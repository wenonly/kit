---
title: 添加记忆
categories: LangGraph
order: 15
date: 2026-06-25
tags:
  - LangGraph
  - 记忆
  - 持久化
---

# 添加记忆

> AI 应用需要[记忆](https://docs.langchain.com/oss/javascript/concepts/memory)来在多次交互间共享上下文。LangGraph 提供短期记忆和长期记忆两种机制，让 Agent 能记住对话历史和用户偏好。

在 LangGraph 中，你可以添加两种类型的记忆：

- [短期记忆](#添加短期记忆)：作为 Agent [状态](/tutorials/LangGraph/Pregel 运行时)的一部分，实现多轮对话。
- [长期记忆](#添加长期记忆)：跨会话存储用户特定或应用级别的数据。

## 添加短期记忆

**短期记忆**（线程级[持久化](/tutorials/LangGraph/持久化)）让 Agent 能跟踪多轮对话。添加短期记忆只需在编译图时传入一个 checkpointer：

```typescript
import { MemorySaver, StateGraph } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const builder = new StateGraph(...);
const graph = builder.compile({ checkpointer });

await graph.invoke(
  { messages: [{ role: "user", content: "hi! i am Bob" }] },
  { configurable: { thread_id: "1" } }
);
```

### 生产环境使用

生产环境中，请使用基于数据库的 checkpointer：

::: code-group

```typescript [Postgres]
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);

const builder = new StateGraph(...);
const graph = builder.compile({ checkpointer });
```

```typescript [MongoDB]
import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

const client = new MongoClient("mongodb://user:password@localhost:27017");
const checkpointer = new MongoDBSaver({ client });

const builder = new StateGraph(...);
const graph = builder.compile({ checkpointer });
```
:::

::: details 示例：使用 Postgres checkpointer
```shell
npm install @langchain/langgraph-checkpoint-postgres
```

::: tip
首次使用 Postgres checkpointer 时需要调用 `checkpointer.setup()`。
:::

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

const DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();

const callModel: GraphNode<typeof State> = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");

const graph = builder.compile({ checkpointer });

const config = {
  configurable: {
    thread_id: "1"
  }
};

const stream1 = await graph.streamEvents(
  { messages: [{ role: "user", content: "hi! I'm bob" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of stream1.values) {
  console.log(snapshot);
}

const stream2 = await graph.streamEvents(
  { messages: [{ role: "user", content: "what's my name?" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of stream2.values) {
  console.log(snapshot);
}
```
:::

::: details 示例：使用 MongoDB checkpointer
```shell
npm install @langchain/langgraph-checkpoint-mongodb
```

::: tip
**准备工作**
要使用 `MongoDBSaver`，你需要一个 MongoDB 集群。如果没有，请按照[此指南](https://www.mongodb.com/docs/guides/atlas/cluster/)创建一个。
:::

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

const client = new MongoClient("mongodb://user:password@localhost:27017");
const checkpointer = new MongoDBSaver({ client, dbName: "langgraph" });

const callModel: GraphNode<typeof State> = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");

const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };

const stream1 = await graph.streamEvents(
  { messages: [{ role: "user", content: "hi! I'm bob" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of stream1.values) {
  console.log(snapshot);
}

const stream2 = await graph.streamEvents(
  { messages: [{ role: "user", content: "what's my name?" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of stream2.values) {
  console.log(snapshot);
}
```
:::

### 在子图中使用

如果你的图包含[子图](/tutorials/LangGraph/使用子图)，只需在编译父图时提供 checkpointer。LangGraph 会自动将 checkpointer 传播到子图。

```typescript
import { StateGraph, StateSchema, START, MemorySaver } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({ foo: z.string() });

const subgraphBuilder = new StateGraph(State)
  .addNode("subgraph_node_1", (state) => {
    return { foo: state.foo + "bar" };
  })
  .addEdge(START, "subgraph_node_1");
const subgraph = subgraphBuilder.compile();

const builder = new StateGraph(State)
  .addNode("node_1", subgraph)
  .addEdge(START, "node_1");

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });
```

你也可以配置子图特定的检查点行为。更多关于持久化级别（包括中断支持和有状态续接）请参阅[子图持久化](/tutorials/LangGraph/使用子图)。

```typescript
const subgraphBuilder = new StateGraph(...);
const subgraph = subgraphBuilder.compile({ checkpointer: true });  // [!code highlight]
```

## 添加长期记忆

使用长期记忆来跨对话存储用户特定或应用特定的数据。

```typescript
import { InMemoryStore, StateGraph } from "@langchain/langgraph";

const store = new InMemoryStore();

const builder = new StateGraph(...);
const graph = builder.compile({ store });
```

### 在节点中访问 store

编译图时传入 store 后，LangGraph 会自动把 store 注入到你的节点函数中。推荐的方式是通过 `Runtime` 对象访问 store。

```typescript
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const callModel: GraphNode<typeof State> = async (state, runtime) => {
  const userId = runtime.context?.userId;
  const namespace = [userId, "memories"];

  // 搜索相关记忆
  const memories = await runtime.store?.search(namespace, {
    query: state.messages.at(-1)?.content,
    limit: 3,
  });
  const info = memories?.map((d) => d.value.data).join("\n") || "";

  // ... 在模型调用中使用记忆

  // 存储新记忆
  await runtime.store?.put(namespace, crypto.randomUUID(), { data: "User prefers dark mode" });
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");
const graph = builder.compile({ store });

// 调用时传入 context
await graph.invoke(
  { messages: [{ role: "user", content: "hi" }] },
  { configurable: { thread_id: "1" }, context: { userId: "1" } }
);
```

### 生产环境使用

生产环境中，请使用基于数据库的 store：

::: code-group

```typescript [Postgres]
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

const DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const store = PostgresStore.fromConnString(DB_URI);

const builder = new StateGraph(...);
const graph = builder.compile({ store });
```

```typescript [MongoDB]
import { MongoDBStore } from "@langchain/langgraph-checkpoint-mongodb";

const MONGODB_URI = "mongodb://user:password@localhost:27017";
const store = await MongoDBStore.fromConnString(MONGODB_URI, {
  dbName: "langgraph",
  collectionName: "store",
});

const builder = new StateGraph(...);
const graph = builder.compile({ store });
```
:::

::: details 示例：使用 Postgres store
```shell
npm install @langchain/langgraph-checkpoint-postgres
```

::: tip
首次使用 Postgres store 时需要调用 `store.setup()`。
:::

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

const callModel: GraphNode<typeof State> = async (state, runtime) => {
  const userId = runtime.context?.userId;
  const namespace = ["memories", userId];
  const memories = await runtime.store?.search(namespace, { query: state.messages.at(-1)?.content });
  const info = memories?.map(d => d.value.data).join("\n") || "";
  const systemMsg = `You are a helpful assistant talking to the user. User info: ${info}`;

  // 如果用户让模型记住，就存储新记忆
  const lastMessage = state.messages.at(-1);
  if (lastMessage?.content?.toLowerCase().includes("remember")) {
    const memory = "User name is Bob";
    await runtime.store?.put(namespace, crypto.randomUUID(), { data: memory });
  }

  const response = await model.invoke([
    { role: "system", content: systemMsg },
    ...state.messages
  ]);
  return { messages: [response] };
};

const DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";

const store = PostgresStore.fromConnString(DB_URI);
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await store.setup();
// await checkpointer.setup();

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");

const graph = builder.compile({
  checkpointer,
  store,
});

const stream1 = await graph.streamEvents(
  { messages: [{ role: "user", content: "Hi! Remember: my name is Bob" }] },
  { configurable: { thread_id: "1" }, context: { userId: "1" }, version: "v3" }
);
for await (const snapshot of stream1.values) {
  console.log(snapshot);
}

const stream2 = await graph.streamEvents(
  { messages: [{ role: "user", content: "what is my name?" }] },
  { configurable: { thread_id: "2" }, context: { userId: "1" }, version: "v3" }
);
for await (const snapshot of stream2.values) {
  console.log(snapshot);
}
```
:::

::: details 示例：使用 MongoDB store
```shell
npm install @langchain/langgraph-checkpoint-mongodb
```

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { MemorySaver, StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { MongoDBStore } from "@langchain/langgraph-checkpoint-mongodb";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-sonnet-4-6" });

const callModel: GraphNode<typeof State> = async (state, runtime) => {
  const userId = runtime.context?.userId;
  const namespace = ["memories", userId];
  const memories = await runtime.store?.search(namespace);
  const info = memories?.map(d => d.value.data).join("\n") || "n/a";
  const systemMsg = `You are a helpful assistant talking to the user. User info: ${info}`;

  // 如果用户让模型记住，就存储新记忆
  const lastMessage = state.messages.at(-1);
  if (lastMessage?.content?.toLowerCase().includes("remember")) {
    const memory = "User name is Bob";
    await runtime.store?.put(namespace, crypto.randomUUID(), { data: memory });
  }

  const response = await model.invoke([
    { role: "system", content: systemMsg },
    ...state.messages
  ]);
  return { messages: [response] };
};

const MONGODB_URI = "mongodb://user:password@localhost:27017";

const store = await MongoDBStore.fromConnString(MONGODB_URI, {
  dbName: "langgraph",
  collectionName: "store",
});

const checkpointer = new MemorySaver();

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");

const graph = builder.compile({ checkpointer, store });

const stream1 = await graph.streamEvents(
  { messages: [{ role: "user", content: "Hi! Remember: my name is Bob" }] },
  { configurable: { thread_id: "1" }, context: { userId: "1" }, version: "v3" }
);
for await (const snapshot of stream1.values) {
  console.log(snapshot);
}

const stream2 = await graph.streamEvents(
  { messages: [{ role: "user", content: "what is my name?" }] },
  { configurable: { thread_id: "2" }, context: { userId: "1" }, version: "v3" }
);
for await (const snapshot of stream2.values) {
  console.log(snapshot);
}
```
:::

### 使用语义搜索

在图的记忆 store 中启用语义搜索，让图 Agent 能够按语义相似度搜索 store 中的项目。

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { InMemoryStore } from "@langchain/langgraph";

// 创建启用了语义搜索的 store
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const store = new InMemoryStore({
  index: {
    embeddings,
    dims: 1536,
  },
});

await store.put(["user_123", "memories"], "1", { text: "I love pizza" });
await store.put(["user_123", "memories"], "2", { text: "I am a plumber" });

const items = await store.search(["user_123", "memories"], {
  query: "I'm hungry",
  limit: 1,
});
```

::: tip
`InMemoryStore` 适合开发环境。生产环境请使用持久化 store，如 `PostgresStore`、`MongoDBStore` 或 `RedisStore`。
:::

::: details 带语义搜索的长期记忆
::: code-group

```typescript [InMemoryStore]
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START, InMemoryStore } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatOpenAI({ model: "gpt-5.4-mini" });

// 创建启用了语义搜索的 store
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const store = new InMemoryStore({
  index: {
    embeddings,
    dims: 1536,
  }
});

await store.put(["user_123", "memories"], "1", { text: "I love pizza" });
await store.put(["user_123", "memories"], "2", { text: "I am a plumber" });

const chat: GraphNode<typeof State> = async (state, runtime) => {
  // 根据用户最后一条消息搜索
  const items = await runtime.store.search(
    ["user_123", "memories"],
    { query: state.messages.at(-1)?.content, limit: 2 }
  );
  const memories = items.map(item => item.value.text).join("\n");
  const memoriesText = memories ? `## Memories of user\n${memories}` : "";

  const response = await model.invoke([
    { role: "system", content: `You are a helpful assistant.\n${memoriesText}` },
    ...state.messages,
  ]);

  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("chat", chat)
  .addEdge(START, "chat");
const graph = builder.compile({ store });

const stream = await graph.streamEvents(
  { messages: [{ role: "user", content: "I'm hungry" }] },
  { version: "v3" }
);
for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```

```typescript [MongoDB（手动嵌入）]
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MongoDBStore } from "@langchain/langgraph-checkpoint-mongodb";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatOpenAI({ model: "gpt-5.4-mini" });

// 创建启用了语义搜索的 store
const MONGODB_URI = "mongodb://user:password@localhost:27017";
const store = await MongoDBStore.fromConnString(MONGODB_URI, {
  dbName: "langgraph",
  collectionName: "store",
  embeddings: new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
  indexConfig: {
    name: "store_vector_index",
    dims: 1536,
    embeddingKey: "text",
  },
});

await store.put(["user_123", "memories"], "1", { text: "I love pizza" });
await store.put(["user_123", "memories"], "2", { text: "I am a plumber" });

const chat: GraphNode<typeof State> = async (state, runtime) => {
  // 根据用户最后一条消息搜索
  const items = await runtime.store.search(
    ["user_123", "memories"],
    { query: state.messages.at(-1)?.content, limit: 2 }
  );
  const memories = items.map(item => item.value.text).join("\n");
  const memoriesText = memories ? `## Memories of user\n${memories}` : "";

  const response = await model.invoke([
    { role: "system", content: `You are a helpful assistant.\n${memoriesText}` },
    ...state.messages,
  ]);

  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("chat", chat)
  .addEdge(START, "chat");
const graph = builder.compile({ store });

const stream = await graph.streamEvents(
  { messages: [{ role: "user", content: "I'm hungry" }] },
  { version: "v3" }
);
for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```

```typescript [MongoDB（自动嵌入）]
// 自动嵌入需要 MongoDB Atlas。MongoDB 通过 Voyage AI 在服务端生成嵌入。
// 详见 https://www.mongodb.com/docs/atlas/atlas-vector-search/automated-embedding/

import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { MongoDBStore } from "@langchain/langgraph-checkpoint-mongodb";
import { ChatOpenAI } from "@langchain/openai";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatOpenAI({ model: "gpt-5.4-mini" });

// 自动嵌入：不需要 embeddings 实例
// 配置 Voyage AI 模型和 MongoDB 服务端读取的字段路径
const MONGODB_URI = "mongodb://user:password@localhost:27017";
const store = await MongoDBStore.fromConnString(MONGODB_URI, {
  dbName: "langgraph",
  collectionName: "store",
  indexConfig: {
    name: "store_vector_index",
    path: "value.content",  // MongoDB 读取该字段并在服务端嵌入
    model: "voyage-4",      // MongoDB Atlas 使用的 Voyage AI 模型
  },
});

// 值必须有与配置路径（value.content）匹配的 content 字段
await store.put(["user_123", "memories"], "1", { content: "I love pizza" });
await store.put(["user_123", "memories"], "2", { content: "I am a plumber" });

const chat: GraphNode<typeof State> = async (state, runtime) => {
  // MongoDB 在服务端生成查询嵌入
  const items = await runtime.store.search(
    ["user_123", "memories"],
    { query: state.messages.at(-1)?.content, limit: 2 }
  );
  const memories = items.map(item => item.value.content).join("\n");
  const memoriesText = memories ? `## Memories of user\n${memories}` : "";

  const response = await model.invoke([
    { role: "system", content: `You are a helpful assistant.\n${memoriesText}` },
    ...state.messages,
  ]);

  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("chat", chat)
  .addEdge(START, "chat");
const graph = builder.compile({ store });

const stream = await graph.streamEvents(
  { messages: [{ role: "user", content: "I'm hungry" }] },
  { version: "v3" }
);
for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```
:::

## 管理短期记忆

启用了[短期记忆](#添加短期记忆)后，长对话可能会超出 LLM 的上下文窗口。常见的解决方案有：

- [裁剪消息](#裁剪消息)：在调用 LLM 前移除最前或最后的 N 条消息。
- [删除消息](#删除消息)：从 LangGraph 状态中永久删除消息。
- [摘要化消息](#摘要化消息)：将较早的消息历史摘要化并用摘要替代。
- [管理检查点](#管理检查点)：存储和检索消息历史。
- 自定义策略（如消息过滤等）。

这样 Agent 就能在不超出 LLM 上下文窗口的情况下跟踪对话。

### 裁剪消息

大多数 LLM 都有最大支持的上下文窗口（以 token 计量）。决定何时截断消息的一种方法是计算消息历史中的 token 数量，并在接近限制时截断。如果你使用 LangChain，可以使用 trim messages 工具并指定要保留的 token 数量以及处理边界的 `strategy`（如保留最后 `maxTokens` 条）。

使用 [`trimMessages`](https://js.langchain.com/docs/how_to/trim_messages/) 函数裁剪消息历史：

```typescript
import { trimMessages } from "@langchain/core/messages";
import { StateSchema, MessagesValue, GraphNode } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const callModel: GraphNode<typeof State> = async (state) => {
  const messages = trimMessages(state.messages, {
    strategy: "last",
    maxTokens: 128,
    startOn: "human",
    endOn: ["human", "tool"],
  });
  const response = await model.invoke(messages);
  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel);
  // ...
```

::: details 完整示例：裁剪消息
```typescript
import { trimMessages } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START, MemorySaver } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" });

const callModel: GraphNode<typeof State> = async (state) => {
  const messages = trimMessages(state.messages, {
    strategy: "last",
    maxTokens: 128,
    startOn: "human",
    endOn: ["human", "tool"],
    tokenCounter: model,
  });
  const response = await model.invoke(messages);
  return { messages: [response] };
};

const checkpointer = new MemorySaver();
const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");
const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };
await graph.invoke({ messages: [{ role: "user", content: "hi, my name is bob" }] }, config);
await graph.invoke({ messages: [{ role: "user", content: "write a short poem about cats" }] }, config);
await graph.invoke({ messages: [{ role: "user", content: "now do the same but for dogs" }] }, config);
const finalResponse = await graph.invoke({ messages: [{ role: "user", content: "what's my name?" }] }, config);

console.log(finalResponse.messages.at(-1)?.content);
```

输出：
```
Your name is Bob, as you mentioned when you first introduced yourself.
```
:::

### 删除消息

你可以从图状态中删除消息来管理消息历史。当你想移除特定消息或清空整个消息历史时很有用。

要从图状态中删除消息，可以使用 `RemoveMessage`。要让 `RemoveMessage` 生效，你需要使用带 [`messagesStateReducer`](https://reference.langchain.com/javascript/langchain-langgraph/index/messagesStateReducer) [reducer](/tutorials/LangGraph/Pregel 运行时) 的状态键，如 `MessagesValue`。

移除特定消息：

```typescript
import { RemoveMessage } from "@langchain/core/messages";

const deleteMessages = (state) => {
  const messages = state.messages;
  if (messages.length > 2) {
    // 移除最早的两天消息
    return {
      messages: messages
        .slice(0, 2)
        .map((m) => new RemoveMessage({ id: m.id })),
    };
  }
};
```

::: warning
删除消息时，**务必确保**结果消息历史是有效的。请检查你使用的 LLM 提供商的限制。例如：

- 一些提供商期望消息历史以 `user` 消息开头
- 大多数提供商要求带工具调用的 `assistant` 消息后跟对应的 `tool` 结果消息
:::

::: details 完整示例：删除消息
```typescript
import { RemoveMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START, MemorySaver } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" });

const deleteMessages: GraphNode<typeof State> = (state) => {
  const messages = state.messages;
  if (messages.length > 2) {
    // 移除最早的两天消息
    return { messages: messages.slice(0, 2).map(m => new RemoveMessage({ id: m.id })) };
  }
  return {};
};

const callModel: GraphNode<typeof State> = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addNode("delete_messages", deleteMessages)
  .addEdge(START, "call_model")
  .addEdge("call_model", "delete_messages");

const checkpointer = new MemorySaver();
const app = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };

const stream1 = await app.streamEvents(
  { messages: [{ role: "user", content: "hi! I'm bob" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of stream1.values) {
  console.log(snapshot.messages.map(message => [message.getType(), message.content]));
}

const stream2 = await app.streamEvents(
  { messages: [{ role: "user", content: "what's my name?" }] },
  { ...config, version: "v3" }
);
for await (const snapshot of stream2.values) {
  console.log(snapshot.messages.map(message => [message.getType(), message.content]));
}
```

输出：
```
[['human', "hi! I'm bob"]]
[['human', "hi! I'm bob"], ['ai', 'Hi Bob! How are you doing today? Is there anything I can help you with?']]
[['human', "hi! I'm bob"], ['ai', 'Hi Bob! How are you doing today? Is there anything I can help you with?'], ['human', "what's my name?"]]
[['human', "hi! I'm bob"], ['ai', 'Hi Bob! How are you doing today? Is there anything I can help you with?'], ['human', "what's my name?"], ['ai', 'Your name is Bob.']]
[['human', "what's my name?"], ['ai', 'Your name is Bob.']]
```
:::

### 摘要化消息

如上所示，裁剪或删除消息的问题在于，消息队列缩减时可能丢失信息。因此，有些应用更适合采用更复杂的方案——用聊天模型对消息历史进行摘要。

使用提示词和编排逻辑来摘要消息历史。例如，在 LangGraph 中你可以在 `messages` 键旁边加一个 `summary` 键：

```typescript
import { StateSchema, MessagesValue, GraphNode } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  messages: MessagesValue,
  summary: z.string().optional(),
});
```

然后，你可以生成聊天历史的摘要，使用已有的摘要作为下一次摘要的上下文。这个 `summarizeConversation` 节点可以在 `messages` 状态键中累积了一定数量消息后被调用。

```typescript
import { RemoveMessage, HumanMessage } from "@langchain/core/messages";

const summarizeConversation: GraphNode<typeof State> = async (state) => {
  // 首先获取已有摘要
  const summary = state.summary || "";

  // 创建摘要提示词
  let summaryMessage: string;
  if (summary) {
    // 已存在摘要
    summaryMessage =
      `This is a summary of the conversation to date: ${summary}\n\n` +
      "Extend the summary by taking into account the new messages above:";
  } else {
    summaryMessage = "Create a summary of the conversation above:";
  }

  // 把提示词加入历史
  const messages = [
    ...state.messages,
    new HumanMessage({ content: summaryMessage })
  ];
  const response = await model.invoke(messages);

  // 删除除最近 2 条以外的所有消息
  const deleteMessages = state.messages
    .slice(0, -2)
    .map(m => new RemoveMessage({ id: m.id }));

  return {
    summary: response.content,
    messages: deleteMessages
  };
};
```

::: details 完整示例：摘要化消息
```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import {
  SystemMessage,
  HumanMessage,
  RemoveMessage,
} from "@langchain/core/messages";
import {
  StateGraph,
  StateSchema,
  MessagesValue,
  GraphNode,
  ConditionalEdgeRouter,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import * as z from "zod";

const memory = new MemorySaver();

// 添加 summary 属性（除了 messages 键）
const GraphState = new StateSchema({
  messages: MessagesValue,
  summary: z.string().default(""),
});

// 对话和摘要都使用同一个模型
const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

// 定义调用模型的逻辑
const callModel: GraphNode<typeof GraphState> = async (state) => {
  // 如果存在摘要，作为系统消息加入
  const { summary } = state;
  let { messages } = state;
  if (summary) {
    const systemMessage = new SystemMessage({
      id: crypto.randomUUID(),
      content: `Summary of conversation earlier: ${summary}`,
    });
    messages = [systemMessage, ...messages];
  }
  const response = await model.invoke(messages);
  // 返回对象，会被添加到现有状态
  return { messages: [response] };
};

// 定义判断是否结束或摘要对话的逻辑
const shouldContinue: ConditionalEdgeRouter<typeof GraphState, "summarize_conversation"> = (state) => {
  const messages = state.messages;
  // 如果超过 6 条消息，就摘要对话
  if (messages.length > 6) {
    return "summarize_conversation";
  }
  // 否则直接结束
  return END;
};

const summarizeConversation: GraphNode<typeof GraphState> = async (state) => {
  // 首先摘要对话
  const { summary, messages } = state;
  let summaryMessage: string;
  if (summary) {
    // 如果已存在摘要，使用不同的系统提示词
    summaryMessage =
      `This is summary of the conversation to date: ${summary}\n\n` +
      "Extend the summary by taking into account the new messages above:";
  } else {
    summaryMessage = "Create a summary of the conversation above:";
  }

  const allMessages = [
    ...messages,
    new HumanMessage({ id: crypto.randomUUID(), content: summaryMessage }),
  ];

  const response = await model.invoke(allMessages);

  // 删除不再需要展示的消息
  // 这里删除除最后两条以外的所有消息，你可以自行调整
  const deleteMessages = messages
    .slice(0, -2)
    .map((m) => new RemoveMessage({ id: m.id! }));

  if (typeof response.content !== "string") {
    throw new Error("Expected a string response from the model");
  }

  return { summary: response.content, messages: deleteMessages };
};

// 定义新图
const workflow = new StateGraph(GraphState)
  // 定义对话节点和摘要节点
  .addNode("conversation", callModel)
  .addNode("summarize_conversation", summarizeConversation)
  // 设置入口为 conversation
  .addEdge(START, "conversation")
  // 添加条件边
  .addConditionalEdges(
    // 首先定义起始节点，使用 conversation
    // 这意味着这些边在 conversation 节点被调用后执行
    "conversation",
    // 传入决定下一个调用哪个节点的函数
    shouldContinue,
  )
  // 从 summarize_conversation 到 END 添加普通边
  // 这意味着 summarize_conversation 被调用后结束
  .addEdge("summarize_conversation", END);

// 最后编译
const app = workflow.compile({ checkpointer: memory });
```
:::

### 管理检查点

你可以查看和删除 checkpointer 存储的信息。

#### 查看线程状态

```typescript
const config = {
  configurable: {
    thread_id: "1",
    // 可选：提供特定检查点的 ID
    // 否则显示最新的检查点
    // checkpoint_id: "1f029ca3-1f5b-6704-8004-820c16b69a5a"
  },
};
await graph.getState(config);
```

```
{
  values: { messages: [HumanMessage(...), AIMessage(...), HumanMessage(...), AIMessage(...)] },
  next: [],
  config: { configurable: { thread_id: '1', checkpoint_ns: '', checkpoint_id: '1f029ca3-1f5b-6704-8004-820c16b69a5a' } },
  metadata: {
    source: 'loop',
    writes: { call_model: { messages: AIMessage(...) } },
    step: 4,
    parents: {},
    thread_id: '1'
  },
  createdAt: '2025-05-05T16:01:24.680462+00:00',
  parentConfig: { configurable: { thread_id: '1', checkpoint_ns: '', checkpoint_id: '1f029ca3-1790-6b0a-8003-baf965b6a38f' } },
  tasks: [],
  interrupts: []
}
```

#### 查看线程历史

```typescript
const config = {
  configurable: {
    thread_id: "1",
  },
};

const history = [];
for await (const state of graph.getStateHistory(config)) {
  history.push(state);
}
```

#### 删除线程的所有检查点

```typescript
const threadId = "1";
await checkpointer.deleteThread(threadId);
```

## 数据库管理

如果你使用任何基于数据库的持久化实现（如 Postgres、Redis 或 Oracle）来存储短期和/或长期记忆，你需要运行数据库迁移来设置所需的 schema，然后才能使用。

按照惯例，大多数数据库特定的库会在 checkpointer 或 store 实例上定义一个 `setup()` 方法来运行所需的迁移。但你应该查阅具体的 [`BaseCheckpointSaver`](https://reference.langchain.com/javascript/langchain-langgraph/index/BaseCheckpointSaver) 或 [`BaseStore`](https://reference.langchain.com/javascript/langchain-core/stores/BaseStore) 实现以确认准确的方法名和用法。

我们建议将迁移作为专门的部署步骤运行，或者确保它们作为服务器启动的一部分运行。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/add-memory) 翻译并二次创作。
