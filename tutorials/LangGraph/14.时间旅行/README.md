---
title: 时间旅行
categories: LangGraph
order: 14
date: 2026-06-25
tags:
  - LangGraph
  - 时间旅行
  - 检查点
---

# 时间旅行

> LangGraph 支持时间旅行（Time Travel）：从历史检查点重放执行，或基于历史检查点分叉探索不同路径。

## 概览

LangGraph 通过[检查点](/tutorials/LangGraph/检查点)支持时间旅行，提供两种核心能力：

- **[重放（Replay）](#重放)**：从之前的检查点重新执行。
- **[分叉（Fork）](#分叉)**：从之前的检查点分支，用修改后的状态探索一条替代路径。

两者都是通过从之前的检查点恢复来实现。检查点之前的节点不会重新执行（结果已经保存），检查点之后的节点会重新执行，包括 LLM 调用、API 请求和[中断](/tutorials/LangGraph/中断)（可能产生不同结果）。

## 重放

使用之前检查点的配置调用图，即可从该点重放。

::: warning
重放会**重新执行节点**——它不只是从缓存读取。LLM 调用、API 请求和[中断](/tutorials/LangGraph/中断)会再次触发，可能返回不同结果。从最终检查点（没有 `next` 节点）重放是一个空操作。
:::

使用 [`getStateHistory`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#getStateHistory) 找到你想重放的检查点，然后用该检查点的配置调用 [`invoke`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#invoke)：

```typescript
import { v7 as uuid7 } from "uuid";
import { StateGraph, MemorySaver, START } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  joke: Annotation<string>(),
});

function generateTopic(state: typeof StateAnnotation.State) {
  return { topic: "socks in the dryer" };
}

function writeJoke(state: typeof StateAnnotation.State) {
  return { joke: `Why do ${state.topic} disappear? They elope!` };
}

const checkpointer = new MemorySaver();
const graph = new StateGraph(StateAnnotation)
  .addNode("generateTopic", generateTopic)
  .addNode("writeJoke", writeJoke)
  .addEdge(START, "generateTopic")
  .addEdge("generateTopic", "writeJoke")
  .compile({ checkpointer });

// 步骤1：运行图
const config = { configurable: { thread_id: uuid7() } };
const result = await graph.invoke({}, config);

// 步骤2：找到要重放的检查点
const states = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}

// 步骤3：从特定检查点重放
const beforeJoke = states.find((s) => s.next.includes("writeJoke"));
const replayResult = await graph.invoke(null, beforeJoke.config);
// writeJoke 重新执行（再次运行），generateTopic 不执行
```

## 分叉

分叉（Fork）从过去的检查点创建一个修改了状态的新分支。在之前的检查点上调用 [`update_state`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#updateState) 来创建分叉，然后用 `None` 调用 [`invoke`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#invoke) 继续执行。

::: warning
`update_state` **不会**回滚一个线程。它创建一个从指定点分支的新检查点。原始执行历史保持不变。
:::

```typescript
// 找到 writeJoke 之前的检查点
const states = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}
const beforeJoke = states.find((s) => s.next.includes("writeJoke"));

// 分叉：更新状态以改变主题
const forkConfig = await graph.updateState(
  beforeJoke.config,
  { topic: "chickens" },
);

// 从分叉恢复 —— writeJoke 用新主题重新执行
const forkResult = await graph.invoke(null, forkConfig);
console.log(forkResult.joke); // 关于鸡的笑话，而不是袜子
```

### 从特定节点分叉

当你调用 `update_state` 时，值会使用指定节点的 writer（包括 [reducer](/tutorials/LangGraph/Pregel 运行时)）来应用。检查点记录该节点产生了更新，执行从该节点的后继节点恢复。

默认情况下，LangGraph 从检查点的版本历史推断 `as_node`。从特定检查点分叉时，这个推断几乎总是正确的。

以下情况需要显式指定 `as_node`：

- **并行分支**：多个节点在同一步骤中更新了状态，LangGraph 无法确定哪个是最后更新的（`InvalidUpdateError`）。
- **没有执行历史**：在新线程上设置状态（[测试](/tutorials/LangGraph/测试)中常见）。
- **跳过节点**：把 `as_node` 设为后面的节点，让图认为该节点已经运行过。

```typescript
// 图：generateTopic -> writeJoke

// 把这次更新当作 generateTopic 产生的
// 执行在 writeJoke（generateTopic 的后继）恢复
const forkConfig = await graph.updateState(
  beforeJoke.config,
  { topic: "chickens" },
  { asNode: "generateTopic" },
);
```

## 中断

如果你的图使用 `interrupt` 实现[人机协作](/tutorials/LangGraph/中断)工作流，时间旅行时中断总是会重新触发。包含中断的节点会重新执行，`interrupt()` 会暂停等待新的 `Command(resume=...)`。

```typescript
import { interrupt, Command } from "@langchain/langgraph";

function askHuman(state: { value: string[] }) {
  const answer = interrupt("What is your name?");
  return { value: [`Hello, ${answer}!`] };
}

function finalStep(state: { value: string[] }) {
  return { value: ["Done"] };
}

// ... 用 checkpointer 构建图 ...

// 首次运行：命中中断
await graph.invoke({ value: [] }, config);
// 用答案恢复
await graph.invoke(new Command({ resume: "Alice" }), config);

// 从 askHuman 之前重放
const states = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}
const beforeAsk = states.filter((s) => s.next.includes("askHuman")).pop();

const replayResult = await graph.invoke(null, beforeAsk.config);
// 在中断处暂停 —— 等待新的 Command({ resume: ... })

// 从 askHuman 之前分叉
const forkConfig = await graph.updateState(beforeAsk.config, { value: ["forked"] });
const forkResult = await graph.invoke(null, forkConfig);
// 在中断处暂停 —— 等待新的 Command({ resume: ... })

// 用不同的答案恢复分叉的中断
await graph.invoke(new Command({ resume: "Bob" }), forkConfig);
// 结果：{ value: ["forked", "Hello, Bob!", "Done"] }
```

### 多个中断

如果你的图在多个点收集输入（例如多步骤表单），你可以在两个中断之间分叉，以修改后面的答案而不重新提问前面的问题。

```typescript
// 从两个中断之间分叉（askName 之后，askAge 之前）
const states = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}
const between = states.filter((s) => s.next.includes("askAge")).pop();

const forkConfig = await graph.updateState(between.config, { value: ["modified"] });
const result = await graph.invoke(null, forkConfig);
// askName 结果保留（"name:Alice"）
// askAge 在中断处暂停 —— 等待新的答案
```

## 子图

使用[子图](/tutorials/LangGraph/使用子图)时的时间旅行取决于子图是否有自己的 checkpointer。这决定了你可以从多细粒度的检查点进行时间旅行。

::: code-group

```typescript [继承的 checkpointer（默认）]
// 没有自己的 checkpointer 的子图（默认）
const subgraph = new StateGraph(StateAnnotation)
  .addNode("stepA", stepA)       // 含 interrupt()
  .addNode("stepB", stepB)       // 含 interrupt()
  .addEdge(START, "stepA")
  .addEdge("stepA", "stepB")
  .compile();  // 无 checkpointer —— 继承父图

const graph = new StateGraph(StateAnnotation)
  .addNode("subgraphNode", subgraph)
  .addEdge(START, "subgraphNode")
  .compile({ checkpointer });

// 完成两个中断
await graph.invoke({ value: [] }, config);
await graph.invoke(new Command({ resume: "Alice" }), config);
await graph.invoke(new Command({ resume: "30" }), config);

// 从子图之前时间旅行
const states = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}
const beforeSub = states.filter((s) => s.next.includes("subgraphNode")).pop();

const forkConfig = await graph.updateState(beforeSub.config, { value: ["forked"] });
const result = await graph.invoke(null, forkConfig);
// 整个子图从头重新执行
// 你无法时间旅行到 stepA 和 stepB 之间的某个点
```

默认情况下，子图继承父图的 checkpointer。父图把整个子图视为**单个超级步骤**——整个子图执行只有一个父级检查点。从子图之前时间旅行会从头重新执行整个子图。你无法时间旅行到默认子图中节点*之间*的某个点——只能从父级层面时间旅行。

```typescript [子图自己的 checkpointer]
// 有自己 checkpointer 的子图
const subgraph = new StateGraph(StateAnnotation)
  .addNode("stepA", stepA)       // 含 interrupt()
  .addNode("stepB", stepB)       // 含 interrupt()
  .addEdge(START, "stepA")
  .addEdge("stepA", "stepB")
  .compile({ checkpointer: true });  // 自己的检查点历史

const graph = new StateGraph(StateAnnotation)
  .addNode("subgraphNode", subgraph)
  .addEdge(START, "subgraphNode")
  .compile({ checkpointer });

// 运行到 stepA 中断，然后恢复 -> 命中 stepB 中断
await graph.invoke({ value: [] }, config);
await graph.invoke(new Command({ resume: "Alice" }), config);

// 获取子图自己的检查点（stepA 和 stepB 之间）
const parentState = await graph.getState(config, { subgraphs: true });
const subConfig = parentState.tasks[0].state.config;

// 从子图检查点分叉
const forkConfig = await graph.updateState(subConfig, { value: ["forked"] });
const result = await graph.invoke(null, forkConfig);
// stepB 重新执行，stepA 的结果保留
```

在子图上设置 `checkpointer=True` 可以给它独立的检查点历史。这会在子图**内部**的每一步创建检查点，让你可以从子图内部的特定点时间旅行——例如两个中断之间。使用带 `subgraphs=True` 的 `get_state` 访问子图自己的检查点配置，然后从中分叉。
:::

更多关于配置子图 checkpointer 的信息，请参阅[子图持久化](/tutorials/LangGraph/使用子图)。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/use-time-travel) 翻译并二次创作。
