---
title: Agent（create_agent）
categories: LangChain
order: 5
date: 2026-06-24
tags:
  - LangChain
  - Agent
---

# Agent（create_agent）

Agent（代理）本质上就是一个**在循环中调用工具的模型**——它不断根据当前任务决定下一步做什么，直到任务完成。

> **Agent = Model + Harness（运行框架）**
>
> Harness 的职责是：在合适的时机，把合适的上下文交给模型，让模型做出正确的决策。
>
> 所谓 harness，就是这个循环外围的一切：模型本身、提示词、工具集合，以及塑造模型行为的中间件（middleware）。`createAgent` 就是一个高度可配置的 harness。最简形式如下：

```js
import { createAgent } from "langchain";

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools,
});
```

在此基础上，你可以通过 `model`、`tools`、`systemPrompt` 等参数直接配置基础能力。更高级的功能则通过中间件来扩展。

---

## 核心组件

### 模型（Model）

向 Agent 传入模型标识字符串（格式为 `"provider:model"`）或已初始化的模型实例，即可选择驱动 Agent 的大语言模型。详见[模型](/tutorials/LangChain/模型)一文中的参数说明、provider 配置和动态模型选择。

```js
import { createAgent } from "langchain";

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools,
});
```

### 工具（Tools）

工具扩展了 Agent 的能力边界——获取实时数据、执行代码、查询数据库、执行外部操作等。通过 `tools` 参数传入工具列表即可。工具的定义方式详见[工具](/tutorials/LangChain/工具)。

```js
import { tool } from "langchain";
import * as z from "zod";

const search = tool(
  ({ query }) => `Results for: ${query}`,
  {
    name: "search",
    description: "Search for information",
    schema: z.object({ query: z.string() }),
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [search],
});
```

### 系统提示词（System Prompt）

系统提示词决定了 Agent 处理任务的方式。`systemPrompt` 参数接受字符串或 `SystemMessage`。如果需要在运行时动态生成提示词，可以使用中间件。

```js
const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools,
  systemPrompt: "You are a helpful assistant. Be concise and accurate.",
});
```

### 结构化输出（Structured Output）

通过 `responseFormat` 参数让 Agent 返回经过 schema 校验的结构化数据。详见[结构化输出](/tutorials/LangChain/结构化输出)。

```js
const Answer = z.object({
  summary: z.string(),
  confidence: z.number(),
});

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools,
  responseFormat: Answer,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "Summarize AI trends" }],
});
result.structuredResponse; // { summary: ..., confidence: ... }
```

---

## 调用 Agent（Invocation）

> 借助 LangSmith 可以追踪 Agent 循环中的每一步，调试工具调用，评估 Agent 输出。建议同时启用 LangSmith Engine 来自动监控 trace、检测异常并给出修复建议。

调用 Agent 时传入一条消息，底层会将该消息作为更新传入 Agent 的 State。所有 Agent 的状态中都包含消息序列；要触发 Agent，传入一条新消息并附带 `thread_id`，这样 Agent 就能持久化并恢复对话历史：

```js
import { AIMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: crypto.randomUUID() } };

let result = await agent.invoke(
  {
    messages: [
      { role: "user", content: "What's the weather in San Francisco?" },
    ],
  },
  config,
);

// 在同一对话中的后续轮次：复用相同的 thread_id 即可保留历史
result = await agent.invoke(
  { messages: [{ role: "user", content: "What about tomorrow?" }] },
  config,
);
```

> **持久化对话历史需要配置 checkpointer。** 部署到 LangSmith 时会自动提供 checkpointer；本地使用时需要显式传入，例如 `checkpointer: new MemorySaver()`。

如果你还需要在每次调用时传递配置信息（如用户 ID、API Key、功能开关），可以通过 `context` 传入，并用 `contextSchema` 定义其数据结构，工具和中间件可通过 `runtime.context` 访问：

```js
import * as z from "zod";
import { AIMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const contextSchema = z.object({
  user_id: z.string(),
});

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [],
  contextSchema,
  checkpointer: new MemorySaver(),
});

const result = await agent.invoke(
  {
    messages: [
      { role: "user", content: "What's the weather in San Francisco?" },
    ],
  },
  {
    configurable: { thread_id: crypto.randomUUID() },
    context: { user_id: "user-123" },
  },
);
```

