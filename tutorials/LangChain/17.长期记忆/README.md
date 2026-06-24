---
title: 长期记忆
categories: LangChain
order: 17
date: 2026-06-24
tags:
  - LangChain
  - Memory
---

# 长期记忆

> 让 Agent 跨越会话边界，在不同对话和 session 之间记住和召回信息。

长期记忆让你的 Agent 能够跨不同对话和 session 存储与召回信息。与短期记忆（限定在单个 thread 内）不同，长期记忆可以跨 thread 持久存在，并在任何时候被召回。

LangChain 的长期记忆构建在 LangGraph store 之上。Store 以 JSON 文档的形式保存数据，通过 namespace（命名空间）和 key（键）来组织。

## 基本用法

要给 Agent 加上长期记忆，创建一个 store 并传给 `createAgent`：

**使用 InMemoryStore**（内存存储，适合开发调试）：

```ts
import { createAgent } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";

// InMemoryStore saves data to an in-memory dictionary. Use a DB-backed store in production use.
const store = new InMemoryStore();

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [],
  store,
});
```

**使用 PostgreSQL store**（生产环境推荐）：

```bash
npm install @langchain/langgraph-checkpoint-postgres
```

```ts
import { createAgent } from "langchain";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

const DB_URI =
  process.env.POSTGRES_URI ??
  "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const store = PostgresStore.fromConnString(DB_URI);
await store.setup();

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [],
  store,
});
```

配置好 store 后，工具就可以通过 `runtime.store` 参数读写 store 了。

> 想深入了解记忆类型（semantic / episodic / procedural）和记忆写入策略，请参阅 Memory 概念指南。

## 记忆存储结构

LangGraph 把长期记忆以 JSON 文档的形式保存在 store 中。每条记忆由自定义 `namespace`（类似文件夹）和独立 `key`（类似文件名）组织。Namespace 通常包含用户 ID、组织 ID 等标签，方便信息分层组织。

这种结构支持记忆的层级化管理，跨 namespace 的搜索则通过内容过滤来实现。

> 代码要点：下面展示了 `store.put` 写入、`store.get` 按 key 读取、`store.search` 在 namespace 内按内容过滤 + 向量相似度排序搜索的基本用法。

**InMemoryStore 示例**：

```ts
import { InMemoryStore } from "@langchain/langgraph";

const embed = (texts: string[]): number[][] => {
  // Replace with an actual embedding function or LangChain embeddings object
  return texts.map(() => [1.0, 2.0]);
};

// InMemoryStore saves data to an in-memory dictionary. Use a DB-backed store in production use.
const store = new InMemoryStore({ index: { embed, dims: 2 } });
const userId = "my-user";
const applicationContext = "chitchat";
const namespace = [userId, applicationContext];

await store.put(namespace, "a-memory", {
  rules: [
    "User likes short, direct language",
    "User only speaks English & TypeScript",
  ],
  "my-key": "my-value",
});

// get the "memory" by ID
const item = await store.get(namespace, "a-memory");

// search for "memories" within this namespace, filtering on content equivalence, sorted by vector similarity
const items = await store.search(namespace, {
  filter: { "my-key": "my-value" },
  query: "language preferences",
});
```

**PostgreSQL store 示例**：

```ts
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

const embed = (texts: string[]): number[][] => {
  return texts.map(() => [1.0, 2.0]);
};

const DB_URI =
  process.env.POSTGRES_URI ??
  "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const store = PostgresStore.fromConnString(DB_URI, {
  index: { embed, dims: 2 },
});
await store.setup();

const userId = "my-user";
const applicationContext = "chitchat";
const namespace = [userId, applicationContext];

await store.put(namespace, "a-memory", {
  rules: [
    "User likes short, direct language",
    "User only speaks English & TypeScript",
  ],
  "my-key": "my-value",
});

const item = await store.get(namespace, "a-memory");
const items = await store.search(namespace, {
  filter: { "my-key": "my-value" },
  query: "language preferences",
});
```

## 在工具中读取长期记忆

工具可以通过 `runtime.store` 读取 store 中的数据。

> 代码要点：先用 `store.put` 写入示例用户数据，然后定义 `getUserInfo` 工具通过 `runtime.store.get(["users"], userId)` 读取，最后运行 Agent 验证输出。

