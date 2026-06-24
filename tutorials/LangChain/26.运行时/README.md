---
title: 运行时
categories: LangChain
order: 26
date: 2026-06-24
tags:
  - LangChain
  - Runtime
---

# 运行时

[`create_agent`](/tutorials/LangChain/Agent（create_agent）) 底层其实跑在 LangGraph 的运行时（Runtime）之上。理解 Runtime 暴露了哪些信息，能让你写出更解耦、更可测试、更可复用的智能体——尤其是当你需要在工具、[中间件](/tutorials/LangChain/中间件概览)、运行环境之间传递上下文时。

## 概览

LangGraph 暴露的 **Runtime 对象** 包含以下五类信息：

| 字段 | 含义 |
| --- | --- |
| **Context** | 静态信息，例如用户 ID、数据库连接或其他 Agent 调用所需的依赖 |
| **Store** | 一个 `BaseStore` 实例，用于 [长期记忆](/tutorials/LangChain/长期记忆) |
| **Stream writer** | 用于通过 `custom` 流模式向外推送信息的对象 |
| **Execution info** | 当前执行的标识与重试信息（thread ID、run ID、attempt number） |
| **Server info** | 运行在 LangGraph Server 上时的服务端元数据（assistant ID、graph ID、已认证用户） |

**Runtime context 是把数据贯穿 Agent 的推荐方式。** 与其把东西塞进全局状态，不如把数据库连接、用户会话、配置等附加到 context 上，然后在工具和中间件里按需读取。这种做法保持了无状态（stateless）、可测试（testable）、可复用（reusable）的代码风格。

你可以在 **工具（tools）** 和 **中间件（middleware）** 中访问 runtime 信息。

## 访问 Runtime

使用 `createAgent` 创建 Agent 时，可以通过 `contextSchema` 定义 Runtime 中 context 的结构。调用时通过 `context` 参数传入本次运行相关的配置：

```ts
import * as z from "zod";
import { createAgent } from "langchain";

const contextSchema = z.object({
  userName: z.string(),
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [
    /* ... */
  ],
  contextSchema,
});

const result = await agent.invoke(
  { messages: [{ role: "user", content: "What's my name?" }] },
  { context: { userName: "John Smith" } }
);
```

> 代码要点：`contextSchema` 是 Agent 与外部世界约定好的一份契约，所有下游工具/中间件都基于它做类型推断。

## 在工具中访问 Runtime

在工具内部可以访问 runtime 信息来：

- 读取 context
- 读写长期记忆（Store）
- 向 custom stream 写入数据（例如上报工具进度）

通过 `runtime` 参数即可拿到 `Runtime` 对象：

```ts
import * as z from "zod";
import { tool } from "langchain";
import { type ToolRuntime } from "@langchain/core/tools";

const contextSchema = z.object({
  userName: z.string(),
});

const fetchUserEmailPreferences = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const userName = runtime.context?.userName;
    if (!userName) {
      throw new Error("userName is required");
    }

    let preferences = "The user prefers you to write a brief and polite email.";
    if (runtime.store) {
      const memory = await runtime.store?.get(["users"], userName);
      if (memory) {
        preferences = memory.value.preferences;
      }
    }
    return preferences;
  },
  {
    name: "fetch_user_email_preferences",
    description: "Fetch the user's email preferences.",
    schema: z.object({}),
  }
);
```

### 在工具中读取 execution info 与 server info

通过 `runtime.executionInfo` 拿到执行标识（thread ID、run ID），在 LangGraph Server 上运行时通过 `runtime.serverInfo` 拿到服务端元数据（assistant ID、已认证用户）：

```ts
import { tool } from "langchain";
import * as z from "zod";

const contextAwareTool = tool(
  async (_input, runtime) => {
    // 读取 thread 与 run ID
    const info = runtime.executionInfo;
    console.log(`Thread: ${info.threadId}, Run: ${info.runId}`);

    // 读取服务端信息（仅在 LangGraph Server 上可用）
    const server = runtime.serverInfo;
    if (server != null) {
      console.log(`Assistant: ${server.assistantId}`);
      if (server.user != null) {
        console.log(`User: ${server.user.identity}`);
      }
    }

    return "done";
  },
  {
    name: "context_aware_tool",
    description: "A tool that uses execution and server info.",
    schema: z.object({}),
  }
);
```

> 注意：本地开发时（没有跑在 LangGraph Server 上）`serverInfo` 会是 `null`。`runtime.executionInfo` 和 `runtime.serverInfo` 需要 `deepagents>=1.9.0`（或 `@langchain/langgraph>=1.2.8`）。

## 在中间件中访问 Runtime

在 [自定义中间件](/tutorials/LangChain/自定义中间件) 中，runtime 可以用来构建 **动态 prompt**、修改消息，或基于用户 context 控制智能体行为。同样通过 `runtime` 参数访问：

```ts
import * as z from "zod";
import { createAgent, createMiddleware, SystemMessage } from "langchain";

const contextSchema = z.object({
  userName: z.string(),
});

// 动态 prompt 中间件
const dynamicPromptMiddleware = createMiddleware({
  name: "DynamicPrompt",
  contextSchema,
  beforeModel: (state, runtime) => {
    const userName = runtime.context?.userName;
    if (!userName) {
      throw new Error("userName is required");
    }

    const systemMsg = `You are a helpful assistant. Address the user as ${userName}.`;
    return {
      messages: [new SystemMessage(systemMsg), ...state.messages],
    };
  },
});

// 日志中间件
const loggingMiddleware = createMiddleware({
  name: "Logging",
  contextSchema,
  beforeModel: (state, runtime) => {
    console.log(`Processing request for user: ${runtime.context?.userName}`);
    return;
  },
  afterModel: (state, runtime) => {
    console.log(`Completed request for user: ${runtime.context?.userName}`);
    return;
  },
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [
    /* ... */
  ],
  middleware: [dynamicPromptMiddleware, loggingMiddleware],
  contextSchema,
});

const result = await agent.invoke(
  { messages: [{ role: "user", content: "What's my name?" }] },
  { context: { userName: "John Smith" } }
);
```

### 中间件中的 execution info 与 server info

中间件钩子同样能访问 `runtime.executionInfo` 和 `runtime.serverInfo`，例如可以基于它做一个权限网关：

```ts
import { createMiddleware } from "langchain";

const authGate = createMiddleware({
  name: "AuthGate",
  beforeModel: (state, runtime) => {
    const server = runtime.serverInfo;
    if (server != null && server.user == null) {
      throw new Error("Authentication required");
    }
    console.log(`Thread: ${runtime.executionInfo.threadId}`);
    return;
  },
});
```

> 同样需要 `deepagents>=1.9.0`（或 `@langchain/langgraph>=1.2.8`）。可以和 [护栏](/tutorials/LangChain/护栏) 配合，构建更完整的权限与安全控制。

## 小结

Runtime 是把"运行环境信息"统一暴露给 Agent 的桥梁：context 用来传依赖、store 用来存长期记忆、stream writer 用来做自定义流式、execution/server info 用来做多租户与审计。掌握 Runtime 后，再回头看 [上下文工程](/tutorials/LangChain/上下文工程) 会更加清晰。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/runtime) 翻译并二次创作。
