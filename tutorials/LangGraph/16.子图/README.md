---
title: 使用子图
categories: LangGraph
order: 16
date: 2026-06-25
tags:
  - LangGraph
  - 子图
  - 多Agent
---

# 使用子图

子图（Subgraph）是 LangGraph 中一项强大的组织能力：一个[图](/tutorials/LangGraph/快速开始)可以作为另一个图中的[节点](/tutorials/LangGraph/快速开始)来使用。这种"图中图"的模式让我们能够构建层次化的复杂应用。

子图在以下场景中特别有用：

- **构建多 Agent 系统**：不同的 Agent 可以各自封装为独立子图，再由父图统一编排。详见 [multi-agent 文档](https://docs.langchain.com/oss/javascript/langchain/multi-agent)。
- **复用节点集合**：将一组通用节点封装为子图，在多个图中重复使用，减少重复代码。
- **团队协作开发**：不同团队可以各自独立开发子图。只要子图的接口（输入/输出 schema）保持不变，父图无需了解子图内部的任何细节。

## 安装

```bash
npm install @langchain/langgraph
```

::: tip 使用 LangSmith 加速开发
注册 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-use-subgraphs)，可以快速定位问题、提升 LangGraph 项目的性能。LangSmith 提供追踪数据来调试、测试和监控你用 LangGraph 构建的 LLM 应用——参考 [LangSmith 快速入门](https://docs.smith.langchain.com)了解更多。
:::

## 定义子图通信方式

在引入子图时，我们需要定义父图与子图之间的通信方式。LangGraph 提供了两种主要模式：

| 模式 | 适用场景 | 状态 Schema |
| --- | --- | --- |
| [在节点中调用子图](#在节点中调用子图) | 父图与子图拥有**不同的状态 schema**（没有共享的 key），或者需要在两者之间转换状态 | 需要编写包装函数，将父图状态映射为子图输入，再将子图输出映射回父图状态 |
| [将子图作为节点添加](#将子图作为节点添加) | 父图与子图**共享状态 key**——子图直接读写父图的状态通道 | 直接将编译后的子图传给 `add_node`，无需包装函数 |

### 在节点中调用子图

当父图和子图拥有**不同的状态 schema**（没有共享的 key）时，我们可以在节点函数内部调用子图。这种模式在[多 Agent](https://docs.langchain.com/oss/javascript/langchain/multi-agent) 系统中非常常见——例如你想为每个 Agent 维护一份私有的消息历史。

节点函数的职责是"翻译"：在调用子图之前，将父图状态转换为子图状态；在子图返回后，将结果再转换回父图状态。

```typescript
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

const SubgraphState = new StateSchema({
  bar: z.string(),
});

// 子图
const subgraphBuilder = new StateGraph(SubgraphState)
  .addNode("subgraphNode1", (state) => {
    return { bar: "hi! " + state.bar };
  })
  .addEdge(START, "subgraphNode1");

const subgraph = subgraphBuilder.compile();

// 父图
const State = new StateSchema({
  foo: z.string(),
});

// 在节点中转换状态：父图 -> 子图 -> 父图
const builder = new StateGraph(State)
  .addNode("node1", async (state) => {
    const subgraphOutput = await subgraph.invoke({ bar: state.foo });
    return { foo: subgraphOutput.bar };
  })
  .addEdge(START, "node1");

const graph = builder.compile();
```

::: details 完整示例：不同的状态 schema
```typescript
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

// 定义子图
const SubgraphState = new StateSchema({
  // 注意：这些 key 都不与父图共享
  bar: z.string(),
  baz: z.string(),
});

const subgraphBuilder = new StateGraph(SubgraphState)
  .addNode("subgraphNode1", (state) => {
    return { baz: "baz" };
  })
  .addNode("subgraphNode2", (state) => {
    return { bar: state.bar + state.baz };
  })
  .addEdge(START, "subgraphNode1")
  .addEdge("subgraphNode1", "subgraphNode2");

const subgraph = subgraphBuilder.compile();

// 定义父图
const ParentState = new StateSchema({
  foo: z.string(),
});

const builder = new StateGraph(ParentState)
  .addNode("node1", (state) => {
    return { foo: "hi! " + state.foo };
  })
  .addNode("node2", async (state) => {
    // 1. 将父图状态转换为子图状态
    const response = await subgraph.invoke({ bar: state.foo });
    // 2. 将子图响应转换回父图状态
    return { foo: response.bar };
  })
  .addEdge(START, "node1")
  .addEdge("node1", "node2");

const graph = builder.compile();

const stream = await graph.streamEvents(
  { foo: "foo" },
  { subgraphs: true, version: "v3" }
);
for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```

输出结果：

```
[[], { node1: { foo: 'hi! foo' } }]
[['node2:9c36dd0f-151a-cb42-cbad-fa2f851f9ab7'], { subgraphNode1: { baz: 'baz' } }]
[['node2:9c36dd0f-151a-cb42-cbad-fa2f851f9ab7'], { subgraphNode2: { bar: 'hi! foobaz' } }]
[[], { node2: { foo: 'hi! foobaz' } }]
```
:::

::: details 完整示例：两层子图嵌套（父 -> 子 -> 孙）
```typescript
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import * as z from "zod";

// 孙子图
const GrandChildState = new StateSchema({
  myGrandchildKey: z.string(),
});

const grandchild = new StateGraph(GrandChildState)
  .addNode("grandchild1", (state) => {
    // 注意：子图或父图的 key 在这里无法访问
    return { myGrandchildKey: state.myGrandchildKey + ", how are you" };
  })
  .addEdge(START, "grandchild1")
  .addEdge("grandchild1", END);

const grandchildGraph = grandchild.compile();

// 子图
const ChildState = new StateSchema({
  myChildKey: z.string(),
});

const child = new StateGraph(ChildState)
  .addNode("child1", async (state) => {
    // 注意：父图或孙子图的 key 在这里无法访问
    // 1. 将子图状态通道（myChildKey）转换为孙子图状态通道（myGrandchildKey）
    const grandchildGraphInput = { myGrandchildKey: state.myChildKey };
    const grandchildGraphOutput = await grandchildGraph.invoke(grandchildGraphInput);
    // 2. 将孙子图状态通道（myGrandchildKey）转换回子图状态通道（myChildKey）
    return { myChildKey: grandchildGraphOutput.myGrandchildKey + " today?" };
  })
  .addEdge(START, "child1")
  .addEdge("child1", END);

const childGraph = child.compile();

// 父图
const ParentState = new StateSchema({
  myKey: z.string(),
});

const parent = new StateGraph(ParentState)
  .addNode("parent1", (state) => {
    // 注意：子图或孙子图的 key 在这里无法访问
    return { myKey: "hi " + state.myKey };
  })
  .addNode("child", async (state) => {
    // 3. 这里传入的是函数而不是编译后的图（childGraph）
    // 4. 将父图状态通道（myKey）转换为子图状态通道（myChildKey）
    const childGraphInput = { myChildKey: state.myKey };
    const childGraphOutput = await childGraph.invoke(childGraphInput);
    // 5. 将子图状态通道（myChildKey）转换回父图状态通道（myKey）
    return { myKey: childGraphOutput.myChildKey };
  })
  .addNode("parent2", (state) => {
    return { myKey: state.myKey + " bye!" };
  })
  .addEdge(START, "parent1")
  .addEdge("parent1", "child")
  .addEdge("child", "parent2")
  .addEdge("parent2", END);

const parentGraph = parent.compile();

const stream = await parentGraph.streamEvents(
  { myKey: "Bob" },
  { subgraphs: true, version: "v3" }
);
for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```

输出结果：

```
[[], { parent1: { myKey: 'hi Bob' } }]
[['child:2e26e9ce-602f-862c-aa66-1ea5a4655e3b', 'child1:781bb3b1-3971-84ce-810b-acf819a03f9c'], { grandchild1: { myGrandchildKey: 'hi Bob, how are you' } }]
[['child:2e26e9ce-602f-862c-aa66-1ea5a4655e3b'], { child1: { myChildKey: 'hi Bob, how are you today?' } }]
[[], { child: { myKey: 'hi Bob, how are you today?' } }]
[[], { parent2: { myKey: 'hi Bob, how are you today? bye!' } }]
```
:::

### 将子图作为节点添加

当父图和子图**共享状态 key** 时，我们可以直接将编译后的子图传给 `add_node`，无需编写任何包装函数——子图会自动读写父图的状态通道。例如，在[多 Agent](https://docs.langchain.com/oss/javascript/langchain/multi-agent) 系统中，多个 Agent 通常通过共享的 [messages](https://docs.langchain.com/oss/javascript/langgraph/graph-api) key 来通信。

如果你的子图与父图共享状态 key，只需两步即可完成集成：

1. 定义子图工作流（下例中的 `subgraphBuilder`）并编译
2. 将编译后的子图传给父图的 `.addNode` 方法

```typescript
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  foo: z.string(),
});

// 子图
const subgraphBuilder = new StateGraph(State)
  .addNode("subgraphNode1", (state) => {
    return { foo: "hi! " + state.foo };
  })
  .addEdge(START, "subgraphNode1");

const subgraph = subgraphBuilder.compile();

// 父图——直接将子图作为节点添加
const builder = new StateGraph(State)
  .addNode("node1", subgraph)
  .addEdge(START, "node1");

const graph = builder.compile();
```

::: details 完整示例：共享状态 schema
```typescript
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

// 定义子图
const SubgraphState = new StateSchema({
  foo: z.string(),    // 此 key 与父图共享
  bar: z.string(),    // 此 key 是子图私有的，父图不可见
});

const subgraphBuilder = new StateGraph(SubgraphState)
  .addNode("subgraphNode1", (state) => {
    return { bar: "bar" };
  })
  .addNode("subgraphNode2", (state) => {
    // 注意：此节点使用了子图私有的 key（'bar'），
    // 同时在共享 key（'foo'）上发送更新
    return { foo: state.foo + state.bar };
  })
  .addEdge(START, "subgraphNode1")
  .addEdge("subgraphNode1", "subgraphNode2");

const subgraph = subgraphBuilder.compile();

// 定义父图
const ParentState = new StateSchema({
  foo: z.string(),
});

const builder = new StateGraph(ParentState)
  .addNode("node1", (state) => {
    return { foo: "hi! " + state.foo };
  })
  .addNode("node2", subgraph)
  .addEdge(START, "node1")
  .addEdge("node1", "node2");

const graph = builder.compile();

const stream = await graph.streamEvents({ foo: "foo" }, { version: "v3" });
for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```

输出结果：

```
{ node1: { foo: 'hi! foo' } }
{ node2: { foo: 'hi! foobar' } }
```
:::

## 子图的持久化

使用子图时，我们需要决定它的内部数据在不同调用之间如何持久化。想象一个客服机器人将任务委托给专家子 Agent：那个"账单专家"子 Agent 应该记住客户之前的问题，还是每次调用都从头开始？

`.compile()` 上的 `checkpointer` 参数控制着子图的持久化行为：

| 模式 | `checkpointer=` | 行为 |
| --- | --- | --- |
| [单次调用](#单次调用默认模式) | `None`（默认） | 每次调用从全新状态开始，并继承父图的 checkpointer，以支持单次调用内的[中断](/tutorials/LangGraph/中断)和[持久化执行](/tutorials/LangGraph/持久化)。 |
| [线程级](#线程级持久化) | `True` | 状态在同一线程的多次调用间累积。每次调用从上次中断处继续。 |
| [无状态](#无状态模式) | `False` | 完全不做检查点——就像普通函数调用一样。不支持中断或持久化执行。 |

对于大多数应用（包括[多 Agent](https://docs.langchain.com/oss/javascript/langchain/multi-agent) 系统中处理独立请求的子 Agent），单次调用模式是正确的选择。只有当子 Agent 需要多轮对话记忆时（例如一个研究助手需要在多次交流中累积上下文），才使用线程级模式。

::: info
父图必须使用 checkpointer 编译，子图的持久化功能（中断、状态检查、线程级记忆）才能正常工作。详见[持久化](/tutorials/LangGraph/持久化)。
:::

::: info 关于 create_agent
下面的示例使用 LangChain 的 [`create_agent`](https://reference.langchain.com/javascript/langchain/index/createAgent)，这是构建 Agent 的常用方式。`create_agent` 底层会生成一个 [LangGraph 图](https://docs.langchain.com/oss/javascript/langgraph/graph-api)，因此所有子图持久化概念都直接适用。如果你使用原始 LangGraph `StateGraph` 构建，同样的模式和配置选项同样适用——详见 [Graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api)。
:::

### 有状态模式

有状态子图会继承父图的 checkpointer，从而支持[中断](/tutorials/LangGraph/中断)、[持久化](/tutorials/LangGraph/持久化)和状态检查。两种有状态模式的区别在于状态的保留时长。

#### 单次调用（默认模式）

::: tip 推荐用于大多数场景
这是大多数应用推荐的模式，包括[多 Agent](https://docs.langchain.com/oss/javascript/langchain/multi-agent) 系统中子 Agent 作为工具被调用的场景。它支持[中断](/tutorials/LangGraph/中断)、[持久化](/tutorials/LangGraph/持久化)和并行调用，同时保持每次调用相互隔离。
:::

当每次调用子图都是独立的、子 Agent 不需要记住之前调用的任何信息时，使用单次调用持久化。这是最常见的模式，尤其适合[多 Agent](https://docs.langchain.com/oss/javascript/langchain/multi-agent) 系统中处理一次性请求的子 Agent——比如"查询这个客户的订单"或"总结这份文档"。

省略 `checkpointer` 或设为 `None`。每次调用都从全新状态开始，但在单次调用内，子图会继承父图的 checkpointer，可以使用 `interrupt()` 暂停和恢复。

下面的示例使用两个子 Agent（水果专家、蔬菜专家）作为外层 Agent 的工具：

```typescript
import { createAgent, tool } from "langchain";
import { MemorySaver, Command, interrupt } from "@langchain/langgraph";
import * as z from "zod";

const fruitInfo = tool(
  (input) => `Info about ${input.fruitName}`,
  {
    name: "fruit_info",
    description: "Look up fruit info.",
    schema: z.object({ fruitName: z.string() }),
  }
);

const veggieInfo = tool(
  (input) => `Info about ${input.veggieName}`,
  {
    name: "veggie_info",
    description: "Look up veggie info.",
    schema: z.object({ veggieName: z.string() }),
  }
);

// 子 Agent —— 不设置 checkpointer（继承父图的）
const fruitAgent = createAgent({
  model: "gpt-5.4-mini",
  tools: [fruitInfo],
  prompt: "You are a fruit expert. Use the fruit_info tool. Respond in one sentence.",
});

const veggieAgent = createAgent({
  model: "gpt-5.4-mini",
  tools: [veggieInfo],
  prompt: "You are a veggie expert. Use the veggie_info tool. Respond in one sentence.",
});

// 将子 Agent 包装为外层 Agent 的工具
const askFruitExpert = tool(
  async (input) => {
    const response = await fruitAgent.invoke({
      messages: [{ role: "user", content: input.question }],
    });
    return response.messages[response.messages.length - 1].content;
  },
  {
    name: "ask_fruit_expert",
    description: "Ask the fruit expert. Use for ALL fruit questions.",
    schema: z.object({ question: z.string() }),
  }
);

const askVeggieExpert = tool(
  async (input) => {
    const response = await veggieAgent.invoke({
      messages: [{ role: "user", content: input.question }],
    });
    return response.messages[response.messages.length - 1].content;
  },
  {
    name: "ask_veggie_expert",
    description: "Ask the veggie expert. Use for ALL veggie questions.",
    schema: z.object({ question: z.string() }),
  }
);

// 外层 Agent，带有 checkpointer
const agent = createAgent({
  model: "gpt-5.4-mini",
  tools: [askFruitExpert, askVeggieExpert],
  prompt:
    "You have two experts: ask_fruit_expert and ask_veggie_expert. " +
    "ALWAYS delegate questions to the appropriate expert.",
  checkpointer: new MemorySaver(),
});
```

::: details 中断（Interrupts）
每次调用都可以使用 `interrupt()` 暂停和恢复。在工具函数中添加 `interrupt()` 来要求用户审批后继续：

```typescript
const fruitInfo = tool(
  (input) => {
    interrupt("continue?");  // 暂停，等待用户确认
    return `Info about ${input.fruitName}`;
  },
  {
    name: "fruit_info",
    description: "Look up fruit info.",
    schema: z.object({ fruitName: z.string() }),
  }
);
```

```typescript
const config = { configurable: { thread_id: "1" } };

// 调用 —— 子 Agent 的工具调用了 interrupt()
let response = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about apples" }] },
  config,
);
// response 中包含 __interrupt__

// 恢复 —— 批准中断
response = await agent.invoke(new Command({ resume: true }), config);
// 子 Agent 消息数：4
```
:::

::: details 多轮对话
每次调用都从全新的子 Agent 状态开始。子 Agent 不会记住之前的调用：

```typescript
const config = { configurable: { thread_id: "1" } };

// 第一次调用
let response = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about apples" }] },
  config,
);
// 子 Agent 消息数：4

// 第二次调用 —— 子 Agent 从头开始，不记得苹果的信息
response = await agent.invoke(
  { messages: [{ role: "user", content: "Now tell me about bananas" }] },
  config,
);
// 子 Agent 消息数：4（依然是全新的！）
```
:::

::: details 多次子图调用
对同一子图的多次调用不会产生冲突，因为每次调用都有自己的检查点命名空间：

```typescript
const config = { configurable: { thread_id: "1" } };

// LLM 同时调用 ask_fruit_expert 查询苹果和香蕉
const response = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about apples and bananas" }] },
  config,
);
// 子 Agent 消息数：4（苹果 —— 全新）
// 子 Agent 消息数：4（香蕉 —— 全新）
```
:::

#### 线程级持久化

当子 Agent 需要记住之前的交互时，使用线程级持久化。例如，一个研究助手需要在多次交流中累积上下文，或一个编程助手需要记录它已经编辑过哪些文件。子 Agent 的对话历史和数据会在同一线程的多次调用间累积，每次调用从上次中断处继续。

使用 `checkpointer=true` 编译子图以启用此行为。

::: warning 线程级子图不支持并行工具调用
当 LLM 可以访问一个线程级子 Agent 作为工具时，它可能会尝试并行调用该工具多次（例如同时向水果专家询问苹果和香蕉）。这会导致检查点冲突，因为两个调用写入同一个命名空间。

下面的示例使用 LangChain 的 `ToolCallLimitMiddleware` 来避免此问题。如果你使用纯 LangGraph `StateGraph` 构建，需要自行避免并行工具调用——例如配置模型禁用并行工具调用，或添加逻辑确保同一子图不会被并行多次调用。
:::

下面的示例使用一个以 `checkpointer=true` 编译的水果专家子 Agent：

```typescript
import { createAgent, tool, toolCallLimitMiddleware } from "langchain";
import { MemorySaver, Command, interrupt } from "@langchain/langgraph";
import * as z from "zod";

const fruitInfo = tool(
  (input) => `Info about ${input.fruitName}`,
  {
    name: "fruit_info",
    description: "Look up fruit info.",
    schema: z.object({ fruitName: z.string() }),
  }
);

// 子 Agent，checkpointer=true 以实现持久化状态
const fruitAgent = createAgent({
  model: "gpt-5.4-mini",
  tools: [fruitInfo],
  prompt: "You are a fruit expert. Use the fruit_info tool. Respond in one sentence.",
  checkpointer: true,
});

// 将子 Agent 包装为外层 Agent 的工具
const askFruitExpert = tool(
  async (input) => {
    const response = await fruitAgent.invoke({
      messages: [{ role: "user", content: input.question }],
    });
    return response.messages[response.messages.length - 1].content;
  },
  {
    name: "ask_fruit_expert",
    description: "Ask the fruit expert. Use for ALL fruit questions.",
    schema: z.object({ question: z.string() }),
  }
);

// 外层 Agent，带有 checkpointer
// 使用 toolCallLimitMiddleware 防止对线程级子 Agent 的并行调用，
// 否则会导致检查点冲突。
const agent = createAgent({
  model: "gpt-5.4-mini",
  tools: [askFruitExpert],
  prompt: "You have a fruit expert. ALWAYS delegate fruit questions to ask_fruit_expert.",
  middleware: [
    toolCallLimitMiddleware({ toolName: "ask_fruit_expert", runLimit: 1 }),
  ],
  checkpointer: new MemorySaver(),
});
```

::: details 中断（Interrupts）
线程级子 Agent 和单次调用一样支持 `interrupt()`。在工具函数中添加 `interrupt()` 来要求用户审批：

```typescript
const fruitInfo = tool(
  (input) => {
    interrupt("continue?");  // 暂停，等待用户确认
    return `Info about ${input.fruitName}`;
  },
  {
    name: "fruit_info",
    description: "Look up fruit info.",
    schema: z.object({ fruitName: z.string() }),
  }
);
```

```typescript
const config = { configurable: { thread_id: "1" } };

// 调用 —— 子 Agent 的工具调用了 interrupt()
let response = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about apples" }] },
  config,
);
// response 中包含 __interrupt__

// 恢复 —— 批准中断
response = await agent.invoke(new Command({ resume: true }), config);
// 子 Agent 消息数：4
```
:::

::: details 多轮对话
状态在多次调用间累积——子 Agent 记住了之前的对话：

```typescript
const config = { configurable: { thread_id: "1" } };

// 第一次调用
let response = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about apples" }] },
  config,
);
// 子 Agent 消息数：4

// 第二次调用 —— 子 Agent 记住了关于苹果的对话
response = await agent.invoke(
  { messages: [{ role: "user", content: "Now tell me about bananas" }] },
  config,
);
// 子 Agent 消息数：8（累积了！）
```
:::

::: details 多次子图调用
当你有多个**不同的**线程级子图时（例如一个水果专家和一个蔬菜专家），每个子图都需要自己的存储空间，以避免检查点相互覆盖。这被称为**命名空间隔离**。

如果你[在节点中调用子图](#在节点中调用子图)，LangGraph 会根据调用顺序分配命名空间（第一次调用、第二次调用等）。这意味着重新排列调用顺序可能导致子图加载到错误的状态。为避免此问题，可以将每个子 Agent 包装在各自的 `StateGraph` 中，并赋予唯一的节点名——这会为每个子图提供一个稳定的唯一命名空间：

```typescript
import { StateGraph, StateSchema, MessagesValue, START } from "@langchain/langgraph";

function createSubAgent(model: string, { name, ...kwargs }: { name: string; [key: string]: any }) {
  const agent = createAgent({ model, name, ...kwargs });
  return new StateGraph(new StateSchema({ messages: MessagesValue }))
    .addNode(name, agent)  // 唯一的 name → 稳定的命名空间
    .addEdge(START, name)
    .compile();
}

const fruitAgent = createSubAgent("gpt-5.4-mini", {
  name: "fruit_agent", tools: [fruitInfo], prompt: "...", checkpointer: true,
});
const veggieAgent = createSubAgent("gpt-5.4-mini", {
  name: "veggie_agent", tools: [veggieInfo], prompt: "...", checkpointer: true,
});
const config = { configurable: { thread_id: "1" } };

// 第一次调用 —— LLM 同时调用水果和蔬菜专家
let response = await agent.invoke(
  { messages: [{ role: "user", content: "Tell me about cherries and broccoli" }] },
  config,
);
// 水果子 Agent 消息数：4
// 蔬菜子 Agent 消息数：4

// 第二次调用 —— 两个 Agent 各自独立累积
response = await agent.invoke(
  { messages: [{ role: "user", content: "Now tell me about oranges and carrots" }] },
  config,
);
// 水果子 Agent 消息数：8（记住了樱桃！）
// 蔬菜子 Agent 消息数：8（记住了西兰花！）
```

通过[将子图作为节点添加](#将子图作为节点添加)的子图已经自动获得基于名称的命名空间，因此不需要这种包装。
:::

### 无状态模式

当你想让子 Agent 像普通函数调用一样运行、完全不做检查点时，使用此模式。子图无法暂停/恢复，也不享有[持久化执行](/tutorials/LangGraph/持久化)的好处。使用 `checkpointer=false` 编译。

::: warning 无检查点的风险
没有检查点，子图就没有持久化执行能力。如果进程在运行中途崩溃，子图无法恢复，必须从头重新运行。
:::

```typescript
const subgraphBuilder = new StateGraph(...);
const subgraph = subgraphBuilder.compile({ checkpointer: false });
```

### 持久化模式对照表

通过 `.compile()` 的 `checkpointer` 参数控制子图持久化：

```typescript
const subgraph = builder.compile({ checkpointer: false });  // 或 true，或 null
```

| 功能 | 单次调用（默认） | 线程级 | 无状态 |
| --- | --- | --- | --- |
| `checkpointer=` | `None` | `True` | `False` |
| 中断（HITL） | ✅ | ✅ | ❌ |
| 多轮记忆 | ❌ | ✅ | ❌ |
| 多次调用（不同子图） | ✅ | ⚠️ 可能命名空间冲突，有解决方案 | ✅ |
| 多次调用（同一子图） | ✅ | ❌ | ✅ |
| 状态检查 | ⚠️ 仅当前调用期间可用 | ✅ | ❌ |

- **中断（HITL）**：子图可以使用 [interrupt()](/tutorials/LangGraph/中断) 暂停执行、等待用户输入，然后从中断处恢复。
- **多轮记忆**：子图在同一[线程](/tutorials/LangGraph/检查点)的多次调用间保留状态。每次调用从上次中断处继续，而不是从头开始。
- **多次调用（不同子图）**：在单个节点内可以调用多个不同的子图实例，不会产生检查点命名空间冲突。
- **多次调用（同一子图）**：同一子图实例在单个节点内可以被多次调用。在有状态持久化下，这些调用会写入同一检查点命名空间并产生冲突——此时应改用单次调用持久化。
- **状态检查**：子图状态可通过 `get_state(config, subgraphs=true)` 获取，用于调试和监控。

## 查看子图状态

当你启用了[持久化](/tutorials/LangGraph/持久化)后，可以通过 `subgraphs` 选项检查子图状态。使用[无状态](#无状态模式)检查点（`checkpointer=false`）时，不会保存子图检查点，因此子图状态不可用。

::: info 静态发现要求
查看子图状态要求 LangGraph 能够**静态发现**子图——即子图是[作为节点添加](#将子图作为节点添加)的或[在节点中调用](#在节点中调用子图)的。如果子图是在[工具](https://docs.langchain.com/oss/javascript/langchain/tools)函数或其他间接方式中调用的（例如 [subagents](https://docs.langchain.com/oss/javascript/langchain/multi-agent/subagents) 模式），则不支持。无论嵌套层级如何，中断仍然会传播到顶层图。
:::

::: details 单次调用模式
返回**当前调用**的子图状态。每次调用从全新状态开始。

```typescript
import { StateGraph, StateSchema, START, MemorySaver, interrupt, Command } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  foo: z.string(),
});

// 子图
const subgraphBuilder = new StateGraph(State)
  .addNode("subgraphNode1", (state) => {
    const value = interrupt("Provide value:");
    return { foo: state.foo + value };
  })
  .addEdge(START, "subgraphNode1");

const subgraph = subgraphBuilder.compile();  // 继承父图的 checkpointer

// 父图
const builder = new StateGraph(State)
  .addNode("node1", subgraph)
  .addEdge(START, "node1");

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };

await graph.invoke({ foo: "" }, config);

// 查看当前调用的子图状态
const subgraphState = (await graph.getState(config, { subgraphs: true })).tasks[0].state;

// 恢复子图
await graph.invoke(new Command({ resume: "bar" }), config);
```
:::

::: details 线程级模式
返回该线程上**所有调用累积**的子图状态。

```typescript
import { StateGraph, StateSchema, MessagesValue, START, MemorySaver } from "@langchain/langgraph";

// 带有独立持久化状态的子图
const SubgraphState = new StateSchema({
  messages: MessagesValue,
});

const subgraphBuilder = new StateGraph(SubgraphState);
// ... 添加节点和边
const subgraph = subgraphBuilder.compile({ checkpointer: true });

// 父图
const builder = new StateGraph(SubgraphState)
  .addNode("agent", subgraph)
  .addEdge(START, "agent");

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };

await graph.invoke({ messages: [{ role: "user", content: "hi" }] }, config);
await graph.invoke({ messages: [{ role: "user", content: "what did I say?" }] }, config);

// 查看累积的子图状态（包含两次调用的消息）
const subgraphState = (await graph.getState(config, { subgraphs: true })).tasks[0].state;
```
:::

## 流式输出子图结果

要观察嵌套图的执行过程，推荐使用[事件流](/tutorials/LangGraph/事件流)：`stream.subgraphs` 投影会自动发现每个嵌套运行，并暴露其 `path`、`messages` 和 `values`，无需手动解析命名空间字符串。

```typescript
const stream = await graph.streamEvents(
  { foo: "foo" },
  {
    subgraphs: true,   // 启用子图输出流
    version: "v3",
  }
);
for await (const snapshot of stream.values) {
  console.log(snapshot);
}
```

::: details 从子图流式输出完整示例
```typescript
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

// 定义子图
const SubgraphState = new StateSchema({
  foo: z.string(),
  bar: z.string(),
});

const subgraphBuilder = new StateGraph(SubgraphState)
  .addNode("subgraphNode1", (state) => {
    return { bar: "bar" };
  })
  .addNode("subgraphNode2", (state) => {
    // 注意：此节点使用了子图私有的 key（'bar'），
    // 同时在共享 key（'foo'）上发送更新
    return { foo: state.foo + state.bar };
  })
  .addEdge(START, "subgraphNode1")
  .addEdge("subgraphNode1", "subgraphNode2");

const subgraph = subgraphBuilder.compile();

// 定义父图
const ParentState = new StateSchema({
  foo: z.string(),
});

const builder = new StateGraph(ParentState)
  .addNode("node1", (state) => {
    return { foo: "hi! " + state.foo };
  })
  .addNode("node2", subgraph)
  .addEdge(START, "node1")
  .addEdge("node1", "node2");

const graph = builder.compile();

const stream = await graph.streamEvents(
  { foo: "foo" },
  {
    subgraphs: true,   // 启用子图输出流
    version: "v3",
  }
);
for await (const snapshot of stream.values) {
  console.log(snapshot);
}
```

输出结果：

```
[[], { node1: { foo: 'hi! foo' } }]
[['node2:e58e5673-a661-ebb0-70d4-e298a7fc28b7'], { subgraphNode1: { bar: 'bar' } }]
[['node2:e58e5673-a661-ebb0-70d4-e298a7fc28b7'], { subgraphNode2: { foo: 'hi! foobar' } }]
[[], { node2: { foo: 'hi! foobar' } }]
```
:::

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/use-subgraphs) 翻译并二次创作。
