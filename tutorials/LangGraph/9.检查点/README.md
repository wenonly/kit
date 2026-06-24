---
title: 检查点
categories: LangGraph
order: 9
date: 2026-06-25
tags:
  - LangGraph
  - 检查点
  - 持久化
---

# 检查点

> LangGraph 的检查点（Checkpointers）机制会在每个步骤保存图的状态快照，从而实现持久化、人机协作和容错执行。

检查点器（Checkpointer）会在每个超级步（super-step）保存图状态的快照，并以**线程**（thread）为单位进行组织。在编译图时传入一个 checkpointer，就可以启用人机协作工作流、时间旅行调试、容错执行和对话记忆等高级功能。

![Checkpoints](https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=966566aaae853ed4d240c2d0d067467c)

::: info Agent Server 自动处理检查点
当你使用 [Agent Server](https://docs.langchain.com/langsmith/agent-server) 时，无需手动实现或配置 checkpointer，服务端会在后台自动处理所有持久化基础设施。
:::

::: tip 使用 LangSmith 追踪检查点状态
借助 [LangSmith](https://smith.langchain.com)，你可以追踪检查点状态，调试 Agent 如何在不同会话间恢复执行。参考 [LangGraph 追踪快速入门](https://docs.langchain.com/langsmith/trace-with-langgraph)快速上手。
:::

## 为什么要使用检查点

以下功能都依赖于 checkpointer：

- **人机协作**：checkpointer 支撑了[人机协作工作流](/tutorials/LangGraph/中断)，允许人类查看、中断和审批图的执行步骤。人机协作之所以需要 checkpointer，是因为人类需要能在任意时刻查看图的状态，而图也需要在人类修改状态后能够恢复执行。详见[中断](/tutorials/LangGraph/中断)章节的示例。
- **记忆**：checkpointer 让多次交互之间保持["记忆"](https://docs.langchain.com/oss/javascript/concepts/memory)。对于重复的人机交互（如对话），后续消息可以发送到同一线程，线程会保留之前交互的记忆。参考[添加记忆](/tutorials/LangGraph/添加记忆)了解如何使用 checkpointer 管理对话记忆。
- **时间旅行**：checkpointer 支持["时间旅行"](/tutorials/LangGraph/时间旅行)，允许用户回放先前的图执行过程，以审查或调试特定步骤。此外，还可以在任意检查点处分叉图状态，探索不同的执行路径。
- **容错**：检查点提供了容错和错误恢复能力。如果某个超级步中有一个或多个节点失败，你可以从最后一个成功的步骤重启图。

<a id="pending-writes"></a>

- **待处理写入（Pending writes）**：当图节点在某个[超级步](#超级步super-steps)执行中途失败时，LangGraph 会保存同一超级步中已成功完成的其他节点的检查点写入。当你从该超级步恢复执行时，不会重复运行已成功的节点。

## 核心概念

### 线程

线程是一个唯一 ID 或线程标识符，分配给 checkpointer 保存的每个检查点。它包含了一系列[运行](https://docs.langchain.com/langsmith/runs)累积的状态。当一次运行被执行时，底层图的状态会被持久化到线程中。

在使用 checkpointer 调用图时，你**必须**在 config 的 `configurable` 部分指定 `thread_id`：

```typescript
{
  configurable: {
    thread_id: "1";
  }
}
```

线程的当前状态和历史状态都可以被检索。要持久化状态，必须在执行运行之前创建线程。LangSmith API 提供了多个用于创建和管理线程及其状态的端点，详见 [API 参考](https://reference.langchain.com/python/langsmith/)。

checkpointer 使用 `thread_id` 作为存储和检索检查点的主键。没有它，checkpointer 就无法保存状态，也无法在[中断](/tutorials/LangGraph/中断)后恢复执行——因为 checkpointer 需要 `thread_id` 来加载已保存的状态。

### 检查点

线程在特定时间点的状态被称为检查点（checkpoint）。检查点是在每个[超级步](#超级步super-steps)保存的图状态快照，由 `StateSnapshot` 对象表示（完整字段说明见 [StateSnapshot 字段](#statesnapshot-字段)）。

#### 超级步（Super-steps）

LangGraph 在每个**超级步**边界创建检查点。一个超级步是图的一次"滴答"（tick），在该步骤中所有被调度的节点都会执行（可能是并行执行）。对于像 `START -> A -> B -> END` 这样的顺序图，输入、节点 A 和节点 B 分别对应不同的超级步——每个超级步之后都会产生一个检查点。理解超级步的边界对于[时间旅行](/tutorials/LangGraph/时间旅行)非常重要，因为你只能从检查点（即超级步边界）恢复执行。

除了超级步级别的检查点外，LangGraph 还会在**节点（任务）级别**持久化写入。当一个超级步中的每个节点完成时，其输出会作为任务条目写入 checkpointer 的 `checkpoint_writes` 表，关联到正在进行中的检查点。这些任务级别的写入是实现[待处理写入](#pending-writes-待处理写入pending-writes)恢复的关键：如果同一超级步中的另一个节点失败，成功节点的写入已经持久化，恢复时无需重新运行。完整的状态快照会在超级步完成后提交。

LangGraph 还会持久化超级步中各个节点执行的写入。这些写入以任务形式存储，用于容错：如果同一超级步中的另一个节点失败，成功节点的写入在恢复时无需重新计算。这些任务写入不是完整的 `StateSnapshot` 检查点，因此时间旅行总是从超级步边界处的完整检查点恢复。

检查点被持久化后，可以在以后用于恢复线程的状态。

接下来，我们看看当调用一个简单图时，会保存哪些检查点：

```typescript
import { StateGraph, StateSchema, ReducedValue, START, END, MemorySaver } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  foo: z.string(),
  bar: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      inputSchema: z.array(z.string()),
      reducer: (x, y) => x.concat(y),
    }
  ),
});

const workflow = new StateGraph(State)
  .addNode("nodeA", (state) => {
    return { foo: "a", bar: ["a"] };
  })
  .addNode("nodeB", (state) => {
    return { foo: "b", bar: ["b"] };
  })
  .addEdge(START, "nodeA")
  .addEdge("nodeA", "nodeB")
  .addEdge("nodeB", END);

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };
await graph.invoke({ foo: "", bar: [] }, config);
```

运行图后，将会产生恰好 4 个检查点：

- 空检查点，下一个待执行节点为 [`START`](https://reference.langchain.com/javascript/langchain-langgraph/index/START)
- 包含用户输入 `{'foo': '', 'bar': []}` 的检查点，下一个待执行节点为 `nodeA`
- 包含 `nodeA` 输出 `{'foo': 'a', 'bar': ['a']}` 的检查点，下一个待执行节点为 `nodeB`
- 包含 `nodeB` 输出 `{'foo': 'b', 'bar': ['a', 'b']}` 的检查点，没有后续节点待执行

注意 `bar` 通道的值包含了两个节点的输出，因为本例中 `bar` 通道配置了 reducer。

#### 检查点命名空间

每个检查点都有一个 `checkpoint_ns`（检查点命名空间）字段，用于标识它属于哪个图或子图：

- **`""`**（空字符串）：该检查点属于父（根）图。
- **`"node_name:uuid"`**：该检查点属于以给定节点调用的子图。对于嵌套子图，命名空间会用 `|` 分隔符连接（例如 `"outer_node:uuid|inner_node:uuid"`）。

你可以在节点内部通过 config 访问检查点命名空间：

```typescript
import { RunnableConfig } from "@langchain/core/runnables";

function myNode(state: typeof State.Type, config: RunnableConfig) {
  const checkpointNs = config.configurable?.checkpoint_ns;
  // "" for the parent graph, "node_name:uuid" for a subgraph
}
```

更多关于子图状态和检查点的信息，请参考[使用子图](/tutorials/LangGraph/使用子图)。

## 获取和更新状态

### 获取状态

在操作已保存的图状态时，你**必须**指定一个[线程标识符](#线程)。通过调用 `graph.getState(config)` 可以查看图的*最新*状态。它会返回一个 `StateSnapshot` 对象，对应于 config 中 thread_id 关联的最新检查点；如果提供了 checkpoint_id，则返回该检查点对应的状态。

```typescript
// get the latest state snapshot
const config = { configurable: { thread_id: "1" } };
await graph.getState(config);

// get a state snapshot for a specific checkpoint_id
const config = {
  configurable: {
    thread_id: "1",
    checkpoint_id: "1ef663ba-28fe-6528-8002-5a559208592c",
  },
};
await graph.getState(config);
```

在这个例子中，`getState` 的输出如下所示：

```
StateSnapshot {
  values: { foo: 'b', bar: ['a', 'b'] },
  next: [],
  config: {
    configurable: {
      thread_id: '1',
      checkpoint_ns: '',
      checkpoint_id: '1ef663ba-28fe-6528-8002-5a559208592c'
    }
  },
  metadata: {
    source: 'loop',
    writes: { nodeB: { foo: 'b', bar: ['b'] } },
    step: 2
  },
  createdAt: '2024-08-29T19:19:38.821749+00:00',
  parentConfig: {
    configurable: {
      thread_id: '1',
      checkpoint_ns: '',
      checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8'
    }
  },
  tasks: []
}
```

#### StateSnapshot 字段

| 字段           | 类型             | 说明                                                                                                                                                        |
| -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `values`       | `object`         | 该检查点时的状态通道值。                                                                                                                                     |
| `next`         | `string[]`       | 下一个待执行的节点名称。为空 `[]` 表示图已完成。                                                                                                             |
| `config`       | `object`         | 包含 `thread_id`、`checkpoint_ns` 和 `checkpoint_id`。                                                                                                       |
| `metadata`     | `object`         | 执行元数据。包含 `source`（`"input"`、`"loop"` 或 `"update"`）、`writes`（节点输出）和 `step`（超级步计数器）。                                              |
| `createdAt`    | `string`         | 该检查点创建时间的 ISO 8601 时间戳。                                                                                                                         |
| `parentConfig` | `object \| null` | 前一个检查点的 config。第一个检查点为 `null`。                                                                                                               |
| `tasks`        | `PregelTask[]`   | 该步骤待执行的任务。每个任务包含 `id`、`name`、`error`、`interrupts`，以及可选的 `state`（使用 `subgraphs: true` 时的子图快照）。                            |

### 获取状态历史

通过调用 `graph.getStateHistory(config)`，你可以获取给定线程的完整图执行历史。它会返回与 config 中线程 ID 关联的一系列 `StateSnapshot` 对象。重要的是，检查点按时间顺序排列，最新的检查点/`StateSnapshot` 位于列表首位。

```typescript
const config = { configurable: { thread_id: "1" } };
for await (const state of graph.getStateHistory(config)) {
  console.log(state);
}
```

在这个例子中，`getStateHistory` 的输出如下所示：

```
[
  StateSnapshot {
    values: { foo: 'b', bar: ['a', 'b'] },
    next: [],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28fe-6528-8002-5a559208592c'
      }
    },
    metadata: {
      source: 'loop',
      writes: { nodeB: { foo: 'b', bar: ['b'] } },
      step: 2
    },
    createdAt: '2024-08-29T19:19:38.821749+00:00',
    parentConfig: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8'
      }
    },
    tasks: []
  },
  StateSnapshot {
    values: { foo: 'a', bar: ['a'] },
    next: ['nodeB'],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8'
      }
    },
    metadata: {
      source: 'loop',
      writes: { nodeA: { foo: 'a', bar: ['a'] } },
      step: 1
    },
    createdAt: '2024-08-29T19:19:38.819946+00:00',
    parentConfig: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f4-6b4a-8000-ca575a13d36a'
      }
    },
    tasks: [
      PregelTask {
        id: '6fb7314f-f114-5413-a1f3-d37dfe98ff44',
        name: 'nodeB',
        error: null,
        interrupts: []
      }
    ]
  },
  StateSnapshot {
    values: { foo: '', bar: [] },
    next: ['node_a'],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f4-6b4a-8000-ca575a13d36a'
      }
    },
    metadata: {
      source: 'loop',
      writes: null,
      step: 0
    },
    createdAt: '2024-08-29T19:19:38.817813+00:00',
    parentConfig: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f0-6c66-bfff-6723431e8481'
      }
    },
    tasks: [
      PregelTask {
        id: 'f1b14528-5ee5-579c-949b-23ef9bfbed58',
        name: 'node_a',
        error: null,
        interrupts: []
      }
    ]
  },
  StateSnapshot {
    values: { bar: [] },
    next: ['__start__'],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f0-6c66-bfff-6723431e8481'
      }
    },
    metadata: {
      source: 'input',
      writes: { foo: '' },
      step: -1
    },
    createdAt: '2024-08-29T19:19:38.816205+00:00',
    parentConfig: null,
    tasks: [
      PregelTask {
        id: '6d27aa2e-d72b-5504-a36f-8620e54a76dd',
        name: '__start__',
        error: null,
        interrupts: []
      }
    ]
  }
]
```

![State](https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=38ffff52be4d8806b287836295a3c058)

#### 查找特定检查点

你可以过滤状态历史，找到匹配特定条件的检查点：

```typescript
const history: StateSnapshot[] = [];
for await (const state of graph.getStateHistory(config)) {
  history.push(state);
}

// Find the checkpoint before a specific node executed
const beforeNodeB = history.find((s) => s.next.includes("nodeB"));

// Find a checkpoint by step number
const step2 = history.find((s) => s.metadata.step === 2);

// Find checkpoints created by updateState
const forks = history.filter((s) => s.metadata.source === "update");

// Find the checkpoint where an interrupt occurred
const interrupted = history.find(
  (s) => s.tasks.length > 0 && s.tasks.some((t) => t.interrupts.length > 0)
);
```

### 回放

回放（Replay）会从先前的检查点重新执行步骤。通过传入一个先前的 `checkpoint_id` 来调用图，可以重新运行该检查点之后的节点。检查点之前的节点会被跳过（其结果已经保存）。检查点之后的节点会重新执行，包括所有的 LLM 调用、API 请求或[中断](/tutorials/LangGraph/中断)——这些在回放时总是会被重新触发。

有关回放过去执行的完整详情和代码示例，请参考[时间旅行](/tutorials/LangGraph/时间旅行)。

![Replay](https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=d7b34b85c106e55d181ae1f4afb50251)

### 更新状态

你可以使用 `graph.updateState()` 来编辑图状态。这会创建一个包含更新值的新检查点——它不会修改原始检查点。更新的处理方式与节点更新相同：值会通过定义的 [reducer](https://docs.langchain.com/oss/javascript/langgraph/graph-api#reducers) 函数处理，因此带 reducer 的通道会*累加*值而不是覆盖。

你可以选择指定 `asNode` 来控制将更新视为来自哪个节点，这会影响接下来执行哪个节点。详见[时间旅行：`asNode`](/tutorials/LangGraph/时间旅行)章节。

![Update](https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=a52016b2c44b57bd395d6e1eac47aa36)

## 持久化模式

LangGraph 支持三种持久化模式（durability modes），让你在性能和数据一致性之间进行平衡。你可以在调用任何图执行方法时指定持久化模式：

```typescript
await graph.stream(
  { input: "test" },
  { durability: "sync" }
)
```

从最低到最高持久化程度，三种模式如下：

- **`"exit"`**：LangGraph 仅在图执行退出时持久化变更——无论是成功退出、出错退出，还是因人机协作中断而退出。这为长时间运行的图提供了最佳性能，但意味着中间状态不会被保存，因此无法从执行中途的系统故障（如进程崩溃）中恢复。
- **`"async"`**：LangGraph 在下一步执行时异步持久化变更。这提供了良好的性能和持久性，但如果进程在执行期间崩溃，LangGraph 可能无法写入检查点，存在小概率风险。
- **`"sync"`**：LangGraph 在下一步开始前同步持久化变更。这确保 LangGraph 在继续执行前写入每个检查点，提供高持久性但会增加一些性能开销。

## 优化检查点存储

## 检查点器库

在底层，检查点功能由符合 [`BaseCheckpointSaver`](https://reference.langchain.com/javascript/langchain-langgraph/index/BaseCheckpointSaver) 接口的 checkpointer 对象驱动。LangGraph 提供了多种 checkpointer 实现，均以独立的可安装库形式提供：

- `@langchain/langgraph-checkpoint`：checkpointer saver 的基础接口（[`BaseCheckpointSaver`](https://reference.langchain.com/javascript/langchain-langgraph/index/BaseCheckpointSaver)）和序列化/反序列化接口（[`SerializerProtocol`](https://reference.langchain.com/javascript/langchain-langgraph-checkpoint/SerializerProtocol)）。包含用于实验的内存 checkpointer 实现（[`MemorySaver`](https://reference.langchain.com/javascript/langchain-langgraph/index/MemorySaver)）。LangGraph 已内置 `@langchain/langgraph-checkpoint`。
- `@langchain/langgraph-checkpoint-sqlite`：使用 SQLite 数据库的 checkpointer 实现（[`SqliteSaver`](https://reference.langchain.com/javascript/langchain-langgraph-checkpoint-sqlite/SqliteSaver)），适合实验和本地工作流，需要单独安装。
- `@langchain/langgraph-checkpoint-postgres`：使用 PostgreSQL 数据库的高级 checkpointer（[`PostgresSaver`](https://reference.langchain.com/javascript/langchain-langgraph-checkpoint-postgres/index/PostgresSaver)），LangSmith 中也使用此实现，适合生产环境，需要单独安装。
- `@langchain/langgraph-checkpoint-mongodb`：基于 MongoDB 的高级 checkpointer（`MongoDBSaver`）和长期记忆存储（`MongoDBStore`）。该存储支持跨线程持久化和可选的集成向量搜索，适合生产环境，需要单独安装。
- `@langchain/langgraph-checkpoint-redis`：使用 Redis 数据库的高级 checkpointer（`RedisSaver`），适合生产环境，需要单独安装。

### Checkpointer 接口

每个 checkpointer 都符合 [`BaseCheckpointSaver`](https://reference.langchain.com/javascript/langchain-langgraph/index/BaseCheckpointSaver) 接口，并实现以下方法：

- `.put` - 存储检查点及其配置和元数据。
- `.putWrites` - 存储与检查点关联的中间写入（即[待处理写入](#pending-writes-待处理写入pending-writes)）。
- `.getTuple` - 根据给定配置（`thread_id` 和 `checkpoint_id`）获取检查点元组。用于在 `graph.getState()` 中填充 `StateSnapshot`。
- `.list` - 列出匹配给定配置和过滤条件的检查点。用于在 `graph.getStateHistory()` 中填充状态历史。

## 构建自定义检查点器

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/checkpointers) 翻译并二次创作。
