---
title: 上下文工程
categories: LangChain
order: 15
date: 2026-06-24
tags:
  - LangChain
---

# 上下文工程

> 让 Agent 拿到"恰到好处"的信息和工具，是 AI 工程师最重要的工作。

## 概览

构建 Agent（或任何 LLM 应用）最难的部分，是让它们足够可靠。原型看起来很酷，但一放到真实场景里就经常翻车。

### Agent 为什么会失败？

当 Agent 出错时，通常是因为内部的某次 LLM 调用采取了错误行动，或没有按预期执行。LLM 失败的原因无非两类：

- 底层模型本身能力不够。
- 没有把"正确的上下文"喂给 LLM。

**多数情况下，真正的罪魁祸首是后者。** 上下文工程（Context Engineering）就是以正确的格式提供正确的信息和工具，让 LLM 能够完成任务。这是 AI 工程师的头号职责。上下文缺失是 Agent 不可靠的最大阻碍，而 LangChain 的 agent 抽象正是专门为此设计。

### Agent 循环

一个典型的 agent 循环由两步构成：

- **模型调用**：把 prompt 和可用工具喂给 LLM，返回一个回复或一组工具执行请求。
- **工具执行**：执行 LLM 请求的工具，把工具结果返回给循环。

循环持续进行，直到 LLM 决定收尾。

### 你能控制什么

要构建可靠的 Agent，你需要控制 agent 循环的每一步、以及步骤之间的过渡。可以把上下文分成三类：

| 上下文类型 | 你能控制的内容 | 瞬态 / 持久 |
| --- | --- | --- |
| Model Context（模型上下文） | 进入模型调用的内容：指令、消息历史、工具、response format | 瞬态 |
| Tool Context（工具上下文） | 工具能访问和产出的内容（读写 state、store、runtime context） | 持久 |
| Life-cycle Context（生命周期上下文） | 模型调用与工具调用之间发生的事（摘要、护栏、日志等） | 持久 |

**瞬态上下文**指 LLM 在单次调用中看到的内容。你可以在不修改 state 的情况下调整 messages、tools 或 prompt。

**持久上下文**指被写入 state、跨轮次保留的内容。生命周期钩子和工具写入会永久性地修改它。

### 数据来源

在整个过程中，Agent 会读写不同的数据源：

| 数据源 | 又称 | 作用域 | 示例 |
| --- | --- | --- | --- |
| Runtime Context | 静态配置 | 会话级 | 用户 ID、API key、数据库连接、权限、环境设置 |
| State | 短期记忆 | 会话级 | 当前消息、上传文件、登录状态、工具结果 |
| Store | 长期记忆 | 跨会话 | 用户偏好、提取的洞察、记忆、历史数据 |

### 实现机制

LangChain 中间件（middleware）是让上下文工程对开发者切实可用的底层机制。中间件允许你在 agent 生命周期的任意步骤上挂钩，从而：

- 更新上下文。
- 跳转到 agent 生命周期中的其他步骤。

在下面的各章节里，你会频繁看到 middleware API 作为实现上下文工程的手段。

## 模型上下文

控制每次模型调用的输入——指令、可用工具、使用哪个模型、输出格式。这些决策直接影响可靠性和成本。

所有模型上下文的来源都可以是 state（短期记忆）、store（长期记忆）或 runtime context（静态配置）。

### System Prompt（系统提示）

系统提示定义了开发者给 LLM 的基础指令，决定了 LLM 的行为和能力边界。不同用户、不同场景、不同对话阶段需要不同指令。成功的 Agent 会综合记忆、偏好、配置来提供与当前对话状态相匹配的指令。

**从 State 读取**——例如根据会话长度调整简洁度：

```ts
import { createAgent } from "langchain";

const agent = createAgent({
  model: "gpt-5.5",
  tools: [...],
  middleware: [
    dynamicSystemPromptMiddleware((state) => {
      // Read from State: check conversation length
      const messageCount = state.messages.length;

      let base = "You are a helpful assistant.";

      if (messageCount > 10) {
        base += "\nThis is a long conversation - be extra concise.";
      }

      return base;
    }),
  ],
});
```

**从 Store 读取**——例如根据长期偏好调整回复风格：

