---
title: Pregel 运行时
categories: LangGraph
order: 27
date: 2026-06-25
tags:
  - LangGraph
  - Pregel
  - 运行时
---

# Pregel 运行时

[`Pregel`](https://reference.langchain.com/javascript/langchain-langgraph/index/Pregel) 是 LangGraph 的底层运行时引擎，负责管理 LangGraph 应用的实际执行过程。

当我们编译一个 [StateGraph](https://reference.langchain.com/javascript/langchain-langgraph/index/StateGraph) 或使用 [entrypoint](https://reference.langchain.com/javascript/langchain-langgraph/index/entrypoint) 创建函数式 API 时，底层都会生成一个 [`Pregel`](https://reference.langchain.com/javascript/langchain-langgraph/index/Pregel) 实例，然后就可以用 `.invoke()` 接收输入并执行。

本篇指南将从高层视角解释运行时的工作原理，并提供直接使用 Pregel 构建应用的说明。

> **关于 Pregel 这个名字：** [`Pregel`](https://reference.langchain.com/javascript/langchain-langgraph/index/Pregel) 运行时以 [Google 的 Pregel 算法](https://research.google/pubs/pub37252/) 命名。该算法描述了一种基于图的大规模并行计算高效方法，而 LangGraph 借鉴了这一思想来实现其执行引擎。

## 运行时概览

在 LangGraph 中，Pregel 将[**执行器（Actor）**](https://en.wikipedia.org/wiki/Actor_model)和**通道（Channel）**组合成一个完整的应用。**执行器**从通道中读取数据，也向通道中写入数据。Pregel 按照核心的 **Pregel 算法** / **批量同步并行（BSP）** 模型，将应用的执行组织为多个步骤。

每个执行步骤（step）包含三个阶段：

- **规划（Plan）**：决定本步骤需要执行哪些**执行器**。例如，在第一步中选择订阅了特殊**输入**通道的执行器；在后续步骤中，选择订阅了上一步更新通道的执行器。
- **执行（Execution）**：并行执行所有选中的**执行器**，直到全部完成、或某个失败、或达到超时。在此阶段，通道更新对执行器不可见，直到下一步骤才开始。
- **更新（Update）**：用本步骤中**执行器**写入的值来更新通道。

如此循环，直到没有**执行器**被选中执行，或达到最大步数限制。

> 这种"规划 -> 并行执行 -> 更新"的三阶段模型，正是 Pregel 算法的精髓。它保证了执行器之间的隔离性——同一步骤中的执行器看不到彼此的写入，只有到下一步骤才能读到结果。这种设计使得复杂的图编排可以安全地并行执行。

## 执行器（Actor）

**执行器**在 LangGraph 中就是一个 `PregelNode`。它订阅通道、从通道读取数据、向通道写入数据，可以类比为 Pregel 算法中的"actor"。`PregelNode` 实现了 LangChain 的 Runnable 接口，因此可以被组合、流式输出、异步调用。

## 通道（Channel）

通道用于执行器（PregelNode）之间的通信。每个通道都有一个值类型、一个更新类型和一个更新函数——更新函数接收一系列更新值，并修改通道中存储的值。通道可以用于在链与链之间传递数据，也可以用于将数据从一个步骤传递到后续步骤。

LangGraph 提供了几种内置通道类型，各有不同的用途。

### LastValue

[`LastValue`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.channels.LastValue.html) 是默认的通道类型。它只存储最后一次写入的值，之前的值会被覆盖。适用于输入/输出值，或在步骤之间传递数据。

```typescript
import { LastValue } from "@langchain/langgraph/channels";

const channel = new LastValue<number>();
```

### Topic

[`Topic`](https://reference.langchain.com/javascript/langchain-langgraph/channels/Topic) 是一种可配置的发布/订阅（PubSub）通道，适合在执行器之间发送多个值，或在多个步骤间累积输出。它可以配置为去重值或累积一次运行中写入的所有值。

```typescript
import { Topic } from "@langchain/langgraph/channels";

// 累积所有步骤中写入的值
const channel = new Topic<string>({ accumulate: true });
```

### BinaryOperatorAggregate

[`BinaryOperatorAggregate`](https://reference.langchain.com/javascript/langchain-langgraph/channels/BinaryOperatorAggregate) 存储一个持久值，该值通过将二元操作符应用于当前值和每个新更新来更新。适合在多个步骤间计算累积聚合值（如累加、合并等）。

```typescript
import { BinaryOperatorAggregate } from "@langchain/langgraph/channels";

// 运行总计：每次写入都加到当前值上
const total = new BinaryOperatorAggregate<number>({ operator: (a, b) => a + b });
```

> 这三种通道类型覆盖了最常见的使用场景：`LastValue` 用于简单的"最新值"传递，`Topic` 用于多值发布/订阅，`BinaryOperatorAggregate` 用于需要 reducer 语义的聚合操作。在 StateGraph 中，每个状态 key 默认使用 `LastValue`，而定义了 reducer 的 key 会自动使用 `BinaryOperatorAggregate`。

## 直接使用 Pregel 的示例

虽然大多数用户会通过 [StateGraph](https://reference.langchain.com/javascript/langchain-langgraph/index/StateGraph) API 或 [entrypoint](https://reference.langchain.com/javascript/langchain-langgraph/index/entrypoint) 装饰器来间接使用 Pregel，但直接操作 Pregel API 也是可行的。

下面通过几个示例帮助你理解 Pregel 的底层 API。

### 单节点

最简单的 Pregel 应用：一个节点订阅通道 `a`，将输入字符串翻倍后写入通道 `b`。

```typescript
import { EphemeralValue } from "@langchain/langgraph/channels";
import { Pregel, NodeBuilder } from "@langchain/langgraph/pregel";

const node1 = new NodeBuilder()
  .subscribeOnly("a")
  .do((x: string) => x + x)
  .writeTo("b");

const app = new Pregel({
  nodes: { node1 },
  channels: {
    a: new EphemeralValue<string>(),
    b: new EphemeralValue<string>(),
  },
  inputChannels: ["a"],
  outputChannels: ["b"],
});

await app.invoke({ a: "foo" });
```

```console
{ b: 'foofoo' }
```

### 多节点

两个节点串联：`node1` 翻倍后写入通道 `b`，`node2` 再从 `b` 读取并翻倍后写入通道 `c`。

```typescript
import { LastValue, EphemeralValue } from "@langchain/langgraph/channels";
import { Pregel, NodeBuilder } from "@langchain/langgraph/pregel";

const node1 = new NodeBuilder()
  .subscribeOnly("a")
  .do((x: string) => x + x)
  .writeTo("b");

const node2 = new NodeBuilder()
  .subscribeOnly("b")
  .do((x: string) => x + x)
  .writeTo("c");

const app = new Pregel({
  nodes: { node1, node2 },
  channels: {
    a: new EphemeralValue<string>(),
    b: new LastValue<string>(),
    c: new EphemeralValue<string>(),
  },
  inputChannels: ["a"],
  outputChannels: ["b", "c"],
});

await app.invoke({ a: "foo" });
```

```console
{ b: 'foofoo', c: 'foofoofoofoo' }
```

### Topic 通道

这个示例展示了如何使用 [`Topic`](https://reference.langchain.com/javascript/langchain-langgraph/channels/Topic) 通道来累积多个节点的写入值。`node1` 同时写入通道 `b` 和 `c`，`node2` 从 `b` 读取处理后也写入 `c`，最终 `c` 累积了两个值。

```typescript
import { EphemeralValue, Topic } from "@langchain/langgraph/channels";
import { Pregel, NodeBuilder } from "@langchain/langgraph/pregel";

const node1 = new NodeBuilder()
  .subscribeOnly("a")
  .do((x: string) => x + x)
  .writeTo("b", "c");

const node2 = new NodeBuilder()
  .subscribeTo("b")
  .do((x: { b: string }) => x.b + x.b)
  .writeTo("c");

const app = new Pregel({
  nodes: { node1, node2 },
  channels: {
    a: new EphemeralValue<string>(),
    b: new EphemeralValue<string>(),
    c: new Topic<string>({ accumulate: true }),
  },
  inputChannels: ["a"],
  outputChannels: ["c"],
});

await app.invoke({ a: "foo" });
```

```console
{ c: ['foofoo', 'foofoofoofoo'] }
```

### BinaryOperatorAggregate 通道

这个示例展示了如何使用 [`BinaryOperatorAggregate`](https://reference.langchain.com/javascript/langchain-langgraph/channels/BinaryOperatorAggregate) 通道实现一个 reducer。两个节点都写入通道 `c`，通过自定义的 reducer 函数将多个值用 ` | ` 连接起来。

```typescript
import { EphemeralValue, BinaryOperatorAggregate } from "@langchain/langgraph/channels";
import { Pregel, NodeBuilder } from "@langchain/langgraph/pregel";

const node1 = new NodeBuilder()
  .subscribeOnly("a")
  .do((x: string) => x + x)
  .writeTo("b", "c");

const node2 = new NodeBuilder()
  .subscribeOnly("b")
  .do((x: string) => x + x)
  .writeTo("c");

const reducer = (current: string, update: string) => {
  if (current) {
    return current + " | " + update;
  } else {
    return update;
  }
};

const app = new Pregel({
  nodes: { node1, node2 },
  channels: {
    a: new EphemeralValue<string>(),
    b: new EphemeralValue<string>(),
    c: new BinaryOperatorAggregate<string>({ operator: reducer }),
  },
  inputChannels: ["a"],
  outputChannels: ["c"],
});

await app.invoke({ a: "foo" });
```

### 循环（Cycle）

这个示例展示了如何在图中引入循环：让一个节点写入它自己订阅的通道。执行会持续进行，直到通道中写入 `null` 值。

```typescript
import { EphemeralValue } from "@langchain/langgraph/channels";
import { Pregel, NodeBuilder, ChannelWriteEntry } from "@langchain/langgraph/pregel";

const exampleNode = new NodeBuilder()
  .subscribeOnly("value")
  .do((x: string) => x.length < 10 ? x + x : null)
  .writeTo(new ChannelWriteEntry("value", { skipNone: true }));

const app = new Pregel({
  nodes: { exampleNode },
  channels: {
    value: new EphemeralValue<string>(),
  },
  inputChannels: ["value"],
  outputChannels: ["value"],
});

await app.invoke({ value: "a" });
```

```console
{ value: 'aaaaaaaaaaaaaaaa' }
```

> 这个循环示例非常精妙：节点每次执行都将字符串翻倍，直到长度达到 10 个字符以上时返回 `null`。`skipNone: true` 确保 `null` 不会被写回通道，从而终止循环。这正是 Agent "思考-行动"循环的底层原理。

## 高层 API

虽然直接操作 Pregel 可以实现完全的控制，但 LangGraph 提供了两个更高层的 API 来简化 Pregel 应用的创建。

### StateGraph（图 API）

[StateGraph](https://reference.langchain.com/javascript/langchain-langgraph/index/StateGraph) 是一个更高级的抽象，简化了 Pregel 应用的创建。它允许你定义节点和边组成的图。编译图时，StateGraph API 会自动为你创建 Pregel 应用。

```typescript
import { START, StateGraph } from "@langchain/langgraph";

interface Essay {
  topic: string;
  content?: string;
  score?: number;
}

const writeEssay = (essay: Essay) => {
  return {
    content: `Essay about ${essay.topic}`,
  };
};

const scoreEssay = (essay: Essay) => {
  return {
    score: 10
  };
};

const builder = new StateGraph<Essay>({
  channels: {
    topic: null,
    content: null,
    score: null,
  }
})
  .addNode("writeEssay", writeEssay)
  .addNode("scoreEssay", scoreEssay)
  .addEdge(START, "writeEssay")
  .addEdge("writeEssay", "scoreEssay");

// 编译图
// 这会返回一个 Pregel 实例
const graph = builder.compile();
```

编译后的 Pregel 实例会关联一组节点和通道。我们可以打印出来查看其内部结构：

```typescript
console.log(graph.nodes);
```

你会看到类似这样的输出：

```console
{
  __start__: PregelNode { ... },
  writeEssay: PregelNode { ... },
  scoreEssay: PregelNode { ... }
}
```

```typescript
console.log(graph.channels);
```

通道的结构则更为丰富：

```console
{
  topic: LastValue { ... },
  content: LastValue { ... },
  score: LastValue { ... },
  __start__: EphemeralValue { ... },
  writeEssay: EphemeralValue { ... },
  scoreEssay: EphemeralValue { ... },
  'branch:__start__:__self__:writeEssay': EphemeralValue { ... },
  'branch:__start__:__self__:scoreEssay': EphemeralValue { ... },
  'branch:writeEssay:__self__:writeEssay': EphemeralValue { ... },
  'branch:writeEssay:__self__:scoreEssay': EphemeralValue { ... },
  'branch:scoreEssay:__self__:writeEssay': EphemeralValue { ... },
  'branch:scoreEssay:__self__:scoreEssay': EphemeralValue { ... },
  'start:writeEssay': EphemeralValue { ... }
}
```

> 可以看到，StateGraph 在底层自动生成了大量的通道——每个状态 key 对应一个 `LastValue`，每个节点对应一个 `EphemeralValue`，此外还有用于边路由的 `branch:` 通道。这正是 StateGraph 封装的价值：你只需要定义业务逻辑，Pregel 运行时细节由框架自动处理。

### Functional API（函数式 API）

在[函数式 API](https://docs.langchain.com/oss/javascript/langgraph/functional-api) 中，你可以使用 [`entrypoint`](https://reference.langchain.com/javascript/langchain-langgraph/index/entrypoint) 来创建一个 Pregel 应用。`entrypoint` 装饰器允许你定义一个接收输入并返回输出的函数，框架会在底层自动创建对应的 Pregel 实例。

```typescript
import { MemorySaver } from "@langchain/langgraph";
import { entrypoint } from "@langchain/langgraph/func";

interface Essay {
  topic: string;
  content?: string;
  score?: number;
}

const checkpointer = new MemorySaver();

const writeEssay = entrypoint(
  { checkpointer, name: "writeEssay" },
  async (essay: Essay) => {
    return {
      content: `Essay about ${essay.topic}`,
    };
  }
);

console.log("Nodes: ");
console.log(writeEssay.nodes);
console.log("Channels: ");
console.log(writeEssay.channels);
```

```console
Nodes:
{ writeEssay: PregelNode { ... } }
Channels:
{
  __start__: EphemeralValue { ... },
  __end__: LastValue { ... },
  __previous__: LastValue { ... }
}
```

> 对比 StateGraph 的输出，函数式 API 生成的通道结构更加简洁——只有 `__start__`、`__end__` 和 `__previous__` 三个通道。这反映了两种 API 的设计差异：StateGraph 围绕状态通道的读写来组织计算，而函数式 API 则更像传统的函数调用，状态传递由框架在幕后管理。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/pregel) 翻译并二次创作。
