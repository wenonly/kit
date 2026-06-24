---
title: 短期记忆
categories: LangChain
order: 16
date: 2026-06-24
tags:
  - LangChain
  - Memory
---

# 短期记忆

> 让 Agent 在单个会话内"记住"之前的交互，而不是每次都从零开始。

## 概览

记忆（Memory）是一个记录先前交互信息的系统。对 AI Agent 来说，记忆至关重要——它让 Agent 能记住之前的互动、从反馈中学习、适应用户偏好。随着 Agent 处理越来越复杂的任务、面对越来越多的用户交互，这种能力对效率和满意度都必不可少。

**短期记忆**让应用在单个 thread（线程/会话）内记住先前的交互。一个 thread 把一个会话中的多次交互组织在一起，类似邮件把多条消息归到同一个对话里。

**对话历史**（conversation history）是短期记忆最常见的形态。但长对话对今天的 LLM 是个挑战：完整历史可能塞不进上下文窗口，导致上下文丢失或报错。即便模型支持完整上下文长度，大多数 LLM 在超长上下文上表现仍然不佳——它们会被过时或离题的内容"分心"，同时响应变慢、成本升高。

> 需要跨会话记住信息？请使用[长期记忆](/tutorials/LangChain/17.长期记忆)在不同 thread 和 session 间存储和调用用户级或应用级数据。

## 基本用法

要给 Agent 加上短期记忆（thread 级持久化），需要在创建 Agent 时指定 `checkpointer`。

LangChain 的 Agent 把短期记忆作为 agent state 的一部分管理。通过将记忆存储在图的 state 中，Agent 可以访问某个对话的完整上下文，同时在不同 thread 之间保持隔离。State 通过 checkpointer 持久化到数据库（或内存），thread 可以随时恢复。短期记忆在 Agent 被 invoke 或一个步骤（如工具调用）完成时更新，state 在每个步骤开始时读取。

> 代码要点：创建一个带 `MemorySaver` checkpointer 的 Agent，通过 `thread_id` 标识会话，连续两轮对话验证 Agent 记住了用户的名字。

```ts
import { createAgent, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const getUserInfo = tool(() => "No user profile on file.", {
  name: "get_user_info",
  description: "Look up information about the current user.",
  schema: z.object({}),
});

const checkpointer = new MemorySaver();

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [getUserInfo],
  checkpointer,
});

const threadConfig = { configurable: { thread_id: "1" } };
let result = await agent.invoke(
  { messages: [{ role: "user", content: "Hi! My name is Bob." }] },
  threadConfig,
);
let response = result.messages.at(-1)?.content;
console.log(response); // "Hi Bob! Nice to see you here. How are you doing?"

result = await agent.invoke(
  { messages: [{ role: "user", content: "What's my name?" }] },
  threadConfig,
);
response = result.messages.at(-1)?.content;
console.log(response); // "You are Bob!"
```

### 生产环境配置

生产环境请使用数据库支持的 checkpointer：

```ts
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);
```

更多 checkpointer 选项（SQLite、Postgres、Azure Cosmos DB 等）请参阅 Persistence 文档中的 checkpointer 库列表。

## 自定义 Agent 记忆

你可以通过创建带 state schema 的自定义中间件来扩展 agent state。自定义 state schema 通过中间件的 `stateSchema` 参数传入。推荐使用 `StateSchema` 类定义 state（也支持原生 Zod 对象）。

```ts
import { createAgent, createMiddleware } from "langchain";
import { StateSchema, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({
    userId: z.string(),
    preferences: z.record(z.string(), z.any()),
});

const stateExtensionMiddleware = createMiddleware({
    name: "StateExtension",
    stateSchema: CustomState,
});

const checkpointer = new MemorySaver();
const agent = createAgent({
    model: "gpt-5.5",
    tools: [],
    middleware: [stateExtensionMiddleware],
    checkpointer,
});

// Custom state can be passed in invoke
const result = await agent.invoke({
    messages: [{ role: "user", content: "Hello" }],
    userId: "user_123",
    preferences: { theme: "dark" },
});
```

## 常见模式

启用了短期记忆后，长对话可能会超出 LLM 的上下文窗口。常见解决方案有：

