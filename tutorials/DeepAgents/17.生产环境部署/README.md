---
title: 生产环境部署
categories: DeepAgents
order: 17
date: 2026-06-25
tags:
  - DeepAgents
  - 生产
---

# 生产环境部署

> 使用持久化记忆、沙箱、弹性中间件和部署方案，将你的 Deep Agent 推向生产环境

本指南涵盖了将 Deep Agent 从本地原型推进到生产环境部署的各种注意事项。我们将依次讨论记忆范围规划、执行环境配置、防护栏设置，以及前端对接。

## 概览

Agent 从记忆和执行环境中获取信息来完成任务。在生产环境中，有几个核心原语决定了信息的共享和访问方式：

- **Thread（线程）**：一次对话。消息历史和临时文件默认限定在线程范围内，不会跨线程携带。
- **User（用户）**：与你的 Agent 交互的人。记忆和文件可以私有于某个用户，也可以在用户间共享。身份认证和授权由你的[认证层](https://docs.langchain.com/langsmith/auth)提供。
- **Assistant（助手）**：一个配置好的 Agent 实例。记忆和文件可以绑定到某个助手，也可以在所有助手间共享。

本页内容涵盖：

- **[LangSmith Deployments](#langsmith-deployments)**：提供认证、Webhook 和定时任务的托管基础设施
- **[生产环境注意事项](#生产环境注意事项)**：调用方式、多租户、认证、凭据、异步和持久化
- **[记忆](#记忆)**：跨对话持久化信息
- **[执行环境](#执行环境)**：文件存储和代码执行
- **[防护栏](#防护栏)**：速率限制、错误处理和数据隐私
- **[前端](#前端)**：将你的 UI 连接到已部署的 Agent

## LangSmith Deployments

![Managed Deep Agents packages your agent configuration, tools, and runtime settings for LangSmith](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/deepagents-deploy-config.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=5c3f2961994afe5fe67a2f5c9e9ba7ac)

将 Deep Agent 推向生产环境的推荐路径是 [Managed Deep Agents](https://docs.langchain.com/langsmith/managed-deep-agents-overview)——一个 API 优先的托管运行时，用于在 LangSmith 中创建、运行和运维 Deep Agent。Managed Deep Agents 目前处于私有预览阶段（[加入等待列表](https://www.langchain.com/langsmith-managed-deep-agents-waitlist)）。对于需要自定义应用代码、自定义路由、高级认证或完整 Agent Server API 的团队，可以直接配置 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment)。无论哪种路径，都会为你提供 Agent 所需的基础设施：[线程](https://docs.langchain.com/langsmith/use-threads)、[运行](https://docs.langchain.com/langsmith/runs)、Store 和 Checkpointer，你不需要自己搭建。传统的 LangSmith Deployment 还提供开箱即用的[认证](https://docs.langchain.com/langsmith/auth)、[Webhook](https://docs.langchain.com/langsmith/use-webhooks)、[定时任务](https://docs.langchain.com/langsmith/cron-jobs)和[可观测性](https://docs.langchain.com/langsmith/observability)，并可以通过 [MCP](https://docs.langchain.com/langsmith/server-mcp) 或 [A2A](https://docs.langchain.com/langsmith/server-a2a) 暴露你的 Agent。

::: tip 提示
LangSmith Cloud 部署会自动将追踪数据发送到以你部署名称命名的一个项目中。打开 [LangSmith](https://smith.langchain.com?utm_source=docs\&utm_medium=cta\&utm_campaign=langsmith-signup\&utm_content=oss-deepagents-going-to-production) 来调试运行和监控用量。对于混合或自托管部署，请参阅 [LangSmith tracing](https://docs.langchain.com/langsmith/data-plane#langsmith-tracing)。我们还建议你设置 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会监控你的追踪数据、检测问题并提出修复建议。
:::

除非另有说明，本页所有代码片段都使用以下 `langgraph.json` 配置：

```json langgraph.json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:agent"
  },
  "env": ".env"
}
```

`langgraph.json` 是告诉 LangGraph 平台如何构建和运行你的应用的配置文件。它位于项目根目录，本地开发（使用 `langgraph dev`）和生产部署都需要它。关键字段如下：

| 字段 | 说明 |
| --- | --- |
| `dependencies` | 要安装的包。`["."]` 会将当前目录作为包安装（从 `requirements.txt`、`pyproject.toml` 或 `package.json` 读取）。 |
| `graphs` | 将图 ID 映射到其代码位置。每个条目的格式为 `"<id>": "./<file>:<variable>"`，其中 `<id>` 是你通过 API 调用图时使用的名称，`<variable>` 是从 `<file>` 导出的已编译图或构造函数。 |
| `env` | `.env` 文件的路径，包含环境变量（API 密钥、密钥）。这些变量在构建时设置，在运行时可用。 |

完整的配置选项（自定义 Docker 步骤、Store 索引、认证处理器等），请参阅[应用结构](https://docs.langchain.com/oss/javascript/langgraph/application-structure)。

## 生产环境注意事项

### 调用 Agent

在生产环境中，每次调用都应该携带两个运行级别参数：

- **`thread_id`**（通过 `config={"configurable": {"thread_id": ...}}` 传递）：对话的稳定标识符。[Checkpointer](#持久化) 用它来持久化和恢复消息历史，所以后续轮次会继续同一次对话。生成一个新的 `thread_id` 即可开始新对话。
- **`context`**：每次运行的数据，供你的工具和中间件在调用时读取，例如 `user_id`、API 密钥、功能开关或会话元数据。通过 `context_schema` 定义其结构，并通过 `runtime.context` 访问。参见[运行时上下文](/tutorials/DeepAgents/上下文工程)。

这两个参数是独立的，几乎总是同时传递：

::: code-group

```ts [Google]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

```ts [OpenAI]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

```ts [Anthropic]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

```ts [OpenRouter]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

```ts [Fireworks]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

```ts [Baseten]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

```ts [Ollama]
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const contextSchema = z.object({ userId: z.string() });

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  contextSchema,
});

// Start a conversation
const config = { configurable: { thread_id: crypto.randomUUID() } };
await agent.invoke(
  { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
  { ...config, context: { userId: "user-123" } },
);

// Follow-up on the same conversation: reuse the same thread_id
await agent.invoke(
  { messages: [{ role: "user", content: "Make it 5 days instead" }] },
  { ...config, context: { userId: "user-123" } },
);
```

:::

使用 LangGraph SDK 部署时，SDK 会为你管理线程，你需要将返回的 `thread_id` 传递给每次运行：

```typescript
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "<DEPLOYMENT_URL>", apiKey: "<LANGSMITH_API_KEY>" });

const thread = await client.threads.create();
for await (const chunk of client.runs.stream(
  thread.thread_id,  // [!code highlight]
  "agent",
  {
    input: { messages: [{ role: "user", content: "Plan a 3-day trip to Tokyo" }] },
    context: { userId: "user-123" },  // [!code highlight]
    streamMode: "updates",
  },
)) {
  console.log(chunk.data);
}
```

::: tip 提示
`thread_id` 限定了*对话*的范围（消息历史、检查点）。`context` 携带了工具和中间件在每次运行中读取的*逐次运行*数据。它们是独立的：改变一个不会影响另一个，你可以传递其中一个或两个都传。
:::

### 多租户

当你的 Agent 服务多个用户时，需要处理三个问题：验证每个用户是谁、控制他们能访问什么、以及管理 Agent 代表他们执行操作时使用的凭据。

![Three authentication layers compose: end-user auth, agent-acting-as-user auth, and team RBAC](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/auth-layers.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=11137d8bae74093c459416fd3e541d68)

#### 用户身份与访问控制

[LangSmith Deployments](https://docs.langchain.com/langsmith/deployment) 支持[自定义认证](https://docs.langchain.com/langsmith/custom-auth)来确立用户身份，以及[授权处理器](https://docs.langchain.com/langsmith/auth)来控制对线程、助手和 Store 命名空间等资源的访问。授权处理器在认证成功后运行，可以：

- 用所有权元数据标记资源（例如 `owner: user_id`）
- 返回过滤器，让用户只能看到自己的资源
- 对未授权操作返回 HTTP 403 拒绝访问

有关分步教程，请参阅[使对话私有化](https://docs.langchain.com/langsmith/resource-auth)。如需观看操作演示，请看[自定义认证视频](https://www.youtube.com/watch?v=DkNqgCz8cjE)。

你如何[限定记忆范围](#范围划分)和[执行环境](#执行环境)决定了用户之间共享哪些数据。详情参见下文各节。

#### 团队访问控制（RBAC）

LangSmith 的[基于角色的访问控制](https://docs.langchain.com/langsmith/rbac)管理团队中谁可以部署、配置和监控 Agent。这与上文的终端用户授权是分开的。

| 角色 | 权限 |
| --- | --- |
| Workspace Admin | 完整权限，包括设置和成员管理 |
| Workspace Editor | 创建和修改资源，但不能删除运行或管理成员 |
| Workspace Viewer | 只读访问 |

Enterprise 计划提供具有细粒度权限的自定义角色。完整的权限模型请参阅 [RBAC 参考文档](https://docs.langchain.com/langsmith/rbac)。

#### 终端用户凭据

当你的 Agent 需要代表用户调用外部 API（例如读取他们的 GitHub 仓库、发送 Slack 消息、查询他们的数据仓库）时，你需要一种将用户凭据传递给 Agent 的方式，而不是硬编码。

**通过 Agent Auth 进行 OAuth。** [Agent Auth](https://docs.langchain.com/langsmith/agent-auth) 提供托管的 OAuth 2.0 流程。配置一个 OAuth 提供者，Agent 就可以请求限定到每个用户的令牌。首次使用时，Agent 会[中断](https://docs.langchain.com/oss/javascript/langgraph/interrupts)执行并展示一个 OAuth 授权 URL。用户认证后，Agent 会使用有效令牌恢复执行。令牌会自动存储和刷新。

```typescript
import { Client } from "@langchain/auth";

const authClient = new Client();

// Inside your agent's tool:
// Access the authenticated user via runtime.serverInfo
const authResult = await authClient.authenticate({
  provider: "github",
  scopes: ["repo", "read:org"],
  userId: runtime.serverInfo.user.identity,  // [!code highlight]
});
// Use authResult.token for GitHub API calls on the user's behalf
```

**沙箱的凭据注入。** 如果你的 Agent 在[沙箱](#沙箱)内运行调用外部 API 的代码，[沙箱认证代理](https://docs.langchain.com/langsmith/sandbox-auth-proxy)可以自动将凭据注入到出站请求中，这样沙箱代码永远不会接触到原始 API 密钥。设置详情请参见[管理密钥](#管理密钥)。

**工作区密钥。** 对于所有用户共享的 API 密钥（例如你组织的 LLM 提供商密钥、搜索 API 密钥），请将它们存储为 LangSmith 中的[工作区密钥](https://docs.langchain.com/langsmith/set-up-hierarchy#configure-workspace-settings)。详情请参见[管理密钥](#管理密钥)。

### 异步

基于 LLM 的应用是重度 I/O 密集型的：调用语言模型、数据库和外部服务。异步编程让这些操作可以并发执行而非阻塞等待，从而提高吞吐量和响应速度。

::: tip 提示
LangChain 遵循在异步方法名前加 `a` 的约定（例如 `ainvoke`、`abefore_agent`、`astream`）。同步和异步变体位于同一个类或命名空间中。
:::

为生产环境构建时应注意：

- **创建异步工具。** LangChain 会在单独的线程中运行同步工具以避免阻塞，但原生异步可以完全避免线程开销。
- **使用异步中间件方法。** 自定义[中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/custom)应该实现异步钩子（例如用 `abefore_agent` 代替 `before_agent`）。
- **对外部资源生命周期使用异步。** 创建[沙箱](#沙箱)或连接 [MCP 服务器](https://docs.langchain.com/oss/javascript/langchain/mcp)涉及网络调用，应该被 await。这就是为什么提供这些资源的[图工厂](https://docs.langchain.com/langsmith/graph-rebuild)是异步的。

### 持久化

Deep Agents 运行在 LangGraph 之上，后者开箱即用地提供持久化执行。[持久化](https://docs.langchain.com/oss/javascript/langgraph/persistence)层在每一步对状态进行检查点（checkpoint），因此因故障、超时或[人机协作](https://docs.langchain.com/oss/javascript/langgraph/interrupts)暂停而中断的运行，可以从最后记录的状态恢复，无需重新处理之前的步骤。对于会生成大量子 Agent 的长时间运行的 Deep Agent，这意味着运行中途的故障不会丢失已完成的工作。

![Durable execution: when a worker crashes mid-run, another worker picks the run up from the latest checkpoint](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/durable-execution.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=d3bfd69460769dba142c68c7a20ae43b)

检查点还支持：

- **无限期[中断](https://docs.langchain.com/oss/javascript/langgraph/interrupts)。** 人机协作工作流可以暂停数分钟或数天，然后从中断处精确恢复。
- **[时间旅行](https://docs.langchain.com/oss/javascript/langgraph/use-time-travel)。** 每个检查点的步骤都是一个可回溯的快照，当出现问题时可以从更早的状态重放。
- **敏感操作的安全处理。** 对于涉及支付或其他不可逆操作的工作流，检查点提供了审计轨迹和恢复点，可以检查导致某个操作的精确状态。

::: tip 提示
[LangSmith Deployments](https://docs.langchain.com/langsmith/deployment) 会自动配置持久化 Checkpointer。如果你是自托管的，请参阅[持久化](https://docs.langchain.com/oss/javascript/langgraph/persistence)获取设置说明。
:::

## 记忆

没有记忆，每次对话都从零开始。记忆让你的 Agent 能够跨对话保留信息（用户偏好、学习到的指令、过往经验），从而随时间推移个性化其行为。有关记忆类型的概述，请参阅[记忆概念指南](https://docs.langchain.com/oss/javascript/concepts/memory)。

![Short-term memory is scoped to a single thread via checkpoints; long-term memory persists across threads via the store](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/memory.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=3ec585271dcd8d62e0207d79d68c296b)

### 范围划分

记忆始终在对话间持久化。主要问题是它如何跨用户和助手边界进行范围划分。正确的范围取决于谁应该看到和修改数据：

| 范围 | 命名空间 | 用途 | 示例 |
| --- | --- | --- | --- |
| **User**（推荐默认值） | `(user_id)` | 每个用户的偏好和上下文 | "我喜欢简洁的回答" |
| **Assistant** | `(assistant_id)` | 某个助手的共享指令 | "帖子最多 280 字符" |
| **Global** | `(org_id)` | 所有用户和助手的只读策略 | "永远不要透露内部定价" |

::: warning
共享记忆（assistant、user 或 organization 范围）是提示注入的攻击面。如果一个用户可以写入另一个用户对话读取的记忆，恶意用户就可能向该共享状态注入指令。在适当的地方强制只读访问。例如，让组织范围的策略只能通过应用代码写入，而不是由 Agent 自己写入。使用[权限](/tutorials/DeepAgents/文件系统权限)声明式地拒绝向共享路径写入，或使用[后端策略钩子](/tutorials/DeepAgents/虚拟文件系统后端)进行自定义验证逻辑。
:::

### 配置

在 Deep Agents 中，记忆以文件形式存储在虚拟文件系统中。默认情况下，文件限定在单个线程（对话）范围内，不跨线程共享。

如果要在跨线程共享记忆，可以将类似 `/memories/` 的路径路由到写入 LangGraph [Store](https://docs.langchain.com/langsmith/custom-store) 的 [StoreBackend](https://reference.langchain.com/javascript/deepagents/backends/StoreBackend)。使用 [CompositeBackend](https://reference.langchain.com/javascript/deepagents/backends/CompositeBackend) 可以同时给 Agent 提供线程范围的临时空间和跨线程的[长期记忆](/tutorials/DeepAgents/记忆)。

::: tip 提示
下面展示的 `rt.serverInfo` 和 `rt.executionInfo` 命名空间模式需要 `deepagents>=1.9.0`。
:::

::: code-group

```typescript [User（推荐）] {src/agent.ts}
import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";

export const agent = createDeepAgent({
  backend: new CompositeBackend(
    new StateBackend(),
    {
      "/memories/": new StoreBackend({
        namespace: (rt) => [
          rt.serverInfo.assistantId,  // [!code highlight]
          rt.serverInfo.user.identity,  // [!code highlight]
        ],
      }),
    },
  ),
  systemPrompt: `You have persistent memory at /memories/.

Read /memories/instructions.txt at the start of each conversation for
accumulated knowledge and preferences. When you learn something that
should persist, update that file.`,
});
```

按 `user_id` 划分命名空间。每个用户拥有自己的私有记忆。这是推荐的默认方式，因为大多数应用部署单个助手。

```typescript [Assistant] {src/agent.ts}
import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";

export const agent = createDeepAgent({
  backend: new CompositeBackend(
    new StateBackend(),
    {
      "/memories/": new StoreBackend({
        namespace: (rt) => [rt.serverInfo.assistantId],  // [!code highlight]
      }),
    },
  ),
});
```

按 `assistant_id` 划分命名空间。记忆在同一助手的所有用户间共享，任何用户都可以读取或更新。适用于适用于使用该助手的所有人的共享指令或知识（例如"始终以正式语气回复"）。

```typescript [User（跨助手）] {src/agent.ts}
import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";

export const agent = createDeepAgent({
  backend: new CompositeBackend(
    new StateBackend(),
    {
      "/memories/": new StoreBackend({
        namespace: (rt) => [rt.serverInfo.user.identity],  // [!code highlight]
      }),
    },
  ),
});
```

仅按 `user_id` 划分命名空间。记忆跟随用户跨所有助手。适用于无论用户与哪个助手对话都应适用的全局用户档案（姓名、时区、沟通偏好）。

```typescript [Organization] {src/agent.ts}
import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";

export const agent = createDeepAgent({
  backend: new CompositeBackend(
    new StateBackend(),
    {
      "/memories/": new StoreBackend({
        namespace: (rt) => [rt.context.orgId],
      }),
    },
  ),
});
```

按 `org_id` 划分命名空间。记忆在所有用户和所有助手间共享。通常用于组织范围的策略（合规规则、品牌指南），对 Agent 应为只读。写入权限应限制为应用代码，以防止提示注入。

:::

你还可以使用 [Store API](https://docs.langchain.com/langsmith/custom-store) 从应用代码读写 Store。示例请参见[高级用法](/tutorials/DeepAgents/记忆)。

完整的命名空间工厂 API，请参见[命名空间工厂](/tutorials/DeepAgents/虚拟文件系统后端)。关于自我改进指令和知识库等记忆模式，请参见[长期记忆](/tutorials/DeepAgents/记忆)。

## 执行环境

在本地，Agent 可以直接读写磁盘文件和运行 Shell 命令。在生产环境中，你需要考虑隔离性和持久性。正确的设置取决于你的 Agent 是否需要执行代码：

- **文件系统后端**：如果你的 Agent 只需要读写文件就足够了。选择一个与你的持久化需求匹配的后端：线程范围的临时空间、跨线程存储，或两者的混合。
- **沙箱**：添加一个带有 `execute` 工具的隔离容器来运行 Shell 命令。如果你的 Agent 需要运行代码、安装包或做任何超越文件 I/O 的操作，请使用沙箱。

### 文件系统

根据需要持久化的内容选择后端：

- [StateBackend](https://reference.langchain.com/javascript/deepagents/backends/StateBackend)（默认）：线程范围的临时空间。文件通过 Checkpointer 在线程内的各轮之间持久化，但不跨线程共享。每一步都会创建检查点，所以避免写入大文件。
- [StoreBackend](https://reference.langchain.com/javascript/deepagents/backends/StoreBackend)：跨对话持久化的跨线程存储。通过[命名空间工厂](/tutorials/DeepAgents/虚拟文件系统后端)限定范围。
- [CompositeBackend](https://reference.langchain.com/javascript/deepagents/backends/CompositeBackend)：混合两者。默认是线程范围的临时空间，对特定路径如 `/memories/` 提供跨线程路由。

完整的后端列表以及如何构建自定义后端，请参见[后端](/tutorials/DeepAgents/虚拟文件系统后端)。

::: warning
`FilesystemBackend` 和 `LocalShellBackend` 直接访问宿主机。不要在已部署的 Agent 中使用它们。
:::

### 沙箱

如果你的 Agent 需要运行代码（不仅仅是读写文件），请使用[沙箱](/tutorials/DeepAgents/沙箱)。沙箱提供了一个文件系统和一个用于运行 Shell 命令的 `execute` 工具，全部在隔离的容器中。这种隔离还保护了你的宿主机：如果 Agent 的代码耗尽内存或崩溃，只有沙箱受到影响，你的服务器继续运行。

#### 生命周期

关键决策是沙箱存活多久。每次对话获得一个全新的沙箱，还是对话共享一个持久的环境？

| 范围 | 沙箱 ID 存储在 | 生命周期 | 示例用例 |
| --- | --- | --- | --- |
| **Thread 范围** | [Thread](https://docs.langchain.com/langsmith/use-threads) 元数据 | 每次对话全新，TTL 到期后清理 | 每次对话都从头开始的数据分析机器人 |
| **Assistant 范围** | [Assistant](https://docs.langchain.com/langsmith/assistants) 配置 | 所有对话共享 | 跨对话维护克隆仓库的编程助手 |

::: tip 提示
下面的示例使用异步[图工厂](https://docs.langchain.com/langsmith/graph-rebuild)而不是静态图，因为沙箱需要 `thread_id` 或 `assistant_id` 来查找或创建正确的沙箱。图工厂不接收完整的 `Runtime`（没有 `server_info` 或 `execution_info`）；而是接收 `RunnableConfig` 并从 `config["configurable"]` 中读取 `thread_id` 和 `assistant_id`。工厂是异步的，因为沙箱创建是一个 I/O 密集型操作，需要在调用时才能获取的逐次运行信息。
:::

::: code-group

```typescript [Thread 范围（最常见）] {src/agent.ts}
import { createDeepAgent, LangSmithSandbox } from "deepagents";
import { SandboxClient } from "langsmith/sandbox";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

const client = new SandboxClient();

export async function agent(config: LangGraphRunnableConfig) {
  const threadId = config.configurable?.thread_id as string;  // [!code highlight]
  const sandboxName = `thread-${threadId}`;
  const existing = (await client.listSandboxes()).filter(
    (sb) => sb.name === sandboxName,
  );
  const lsSandbox =
    existing[0] ??
    (await client.createSandbox({
      name: sandboxName,
      idleTtlSeconds: 3600, // TTL: clean up when idle
    }));
  return createDeepAgent({
    model: "google_genai:gemini-3.5-flash",
    backend: new LangSmithSandbox({ sandbox: lsSandbox }),
  });
}
```

每次对话获得自己的沙箱。[图工厂](https://docs.langchain.com/langsmith/graph-rebuild)从运行配置中读取 `thread_id`，因此每个[线程](https://docs.langchain.com/langsmith/use-threads)自动获得自己的隔离环境。命名沙箱查找处理跨运行的去重。当沙箱 [TTL](https://docs.langchain.com/langsmith/configure-ttl) 到期时清理。

```typescript [Assistant 范围] {src/agent.ts}
import { createDeepAgent, LangSmithSandbox } from "deepagents";
import { SandboxClient } from "langsmith/sandbox";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

const client = new SandboxClient();

export async function agent(config: LangGraphRunnableConfig) {
  const assistantId = config.configurable?.assistant_id as string;  // [!code highlight]
  const sandboxName = `assistant-${assistantId}`;
  const existing = (await client.listSandboxes()).filter(
    (sb) => sb.name === sandboxName,
  );
  const lsSandbox =
    existing[0] ??
    (await client.createSandbox({
      name: sandboxName,
    }));
  return createDeepAgent({
    model: "google_genai:gemini-3.5-flash",
    backend: new LangSmithSandbox({ sandbox: lsSandbox }),
  });
}
```

所有对话共享一个沙箱。[图工厂](https://docs.langchain.com/langsmith/graph-rebuild)从 `config["configurable"]` 中读取[助手](https://docs.langchain.com/langsmith/assistants) ID，因此同一助手上的每个线程都返回到同一个环境。文件、已安装的包和克隆的仓库跨对话持久化。

::: warning
Assistant 范围的沙箱会随时间累积文件、已安装的包和其他沙箱内状态。请向沙箱提供商配置 TTL，使用快照定期重置，或实施清理逻辑，以防止沙箱的磁盘和内存无限增长。
:::

:::

因为 `agent` 变量是一个异步函数（而非已编译的图），服务器将其视为[图工厂](https://docs.langchain.com/langsmith/graph-rebuild)并在每次运行时调用它，注入配置。工厂按名称查找或创建沙箱，并返回连接到该沙箱的全新 Agent 图。

一旦使用 `langgraph deploy` 部署，就可以使用 SDK 从应用代码中调用 Agent。无论范围如何，客户端代码都是相同的。范围划分完全由上面的 Agent 工厂处理，但行为有所不同：

::: code-group

```typescript [Thread 范围] {client.ts}
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "<DEPLOYMENT_URL>", apiKey: "<LANGSMITH_API_KEY>" });

// Conversation 1: install pandas and analyze data
const thread1 = await client.threads.create();
for await (const chunk of client.runs.stream(
  thread1.thread_id,
  "agent",
  { input: { messages: [{ role: "human", content: "Install pandas and analyze sales_data.csv" }] } },
)) {
  console.log(chunk.data);
}

// Follow-up in the same conversation — pandas is still installed
for await (const chunk of client.runs.stream(
  thread1.thread_id,
  "agent",
  { input: { messages: [{ role: "human", content: "Now plot the results" }] } },
)) {
  console.log(chunk.data);
}

// Conversation 2: fresh sandbox — pandas is NOT installed, no files from conversation 1
const thread2 = await client.threads.create();
for await (const chunk of client.runs.stream(
  thread2.thread_id,
  "agent",
  { input: { messages: [{ role: "human", content: "What packages are installed?" }] } },
)) {
  console.log(chunk.data);
}
```

每个线程获得自己的沙箱。同一线程内的后续消息重用同一个沙箱，但新线程总是全新开始，没有之前对话留下的文件或已安装的包。

```typescript [Assistant 范围] {client.ts}
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "<DEPLOYMENT_URL>", apiKey: "<LANGSMITH_API_KEY>" });

// Conversation 1: clone and set up the project
const thread1 = await client.threads.create();
for await (const chunk of client.runs.stream(
  thread1.thread_id,
  "agent",
  { input: { messages: [{ role: "human", content: "Clone https://github.com/org/repo and install dependencies" }] } },
)) {
  console.log(chunk.data);
}

// Conversation 2: repo and dependencies are still there
const thread2 = await client.threads.create();
for await (const chunk of client.runs.stream(
  thread2.thread_id,
  "agent",
  { input: { messages: [{ role: "human", content: "Run the test suite and fix any failures" }] } },
)) {
  console.log(chunk.data);
}
```

所有线程共享一个沙箱。当沙箱有重建成本较高的状态（如克隆的仓库、已安装的依赖或构建产物）时非常有用。同一助手上的任何对话都可以从上一次对话中断处继续，无需重复设置。

:::

#### 文件传输

沙箱是隔离的容器，因此你的应用代码无法直接访问其中的文件。使用 `upload_files()` 和 `download_files()` 来跨越沙箱边界移动数据：

- **在 Agent 运行前播种沙箱**：上传用户文件、[技能](/tutorials/DeepAgents/技能)脚本、配置或[持久化记忆](/tutorials/DeepAgents/记忆)，让 Agent 从一开始就有所需的一切
- **在 Agent 完成后获取结果**：下载生成的制品（报告、图表、导出文件）并将更新的记忆同步回去供未来对话使用

有关特定于提供商的文件传输示例，请参见[处理文件](/tutorials/DeepAgents/沙箱)。有关提供商设置、安全和生命周期模式，请参见完整的[沙箱指南](/tutorials/DeepAgents/沙箱)。

::: details 示例：使用自定义中间件同步技能和记忆

Agent 需要执行的[技能](/tutorials/DeepAgents/技能)脚本必须在 Agent 运行前上传到沙箱。你可能还希望同步[记忆](/tutorials/DeepAgents/记忆)，以便 Agent 可以在容器内读取和更新它们。使用带有 `before_agent` 和 `after_agent` 钩子的[自定义中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/custom)来跨沙箱边界移动文件：

```typescript {src/agent.ts}
import { createMiddleware } from "langchain";
import {
  createDeepAgent,
  CompositeBackend,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { SandboxClient } from "langsmith/sandbox";

function safeFilename(key: string): string {
  const name = key.split("/").pop()!;
  if (name.includes("..") || /[*?]/.test(name)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return name;
}

const createSandboxSyncMiddleware = (backend: CompositeBackend) => {
  return createMiddleware({
    name: "SandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      // Upload skill scripts and memories into the sandbox
      const userId = runtime.serverInfo.user.identity;  // [!code highlight]
      const store = runtime.store;
      const encoder = new TextEncoder();
      const files: [string, Uint8Array][] = [];
      for (const item of await store.search(["skills", userId])) {
        const name = safeFilename(item.key);
        files.push([`/skills/${name}`, encoder.encode(item.value.content)]);
      }
      for (const item of await store.search(["memories", userId])) {
        const name = safeFilename(item.key);
        files.push([`/memories/${name}`, encoder.encode(item.value.content)]);
      }
      if (files.length > 0) {
        await backend.uploadFiles(files);
      }
    },
    afterAgent: async (state, runtime) => {
      // Sync updated memories back to the store
      const userId = runtime.serverInfo.user.identity;  // [!code highlight]
      const store = runtime.store;
      const items = await store.search(["memories", userId]);
      const results = await backend.downloadFiles(
        items.map((item) => `/memories/${item.key}`),
      );
      const decoder = new TextDecoder();
      for (const result of results) {
        if (result.content) {
          await store.put(
            ["memories", userId],
            result.path.split("/").pop()!,
            { content: decoder.decode(result.content) },
          );
        }
      }
    },
  });
};

const client = new SandboxClient();
const lsSandbox = await client.createSandbox();

const backend = new CompositeBackend(
  new LangSmithSandbox({ sandbox: lsSandbox }),
  {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["skills", rt.serverInfo.user.identity],  // [!code highlight]
    }),
    "/memories/": new StoreBackend({
      namespace: (rt) => ["memories", rt.serverInfo.user.identity],  // [!code highlight]
    }),
  },
);

export const agent = createDeepAgent({
  backend,
  middleware: [createSandboxSyncMiddleware(backend)],
});
```

:::

#### 管理密钥

沙箱是隔离的容器，因此宿主机上的环境变量在其中不可用。有两种方式可以向沙箱代码提供 API 密钥和其他密钥：

**认证代理（推荐）。** [沙箱认证代理](https://docs.langchain.com/langsmith/sandbox-auth-proxy)拦截来自沙箱的出站请求并自动注入认证头。沙箱代码正常调用外部 API，代理根据目标主机添加正确的凭据。这意味着 API 密钥永远不会出现在沙箱代码、环境变量或日志中。

![The sandbox auth proxy injects credentials into outbound requests so secrets never enter the sandbox](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/sandbox-auth-proxy.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=632c4a493f1d5928e41c6865ab86d1da)

```json
{
  "proxy_config": {
    "rules": [
      {
        "name": "openai-api",
        "match_hosts": ["api.openai.com"],
        "inject_headers": {
          "Authorization": "Bearer ${OPENAI_API_KEY}"
        }
      },
      {
        "name": "anthropic-api",
        "match_hosts": ["api.anthropic.com"],
        "inject_headers": {
          "x-api-key": "${ANTHROPIC_API_KEY}"
        }
      }
    ]
  }
}
```

`${SECRET_KEY}` 引用会解析为你存储在 LangSmith [工作区设置](https://docs.langchain.com/langsmith/set-up-hierarchy#configure-workspace-settings)中的密钥。在创建引用密钥的模板之前，请先在那里配置密钥。

**工作区密钥。** 对于不需要基于代理注入的 API 密钥（例如 Agent 服务器本身使用的密钥，而非沙箱代码），请将它们存储为 LangSmith 中的[工作区密钥](https://docs.langchain.com/langsmith/set-up-hierarchy#configure-workspace-settings)。这些密钥在运行时作为环境变量可供工作区中的所有 Agent 使用。

::: warning
避免通过环境变量或文件上传将密钥传入沙箱。Agent 可以读取沙箱内任何可访问的文件或环境变量，包括凭据。认证代理可以将密钥完全排除在沙箱之外。
:::

## 防护栏

生产环境中的 Agent 自主运行，这意味着它们可能无限循环、触及速率限制或处理包含敏感信息的用户数据。Deep Agents 提供两层保护：

- **[权限](/tutorials/DeepAgents/文件系统权限)**：声明式的允许/拒绝规则，控制 Agent 可以读写哪些文件和目录。使用权限来将 Agent 隔离到工作目录、保护敏感文件或强制只读记忆。
- **[中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)**：包装模型和工具调用的钩子，用于速率限制、错误处理和数据隐私。

![Middleware hooks—before_model, wrap_model_call, wrap_tool_call, after_model—wrap the agent loop so policies run deterministically around every relevant step](https://mintcdn.com/langchain-5e9cc07a/9oyV6nbtSbBRfaE1/oss/images/deepagents/production/middleware-lifecycle.png?fit=max&auto=format&n=9oyV6nbtSbBRfaE1&q=85&s=0d30b34aba2b829a1b763b975cfb2817)

### 速率限制

这里的速率限制是指限制 Agent 自身在单次运行中的 LLM 和工具使用量，而不是针对入站请求的 API 网关速率限制。

如果没有限制，一个陷入混乱的 Agent 可能在几分钟内通过在同一工具调用上循环或进行数百次模型调用来耗尽你的 LLM API 预算。为每次运行中的模型调用和工具执行都设置上限：

```typescript
import { createAgent, modelCallLimitMiddleware, toolCallLimitMiddleware } from "langchain";

const agent = createAgent({
  model: "google_genai:gemini-3.5-flash",
  middleware: [
    modelCallLimitMiddleware({ runLimit: 50 }),
    toolCallLimitMiddleware({ runLimit: 200 }),
  ],
});
```

使用 `run_limit` 来限制单次调用内的调用次数（每轮重置）。使用 `thread_limit` 来限制整个对话中的调用次数（需要 Checkpointer）。完整配置请参见 [ModelCallLimitMiddleware](https://reference.langchain.com/javascript/langchain/index/modelCallLimitMiddleware) 和 [ToolCallLimitMiddleware](https://reference.langchain.com/javascript/langchain/index/toolCallLimitMiddleware)。

### 错误处理

并非所有错误都应该用相同的方式处理。瞬时故障（网络超时、速率限制）应该自动重试。LLM 可以恢复的错误（错误的工具输出、解析失败）应该反馈给模型。需要人工介入的错误应该暂停 Agent。完整的分析和代码示例，请参见[正确处理错误](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph#handle-errors-appropriately)。

中间件处理瞬时故障的情况。模型调用和工具调用各自有带指数退避的重试中间件。如果你的主要模型提供商完全宕机，回退中间件会切换到替代方案：

```typescript
import {
  createAgent,
  modelFallbackMiddleware,
  modelRetryMiddleware,
  toolRetryMiddleware,
} from "langchain";

const agent = createAgent({
  model: "google_genai:gemini-3.5-flash",
  middleware: [
    // Retry model calls on rate limits, timeouts, and 5xx errors
    modelRetryMiddleware({ maxRetries: 3, backoffFactor: 2.0, initialDelayMs: 1000 }),
    // If the primary model is fully down, fall back to an alternative
    modelFallbackMiddleware("gpt-5.5"),
    // Retry specific tools that hit external APIs (not all tools)
    toolRetryMiddleware({
      maxRetries: 2,
      tools: ["search", "fetch_url"],
      retryOn: [TimeoutError, TypeError],
    }),
  ],
});
```

将 [ToolRetryMiddleware](https://reference.langchain.com/javascript/langchain/index/toolRetryMiddleware) 限定到特定工具，而不是重试所有工具。文件系统的 `read_file` 失败不会从重试中受益，但超时的网络搜索可能会。完整配置请参见 [ModelRetryMiddleware](https://reference.langchain.com/javascript/langchain/index/modelRetryMiddleware) 和 [ModelFallbackMiddleware](https://reference.langchain.com/javascript/langchain/index/modelFallbackMiddleware)。

### 数据隐私

如果你的 Agent 处理的用户输入可能包含电子邮件、信用卡号或其他 PII（个人身份信息），你可以在数据到达模型或被存储到日志之前检测和处理它：

```typescript
import { createAgent, piiMiddleware } from "langchain";

const agent = createAgent({
  model: "google_genai:gemini-3.5-flash",
  middleware: [
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
  ],
});
```

策略包括 `redact`（替换为 `[REDACTED_EMAIL]`）、`mask`（部分遮蔽，如 `****-****-****-1234`）、`hash`（确定性哈希）和 `block`（抛出错误）。你还可以为领域特定的模式编写自定义检测器。

完整配置请参见 [piiMiddleware](https://reference.langchain.com/javascript/langchain/index/piiMiddleware)。

关于默认 Deep Agents 中间件栈，请参见[自定义配置](/tutorials/DeepAgents/自定义配置)。关于更多 LangChain 预构建中间件（重试、回退、PII 检测等），请参见[预构建中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)。

## 前端

Deep Agents 使用 [`useStream`](https://docs.langchain.com/oss/javascript/langchain/frontend/overview) 将你的 UI 连接到 Agent 后端。[`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream) 是一个前端 Hook（可用于 React、Vue、Svelte 和 Angular），可以实时流式传输消息、子 Agent 进度和自定义状态。

在本地，`useStream` 指向 `http://localhost:2024`。在生产环境中，将其指向你的 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment) 并配置重新连接功能，这样用户在连接断开时不会丢失进度。

```tsx
import { useStream } from "@langchain/react";

function App() {
  const stream = useStream<typeof agent>({
    apiUrl: "https://your-deployment.langsmith.dev",
    assistantId: "agent",
  });
}
```

对于会生成大量子 Agent 的 Deep Agent 工作流，在提交时设置较高的 `recursionLimit` 以避免截断长时间运行的执行：

```tsx
stream.submit(
  { messages: [{ type: "human", content: text }] },
  {
    streamSubgraphs: true,
    config: { recursionLimit: 10000 },
  },
);
```

有关 Deep Agent 特定的 UI 模式，例如子 Agent 卡片、Todo 列表和自定义状态渲染，请参见[前端指南](/tutorials/DeepAgents/前端概览)。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/going-to-production) 翻译并二次创作。
