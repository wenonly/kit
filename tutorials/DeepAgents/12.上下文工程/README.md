---
title: 上下文工程
categories: DeepAgents
order: 12
date: 2026-06-25
tags:
  - DeepAgents
  - 上下文
---

# 上下文工程

> 控制你的 Deep Agent 可以访问哪些上下文，以及如何跨长时间运行的任务管理它们

上下文工程是指以正确的格式提供正确的信息和工具，让你的 Deep Agent 能够可靠地完成任务。

Deep Agent 可以访问多种上下文。一些来源在启动时提供给 Agent；其他来源在运行时变得可用，比如用户输入。Deep Agent 包含内置机制来管理跨长时间运行会话的上下文。

本页概述了你的 Deep Agent 可以访问和管理的不同类型的上下文。

::: tip 提示
刚接触上下文工程？请参阅[概念概述](https://docs.langchain.com/oss/javascript/concepts/context)了解不同类型的上下文及其使用场景。
:::

## 上下文类型

| 上下文类型                                           | 你控制的方面                                                            | 范围                             |
| ---------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| **[输入上下文](#输入上下文)**                        | 启动时加入 Agent 提示的内容（系统提示、记忆、技能）                      | 静态，每次运行时应用             |
| **[运行时上下文](#运行时上下文)**                    | 调用时传入的静态配置（用户元数据、API 密钥、连接）                        | 每次运行，传播到子 Agent         |
| **[上下文压缩](#上下文压缩)**                        | 内置的卸载和摘要，让上下文保持在窗口限制内                                | 自动，当接近限制时触发           |
| **[上下文隔离](#使用子-agent-实现上下文隔离)**       | 使用子 Agent 将重度工作隔离，只返回结果给主 Agent                        | 每个子 Agent，委托时             |
| **[长期记忆](#长期记忆)**                            | 使用虚拟文件系统跨线程持久化存储                                         | 跨对话持久化                     |

## 输入上下文

输入上下文是在启动时提供给 Deep Agent 并成为其系统提示一部分的信息。最终提示由多个来源组成：

- [**系统提示**](#系统提示) — 你提供的自定义指令加上内置的 Agent 指导。
- [**记忆**](#记忆) — 配置后始终加载的持久 `AGENTS.md` 文件。
- [**技能**](#技能) — 相关时加载的按需能力（渐进式披露）。
- [**工具提示**](#工具提示) — 使用内置工具或自定义工具的指令。

### 系统提示

你的自定义系统提示会被前置到内置系统提示中，后者包含规划、文件系统工具和子 Agent 的指导。用它来定义 Agent 的角色、行为和知识：

```typescript
import { createDeepAgent } from "deepagents";

const agent = await createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  systemPrompt: `You are a research assistant specializing in scientific literature.
  Always cite sources. Use subagents for parallel research on different topics.`,
});
```

`systemPrompt` 参数是静态的，意味着它不会在每次调用时改变。
对于某些用例，你可能想要动态提示：例如，告诉模型"你有管理员权限"vs"你只有只读权限"，或从[长期记忆](#长期记忆)注入用户偏好如"用户偏好简洁回复"。
如果你的提示依赖于上下文或 `runtime.store`，使用 `dynamicSystemPromptMiddleware` 来构建上下文感知指令。
你的中间件可以读取 `request.runtime.context` 和 `request.runtime.store`。
关于[默认中间件栈](/tutorials/DeepAgents/自定义配置)和添加[自定义中间件](https://docs.langchain.com/oss/javascript/langchain/middleware)，请参见[自定义配置](/tutorials/DeepAgents/自定义配置)。关于示例，请参见 [LangChain 上下文工程](https://docs.langchain.com/oss/javascript/langchain/context-engineering#system-prompt)指南。

当仅工具使用上下文或 `runtime.store` 时，你**不需要**中间件；工具直接接收 `runtime` 对象（包括 `runtime.context` 和 `runtime.store`）。只有当系统提示本身需要按请求变化时才添加中间件。

::: tip 提示
要为特定提供商或模型调整组装的系统提示，使用 [Harness Profile](/tutorials/DeepAgents/Harness Profile)：`base_system_prompt` 直接替换基础提示，`system_prompt_suffix` 追加到其后。
:::

### 记忆

记忆文件（[`AGENTS.md`](https://agents.md/)）提供**始终加载**到系统提示中的持久上下文。将记忆用于项目约定、用户偏好和应适用于每次对话的关键指南：

```typescript
const agent = await createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  memory: ["/project/AGENTS.md", "~/.deepagents/preferences.md"],
});
```

与技能不同，记忆总是被注入——没有渐进式披露。保持记忆精简以避免上下文过载；将详细的工作流和领域特定内容使用[技能](/tutorials/DeepAgents/技能)。配置详情请参见[记忆](/tutorials/DeepAgents/自定义配置)。

### 技能

技能提供**按需**能力。Agent 在启动时读取每个 `SKILL.md` 的 frontmatter，然后在判定技能相关时才加载完整的技能内容。这减少了 token 使用，同时仍提供专门的工作流：

```typescript
const agent = await createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  skills: ["/skills/research/", "/skills/web-search/"],
});
```

保持每个技能聚焦于单一工作流或领域；宽泛或重叠的技能在加载时会稀释相关性并使上下文膨胀。在技能内部，保持主要内容简洁，将详细参考材料移到技能文件中引用的独立文件中。将始终相关的约定放在[记忆](#记忆)中。关于编写和配置，请参见[技能](/tutorials/DeepAgents/技能)。

### 工具提示

[工具](https://docs.langchain.com/oss/javascript/langchain/tools)提示是塑造模型如何使用工具的指令。所有工具都暴露模型在其提示中看到的元数据——通常是模式（schema）和描述。通过 `tools` 参数传入的工具会将工具元数据（模式和描述）展示给模型。Deep Agent 的内置工具打包在[默认中间件栈](/tutorials/DeepAgents/自定义配置)中，通常也会在系统提示中更新更多这些工具的使用指导。

**内置工具** — 添加 harness 能力（规划、文件系统、子 Agent）的中间件会自动将特定工具的指令追加到系统提示中，创建解释如何有效使用这些工具的工具提示。完整列表请参见[自定义配置](/tutorials/DeepAgents/自定义配置)：

- 规划提示 — 使用 `write_todos` 维护结构化任务列表的指令
- 文件系统提示 — `ls`、`read_file`、`write_file`、`edit_file`、`glob`、`grep`（以及使用沙箱后端时的 `execute`）的文档
- 子 Agent 提示 — 使用 `task` 工具委托工作的指导
- 人机协作提示 — 在指定工具调用处暂停的用法（当设置了 `interrupt_on` 时）
- 本地上下文提示 — 当前目录和项目信息（仅 CLI）

**你提供的工具** — 通过 `tools` 参数传入的工具会将其描述（来自工具模式）发送给模型。你也可以添加[自定义中间件](https://docs.langchain.com/oss/javascript/langchain/middleware)来添加工具并追加自己的系统提示指令。

对于你提供的工具，确保提供清晰的名称、描述和参数描述。这些指导模型关于何时和如何使用工具的推理。在描述中包含*何时*使用工具，并描述每个参数的作用。

```typescript
const searchOrders = tool(
  async ({ userId, status, limit }) => { /* ... */ },
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

::: tip 提示
要为特定提供商或模型覆盖内置或用户提供的工具描述，使用 [Harness Profile](/tutorials/DeepAgents/Harness Profile) 的 `tool_description_overrides`，按工具名索引。`excluded_tools` 可以完全从可见工具集中移除一个工具。
:::

关于内置能力，请参见 [Harness](/tutorials/DeepAgents/Harness Profile)；关于直接传入工具，请参见[自定义配置](/tutorials/DeepAgents/自定义配置)。

### 完整系统提示

Deep Agent 的系统消息——即模型在运行开始时收到的组装好的系统提示——由以下部分组成：

1. 自定义 `system_prompt`（如果提供）
2. [基础 Agent 提示](https://github.com/langchain-ai/deepagents/blob/e18e9dcd0e6edc72c0a4a5b76ae752c4bc539752/libs/deepagents/deepagents/graph.py#L37)
3. 待办列表提示：如何用待办列表进行规划的指令
4. 记忆提示：`AGENTS.md` + 记忆使用指南（仅在提供 `memory` 时）
5. 技能提示：技能位置 + 带 frontmatter 信息的技能列表 + 用法（仅在提供技能时）
6. 虚拟文件系统提示（文件系统 + execute 工具文档，如适用）
7. 子 Agent 提示：Task 工具用法
8. 用户提供的中间件提示（如果提供了自定义中间件）
9. 人机协作提示（当设置了 `interrupt_on` 时）

## 运行时上下文

运行时上下文是你调用 Agent 时传入的每次运行配置。它不会自动包含在模型提示中；模型只有在工具、中间件或其他逻辑读取它并将其添加到消息或系统提示中时才会看到它。将运行时上下文用于用户元数据（ID、偏好、角色）、API 密钥、数据库连接、功能开关或你的工具和 harness 需要的其他值。

使用 `contextSchema` 定义数据的结构，通常是一个 Zod 对象模式（例如 `z.object({ ... })`）。在传入 `invoke` / `ainvoke` 的 options 对象的 **`context`** 字段中传入运行时值。完整详情请参见 [Runtime](https://docs.langchain.com/oss/javascript/langchain/runtime) 和 [LangGraph 运行时上下文](https://docs.langchain.com/oss/javascript/langgraph/graph-api#runtime-context)。

在工具内部，从工具处理器的 `runtime` 参数提供的 `ToolRuntime` 实例读取 `runtime.context`：

```typescript
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";
import type { ToolRuntime } from "@langchain/core/tools";
import { z } from "zod";

const contextSchema = z.object({
  userId: z.string(),
  apiKey: z.string(),
});

const fetchUserData = tool(
  async (input, runtime: ToolRuntime<unknown, typeof contextSchema>) => {
    const userId = runtime.context?.userId;
    return `Data for user ${userId}: ${input.query}`;
  },
  {
    name: "fetch_user_data",
    description: "Fetch data for the current user",
    schema: z.object({ query: z.string() }),
  }
);

const agent = await createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  tools: [fetchUserData],
  contextSchema,
});

const result = await agent.invoke(
  { messages: [{ role: "user", content: "Get my recent activity" }] },
  { context: { userId: "user-123", apiKey: "sk-..." } },
);
```

运行时上下文**会传播到所有子 Agent**。当子 Agent 运行时，它接收与父 Agent 相同的运行时上下文。关于每个子 Agent 的上下文（命名空间键），请参见[子 Agent](/tutorials/DeepAgents/子 Agent)。

## 上下文压缩

长时间运行的任务会产生大量的工具输出和冗长的对话历史。上下文压缩在减少 Agent 工作记忆中信息大小的同时，保留与任务相关的细节。以下是内置机制，确保传递给 LLM 的上下文保持在其上下文窗口限制内：

- [**卸载**](#卸载) — 大型工具输入和结果被存储到文件系统中并用引用替换。
- [**摘要**](#摘要) — 当接近限制时，旧消息被压缩为 LLM 生成的摘要。

### 卸载

Deep Agents 使用[内置文件系统工具](/tutorials/DeepAgents/Harness Profile)自动卸载内容，并按需搜索和检索卸载的内容。
当工具调用输入或结果超过 token 阈值（默认 20,000）时，内容卸载就会发生：

1. **工具调用输入超过 20,000 token**：文件写入和编辑操作会在 Agent 的对话历史中留下包含完整文件内容的工具调用。由于这些内容已经持久化到文件系统中，它通常是冗余的。当会话上下文超过模型可用窗口的 85% 时，Deep Agents 会截断旧的工具调用，用指向磁盘上文件的指针替换它们，从而减少活跃上下文的大小。

   ![An example of offloading showing a large input which is saved to disk and the truncated version is used for the tool call](https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=fa18372080684d661965ea6f5ed1edd0)

2. **工具调用结果超过 20,000 token**：当这种情况发生时，Deep Agent 会将响应卸载到已配置的后端，并用文件路径引用和前 10 行预览来替换它。Agent 之后可以按需重新读取或搜索内容。

   ![An example of offloading showing a large tool response that is replaced with a message about the location of the offloaded results and the first 10 lines of the result](https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=11f3da2f37cae63b8aa4c440549f1a67)

### 多模态输入

Deep Agents 支持多模态输入，如 `read_file` 返回的图片或消息中提供的图片，但内置的上下文管理机制主要面向文本和消息历史。它们不会调整图片大小、降低图片分辨率或生成可复用的视觉嵌入。

对于多模态工作负载，尽可能将大型媒体保持在活跃消息历史之外：

- 将图片、截图和图表存储在文件系统后端或外部对象存储中，然后通过消息传递文件路径或 URL。
- 在长时间运行的对话中，优先使用引用而非 base64 编码的图片块。
- 如果工具生成图片，让工具保存图片并返回简洁的文本描述加上路径或 URL。
- 对图片密集的检查工作使用子 Agent，这样主 Agent 收到的是紧凑的文本结果，而不是每个多模态中间步骤。
- 当你的模型提供商对图片收取大量 token 时，调整摘要阈值或提供自定义 token 计数器。

卸载大型工具输入和结果时只计算文本内容。非文本块（包括图片）在替换消息中被保留而非压缩。仅包含图片的消息不会仅因图片大小而被卸载。

摘要化在旧消息超出保留的近期上下文时用文本摘要替换它们。被摘要化的分区中的任何图片在摘要化后不再作为活跃图片块发送。写入后端的对话历史文件是文本记录，而非媒体制品存储，因此如果 Agent 之后需要再次检查重要图片，请单独存储。

### 摘要

::: tip 提示
当前的摘要行为（通过 `wrapModelCall` 进行模型内摘要、精确 token 计数和自动 `ContextOverflowError` 回退）需要 `deepagents>=1.6.0`。
:::

每个 `create_deep_agent` 调用都在[默认中间件栈](/tutorials/DeepAgents/自定义配置)中包含 [`SummarizationMiddleware`](https://reference.langchain.com/javascript/langchain/index/summarizationMiddleware)。当上下文大小超过模型的上下文窗口限制（例如 `max_input_tokens` 的 85%），且没有更多可卸载的上下文时，Deep Agent 会自动摘要化消息历史。

这个过程有两个组成部分：

- **上下文内摘要**：LLM 生成对话的结构化摘要，包括会话意图、创建的产物和下一步计划——替换 Agent 工作记忆中的完整对话历史。
- **文件系统保留**：原始对话消息的文本渲染被写入文件系统作为规范记录。

这种双重方法确保 Agent 通过摘要保持对其目标和进展的感知，同时通过文件系统搜索保留在需要时恢复文本细节的能力。

![An example of summarization showing an agent's conversation history, where several steps get compacted](https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=a8fea59d4365dd688e49ce118e706e76)

**配置：**

- 在模型 [model profile](https://docs.langchain.com/oss/javascript/langchain/models#model-profiles) 的 `max_input_tokens` 的 85% 时触发
- 保留 10% 的 token 作为近期上下文
- 如果模型 profile 不可用，回退到 170,000 token 触发 / 保留 6 条消息
- 如果任何模型调用引发标准的 [ContextOverflowError](https://reference.langchain.com/javascript/langchain-core/errors/ContextOverflowError)，Deep Agent 立即回退到摘要化并使用摘要 + 保留的近期消息重试
- 旧消息由模型摘要

::: tip 提示
从 Agent [流式传输 token](/tutorials/DeepAgents/事件流) 通常会包含摘要步骤生成的 token。你可以使用它们关联的元数据过滤掉这些 token：

```typescript
for await (const [namespace, chunk] of await agent.stream(
  { messages: [...] },
  { streamMode: "messages" },
)) {
  const [message, metadata] = chunk;
  if (metadata?.lcSource === "summarization") {  // [!code highlight]
    continue;
  } else {
    ...
  }
}
```
:::

## 使用子 Agent 实现上下文隔离

子 Agent 解决**上下文膨胀问题**。当主 Agent 使用具有大型输出的工具（网络搜索、文件读取、数据库查询）时，上下文窗口很快就会被填满。子 Agent 隔离这些工作——主 Agent 只收到最终结果，而不是产生结果的数十个工具调用。你还可以将每个子 Agent 与主 Agent 分开配置（例如模型、工具、系统提示和技能）。

**工作原理：**

- 主 Agent 有一个 `task` 工具来委托工作
- 子 Agent 以自己全新的上下文运行
- 子 Agent 自主执行直到完成
- 子 Agent 向主 Agent 返回单个最终报告
- 主 Agent 的上下文保持干净

**最佳实践：**

1. **委托复杂任务**：对会使主 Agent 上下文杂乱的多步工作使用子 Agent。

2. **保持子 Agent 响应简洁**：指示子 Agent 返回摘要，而非原始数据：

   ```typescript
   const researchSubagent = {
   name: "researcher",
   description: "Conducts research on a topic",
   systemPrompt: `You are a research assistant.
   IMPORTANT: Return only the essential summary (under 500 words).
   Do NOT include raw search results or detailed tool outputs.`,
   tools: [webSearch],
   };
   ```

3. **使用文件系统处理大型数据**：子 Agent 可以将结果写入文件；主 Agent 按需读取。

关于配置，请参见[子 Agent](/tutorials/DeepAgents/子 Agent)；关于运行时上下文传播和每个子 Agent 的命名空间，请参见[上下文管理](/tutorials/DeepAgents/子 Agent)。

## 长期记忆

使用默认文件系统时，你的 Deep Agent 将其工作记忆文件存储在 Agent 状态中，这只在单个线程内持久化。长期记忆使你的 Deep Agent 能够跨不同线程和对话持久化信息。Deep Agent 可以使用长期记忆来存储用户偏好、积累的知识、研究进度或任何应跨会话持久化的信息。

要使用长期记忆，你必须使用 `CompositeBackend`，将特定路径（通常是 `/memories/`）路由到 LangGraph Store，它提供持久的跨线程持久化。`CompositeBackend` 是一个混合存储系统，其中一些文件无限期持久化，而另一些仍然限定在单个线程内。

```typescript
import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph-checkpoint";

const agent = await createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  store: new InMemoryStore(),
  backend: new CompositeBackend(
    new StateBackend(),
    { "/memories/": new StoreBackend() },
  ),
  systemPrompt: `When users tell you their preferences, save them to /memories/user_preferences.txt so you remember them in future conversations.`,
});
```

你不需要用文件预填充 `/memories/`。你提供后端配置、存储和系统提示指令，告诉 Agent *保存什么*以及*保存到哪里*。例如，你可以提示 Agent 将偏好存储在 `/memories/preferences.txt` 中。该路径初始为空，当用户分享值得记住的信息时，Agent 使用其文件系统工具（`write_file`、`edit_file`）按需创建文件。

要预播种记忆，在 LangSmith 上部署时使用 [Store API](https://docs.langchain.com/langsmith/custom-store)。

关于设置和用例，请参见[长期记忆](/tutorials/DeepAgents/记忆)。

## 最佳实践

1. **从正确的输入上下文开始** — 保持记忆精简以包含始终相关的约定；使用聚焦的技能来提供任务特定的能力。
2. **利用子 Agent 处理重度工作** — 委托多步、输出密集的任务以保持主 Agent 的上下文干净。
3. **在配置中调整子 Agent 输出** — 如果在调试时发现子 Agent 生成了冗长的输出，可以在子 Agent 的 `system_prompt` 中添加指导来创建摘要和综合发现。
4. **使用文件系统** — 将大型输出持久化到文件（例如子 Agent 写入或[自动卸载](#卸载)），让活跃上下文保持小型；模型可以在需要细节时用 `read_file` 和 `grep` 拉取片段。
5. **记录长期记忆结构** — 告诉 Agent `/memories/` 中存放什么以及如何使用。
6. **为工具传递运行时上下文** — 使用 `context` 传递用户元数据、API 密钥和其他工具需要的静态配置。

## 相关资源

- [Harness Profile](/tutorials/DeepAgents/Harness Profile) — 上下文管理概述、卸载、摘要
- [子 Agent](/tutorials/DeepAgents/子 Agent) — 上下文隔离、运行时上下文传播
- [长期记忆](/tutorials/DeepAgents/记忆) — 跨线程持久化
- [技能](/tutorials/DeepAgents/技能) — 渐进式披露和技能编写
- [虚拟文件系统后端](/tutorials/DeepAgents/虚拟文件系统后端) — 文件系统后端和 CompositeBackend
- [上下文概念概述](https://docs.langchain.com/oss/javascript/concepts/context) — 上下文类型和生命周期

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/context-engineering) 翻译并二次创作。