```ts
import * as z from "zod";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
});

type Context = z.infer<typeof contextSchema>;

const agent = createAgent({
  model: "gpt-5.5",
  tools: [...],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware<Context>(async (state, runtime) => {
      const userId = runtime.context.userId;

      // Read from Store: get user preferences
      const store = runtime.store;
      const userPrefs = await store.get(["preferences"], userId);

      let base = "You are a helpful assistant.";

      if (userPrefs) {
        const style = userPrefs.value?.communicationStyle || "balanced";
        base += `\nUser prefers ${style} responses.`;
      }

      return base;
    }),
  ],
});
```

**从 Runtime Context 读取**——例如根据用户角色和生产环境切换指令：

```ts
import * as z from "zod";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

const contextSchema = z.object({
  userRole: z.string(),
  deploymentEnv: z.string(),
});

type Context = z.infer<typeof contextSchema>;

const agent = createAgent({
  model: "gpt-5.5",
  tools: [...],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware<Context>((state, runtime) => {
      // Read from Runtime Context: user role and environment
      const userRole = runtime.context.userRole;
      const env = runtime.context.deploymentEnv;

      let base = "You are a helpful assistant.";

      if (userRole === "admin") {
        base += "\nYou have admin access. You can perform all operations.";
      } else if (userRole === "viewer") {
        base += "\nYou have read-only access. Guide users to read operations only.";
      }

      if (env === "production") {
        base += "\nBe extra careful with any data modifications.";
      }

      return base;
    }),
  ],
});
```

### Messages（消息）

消息构成了发送给 LLM 的 prompt。合理管理消息内容，确保 LLM 拥有回答问题所需的恰当信息，是上下文工程的核心工作之一。

**从 State 注入**上传文件上下文（当与当前查询相关时）：

```ts
import { createMiddleware } from "langchain";

const injectFileContext = createMiddleware({
  name: "InjectFileContext",
  wrapModelCall: (request, handler) => {
    // request.state is a shortcut for request.state.messages
    const uploadedFiles = request.state.uploadedFiles || [];

    if (uploadedFiles.length > 0) {
      // Build context about available files
      const fileDescriptions = uploadedFiles.map(file =>
        `- ${file.name} (${file.type}): ${file.summary}`
      );

      const fileContext = `Files you have access to in this conversation:
${fileDescriptions.join("\n")}

Reference these files when answering questions.`;

      // Inject file context before recent messages
      const messages = [
        ...request.messages,  // Rest of conversation
        { role: "user", content: fileContext }
      ];
      request = request.override({ messages });
    }

    return handler(request);
  },
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [...],
  middleware: [injectFileContext],
});
```

**从 Store 注入**用户的写作风格示例来引导草稿生成：

```ts
import * as z from "zod";
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
});

const injectWritingStyle = createMiddleware({
  name: "InjectWritingStyle",
  contextSchema,
  wrapModelCall: async (request, handler) => {
    const userId = request.runtime.context.userId;

    // Read from Store: get user's writing style examples
    const store = request.runtime.store;
    const writingStyle = await store.get(["writing_style"], userId);

    if (writingStyle) {
      const style = writingStyle.value;
      // Build style guide from stored examples
      const styleContext = `Your writing style:
- Tone: ${style.tone || 'professional'}
- Typical greeting: "${style.greeting || 'Hi'}"
- Typical sign-off: "${style.signOff || 'Best'}"
- Example email you've written:
${style.exampleEmail || ''}`;

      // Append at end - models pay more attention to final messages
      const messages = [
        ...request.messages,
        { role: "user", content: styleContext }
      ];
      request = request.override({ messages });
    }

    return handler(request);
  },
});
```

**从 Runtime Context 注入**合规规则（根据用户所在司法管辖区）：