- **Trim messages**：在调用 LLM 前移除前 N 条或后 N 条消息。
- **Delete messages**：从 LangGraph state 中永久删除消息。
- **Summarize messages**：把较早的消息摘要后替换掉。
- **Custom strategies**：自定义策略（如消息过滤等）。

这些手段让 Agent 既能跟踪对话，又不会撑爆 LLM 的上下文窗口。

### 裁剪消息（Trim messages）

大多数 LLM 有最大上下文窗口（以 token 计）。一种决定何时截断消息的方式是统计消息历史中的 token 数，接近上限就截断。LangChain 提供了 `trimMessages` 工具函数，可以指定保留的 token 数和 `strategy`（如保留最后 `maxTokens` 条）。

在 Agent 中裁剪消息历史，用 `createMiddleware` 配合 `beforeModel` 钩子：

```ts
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { MemorySaver, REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

const trimMessages = createMiddleware({
  name: "TrimMessages",
  beforeModel: (state) => {
    const messages = state.messages;

    if (messages.length <= 3) {
      return; // No changes needed
    }

    const firstMsg = messages[0];
    const recentMessages =
      messages.length % 2 === 0 ? messages.slice(-3) : messages.slice(-4);
    const newMessages = [firstMsg, ...recentMessages];

    return {
      messages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ...newMessages,
      ],
    };
  },
});

const checkpointer = new MemorySaver();
const agent = createAgent({
  model: "gpt-5.5",
  tools: [...],
  middleware: [trimMessages],
  checkpointer,
});
```

### 删除消息（Delete messages）

你可以从图状态中删除消息来管理历史。这在需要移除特定消息或清空全部消息历史时很有用。

要删除消息，使用 `RemoveMessage`。它要求 state key 配置 `messagesStateReducer` reducer（如 `MessagesValue`）。

```ts
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const deleteOldMessages = createMiddleware({
  name: "DeleteOldMessages",
  afterModel: (state) => {
    const messages = state.messages;
    if (messages.length > 2) {
      // remove the earliest two messages
      return {
        messages: messages
          .slice(0, 2)
          .map((m) => new RemoveMessage({ id: m.id! })),
      };
    }
    return;
  },
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  systemPrompt: "Please be concise and to the point.",
  middleware: [deleteOldMessages],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: "1" } };

const streamA = await agent.streamEvents(
  { messages: [{ role: "user", content: "hi! I'm bob" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of streamA.values) {
  const messageDetails = snapshot.messages.map((message) => [
    message.getType(),
    message.content,
  ]);
  console.log(messageDetails);
}
```

> 删除消息时，确保结果消息历史是合法的。不同 LLM 提供商有不同限制，例如：有些提供商要求消息历史以 `user` 消息开头；大多数要求带 tool call 的 `assistant` 消息后面必须紧跟对应的 `tool` 结果消息。

### 摘要消息（Summarize messages）

裁剪和删除消息的问题在于可能丢失信息。因此，有些应用更适合用聊天模型对消息历史做摘要。

在 Agent 中摘要消息历史，使用内置的 `summarizationMiddleware`：

```ts
import { createAgent, summarizationMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  middleware: [
    summarizationMiddleware({
      model: "gpt-5.4-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
  checkpointer,
});

const config = { configurable: { thread_id: "1" } };
await agent.invoke({ messages: "hi, my name is bob" }, config);
await agent.invoke({ messages: "write a short poem about cats" }, config);
await agent.invoke({ messages: "now do the same but for dogs" }, config);
const finalResponse = await agent.invoke({ messages: "what's my name?" }, config);

console.log(finalResponse.messages.at(-1)?.content);
// Your name is Bob!
```

## 访问记忆

你可以通过多种方式访问和修改 Agent 的短期记忆（state）。

### 在工具中读取短期记忆

在工具中通过 `runtime` 参数（类型为 `ToolRuntime`）访问短期记忆（state）。`runtime` 参数对工具签名是隐藏的（模型看不到），但工具可以通过它访问 state。