```ts
import * as z from "zod";
import { createAgent, tool, type ToolRuntime } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";

// InMemoryStore saves data to an in-memory dictionary. Use a DB-backed store in production.
const store = new InMemoryStore();
const contextSchema = z.object({
  userId: z.string(),
});

// Write sample data to the store using the put method
await store.put(
  ["users"], // Namespace to group related data together (users namespace for user data)
  "user_123", // Key within the namespace (user ID as key)
  {
    name: "John Smith",
    language: "English",
  }, // Data to store for the given user
);

const getUserInfo = tool(
  // Look up user info.
  async (_, runtime: ToolRuntime<unknown, z.infer<typeof contextSchema>>) => {
    // Access the store - same as that provided to `createAgent`
    const userId = runtime.context.userId;
    if (!userId) {
      throw new Error("userId is required");
    }
    // Retrieve data from store - returns StoreValue object with value and metadata
    const userInfo = await runtime.store.get(["users"], userId);
    return userInfo?.value ? JSON.stringify(userInfo.value) : "Unknown user";
  },
  {
    name: "getUserInfo",
    description: "Look up user info by userId from the store.",
    schema: z.object({}),
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [getUserInfo],
  contextSchema,
  // Pass store to agent - enables agent to access store when running tools
  store,
});

// Run the agent
const result = await agent.invoke(
  { messages: [{ role: "user", content: "look up user information" }] },
  { context: { userId: "user_123" } },
);

console.log(result.messages.at(-1)?.content);

/**
 * Outputs:
 * User Information:
 * - **Name:** John Smith
 * - **Language:** English
 */
```

## 在工具中写入长期记忆

工具也可以向 store 写入数据，从而实现跨会话的信息持久化。

> 代码要点：`saveUserInfo` 工具从 LLM 提取的用户信息中拿到 name，通过 `runtime.store.put(["users"], userId, userInfo)` 持久化。运行后直接访问 store 验证写入成功。

```ts
import * as z from "zod";
import { tool, createAgent, type ToolRuntime } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";

// InMemoryStore saves data to an in-memory dictionary. Use a DB-backed store in production.
const store = new InMemoryStore();

const contextSchema = z.object({
  userId: z.string(),
});

// Schema defines the structure of user information for the LLM
const UserInfo = z.object({
  name: z.string(),
});

// Tool that allows agent to update user information (useful for chat applications)
const saveUserInfo = tool(
  async (
    userInfo: z.infer<typeof UserInfo>,
    runtime: ToolRuntime<unknown, z.infer<typeof contextSchema>>,
  ) => {
    const userId = runtime.context.userId;
    if (!userId) {
      throw new Error("userId is required");
    }
    // Store data in the store (namespace, key, data)
    await runtime.store.put(["users"], userId, userInfo);
    return "Successfully saved user info.";
  },
  {
    name: "save_user_info",
    description: "Save user info",
    schema: UserInfo,
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [saveUserInfo],
  contextSchema,
  store,
});

// Run the agent
await agent.invoke(
  { messages: [{ role: "user", content: "My name is John Smith" }] },
  // userId passed in context to identify whose information is being updated
  { context: { userId: "user_123" } },
);

// You can access the store directly to get the value
const result = await store.get(["users"], "user_123");
console.log(result?.value); // Output: { name: "John Smith" }
```

PostgreSQL 版本的读写逻辑完全一致，只是把 `InMemoryStore` 换成 `PostgresStore`：

```ts
import * as z from "zod";
import { tool, createAgent, type ToolRuntime } from "langchain";
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

const DB_URI =
  process.env.POSTGRES_URI ??
  "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable";
const store = PostgresStore.fromConnString(DB_URI);
await store.setup();

const contextSchema = z.object({ userId: z.string() });

const UserInfo = z.object({ name: z.string() });

const saveUserInfo = tool(
  async (
    userInfo: z.infer<typeof UserInfo>,
    runtime: ToolRuntime<unknown, z.infer<typeof contextSchema>>,
  ) => {
    const userId = runtime.context.userId;
    if (!userId) throw new Error("userId is required");
    await runtime.store.put(["users"], userId, userInfo);
    return "Successfully saved user info.";
  },
  { name: "save_user_info", description: "Save user info", schema: UserInfo },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [saveUserInfo],
  contextSchema,
  store,
});

await agent.invoke(
  { messages: [{ role: "user", content: "My name is John Smith" }] },
  { context: { userId: "user_123" } },
);

const result = await store.get(["users"], "user_123");
console.log(result?.value);
```

## 小结

长期记忆是 Agent 的"硬盘"：它通过 store + namespace + key 实现跨会话的信息持久化。开发时用 `InMemoryStore`，生产环境切到 `PostgresStore` 或其他数据库后端。工具通过 `runtime.store` 无缝读写，无需改变业务逻辑。

短期记忆解决"这次对话记得住"的问题，长期记忆解决"下次对话还记得"的问题。两者结合，再配合[上下文工程](/tutorials/LangChain/15.上下文工程)中的中间件机制，就构成了 Agent 完整的记忆体系。如需回顾短期记忆，请参阅[短期记忆](/tutorials/LangChain/16.短期记忆)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/long-term-memory) 翻译并二次创作。