```ts
import * as z from "zod";
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userJurisdiction: z.string(),
  industry: z.string(),
  complianceFrameworks: z.array(z.string()),
});

type Context = z.infer<typeof contextSchema>;

const injectComplianceRules = createMiddleware<Context>({
  name: "InjectComplianceRules",
  contextSchema,
  wrapModelCall: (request, handler) => {
    // Read from Runtime Context: get compliance requirements
    const { userJurisdiction, industry, complianceFrameworks } = request.runtime.context;

    // Build compliance constraints
    const rules = [];
    if (complianceFrameworks.includes("GDPR")) {
      rules.push("- Must obtain explicit consent before processing personal data");
      rules.push("- Users have right to data deletion");
    }
    if (complianceFrameworks.includes("HIPAA")) {
      rules.push("- Cannot share patient health information without authorization");
      rules.push("- Must use secure, encrypted communication");
    }
    if (industry === "finance") {
      rules.push("- Cannot provide financial advice without proper disclaimers");
    }

    if (rules.length > 0) {
      const complianceContext = `Compliance requirements for ${userJurisdiction}:
${rules.join("\n")}`;

      // Append at end - models pay more attention to final messages
      const messages = [
        ...request.messages,
        { role: "user", content: complianceContext }
      ];
      request = request.override({ messages });
    }

    return handler(request);
  },
});
```

> **瞬态 vs 持久消息更新**：上述示例使用 `wrapModelCall` 做瞬态更新——只修改单次调用中发送给模型的消息，不改变 state 中保存的内容。要做持久更新，可以：直接从 `wrapModelCall` 返回 `Command` 来注入 state 更新；或使用 `beforeModel`、`afterModel`、`wrapToolCall`（针对工具返回值）等生命周期钩子更新对话历史。

### Tools（工具）

工具让模型能够与数据库、API 和外部系统交互。工具的定义方式和选择策略，直接决定模型能否有效完成任务。

#### 定义工具

每个工具都需要清晰的名称、描述、参数名和参数描述。这些不只是元数据——它们引导模型推理何时以及如何使用该工具。

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const searchOrders = tool(
  async ({ userId, status, limit }) => {
    // Implementation here
  },
  {
    name: "search_orders",
    description: `Search for user orders by status.

    Use this when the user asks about order history or wants to check
    order status. Always filter by the provided status.`,
    schema: z.object({
      userId: z.string().describe("Unique identifier for the user"),
      status: z.enum(["pending", "shipped", "delivered"]).describe("Order status to filter by"),
      limit: z.number().default(10).describe("Maximum number of results to return"),
    }),
  }
);
```

#### 选择工具

并非所有工具在所有情境下都合适。工具太多会让模型过载（上下文超载）并增加出错率；工具太少又限制能力。动态工具选择可以根据认证状态、用户权限、feature flag 或对话阶段来调整可用工具集。

**基于 State**——例如只在认证后启用敏感工具：

```ts
import { createMiddleware } from "langchain";

const stateBasedTools = createMiddleware({
  name: "StateBasedTools",
  wrapModelCall: (request, handler) => {
    // Read from State: check authentication and conversation length
    const state = request.state;
    const isAuthenticated = state.authenticated || false;
    const messageCount = state.messages.length;

    let filteredTools = request.tools;

    // Only enable sensitive tools after authentication
    if (!isAuthenticated) {
      filteredTools = request.tools.filter(t => t.name.startsWith("public_"));
    } else if (messageCount < 5) {
      filteredTools = request.tools.filter(t => t.name !== "advanced_search");
    }

    return handler({ ...request, tools: filteredTools });
  },
});
```

**基于 Store**——例如根据 feature flag 过滤工具：

```ts
import * as z from "zod";
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
});

const storeBasedTools = createMiddleware({
  name: "StoreBasedTools",
  contextSchema,
  wrapModelCall: async (request, handler) => {
    const userId = request.runtime.context.userId;

    // Read from Store: get user's enabled features
    const store = request.runtime.store;
    const featureFlags = await store.get(["features"], userId);

    let filteredTools = request.tools;

    if (featureFlags) {
      const enabledFeatures = featureFlags.value?.enabledTools || [];
      filteredTools = request.tools.filter(t => enabledFeatures.includes(t.name));
    }

    return handler({ ...request, tools: filteredTools });
  },
});
```

**基于 Runtime Context**——例如按用户角色裁剪工具：

```ts
import * as z from "zod";
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userRole: z.string(),
});