```ts
import { createAgent, tool, type ToolRuntime } from "langchain";
import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({
  userId: z.string(),
});

const getUserInfo = tool(
  async (_, config: ToolRuntime<typeof CustomState.State>) => {
    const userId = config.state.userId;
    return userId === "user_123" ? "John Doe" : "Unknown User";
  },
  {
    name: "get_user_info",
    description: "Get user info",
    schema: z.object({}),
  }
);

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [getUserInfo],
  stateSchema: CustomState,
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "what's my name?" }],
    userId: "user_123",
  },
  {
    context: {},
  }
);

console.log(result.messages.at(-1)?.content);
// Outputs: "Your name is John Doe."
```

### 在工具中写入短期记忆

在工具执行过程中，可以直接返回 state 更新来修改 Agent 的短期记忆。这在需要持久化中间结果、或让后续工具 / prompt 能够访问某些信息时很有用。

```ts
import { tool, createAgent, ToolMessage, type ToolRuntime } from "langchain";
import { Command, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({
  userId: z.string().optional(),
});

const updateUserInfo = tool(
  async (_, config: ToolRuntime<typeof CustomState.State>) => {
    const userId = config.state.userId;
    const name = userId === "user_123" ? "John Smith" : "Unknown user";
    return new Command({
      update: {
        userName: name,
        // update the message history
        messages: [
          new ToolMessage({
            content: "Successfully looked up user information",
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
    });
  },
  {
    name: "update_user_info",
    description: "Look up and update user info.",
    schema: z.object({}),
  }
);

const agent = createAgent({
  model: "openai:gpt-5-mini",
  tools: [updateUserInfo],
  stateSchema: CustomState,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "greet the user" }],
  userId: "user_123",
});
```

### 在 prompt 中访问短期记忆

在中间件中访问短期记忆（state），可以根据对话历史或自定义 state 字段生成动态 prompt：

```ts
import * as z from "zod";
import { createAgent, tool, dynamicSystemPromptMiddleware } from "langchain";

const contextSchema = z.object({
  userName: z.string(),
});
type ContextSchema = z.infer<typeof contextSchema>;

const getWeather = tool(
  async ({ city }) => {
    return `The weather in ${city} is always sunny!`;
  },
  {
    name: "get_weather",
    description: "Get user info",
    schema: z.object({
      city: z.string(),
    }),
  }
);

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [getWeather],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware<ContextSchema>((_, config) => {
      return `You are a helpful assistant. Address the user as ${config.context?.userName}.`;
    }),
  ],
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "What is the weather in SF?" }],
  },
  {
    context: {
      userName: "John Smith",
    },
  }
);
```

### beforeModel 与 afterModel 钩子

在模型调用前对消息历史做裁剪（`beforeModel`）：

```ts
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware, trimMessages } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

const trimMessageHistory = createMiddleware({
  name: "TrimMessages",
  beforeModel: async (state) => {
    const trimmed = await trimMessages(state.messages, {
      maxTokens: 384,
      strategy: "last",
      startOn: "human",
      endOn: ["human", "tool"],
      tokenCounter: (msgs) => msgs.length,
    });
    return {
      messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), ...trimmed],
    };
  },
});

const checkpointer = new MemorySaver();
const agent = createAgent({
  model: "gpt-5-nano",
  tools: [],
  middleware: [trimMessageHistory],
  checkpointer,
});
```

在模型调用后对响应做校验（`afterModel`），例如检测并移除包含敏感词的回复：

```ts
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

const validateResponse = createMiddleware({
  name: "ValidateResponse",
  afterModel: (state) => {
    const lastMessage = state.messages.at(-1)?.content;
    if (
      typeof lastMessage === "string" &&
      lastMessage.toLowerCase().includes("confidential")
    ) {
      return {
        messages: [
          new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ],
      };
    }
    return;
  },
});

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [],
  middleware: [validateResponse],
});
```

## 小结

短期记忆是 Agent 的"工作内存"：它通过 checkpointer + thread_id 实现同会话内的上下文保持。面对长对话，你可以选择裁剪、删除或摘要消息来管理上下文窗口。如果需要跨会话记住信息，请继续阅读[长期记忆](/tutorials/LangChain/17.长期记忆)。想了解如何把这些记忆机制融入整体上下文策略，可以回顾[上下文工程](/tutorials/LangChain/15.上下文工程)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/short-term-memory) 翻译并二次创作。
