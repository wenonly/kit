---
title: 向后兼容
categories: LangGraph
order: 19
date: 2026-06-25
tags:
  - LangGraph
  - 向后兼容
  - 生产部署
---

# 向后兼容

> 在生产环境中更新 LangGraph 图代码，同时不中断正在进行的运行。

软件在生产环境中总是需要迭代的。新需求、Bug 修复和重构最终都会落地到你的图代码中。由于 LangGraph 会对已[持久化](/tutorials/LangGraph/持久化)的现有线程状态运行最新部署的图，因此你发布的每一次变更，实际上都是一次针对现有检查点的向后兼容性 API 变更。

与那些将运行绑定到其启动时代码版本的工作流引擎不同，LangGraph 会立即将最新的图应用到*每个*线程——无论是新线程还是从检查点恢复的线程。这很方便：Bug 修复可以无缝地传播到正在进行的对话和 Agent 中。但这也意味着你必须思考每次变更如何与在旧版代码下启动的运行进行交互。

有三类兼容性问题需要注意，大致按你遇到它们的先后顺序排列：

1. [技术兼容性](#技术兼容性)：最常见的问题；新代码必须能够针对已有状态加载和执行。
2. [业务兼容性](#业务兼容性)：较少见；现有运行应该继续遵循旧的业务逻辑，即使代码已经改变。
3. [非确定性](#非确定性)：仅适用于 Functional API。

::: tip
关于运行时默认支持哪些图拓扑和状态变更的简要总结，请参阅 [Graph 迁移](https://docs.langchain.com/oss/javascript/langgraph/graph-api#graph-migrations)。本页其余部分涵盖了当变更超出支持范围时，你可以应用的模式。
:::

## 技术兼容性

技术兼容性类似于微服务中的 API 破坏性变更。这里的"API"是指你的图代码与[检查点器](/tutorials/LangGraph/检查点#检查点器库)已为现有线程持久化的数据之间的契约。当线程恢复时，LangGraph 会反序列化已保存的状态，按名称将其分发给节点，并期望节点返回符合状态 schema 的值。

常见的技术性破坏：

- **重命名或删除节点**，而此时有线程暂停在该节点或即将进入该节点——例如在 [`interrupt`](https://reference.langchain.com/javascript/langchain-langgraph/index/interrupt) 处，或通过仍然路由到旧名称的条件边。恢复时，LangGraph 无法通过保存的名称找到节点，运行因此失败。运行恢复的起点是执行停止的节点的开始处，所以如果节点不存在，就没有地方可以恢复。

- **重命名或删除 State 键**，而旧检查点仍然包含这些键，或下游节点仍然读取这些键。

- **收紧 State 字段**，例如将 `Optional` 字段改为必需、收窄类型、或添加没有默认值的新必需字段。现有检查点将无法满足新的 schema。

边拓扑本身*不会*被持久化在检查点中。在仍然存在的节点之间添加、删除或重定向边，对于正在进行的线程是安全的。根据 [Graph 迁移](https://docs.langchain.com/oss/javascript/langgraph/graph-api#graph-migrations) 的总结，唯一可能破坏中断线程的拓扑变更是重命名或删除节点。

### 推荐模式

- 将新的状态字段标记为可选（`z.string().optional()` 或 `.nullish()`），以便旧检查点仍然能通过验证。
- 将删除视为弃用处理：在 schema 上保留该字段至少一个排空周期，让现有检查点继续加载。
- 通过"先添加后删除"的方式重命名：在旧字段或旧节点旁边添加新的字段或节点，在弃用窗口期内双写或同时路由到两者，然后在没有正在进行中的线程依赖旧项后将其删除。
- 使用[时间旅行](/tutorials/LangGraph/时间旅行)和 [`graph.getState`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#getState) 在预发布部署中使用新代码检查现有线程，然后再正式上线。

### 检测进行中的线程

在删除节点、重命名 State 键或进行旧线程无法容忍的变更之前，你需要了解是否有线程当前停留在你即将删除的代码版本上。LangGraph 本身不维护线程状态的搜索索引，因此答案取决于你的图在哪里运行。

**如果你部署到 [LangSmith](https://docs.langchain.com/langsmith/deployment)。** 使用 Agent Server 的线程搜索功能按状态过滤。`status` 字段接受 `idle`、`busy`、`interrupted` 和 `error`，因此你可以批量查询 `interrupted` 或 `busy` 的线程，还可以选择用元数据过滤器进一步缩小范围。参见[按线程状态过滤](https://docs.langchain.com/langsmith/use-threads#filter-by-thread-status)和[列出线程](https://docs.langchain.com/langsmith/use-threads#list-threads)。

**在任何 LangGraph 运行的地方。** 使用 [LangSmith 追踪](/tutorials/LangGraph/可观测性)来监控生产环境中哪些节点正在被进入和退出。这是判断某个节点或状态字段是否已不可达的最可靠信号。

**当你已经有了一个 `thread_id` 时。** 直接检查该线程：

- [`graph.getState(config)`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#getState) 返回最新检查点，包括线程暂停在哪个节点以及任何待处理的中断。
- [`graph.getStateHistory(config)`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#getStateHistory) 返回该线程的完整时间顺序检查点列表。

如有疑问，请保留已弃用的节点或字段，直到 Agent Server 线程列表和追踪都显示不再有活动。

## 业务兼容性

有时候一个变更在技术上是有效的（每个现有检查点仍然可以加载，每个节点仍然可以解析），但新图的*含义*与旧图不同。新行为对于新线程是正确的，而你不希望追溯性地将其应用到在旧逻辑下启动的线程。

例如，假设你的图执行流程为 `intake → triage → respond`，而你决定在 `triage` 和 `respond` 之间插入一个新的 `policy_check` 步骤：

- 已经通过 `triage` 的线程应该直接继续到 `respond`（旧流程）。
- 新线程应该运行完整的新流程。

推荐的模式是：在线程启动时将相关的*行为版本*记录到状态中，然后通过[条件边](https://docs.langchain.com/oss/javascript/langgraph/graph-api#conditional-edges)进行分支：

在 `triage` 之后恢复的旧线程会从其保存的状态中读取 `flow_version`（或回退到 v1 默认值），跳过 `policy_check`。新线程从 `intake` 开始，被标记为 `flow_version=2`，运行新路径。一旦所有 v1 线程都完成，你就可以移除版本标记和条件边。

> **关键前提**：这种模式只有在你在*线程启动时*——即任何需要版本化的分支之前——设置版本才有效。如果设置得太晚，现有线程在需要版本信息时将不会包含它。

## 非确定性

此类别仅适用于 Functional API 以及 Graph API **节点**内部的 [**task**](https://docs.langchain.com/oss/javascript/langgraph/functional-api#task) 或 [`interrupt`](https://reference.langchain.com/javascript/langchain-langgraph/index/interrupt) 调用。普通的 Graph API **节点**在恢复时会[从节点函数的起点重新运行](https://docs.langchain.com/oss/javascript/langgraph/graph-api#re-execution-and-idempotency)；你应该将副作用设计为幂等的，但除非你在该**节点**中使用了 **task** 或 [`interrupt`](https://reference.langchain.com/javascript/langchain-langgraph/index/interrupt)，否则不需要保留任务调用顺序。

Functional API 的 **entrypoint** 会编译为一个**节点**，当运行恢复时，它会从头开始回放 entrypoint 主体，使用缓存的 [`@task`](https://reference.langchain.com/javascript/langchain-langgraph/index/task) 结果来跳过已完成的工作。有两种变更会破坏这个模型：

- **在恢复点之前添加、删除或重排序 `@task` 调用或 [`interrupt`](https://reference.langchain.com/javascript/langchain-langgraph/index/interrupt) 调用。** LangGraph 通过调用在回放中的位置来匹配缓存结果和恢复值，因此位置偏移可能导致错误的缓存值被回放到不同的调用上。
- **在 `@task` 之外引入非确定性操作**，例如在 entrypoint 主体中内联 `time.time()`、`random.random()` 或网络调用。回放时这些操作会产生与首次运行不同的值，可能改变控制流。

关于更深入的分析和示例，请参阅 Functional API 指南中的[确定性](https://docs.langchain.com/oss/javascript/langgraph/functional-api#determinism)和[常见陷阱](https://docs.langchain.com/oss/javascript/langgraph/functional-api#common-pitfalls)部分。

如果你需要对一个有正在进行中运行的 `@entrypoint` 进行非平凡的代码变更，最安全的选项是：

- 在部署变更之前让正在进行的运行排空（drain）。
- 将任何新逻辑包装在新的 `@task` 中，使其结果被独立检查点化。
- 在 `langgraph.json` 中以新的图名称注册一个新的 entrypoint 来承载新行为，并将新线程路由到它。

> **总结**：向后兼容的核心策略是"先加后删"（add-then-remove）和"版本标记"（version stamping）。在生产环境中，永远不要假设没有正在进行中的旧线程——先用 LangSmith 追踪和线程搜索确认，再做破坏性变更。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/backward-compatibility) 翻译并二次创作。