const contextBasedTools = createMiddleware({
  name: "ContextBasedTools",
  contextSchema,
  wrapModelCall: (request, handler) => {
    // Read from Runtime Context: get user role
    const userRole = request.runtime.context.userRole;

    let filteredTools = request.tools;

    if (userRole === "admin") {
      // Admins get all tools
    } else if (userRole === "editor") {
      filteredTools = request.tools.filter(t => t.name !== "delete_data");
    } else {
      filteredTools = request.tools.filter(t => t.name.startsWith("read_"));
    }

    return handler({ ...request, tools: filteredTools });
  },
});
```

### Model（模型）

不同模型在能力、成本和上下文窗口上各有取舍。要根据当前任务选择合适的模型，而且这个选择可能在 agent 运行过程中动态变化。

**基于 State**——根据会话长度切换模型（长对话用大窗口模型）：

```ts
import { createMiddleware, initChatModel } from "langchain";

// Initialize models once outside the middleware
const largeModel = initChatModel("claude-sonnet-4-6");
const standardModel = initChatModel("gpt-5.5");
const efficientModel = initChatModel("gpt-5.4-mini");

const stateBasedModel = createMiddleware({
  name: "StateBasedModel",
  wrapModelCall: (request, handler) => {
    // request.messages is a shortcut for request.state.messages
    const messageCount = request.messages.length;
    let model;

    if (messageCount > 20) {
      model = largeModel;
    } else if (messageCount > 10) {
      model = standardModel;
    } else {
      model = efficientModel;
    }

    return handler({ ...request, model });
  },
});
```

**基于 Store**——读取用户偏好的模型：

```ts
import * as z from "zod";
import { createMiddleware, initChatModel } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
});

// Initialize available models once
const MODEL_MAP = {
  "gpt-5.5": initChatModel("gpt-5.5"),
  "gpt-5.4-mini": initChatModel("gpt-5.4-mini"),
  "claude-sonnet": initChatModel("claude-sonnet-4-6"),
};

const storeBasedModel = createMiddleware({
  name: "StoreBasedModel",
  contextSchema,
  wrapModelCall: async (request, handler) => {
    const userId = request.runtime.context.userId;

    // Read from Store: get user's preferred model
    const store = request.runtime.store;
    const userPrefs = await store.get(["preferences"], userId);

    let model = request.model;

    if (userPrefs) {
      const preferredModel = userPrefs.value?.preferredModel;
      if (preferredModel && MODEL_MAP[preferredModel]) {
        model = MODEL_MAP[preferredModel];
      }
    }

    return handler({ ...request, model });
  },
});
```

**基于 Runtime Context**——按成本档位和环境选模型：

```ts
import * as z from "zod";
import { createMiddleware, initChatModel } from "langchain";

const contextSchema = z.object({
  costTier: z.string(),
  environment: z.string(),
});

// Initialize models once outside the middleware
const premiumModel = initChatModel("claude-sonnet-4-6");
const standardModel = initChatModel("gpt-5.5");
const budgetModel = initChatModel("gpt-5.4-mini");

const contextBasedModel = createMiddleware({
  name: "ContextBasedModel",
  contextSchema,
  wrapModelCall: (request, handler) => {
    // Read from Runtime Context: cost tier and environment
    const costTier = request.runtime.context.costTier;
    const environment = request.runtime.context.environment;

    let model;

    if (environment === "production" && costTier === "premium") {
      model = premiumModel;
    } else if (costTier === "budget") {
      model = budgetModel;
    } else {
      model = standardModel;
    }

    return handler({ ...request, model });
  },
});
```

### Response Format（响应格式）

结构化输出把非结构化文本转换为经过校验的结构化数据。当需要提取特定字段或为下游系统返回数据时，自由文本就不够用了。

当你提供 schema 作为 response format 时，模型最终响应必定符合该 schema。Agent 会先跑完模型 / 工具调用循环，等模型不再调用工具后，再把最终响应强制转换为指定格式。

#### 定义格式

Schema 定义引导模型。字段名、类型、描述精确指定了输出应遵循的格式：

```ts
import { z } from "zod";