> `thread_id` 用于界定对话范围（消息历史、检查点），`context` 则携带工具和中间件在运行时读取的每次调用数据。两者通常一起使用。详见[工具上下文](/tutorials/LangChain/工具)和[运行时](/tutorials/LangChain/运行时)。

---

## 流式输出（Streaming）

`invoke` 会等待整个运行结束后返回最终响应。如果 Agent 执行了多个工具调用，用户通常需要在完成前就看到进展。使用流式输出可以实时呈现中间消息和工具活动：

```js
const stream = await agent.streamEvents(
  {
    messages: [
      {
        role: "user",
        content: "Search for AI news and summarize the findings",
      },
    ],
  },
  { version: "v3" },
);

for await (const snapshot of stream.values) {
  // 每个 snapshot 包含当前时刻的完整状态
  const latestMessage = snapshot.messages.at(-1);
  if (latestMessage?.content) {
    if (latestMessage.type === "human") {
      console.log(`User: ${latestMessage.content}`);
    } else if (latestMessage.type === "ai") {
      console.log(`Agent: ${latestMessage.content}`);
    }
  } else if (latestMessage?.tool_calls?.length) {
    const toolCallNames = latestMessage.tool_calls.map((tc) => tc.name);
    console.log(`Calling tools: ${toolCallNames.join(", ")}`);
  }
}
```

> 更多流式模式、事件类型和 UI 集成方案，请阅读[流式输出](/tutorials/LangChain/流式输出)。

---

## 配置 Harness

`createAgent` 高度可扩展。**中间件（Middleware）是自定义的核心原语**：每个中间件处理一个关注点，在合适的时机挂载到 Agent 循环中，并与其他中间件自由组合。按需选用，不需要的可以跳过。

常见模式已经被封装为开箱即用的内置中间件，你也可以编写自定义中间件来处理业务逻辑。

随着 Agent 承担越来越复杂的工作，它在以下几个关键领域需要支持。中间件生态提供了：

| 领域 | 说明 |
|---|---|
| **执行环境** | 工具、文件系统、沙箱、代码执行 |
| **上下文管理** | 摘要压缩、记忆持久化、技能加载、提示词缓存 |
| **规划与委派** | 待办清单、子代理（subagent）用于并行隔离工作 |
| **容错** | 重试、降级、调用次数限制 |
| **护栏（Guardrails）** | PII 检测、内容管控 |
| **人机协作（Steering）** | 高风险操作前的人工审批 |

> `createDeepAgent` 为长时间运行的编码和研究任务预装了这套技术栈（默认包含文件系统、摘要压缩、子代理和提示词缓存）。

### 执行环境

Agent 能够执行实际操作而不仅是生成文本时，才真正发挥价值。执行环境为 Agent 提供工作空间：可调用的工具、跨轮次读写的文件系统，以及执行脚本或 shell 命令的代码执行能力。

```js
import { createAgent } from "langchain";
import { createFilesystemMiddleware, StateBackend } from "deepagents";

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [search],
  middleware: [createFilesystemMiddleware({ backend: new StateBackend() })],
});
```

### 上下文管理

每次模型调用的上下文窗口是有限的。随着 Agent 运行，窗口会被不断累积的历史记录、工具结果和中间步骤填满。**摘要压缩**在溢出前压缩历史；**记忆**在启动时加载持久化指令，使知识能跨会话保留；**技能**按需呈现领域知识，而非一次性全部加载。

```js
import { createAgent } from "langchain";
import {
  StateBackend,
  createFilesystemMiddleware,
  createSkillsMiddleware,
  createSummarizationMiddleware,
} from "deepagents";

const backend = new StateBackend();
const model = "anthropic:claude-sonnet-4-6";

const agent = createAgent({
  model,
  tools: [search],
  middleware: [
    createFilesystemMiddleware({ backend }),
    createSummarizationMiddleware({ model, backend }),
    createSkillsMiddleware({ backend, sources: ["./skills/"] }),
  ],
});
```

