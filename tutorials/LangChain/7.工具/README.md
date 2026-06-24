---
title: 工具
categories: LangChain
order: 7
date: 2026-06-24
tags:
  - LangChain
  - Tool
---

# 工具

工具扩展了 Agent 的能力——让它们可以获取实时数据、执行代码、查询外部数据库、在世界中执行操作。

本质上，工具是带有明确定义输入和输出的可调用函数，会被传递给聊天模型。模型根据对话上下文决定何时调用工具以及提供什么输入参数。

> 关于模型如何处理工具调用的细节，请参见[模型](/tutorials/LangChain/模型)中的工具调用部分。借助 LangSmith 可以追踪工具调用并调试错误。

---

## 创建工具

### 基础工具定义

创建工具最简单的方式是从 `langchain` 包导入 `tool` 函数，并使用 `zod` 定义工具的输入 schema：

```js
import * as z from "zod";
import { tool } from "langchain";

const searchDatabase = tool(
  ({ query, limit }) => `Found ${limit} results for '${query}'`,
  {
    name: "search_database",
    description: "Search the customer database for records matching the query.",
    schema: z.object({
      query: z.string().describe("Search terms to look for"),
      limit: z.number().describe("Maximum number of results to return"),
    }),
  },
);
```

> **命名建议**：工具名优先使用 snake_case（如 `web_search` 而非 `Web Search`）。某些 provider 对包含空格或特殊字符的名称有兼容问题。坚持使用字母、数字、下划线和连字符可以提高跨 provider 的兼容性。

---

## 访问上下文

工具在能够访问运行时信息（如对话历史、用户数据、持久化记忆）时最为强大。本节介绍如何从工具内部访问和更新这些信息。

### Context（上下文）

Context 提供在调用时传入的不可变配置数据。用于用户 ID、会话详情或不应在对话过程中改变的应用级设置。

> `thread_id`（通过 `config` 传入）界定对话范围：消息历史和检查点；`context` 携带工具和中间件在运行时读取的每次调用数据。生产环境中通常两者一起使用：每个对话一个稳定的 `thread_id`，每次调用附带 `context` 对象。

工具可以通过 `config` 参数访问 Agent 的运行时上下文。传入 `context` 的同时附带 `thread_id` 以便跨轮次持久化对话：

```js
import * as z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";

const getUserName = tool(
  (_, config) => {
    return config.context.user_name;
  },
  {
    name: "get_user_name",
    description: "Get the user's name.",
    schema: z.object({}),
  },
);

const contextSchema = z.object({
  user_name: z.string(),
});

const agent = createAgent({
  model: new ChatOpenAI({ model: "google-genai:gemini-3.5-flash" }),
  tools: [getUserName],
  contextSchema,
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "What is my name?" }],
  },
  {
    configurable: { thread_id: crypto.randomUUID() },
    context: { user_name: "John Smith" },
  },
);
```

### 长期记忆（Store）

`BaseStore` 提供跨对话持久存在的存储。与状态（短期记忆）不同，保存到 store 中的数据在未来会话中仍然可用。通过 `config.store` 访问 store，store 使用命名空间/键模式来组织数据：

```js
import * as z from "zod";
import { createAgent, tool } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const store = new InMemoryStore();

// 读取记忆
const getUserInfo = tool(
  async ({ user_id }) => {
    const value = await store.get(["users"], user_id);
    console.log("get_user_info", user_id, value);
    return value;
  },
  {
    name: "get_user_info",
    description: "Look up user info.",
    schema: z.object({
      user_id: z.string(),
    }),
  },
);

// 更新记忆
const saveUserInfo = tool(
  async ({ user_id, name, age, email }) => {
    console.log("save_user_info", user_id, name, age, email);
    await store.put(["users"], user_id, { name, age, email });
    return "Successfully saved user info.";
  },
  {
    name: "save_user_info",
    description: "Save user info.",
    schema: z.object({
      user_id: z.string(),
      name: z.string(),
      age: z.number(),
      email: z.string(),
    }),
  },
);

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-5.5" }),
  tools: [getUserInfo, saveUserInfo],
  store,
});

// 第一次会话：保存用户信息
await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "Save the following user: userid: abc123, name: Foo, age: 25, email: foo@langchain.dev",
    },
  ],
});

// 第二次会话：获取用户信息
const result = await agent.invoke({
  messages: [
    { role: "user", content: "Get user info for user with id 'abc123'" },
  ],
});

console.log(result);
// Here is the user info for user with ID "abc123":
// - Name: Foo
// - Age: 25
// - Email: foo@langchain.dev
```