const customerSupportTicket = z.object({
  category: z.enum(["billing", "technical", "account", "product"]).describe(
    "Issue category"
  ),
  priority: z.enum(["low", "medium", "high", "critical"]).describe(
    "Urgency level"
  ),
  summary: z.string().describe(
    "One-sentence summary of the customer's issue"
  ),
  customerSentiment: z.enum(["frustrated", "neutral", "satisfied"]).describe(
    "Customer's emotional tone"
  ),
}).describe("Structured ticket information extracted from customer message");
```

#### 选择格式

动态 response format 可以根据用户偏好、对话阶段或角色调整 schema——对话早期返回简单格式，复杂度上升后再返回详细格式。

**基于 State**：

```ts
import { createMiddleware } from "langchain";
import { z } from "zod";

const simpleResponse = z.object({
  answer: z.string().describe("A brief answer"),
});

const detailedResponse = z.object({
  answer: z.string().describe("A detailed answer"),
  reasoning: z.string().describe("Explanation of reasoning"),
  confidence: z.number().describe("Confidence score 0-1"),
});

const stateBasedOutput = createMiddleware({
  name: "StateBasedOutput",
  wrapModelCall: (request, handler) => {
    // request.state is a shortcut for request.state.messages
    const messageCount = request.messages.length;

    let responseFormat;
    if (messageCount < 3) {
      // Early conversation - use simple format
      responseFormat = simpleResponse;
    } else {
      // Established conversation - use detailed format
      responseFormat = detailedResponse;
    }

    return handler({ ...request, responseFormat });
  },
});
```

**基于 Store**（用户偏好简洁或详细风格）和 **基于 Runtime Context**（管理员在生产环境拿调试信息）的示例同理，核心都是根据上下文选择合适的 response format schema。

## 工具上下文

工具的特殊之处在于它既读又写上下文。最基本的情况下，工具收到 LLM 的参数、执行工作、返回一条 tool message。但工具还可以主动为模型获取重要信息，帮助它完成和推进任务。

### 读取

大多数现实中的工具需要的不仅是 LLM 的参数。它们需要数据库查询用的用户 ID、外部服务用的 API key，或当前会话状态来做决策。工具通过 state、store 和 runtime context 获取这些信息。

**从 State 读取**当前认证状态：

```ts
import * as z from "zod";
import { createAgent, tool, type ToolRuntime } from "langchain";

const checkAuthentication = tool(
  async (_, runtime: ToolRuntime) => {
    // Read from State: check current auth status
    const currentState = runtime.state;
    const isAuthenticated = currentState.authenticated || false;

    if (isAuthenticated) {
      return "User is authenticated";
    } else {
      return "User is not authenticated";
    }
  },
  {
    name: "check_authentication",
    description: "Check if user is authenticated",
    schema: z.object({}),
  }
);
```

**从 Store 读取**用户偏好：

```ts
import * as z from "zod";
import { createAgent, tool, type ToolRuntime } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
});

const getPreference = tool(
  async ({ preferenceKey }, runtime: ToolRuntime) => {
    const userId = runtime.context.userId;

    // Read from Store: get existing preferences
    const store = runtime.store;
    const existingPrefs = await store.get(["preferences"], userId);

    if (existingPrefs) {
      const value = existingPrefs.value?.[preferenceKey];
      return value ? `${preferenceKey}: ${value}` : `No preference set for ${preferenceKey}`;
    } else {
      return "No preferences found";
    }
  },
  {
    name: "get_preference",
    description: "Get user preference from Store",
    schema: z.object({
      preferenceKey: z.string(),
    }),
  }
);
```

**从 Runtime Context 读取** API key 和数据库连接：

```ts
import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
  apiKey: z.string(),
  dbConnection: z.string(),
});

const fetchUserData = tool(
  async ({ query }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    // Read from Runtime Context: get API key and DB connection
    const { userId, apiKey, dbConnection } = runtime.context;

    // Use configuration to fetch data
    const results = await performDatabaseQuery(dbConnection, query, apiKey);

    return `Found ${results.length} results for user ${userId}`;
  },
  {
    name: "fetch_user_data",
    description: "Fetch data using Runtime Context configuration",
    schema: z.object({
      query: z.string(),
    }),
  }
);

