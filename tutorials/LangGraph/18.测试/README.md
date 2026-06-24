---
title: 测试
categories: LangGraph
order: 18
date: 2026-06-25
tags:
  - LangGraph
  - 测试
---

# 测试

当你用 LangGraph 搭建好 Agent 原型后，下一步自然是为它编写测试。本指南介绍了一些在编写单元测试时非常实用的模式。

> 请注意，本指南专注于 LangGraph 特有的测试场景，主要针对具有自定义结构的图。如果你刚开始使用 LangChain 的内置 [`createAgent`](https://reference.langchain.com/javascript/langchain/index/createAgent)，建议先阅读 [LangChain 测试指南](/tutorials/LangChain/快速开始)。

## 前置条件

首先，确保你已安装 [`vitest`](https://vitest.dev/)：

```bash
npm install -D vitest
```

## 快速入门

许多 LangGraph Agent 都依赖状态，因此一个实用的模式是：在每个使用图的测试之前先创建图，然后在测试中使用新的 checkpointer 实例编译它。

下面的例子展示了一个简单的线性图，它依次经过 `node1` 和 `node2`。每个节点都会更新唯一的状态键 `my_key`：

```typescript
import { test, expect } from 'vitest';
import {
  StateGraph,
  StateSchema,
  START,
  END,
  MemorySaver,
} from '@langchain/langgraph';
import * as z from "zod";

const State = new StateSchema({
  my_key: z.string(),
});

const createGraph = () => {
  return new StateGraph(State)
    .addNode('node1', (state) => ({ my_key: 'hello from node1' }))
    .addNode('node2', (state) => ({ my_key: 'hello from node2' }))
    .addEdge(START, 'node1')
    .addEdge('node1', 'node2')
    .addEdge('node2', END);
};

test('basic agent execution', async () => {
  const uncompiledGraph = createGraph();
  const checkpointer = new MemorySaver();
  const compiledGraph = uncompiledGraph.compile({ checkpointer });
  const result = await compiledGraph.invoke(
    { my_key: 'initial_value' },
    { configurable: { thread_id: '1' } }
  );
  expect(result.my_key).toBe('hello from node2');
});
```

> **测试模式要点**：每个测试使用独立的 `MemorySaver` 实例，确保测试之间状态完全隔离。这种模式可以防止状态污染，让测试结果更加可靠。

## 测试单个节点和边

编译后的 LangGraph Agent 通过 `graph.nodes` 暴露了对每个单独节点的引用。你可以利用这一点来测试 Agent 中的各个节点。需要注意的是，这种方式会绕过编译图时传入的 checkpointer：

```typescript
import { test, expect } from 'vitest';
import {
  StateGraph,
  START,
  END,
  MemorySaver,
  StateSchema,
} from '@langchain/langgraph';
import * as z from "zod";

const State = new StateSchema({
  my_key: z.string(),
});

const createGraph = () => {
  return new StateGraph(State)
    .addNode('node1', (state) => ({ my_key: 'hello from node1' }))
    .addNode('node2', (state) => ({ my_key: 'hello from node2' }))
    .addEdge(START, 'node1')
    .addEdge('node1', 'node2')
    .addEdge('node2', END);
};

test('individual node execution', async () => {
  const uncompiledGraph = createGraph();
  // Will be ignored in this example
  const checkpointer = new MemorySaver();
  const compiledGraph = uncompiledGraph.compile({ checkpointer });
  // Only invoke node 1
  const result = await compiledGraph.nodes['node1'].invoke(
    { my_key: 'initial_value' },
  );
  expect(result.my_key).toBe('hello from node1');
});
```

> 单独测试节点时，checkpointer 不会参与执行。这意味着你可以在不设置 `thread_id` 的情况下直接调用节点，非常方便进行快速验证。

## 部分执行

对于由较大图组成的 Agent，你可能希望测试 Agent 中的部分执行路径，而不是端到端地测试整个流程。在某些情况下，[将这些部分重构为子图](/tutorials/LangGraph/使用子图)在语义上可能更合理，因为子图可以像普通图一样独立调用。

但是，如果你不想改变 Agent 图的整体结构，可以使用 LangGraph 的持久化机制来模拟一种状态：让 Agent 在目标部分开始之前暂停，在目标部分结束时再次暂停。具体步骤如下：

1. 使用 checkpointer 编译 Agent（测试时使用内存 checkpointer [`MemorySaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.MemorySaver.html) 即可）。
2. 调用 Agent 的 [`update_state`](/tutorials/LangGraph/时间旅行) 方法，将 [`asNode`](/tutorials/LangGraph/时间旅行) 参数设置为你想要开始测试的节点*之前*的那个节点的名称。
3. 使用与更新状态时相同的 `thread_id` 调用 Agent，并将 `interruptBefore` 参数设置为你要停止的节点名称。

以下示例只执行线性图中的第二个和第三个节点：

```typescript
import { test, expect } from 'vitest';
import {
  StateGraph,
  StateSchema,
  START,
  END,
  MemorySaver,
} from '@langchain/langgraph';
import * as z from "zod";

const State = new StateSchema({
  my_key: z.string(),
});

const createGraph = () => {
  return new StateGraph(State)
    .addNode('node1', (state) => ({ my_key: 'hello from node1' }))
    .addNode('node2', (state) => ({ my_key: 'hello from node2' }))
    .addNode('node3', (state) => ({ my_key: 'hello from node3' }))
    .addNode('node4', (state) => ({ my_key: 'hello from node4' }))
    .addEdge(START, 'node1')
    .addEdge('node1', 'node2')
    .addEdge('node2', 'node3')
    .addEdge('node3', 'node4')
    .addEdge('node4', END);
};

test('partial execution from node2 to node3', async () => {
  const uncompiledGraph = createGraph();
  const checkpointer = new MemorySaver();
  const compiledGraph = uncompiledGraph.compile({ checkpointer });
  await compiledGraph.updateState(
    { configurable: { thread_id: '1' } },
    // The state passed into node 2 - simulating the state at
    // the end of node 1
    { my_key: 'initial_value' },
    // Update saved state as if it came from node 1
    // Execution will resume at node 2
    'node1',
  );
  const result = await compiledGraph.invoke(
    // Resume execution by passing None
    null,
    {
      configurable: { thread_id: '1' },
      // Stop after node 3 so that node 4 doesn't run
      interruptAfter: ['node3']
    },
  );
  expect(result.my_key).toBe('hello from node3');
});
```

> **部分执行的核心思路**：通过 `updateState` 模拟某个节点已完成的状态，然后利用 `interruptAfter` 在目标节点之后停止执行，从而只运行图中你感兴趣的片段。这在测试复杂的分支逻辑或跳过耗时的前置节点时特别有用。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/test) 翻译并二次创作。