### 规划与委派

复杂任务常常超出单个上下文窗口的处理能力。委派（Delegation）让主 Agent 将工作拆分，交给各自在独立上下文中运行的子代理处理，主 Agent 专注于协调而非执行。工作可以并行进行，主 Agent 的上下文也保持清爽。

```js
import { createAgent, todoListMiddleware, tool } from "langchain";
import {
  createFilesystemMiddleware,
  createSubAgentMiddleware,
  StateBackend,
} from "deepagents";
import * as z from "zod";

const search = tool(
  ({ query }) => `Search results for: ${query}`,
  {
    name: "search",
    description: "Search for a query and return a short summary.",
    schema: z.object({ query: z.string() }),
  },
);

const backend = new StateBackend();

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [search],
  middleware: [
    createFilesystemMiddleware({ backend }),
    todoListMiddleware(),
    createSubAgentMiddleware({
      defaultModel: "anthropic:claude-sonnet-4-6",
      defaultTools: [],
      subagents: [
        {
          name: "researcher",
          description: "Searches and returns a structured summary.",
          systemPrompt:
            "Use the search tool to research the question and summarize key points.",
          tools: [search],
          model: "anthropic:claude-sonnet-4-6",
          middleware: [],
        },
      ],
    }),
  ],
});
```

### 命名 Agent

可选地为 Agent 设置一个标识符。在多 Agent 系统中将 Agent 作为子图嵌入时，这特别有用。

```js
const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools,
  name: "research_assistant",
});
```

### 容错（Fault Tolerance）

生产环境中的 Agent 会遇到开发时罕见的各种失败：速率限制、模型超时、瞬时 API 错误。容错中间件在基础设施层面处理这些问题，这样你的工具和业务逻辑就不需要在每次调用外层包裹 try/catch。

```js
import {
  createAgent,
  modelRetryMiddleware,
  tool,
  toolRetryMiddleware,
} from "langchain";
import * as z from "zod";

const search = tool(
  ({ query }) => `Search results for: ${query}`,
  {
    name: "search",
    description: "Search for a query and return a short summary.",
    schema: z.object({ query: z.string() }),
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [search],
  middleware: [
    modelRetryMiddleware({ maxRetries: 3 }),
    toolRetryMiddleware({ maxRetries: 2 }),
  ],
});
```

### 护栏（Guardrails）

有些策略不能仅靠提示词约束——无论模型做什么，都需要确定性地执行。护栏在数据流经 Agent 循环时进行拦截，在工具结果到达模型上下文之前应用合规规则或内容策略。

```js
import { createAgent, piiMiddleware, tool } from "langchain";
import * as z from "zod";

const search = tool(
  ({ query }) => `Search results for: ${query}`,
  {
    name: "search",
    description: "Search for a query and return a short summary.",
    schema: z.object({ query: z.string() }),
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [search],
  middleware: [piiMiddleware("email")],
});
```

### 人机协作（Steering）

完全自主并不总是合适的。人机协作让你可以在特定决策点——破坏性写入、昂贵的 API 调用或任何需要判断的操作之前——引入人工介入，而无需重构 Agent。Agent 会暂停等待；人工批准、编辑或拒绝后，执行继续。

```js
import { createAgent, humanInTheLoopMiddleware, tool } from "langchain";
import * as z from "zod";

const search = tool(
  ({ query }) => `Search results for: ${query}`,
  {
    name: "search",
    description: "Search for a query and return a short summary.",
    schema: z.object({ query: z.string() }),
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [search],
  middleware: [
    humanInTheLoopMiddleware({ interruptOn: { writeFile: true } }),
  ],
});
```

---

## 中间件相关资源

- **[中间件概览](/tutorials/LangChain/中间件概览)** — 了解中间件栈的工作原理以及各钩子的触发时机
- **[内置中间件](/tutorials/LangChain/内置中间件)** — 完整参考文档与配置示例
- **[自定义中间件](/tutorials/LangChain/自定义中间件)** — 编写自己的钩子，处理业务逻辑、PII 过滤等

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/agents) 翻译并二次创作。