const agent = createAgent({
  model: "gpt-5.5",
  tools: [fetchUserData],
  contextSchema,
});
```

### 写入

工具结果既能直接返回给模型，也能更新 agent 的记忆，使重要上下文对后续步骤可见。

**写入 State**——使用 `Command` 跟踪会话级信息：

```ts
import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { Command } from "@langchain/langgraph";

const authenticateUser = tool(
  async ({ password }) => {
    // Perform authentication
    if (password === "correct") {
      // Write to State: mark as authenticated using Command
      return new Command({
        update: { authenticated: true },
      });
    } else {
      return new Command({ update: { authenticated: false } });
    }
  },
  {
    name: "authenticate_user",
    description: "Authenticate user and update State",
    schema: z.object({
      password: z.string(),
    }),
  }
);
```

**写入 Store**——跨会话持久化用户偏好：

```ts
import * as z from "zod";
import { createAgent, tool, type ToolRuntime } from "langchain";

const savePreference = tool(
  async ({ preferenceKey, preferenceValue }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const userId = runtime.context.userId;

    // Read existing preferences
    const store = runtime.store;
    const existingPrefs = await store.get(["preferences"], userId);

    // Merge with new preference
    const prefs = existingPrefs?.value || {};
    prefs[preferenceKey] = preferenceValue;

    // Write to Store: save updated preferences
    await store.put(["preferences"], userId, prefs);

    return `Saved preference: ${preferenceKey} = ${preferenceValue}`;
  },
  {
    name: "save_preference",
    description: "Save user preference to Store",
    schema: z.object({
      preferenceKey: z.string(),
      preferenceValue: z.string(),
    }),
  }
);
```

## 生命周期上下文

控制 agent 核心步骤之间发生的事情——拦截数据流以实现摘要、护栏、日志等横切关注点。

正如你在模型上下文和工具上下文中所见，中间件是让上下文工程落地的基础设施。它允许你在 agent 生命周期的任意步骤上挂钩，从而：

- **更新上下文**：修改 state 和 store 以持久化变更、更新对话历史、保存洞察。
- **在生命周期中跳转**：根据上下文移动到不同步骤（例如满足某条件时跳过工具执行，或修改上下文后重复模型调用）。

### 示例：消息摘要

最常见的生命周期模式之一是当对话历史过长时自动压缩。与模型上下文中展示的瞬态消息裁剪不同，摘要会持久更新 state——永久性地用摘要替换旧消息。

LangChain 提供了内置中间件来完成这件事：

```ts
import { createAgent, summarizationMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-5.5",
  tools: [...],
  middleware: [
    summarizationMiddleware({
      model: "gpt-5.4-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
});
```

当对话超过 token 限制时，`SummarizationMiddleware` 会自动：

- 使用一次独立的 LLM 调用总结较早的消息。
- 在 State 中用摘要消息永久替换旧消息。
- 保留最近的消息原样不动。

摘要后的对话历史是永久更新的——后续轮次看到的是摘要而非原始消息。

## 最佳实践

- **从简单开始**：先用静态 prompt 和工具，只在需要时才加动态逻辑。
- **增量测试**：一次只加一个上下文工程特性。
- **监控性能**：跟踪模型调用、token 使用量和延迟。
- **善用内置中间件**：优先使用 `SummarizationMiddleware`、`LLMToolSelectorMiddleware` 等。
- **记录上下文策略**：明确说明传入了什么上下文、为什么要传。
- **理解瞬态 vs 持久**：模型上下文变更是瞬态（每次调用），生命周期上下文变更会持久化到 state。

## 小结

上下文工程是让 Agent 从"演示品"变成"生产级"的核心方法论。记住三类上下文（模型、工具、生命周期）和三个数据来源（State、Store、Runtime Context），你就掌握了调控 Agent 行为的全局视角。配合 LangChain 的中间件机制，几乎可以在 agent 循环的任意环节注入、过滤、转换上下文。

接下来推荐阅读 [短期记忆](/tutorials/LangChain/16.短期记忆) 和 [长期记忆](/tutorials/LangChain/17.长期记忆)，深入理解 State 和 Store 的具体用法。如需回顾流式相关内容，可参考 [流式输出](/tutorials/LangChain/13.流式输出)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/context-engineering) 翻译并二次创作。