### 流式写入器（Stream Writer）

在工具执行期间向用户实时推送更新。这对于长时间运行的操作中提供进度反馈非常有用。使用 `config.writer` 发出自定义更新：

```js
import * as z from "zod";
import { tool, ToolRuntime } from "langchain";

const getWeather = tool(
  ({ city }, config: ToolRuntime) => {
    const writer = config.writer;

    // 在工具执行期间流式发送自定义更新
    if (writer) {
      writer(`Looking up data for city: ${city}`);
      writer(`Acquired data for city: ${city}`);
    }

    return `It's always sunny in ${city}!`;
  },
  {
    name: "get_weather",
    description: "Get weather for a given city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);
```

### 执行信息（Execution Info）

通过 `runtime.executionInfo` 在工具内部访问线程 ID、运行 ID 和重试状态：

```js
import { tool } from "langchain";
import * as z from "zod";

const logExecutionContext = tool(
  async (_input, runtime) => {
    const info = runtime.executionInfo;
    console.log(`Thread: ${info.threadId}, Run: ${info.runId}`);
    console.log(`Attempt: ${info.nodeAttempt}`);
    return "done";
  },
  {
    name: "log_execution_context",
    description: "Log execution identity information.",
    schema: z.object({}),
  },
);
```

> 需要 `deepagents>=1.9.0`（或 `@langchain/langgraph>=1.2.8`）。

### 服务端信息（Server Info）

当你的工具运行在 LangGraph Server 上时，通过 `runtime.serverInfo` 访问 assistant ID、graph ID 和已认证用户：

```js
import { tool } from "langchain";
import * as z from "zod";

const getAssistantScopedData = tool(
  async (_input, runtime) => {
    const server = runtime.serverInfo;
    if (server != null) {
      console.log(`Assistant: ${server.assistantId}, Graph: ${server.graphId}`);
      if (server.user != null) {
        console.log(`User: ${server.user.identity}`);
      }
    }
    return "done";
  },
  {
    name: "get_assistant_scoped_data",
    description: "Fetch data scoped to the current assistant.",
    schema: z.object({}),
  },
);
```

> `serverInfo` 在工具未运行于 LangGraph Server 时为 `null`。需要 `deepagents>=1.9.0`（或 `@langchain/langgraph>=1.2.8`）。

---

## 工具执行

在 LangChain 中，工具由 Agent 使用（例如通过 `createAgent`），工具错误处理通过中间件配置。对于 LangGraph 工作流，工具执行由 `ToolNode` 处理。

### 工具返回值

你可以为工具选择不同的返回值类型：

- **返回字符串**：用于人类可读的结果
- **返回对象**：用于模型应解析的结构化结果
- **返回 Command**：当你需要写入状态时使用

#### 返回字符串

当工具应提供纯文本供模型阅读和使用时，返回字符串：

```js
import { tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  ({ city }) => `It is currently sunny in ${city}.`,
  {
    name: "get_weather",
    description: "Get weather for a city.",
    schema: z.object({ city: z.string() }),
  },
);
```

行为说明：

- 返回值会被转换为 `ToolMessage`
- 模型看到该文本并决定下一步做什么
- 除非模型或其他工具后续操作，否则 Agent 状态字段不会被改变

#### 返回对象

当你的工具产生模型应检查的结构化数据时，返回对象：

```js
import { tool } from "langchain";
import * as z from "zod";

const getWeatherData = tool(
  ({ city }) => ({
    city,
    temperature_c: 22,
    conditions: "sunny",
  }),
  {
    name: "get_weather_data",
    description: "Get structured weather data for a city.",
    schema: z.object({ city: z.string() }),
  },
);
```

行为说明：

- 对象被序列化后作为工具输出发回
- 模型可以读取特定字段并进行推理
- 与字符串返回一样，不会直接更新图状态

#### 返回 Command

当工具需要更新图状态时（例如设置用户偏好或应用状态），返回 `Command`。你可以在更新中包含或不包含 `ToolMessage`。

> 如果模型需要看到工具成功（例如确认偏好更改），请在更新中包含 `ToolMessage`，使用 `runtime.toolCallId` 作为 `tool_call_id`。

```js
import { tool, ToolMessage, type ToolRuntime } from "langchain";
import { Command } from "@langchain/langgraph";
import * as z from "zod";

const setLanguage = tool(
  async ({ language }, config: ToolRuntime) => {
    return new Command({
      update: {
        preferredLanguage: language,
        messages: [
          new ToolMessage({
            content: `Language set to ${language}.`,
            tool_call_id: config.toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "set_language",
    description: "Set the preferred response language.",
    schema: z.object({ language: z.string() }),
  },
);
```

#### 直接返回（Return Direct）

在工具上设置 `returnDirect` 可以短路 Agent 循环：Agent 直接将工具输出返回给调用方，不再将其传回模型做进一步处理：

```js
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import * as z from "zod";

const fetchOrderStatus = tool(
  ({ order_id }) => {
    return `Order ${order_id} is shipped and will arrive in 2 days.`;
  },
  {
    name: "fetch_order_status",
    description: "Fetch the current status of a customer order.",
    schema: z.object({ order_id: z.string() }),
    returnDirect: true,
  },
);

const agent = createAgent({
  model: new ChatOpenAI({ model: "google-genai:gemini-3.5-flash" }),
  tools: [fetchOrderStatus],
});

const result = await agent.invoke({
  messages: [
    { role: "user", content: "What is the status of order #12345?" },
  ],
});
// Agent 直接返回工具输出，不经过额外的模型调用：
// "Order 12345 is shipped and will arrive in 2 days."
```

> **注意**：如果模型在单轮中调用了多个工具，`returnDirect` 仅在所有被调用工具都设置了 `returnDirect: true` 时生效。

适合使用 `returnDirect` 的场景：

- 工具输出本身就是完整的、可直接展示给用户的答案
- 不需要额外推理时，想避免一次不必要的模型调用
- 需要确定性输出——模型无法重新表述、摘要或基于工具结果做进一步操作

### 错误处理

使用 LangChain Agent 中间件处理工具错误，重试失败的调用或返回自定义错误消息：

```js
import { createAgent, createMiddleware, ToolMessage } from "langchain";

const handleToolErrors = createMiddleware({
  name: "HandleToolErrors",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      return new ToolMessage({
        content: `Tool error: Please check your input and try again. (${error})`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
});

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [],
  middleware: [handleToolErrors],
});
```

---

## 动态工具选择

动态工具意味着 Agent 可用的工具集在运行时被修改，而非全部在 upfront 定义。并非每个工具都适用于每种情况——工具太多可能让模型困惑（过载上下文）并增加错误率；太少又限制了能力。动态工具选择让你能够根据认证状态、用户权限、功能开关或对话阶段来调整可用工具集。

有两种方法，取决于工具是否事先已知：

### 过滤预注册工具

当所有可能的工具在 Agent 创建时已知，你可以预先注册它们，并根据状态、权限或上下文动态过滤暴露给模型的工具：

```js
import { createMiddleware, tool } from "langchain";
import { createDeepAgent } from "deepagents";

const stateBasedTools = createMiddleware({
  name: "StateBasedTools",
  wrapModelCall: (request, handler) => {
    // 从 State 中读取：检查认证和对话长度
    const state = request.state as typeof request.state & {
      authenticated?: boolean;
    };
    const isAuthenticated = state.authenticated ?? false;
    const messageCount = state.messages.length;

    let filteredTools = request.tools;

    // 仅在认证后启用敏感工具
    if (!isAuthenticated) {
      filteredTools = request.tools.filter(
        (t) => typeof t.name === "string" && t.name.startsWith("public_"),
      );
    } else if (messageCount < 5) {
      filteredTools = request.tools.filter(
        (t) => typeof t.name === "string" && t.name !== "advanced_search",
      );
    }

    return handler({ ...request, tools: filteredTools });
  },
});

const agent = await createDeepAgent({
  model: "claude-sonnet-4-20250514",
  tools: tools,
  middleware: [stateBasedTools],
});
```

> 此方法适用于：所有可能的工具在编译/启动时已知；想基于权限、功能开关或对话状态进行过滤；工具本身静态但可用性动态变化的场景。

### 运行时注册工具

当工具在运行时被发现或创建（例如从 MCP 服务器加载、基于用户数据生成、从远程注册表获取），你需要同时注册工具并动态处理其执行。这需要两个中间件钩子：`wrapModelCall` 添加动态工具到请求；`wrapToolCall` 处理动态添加工具的执行。

```js
import { createAgent, createMiddleware, tool } from "langchain";
import * as z from "zod";

// 一个将在运行时动态添加的工具
const calculateTip = tool(
  ({ billAmount, tipPercentage = 20 }) => {
    const tip = billAmount * (tipPercentage / 100);
    return `Tip: $${tip.toFixed(2)}, Total: $${(billAmount + tip).toFixed(2)}`;
  },
  {
    name: "calculate_tip",
    description: "Calculate the tip amount for a bill",
    schema: z.object({
      billAmount: z.number().describe("The bill amount"),
      tipPercentage: z.number().default(20).describe("Tip percentage"),
    }),
  },
);

const dynamicToolMiddleware = createMiddleware({
  name: "DynamicToolMiddleware",
  wrapModelCall: (request, handler) => {
    // 将动态工具添加到请求中
    // 这可以从 MCP 服务器、数据库等加载
    return handler({
      ...request,
      tools: [...request.tools, calculateTip],
    });
  },
  wrapToolCall: (request, handler) => {
    // 处理动态添加工具的执行
    if (request.toolCall.name === "calculate_tip") {
      return handler({ ...request, tool: calculateTip });
    }
    return handler(request);
  },
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [getWeather], // 这里只注册静态工具
  middleware: [dynamicToolMiddleware],
});

// Agent 现在可以同时使用 getWeather 和 calculateTip
const result = await agent.invoke({
  messages: [{ role: "user", content: "Calculate a 20% tip on $85" }],
});
```

> `wrapToolCall` 钩子对于运行时注册的工具是必需的，因为 Agent 需要知道如何执行原始工具列表中不存在的工具。没有它，Agent 将不知道如何调用动态添加的工具。

---

## 无头工具（Headless Tools）

有些工具应该运行在用户应用所在的环境中（通常是浏览器），而不是在服务器进程中。无头工具是工具定义——包括名称、描述和参数 schema——你在服务器上与 Agent 一起注册。实现则只在客户端注册，通过短暂的 interrupt/resume 握手后执行。

这与普通工具（函数体在服务器上运行）和服务端工具使用（模型 provider 远程执行内置工具）都不同。

### 何时使用无头工具

当工作依赖于只存在于客户端的环境、设备或 UI 时使用。例如：

- **浏览器 API**：地理位置、IndexedDB、剪贴板、Canvas 2D、文件选择器、电池 API 等
- **隐私和本地性**：数据保留在设备上（例如 IndexedDB 中的本地"记忆"）
- **延迟**：纯本地操作无需额外的服务器往返
- **结构化的安全效果**：优先使用多个小型、有类型的工具（例如每个 canvas 原语一个工具），而非发送任意代码到 eval

### 工作原理

在两种运行时中，模型看到的都是可以正常调用的工具，但实际执行发生在服务器进程之外：

1. 用 `tool({ name, description, schema })` 定义工具——仅元数据和校验，没有服务端执行器
2. 用 `.implement(async (args) => { ... })` 附加实际行为，返回无头工具实现（定义 + 执行函数）
3. 将步骤 1 的定义注册到 `createAgent` 或你的图中，让模型在其常规工具调用循环中看到该工具
4. 将步骤 2 的实现传给你流式钩子的 `tools` 选项

> 将工具定义（`tool({ name, description, schema })`）和实现（`.implement(...)`）放在不同模块中。从服务器 Agent 和前端共同导入共享定义文件，保持名称和 schema 对齐；将仅客户端的执行逻辑放在服务器永远不会加载的实现模块中。

当模型对这类工具发出调用时，运行会中断（interrupt）而不是在本地执行。你的应用可以检查载荷、在正确的环境中执行操作（例如浏览器、另一个服务或人工审核步骤），然后用工具结果恢复（resume）图。

---

## 预构建工具

LangChain 提供了大量预构建工具和工具包，用于网络搜索、代码解释、数据库访问等常见任务。这些开箱即用的工具可以直接集成到你的 Agent 中，无需编写自定义代码。详见工具和工具包集成页面。

### 服务端工具使用

某些聊天模型具有由模型 provider 在服务端执行内置工具的能力，包括网络搜索和代码解释器等，不需要你定义或托管工具逻辑。请参阅各聊天模型集成页面和工具调用文档了解详情。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/tools) 翻译并二次创作。
