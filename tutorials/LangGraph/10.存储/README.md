---
title: 存储
categories: LangGraph
order: 10
date: 2026-06-25
tags:
  - LangGraph
  - 存储
  - 长期记忆
---

# 存储

> LangGraph 的 Store 提供跨线程的长期记忆能力，与按线程保存状态的 checkpointer 形成互补。

Store 让 Agent 能够跨线程持久化信息，包括用户偏好、积累的知识和需要在单次对话之外留存的事实。与[检查点](/tutorials/LangGraph/检查点)不同——后者保存的是作用域限于单个线程的完整图状态——而 Store 保存的是任意键值对数据，可以从任意线程访问。

![Model of shared state](https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=354526fb48c5eb11b4b2684a2df40d6c)

::: info Agent Server 自动处理存储
当你使用 [Agent Server](https://docs.langchain.com/langsmith/agent-server) 时，无需手动实现或配置 store。API 会在后台自动处理所有存储基础设施。
:::

::: tip 选择合适的存储后端
[InMemoryStore](https://reference.langchain.com/javascript/langchain-core/stores/InMemoryStore) 适合开发和测试环境。生产环境请使用持久化存储，如 `PostgresStore`、`MongoDBStore` 或 `RedisStore`。所有实现都继承自 [BaseStore](https://reference.langchain.com/javascript/langchain-core/stores/BaseStore)，这也是你在节点函数签名中应该使用的类型注解。
:::

## 基本用法

以下代码片段展示了在不使用 LangGraph 的情况下，独立使用 [InMemoryStore](https://reference.langchain.com/javascript/langchain-core/stores/InMemoryStore)：

```typescript
import { MemoryStore } from "@langchain/langgraph";

const memoryStore = new MemoryStore();
```

记忆通过 `tuple`（元组）进行命名空间管理，在下面的例子中就是 `(<user_id>, "memories")`。命名空间可以是任意长度，可以代表任何含义，不一定要与用户相关。

```typescript
const userId = "1";
const namespaceForMemory = [userId, "memories"];
```

使用 `store.put` 方法将记忆保存到 store 的命名空间中。指定上面定义的命名空间，以及记忆的键值对：键是记忆的唯一标识符（`memory_id`），值（一个字典）是记忆本身。

```typescript
const memoryId = crypto.randomUUID();
const memory = { food_preference: "I like pizza" };
await memoryStore.put(namespaceForMemory, memoryId, memory);
```

使用 `store.search` 方法从命名空间读取记忆，它会返回给定用户的记忆列表，数量不超过 `limit` 参数（默认为 `10`）。使用 `InMemoryStore` 时，条目按插入顺序返回，因此最近插入的记忆排在列表最后；其他后端可能有不同的排序方式（参见[列出到命名空间中的条目](#列出到命名空间中的条目)）。

```typescript
const memories = await memoryStore.search(namespaceForMemory);
memories[memories.length - 1];

// {
//   value: { food_preference: 'I like pizza' },
//   key: '07e0caf4-1631-47b7-b15f-65515d4c1843',
//   namespace: ['1', 'memories'],
//   createdAt: '2024-10-02T17:22:31.590602+00:00',
//   updatedAt: '2024-10-02T17:22:31.590605+00:00'
// }
```

返回的记忆对象具有以下属性：

- **`value`**：该记忆的值

- **`key`**：该记忆在当前命名空间中的唯一键

- **`namespace`**：字符串元组，该记忆类型的命名空间

  ::: info
  虽然类型是 `tuple`，但在转换为 JSON 时可能被序列化为列表（例如 `['1', 'memories']`）。
  :::

- **`createdAt`**：该记忆创建时的时间戳

- **`updatedAt`**：该记忆更新时的时间戳

## 列出到命名空间中的条目

调用 `store.search` 时不传 `query` 和 `filter` 参数，会返回该命名空间前缀下存储的条目，数量不超过 `limit`。当你不需要语义排序时，可以用这个方法枚举命名空间中的所有内容。

```typescript
// Return up to 100 items stored under ["alice", "memories"].
const items = await store.search(["alice", "memories"], { limit: 100 });
```

需要注意的三个行为：

- **`namespace_prefix` 是按前缀匹配，不是精确匹配。** `("alice",)` 也会返回 `("alice", "memories")`、`("alice", "preferences")` 等命名空间下的条目。要限制在单一级别，请传入完整的命名空间或在客户端通过 `item.namespace` 过滤返回结果。
- **超过 `limit` 的结果会被静默截断。** 没有溢出信号——请将 `limit` 设置为高于你预期的最大值，或使用 `offset` 进行分页。
- **默认排序取决于 store 后端。** `PostgresStore` 和 `AsyncPostgresStore` 按 `updated_at` 降序返回结果（最近更新的在前）。`InMemoryStore` 按插入顺序返回结果（最近插入的在后）。不要在不同实现间依赖特定排序；如果顺序很重要，请在客户端按 `item.updated_at` 排序。

对大型命名空间进行分页遍历：

```typescript
const pageSize = 50;
let offset = 0;
while (true) {
  const page = await store.search(["alice", "memories"], { limit: pageSize, offset });
  if (page.length === 0) break;
  for (const item of page) {
    // ...
  }
  offset += pageSize;
}
```

要发现存在哪些命名空间（例如在列出所有用户的记忆之前先遍历所有用户），使用 `store.listNamespaces`：

```typescript
// All namespaces that start with ["alice"], truncated to two levels deep.
const namespaces = await store.listNamespaces({ prefix: ["alice"], maxDepth: 2 });
```

## 语义搜索

除了简单的检索之外，Store 还支持语义搜索，让你可以根据含义而不仅是精确匹配来查找记忆。要启用此功能，请为 store 配置一个嵌入模型：

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const store = new InMemoryStore({
  index: {
    embeddings: new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    dims: 1536,
    fields: ["food_preference", "$"], // Fields to embed
  },
});
```

现在搜索时，你可以使用自然语言查询来找到相关记忆：

```typescript
// Find memories about food preferences
// (This can be done after putting memories into the store)
const memories = await store.search(namespaceForMemory, {
  query: "What does the user like to eat?",
  limit: 3, // Return top 3 matches
});
```

你可以通过配置 `fields` 参数或在存储记忆时指定 `index` 参数来控制记忆的哪些部分被嵌入：

```typescript
// Store with specific fields to embed
await store.put(
  namespaceForMemory,
  crypto.randomUUID(),
  {
    food_preference: "I love Italian cuisine",
    context: "Discussing dinner plans",
  },
  { index: ["food_preference"] } // Only embed "food_preferences" field
);

// Store without embedding (still retrievable, but not searchable)
await store.put(
  namespaceForMemory,
  crypto.randomUUID(),
  { system_info: "Last updated: 2024-01-01" },
  { index: false }
);
```

## 在 LangGraph 中使用

`memoryStore` 与 checkpointer 配合工作：如前所述，checkpointer 将状态保存到线程中，而 `memoryStore` 允许你存储可*跨*线程访问的任意信息。按以下方式同时使用 checkpointer 和 `memoryStore` 编译图：

```typescript
import { MemorySaver } from "@langchain/langgraph";

// We need this because we want to enable threads (conversations)
const checkpointer = new MemorySaver();

// ... Define the graph ...

// Compile the graph with the checkpointer and store
const graph = workflow.compile({ checkpointer, store: memoryStore });
```

然后像之前一样使用 `thread_id` 调用图，同时还传入 `user_id`，它作为特定用户记忆的命名空间。

```typescript
// Invoke the graph
const userId = "1";
const config = { configurable: { thread_id: "1" }, context: { userId } };

// First let's just say hi to the AI
for await (const update of await graph.stream(
  { messages: [{ role: "user", content: "hi" }] },
  { ...config, streamMode: "updates" }
)) {
  console.log(update);
}
```

你可以从*任何节点*通过 `runtime` 参数访问 store 和 `userId`。可以用它来保存记忆：

```typescript
import { StateSchema, MessagesValue, Runtime } from "@langchain/langgraph";

const MessagesState = new StateSchema({
  messages: MessagesValue,
});

const updateMemory: GraphNode<typeof MessagesState> = async (state, runtime) => {
  // Get the user id from the config
  const userId = runtime.context?.user_id;
  if (!userId) throw new Error("User ID is required");

  // Namespace the memory
  const namespace = [userId, "memories"];

  // ... Analyze conversation and create a new memory
  const memory = "Some memory content";

  // Create a new memory ID
  const memoryId = crypto.randomUUID();

  // We create a new memory
  await runtime.store?.put(namespace, memoryId, { memory });
};
```

你也可以从任何节点访问 store 并使用 `store.search` 方法获取记忆。记忆以对象列表的形式返回，可以转换为字典。

```typescript
memories[memories.length - 1];
// {
//   value: { food_preference: 'I like pizza' },
//   key: '07e0caf4-1631-47b7-b15f-65515d4c1843',
//   namespace: ['1', 'memories'],
//   createdAt: '2024-10-02T17:22:31.590602+00:00',
//   updatedAt: '2024-10-02T17:22:31.590605+00:00'
// }
```

获取记忆后，你可以在模型调用中使用它们：

```typescript
const callModel: GraphNode<typeof MessagesState> = async (state, runtime) => {
  // Get the user id from the config
  const userId = runtime.context?.user_id;

  // Namespace the memory
  const namespace = [userId, "memories"];

  // Search based on the most recent message
  const memories = await runtime.store?.search(namespace, {
    query: state.messages[state.messages.length - 1].content,
    limit: 3,
  });
  const info = memories.map((d) => d.value.memory).join("\n");

  // ... Use memories in the model call
};
```

如果你创建了一个新线程，只要 `user_id` 相同，你仍然可以访问相同的记忆：

```typescript
// Invoke the graph
const config = { configurable: { thread_id: "2" }, context: { userId: "1" } };

// Let's say hi again
for await (const update of await graph.stream(
  { messages: [{ role: "user", content: "hi, tell me about my memories" }] },
  { ...config, streamMode: "updates" }
)) {
  console.log(update);
}
```

> **跨线程记忆的关键**：同一用户的不同对话线程共享同一命名空间下的记忆。新线程中也能读取到之前线程中保存的偏好和知识。

当你在本地使用 LangSmith（例如在 [Studio](https://docs.langchain.com/langsmith/studio) 中）或使用[托管版本](https://docs.langchain.com/langsmith/platform-setup)时，基础 store 默认可用，无需在图编译时指定。但要启用语义搜索，你**确实**需要在 `langgraph.json` 文件中配置索引设置。例如：

```json
{
    ...
    "store": {
        "index": {
            "embed": "openai:text-embeddings-3-small",
            "dims": 1536,
            "fields": ["$"]
        }
    }
}
```

更多详情和配置选项，请参考[部署指南](https://docs.langchain.com/langsmith/semantic-search)。

### 下一步

- [向 Agent Server 添加自定义 Store](https://docs.langchain.com/langsmith/custom-store) — 部署你自己的实现
- [检查点](/tutorials/LangGraph/检查点) — 线程级别的状态持久化

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/stores) 翻译并二次创作。
