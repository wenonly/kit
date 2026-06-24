---
title: 事件流
categories: LangGraph
order: 11
date: 2026-06-25
tags:
  - LangGraph
  - Event Streaming
---

# 事件流

> 用类型化的投影（projection）来流式消费 LangGraph 的运行过程：消息、状态、子图、输出、扩展，一应俱全。

事件流（Event Streaming）是 LangGraph 推荐的进程内流式模型，适用于绝大多数应用代码。它返回一个 run stream 对象，允许你以多种方式同时消费同一个运行过程中的不同切面。

## 快速上手

只需调用 `streamEvents` 并指定 `version: "v3"`，即可拿到一个类型化的 run stream 对象：

```ts
const stream = await graph.streamEvents(
  { messages: [{ role: "user", content: "What is 42 * 17?" }] },
  { version: "v3" }
);

for await (const message of stream.messages) {
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}

const finalState = await stream.output;
```

上面这段代码做了两件事：先逐 token 打印模型的回复，再通过 `stream.output` 拿到最终的完整状态。`stream.messages` 和 `stream.output` 共享同一个底层事件流，互不干扰。

> 如果你需要流式消费部署在 Agent Server 上的图，请参考 [LangSmith Streaming API](https://docs.langchain.com/langsmith/streaming)。

## 两层架构：Streaming 与 Event Streaming

LangGraph 的流式栈分为两层：

1. **Streaming（流式）**：从 Pregel 引擎发出原始的图执行事件。
2. **Event Streaming（事件流）**：对这些事件做归一化处理，经过 stream transformer 管道，最终暴露为类型化的投影。

```
Pregel engine（运行图步骤）
        |
    emits
        ↓
Raw Pregel events（updates / values / messages / custom / checkpoints / tasks / debug）
        |
     sent to
        ↓
Event router（事件路由器，将每个事件送入 transformer 管道）
        |
  cascades through
        ↓
Stream transformers（ValuesTransformer、MessagesTransformer、……、自定义 transformer）
        |
    produces
        ↓
Event Stream（面向应用代码的投影事件）
```

事件路由器（event router）是两层之间的桥梁。它接收归一化后的 Pregel 事件，将每个事件依次传递给已注册的 stream transformer。内置的 transformer 会创建标准投影，例如 `stream.messages`、`stream.values`、`stream.subgraphs` 和 `stream.output`；自定义 transformer 则可以在 `stream.extensions` 下添加应用专属的投影。

## 事件流提供了哪些投影

run stream 对象在一股底层事件流之上，暴露了多个类型化的投影：

| 投影 | 用途 |
| --- | --- |
| `stream` | 迭代每一个协议事件（protocol event）。 |
| `stream.messages` | 流式获取聊天模型的消息和 token delta。 |
| `stream.values` | 迭代状态快照，也可以 await 拿到最终值。 |
| `stream.output` | await 拿到最终输出。 |
| `stream.subgraphs` | 发现并观察嵌套的图执行。 |
| `stream.interrupts` | 检查人机协作（human-in-the-loop）中断时的 payload。 |
| `stream.interrupted` | 判断当前运行是否因等待人类输入而暂停。 |
| `stream.extensions` | 消费自定义 stream transformer 产生的投影。 |

> 多个消费者可以并发读取这些投影。读取 `stream.messages` 不会"消费掉" `stream.values`、`stream.subgraphs` 或 `stream.output` 所需的事件——它们各自独立。

事件流位于 [流式输出](/tutorials/LangGraph/流式输出) 之上。后者通过 `stream_mode` 模式（如 `updates`、`values`、`messages`、`custom`、`checkpoints`、`tasks`、`debug`）暴露原始的图执行事件。当你需要对这些模式做低级别访问时使用 streaming；当应用代码能从类型化投影中受益时，使用事件流。

## 流式获取消息

使用 `stream.messages` 获取聊天模型的输出：

```ts
const stream = await graph.streamEvents(input, { version: "v3" });

for await (const message of stream.messages) {
  const text = await message.text;
  const usage = await message.usage;

  console.log(text);
  console.log(usage);
}
```

`message.text` 既可以作为异步迭代器使用（逐 token 输出），也可以作为 Promise 来 await（拿到完整文本）。非常灵活。

## 流式获取子图

使用 `stream.subgraphs` 观察嵌套的图执行，无需手动解析 namespace 字符串：

```ts
const stream = await graph.streamEvents(input, { version: "v3" });

for await (const subgraph of stream.subgraphs) {
  console.log(subgraph.name, subgraph.path);

  for await (const message of subgraph.messages) {
    console.log(await message.text);
  }
}
```

`subgraph.graph_name` 是编译后的图或 agent 的 `name`。当一个具名 agent 通过工具被调度（例如 Deep Agents 的 `task` 工具中调用 `create_agent(name=...)`），它会以这个名字出现在这里；同时，开启该作用域的 `lifecycle` 事件会携带一个 `cause` 字段，指回发起调度的 tool call。详见 [生命周期](#生命周期) 一节。

> 如果你在使用 Deep Agents 或 LangChain，可以分别参考 [Deep Agents 事件流](https://docs.langchain.com/oss/javascript/deepagents/event-streaming)（子 agent 流）和 [LangChain 流式输出](/tutorials/LangChain/流式输出)（工具调用与中间件事件）。

## 流式获取状态

使用 `stream.values` 在每个步骤后获取完整的状态快照：

```ts
const stream = await graph.streamEvents(input, { version: "v3" });

for await (const snapshot of stream.values) {
  console.log(snapshot);
}

const finalState = await stream.output;
```

## 并发消费多个投影

在 JavaScript 中，当你需要同时消费多个投影时，可以使用 `Promise.all` 让多个消费者并行运行：

```ts
await Promise.all([
  (async () => {
    for await (const message of stream.messages) {
      console.log(await message.text);
    }
  })(),
  (async () => {
    for await (const subgraph of stream.subgraphs) {
      console.log(subgraph.path);
    }
  })(),
]);
```

## 中断后恢复

当图因为等待人类输入而暂停时，你可以通过 `stream.interrupted` 和 `stream.interrupts` 检查中断状态，然后再次调用 `streamEvents(..., version="v3")` 并传入 `Command` 来恢复执行。

> 恢复执行要求图编译时配置了 checkpointer，并且 config 中携带了 thread ID——详见 [持久化](/tutorials/LangGraph/持久化)。

```ts
import { Command } from "@langchain/langgraph";

let stream = await graph.streamEvents(input, { version: "v3" });

for await (const message of stream.messages) {
  console.log(await message.text);
}

if (stream.interrupted) {
  console.log(stream.interrupts);
}

stream = await graph.streamEvents(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  { version: "v3" }
);
const finalState = await stream.output;
```

## 迭代原始协议事件

当你想要最原始的协议事件流时，可以直接迭代 run stream 对象本身：

```ts
const stream = await graph.streamEvents(
  { messages: [{ role: "user", content: "What is 42 * 17?" }] },
  { version: "v3" }
);

for await (const event of stream) {
  const namespace = event.params.namespace;
  console.log(namespace, event.method, event.params.data);
}
```

每个事件都是一个 `ProtocolEvent` 信封，包裹着特定 channel 的 payload。这也是 transformer 的 `process(event)` 接收到的数据结构：

```ts
interface ProtocolEvent {
  readonly seq: number;         // 在一次运行内严格递增，可用于排序
  readonly method: string;      // channel 名称："messages"、"values"、"updates"、"custom"、"tools"、"lifecycle" 等
  readonly params: {
    readonly namespace: string[];  // 从根图到发出事件的作用域的路径；[] 表示根
    readonly timestamp: number;    // 毫秒级时间戳；可能有偏移，不要依赖它做排序
    readonly node?: string;        // 发出该事件的图节点（如适用）
    readonly data: unknown;        // channel 特定的 payload；结构取决于 method
  };
}
```

`namespace` 是一条从根图到发出事件的作用域的路径。根图的 namespace 是空数组 `[]`。每进入一层子执行，路径上就会增加一个 `"name:runtime_id"` 段，所以子图中一个嵌套的工具调用看起来像 `["researcher:6f4d", "tools:91ac"]`。`:` 之前是稳定的图或节点名称，之后是每次调用的运行时 ID。当你只关心某个子树时，可以自行按 namespace 过滤原始事件——而 `stream.subgraphs` 已经为嵌套图执行做了这件事。

## Channel 与事件生命周期

原始事件在 channel 上流动。channel 名称就是事件的 `method` 字段，每个 channel 发出特定结构的事件：

| Channel | 用途 |
| --- | --- |
| `values` | 完整的图状态快照。 |
| `updates` | 每个节点的状态增量。 |
| `messages` | 以 content block 为中心的聊天模型输出。 |
| `tools` | 工具调用的开始、流式输出、完成和错误事件。 |
| `lifecycle` | 运行、子图、子 agent 的状态变更。 |
| `checkpoints` | 用于分支和时间旅行的轻量级 checkpoint 信封。 |
| `input` | 人机协作的输入请求和响应。 |
| `tasks` | Pregel 任务的创建和结果事件。 |
| `custom` | 图代码中用户自定义的 payload。 |
| `custom:<name>` | 应用自定义 stream transformer 的输出。 |

类型化投影（`stream.messages`、`stream.values` 等）正是基于这些 channel 构建的。当你直接迭代 run stream 对象时，channel 名称会作为事件的 `method` 字段出现。

### Messages channel

`messages` channel 以 content block 为单位来建模输出。data 的 `event` 字段取值如下：

- `message-start`
- `content-block-start`
- `content-block-delta`
- `content-block-finish`
- `message-finish`

Content block 有明确的边界：一个 block 先 start，然后发出零或多个 delta，最后 finish，同一消息中的下一个 block 才会开始。这种设计让 token 流式、reasoning block、工具调用 block 和多模态内容都变得显式且清晰，无需依赖提供商特定的格式。`message-finish` 可能包含 token 用量信息；不可恢复的模型调用失败以 message error 事件的形式到达。

如果你想直接消费原始的 content-block 事件，而不是使用 `stream.messages` 投影，可以这样做：

```ts
for await (const event of stream) {
  if (event.method !== "messages") continue;

  const data = event.params.data;
  if (data.event !== "content-block-delta") continue;

  const block = data.delta ?? {};
  if (block.type === "text-delta") {
    process.stdout.write(block.text ?? "");
  } else if (block.type === "reasoning-delta") {
    process.stdout.write(`[thinking]${block.reasoning ?? ""}`);
  }
}
```

### Tools channel

`tools` channel 暴露工具的执行过程。data 的 `event` 字段取值如下：

- `tool-started`
- `tool-output-delta`
- `tool-finished`
- `tool-error`

工具事件通过 tool call ID 关联，因此一个工具执行可以追溯到它在 `messages` channel 上对应的 tool-call content block。

### 生命周期

`lifecycle` channel 追踪根运行、子图和子 agent 的状态。data 的 `event` 字段取值如下：

- `started`
- `running`
- `completed`
- `failed`
- `interrupted`

除了 `event` 之外，lifecycle data 还可能携带可选的 `graph_name`、`error` 和 `cause` 字段，描述子作用域为何启动（父 tool call、扇出 send、edge 跳转等）。

## 构建自定义投影

Stream transformer 是事件流中的投影层。它们观察协议事件、维护自己的状态，并暴露运行的衍生视图——比如工具活动、token 总量、进度事件、产物，或是面向其他协议的消息。`StreamChannel` 是 transformer 用来发布这些视图的投影原语。

内置投影（`stream.messages`、`stream.values`、`stream.subgraphs`、`stream.output`）和产品特定投影（LangChain 的 `stream.tool_calls`、Deep Agents 的 `stream.subagents`）本身都是使用同一套契约的 transformer。用户 transformer 通过编译时或调用时注册叠加在上面，其投影出现在 `stream.extensions` 下。

当现有投影的形状不符合应用需求时，就该写一个自定义 transformer 了。

### Transformer 的工作原理

事件流始于 LangGraph Pregel 引擎的 streaming 输出。运行时将这些 chunk 归一化为协议事件，然后由 stream handler 将每个事件路由到一串 stream transformer。

```
Pregel modes → Events → Built-in projections → User transformers → Run projections
```

stream handler 是一个 stream 的中央调度器。对于每一个协议事件，它会：

1. 按顺序调用每个已注册 transformer 的 `process(event)` 钩子。
2. 将具名 `StreamChannel` 的 push 值接回到协议事件流中。
3. 将事件存入 run stream（除非某个 transformer 抑制了它）。
4. 在运行结束时对每个 transformer 调用 `finalize()` 或 `fail()`。

Transformer 是观察性的。它们不会回调图运行时。相反，它们消费事件并将衍生值推入 `StreamChannel`、Promise 或其他投影对象。

### Transformer 接口

一个 transformer 实现 `StreamTransformer` 接口：

```ts
interface StreamTransformer<TProjection = unknown> {
  init(): TProjection;
  process(event: ProtocolEvent): boolean;
  finalize?(): void | PromiseLike<void>;
  fail?(err: unknown): void;
}
```

- `init()` 创建投影对象。用户 transformer 的投影会出现在 `stream.extensions` 下。
- `process()` 观察每个协议事件。`ProtocolEvent` 结构见 [迭代原始协议事件](#迭代原始协议事件)。仅当你有意要抑制原始事件时才返回 `false`。
- `finalize()` 在流成功结束后关闭或 resolve 非通道投影。
- `fail()` 将错误传播给非通道投影。

### 声明所需的 stream mode

`required_stream_modes` 控制底层图在流式过程中发出哪些 Pregel stream mode。运行时会取所有已注册 transformer 的 `required_stream_modes` 的并集，并将其作为 `stream_mode` 参数传给图的 `.stream()` 调用。**没有被任何 transformer 请求的模式永远不会被发出**——声明 `("custom",)` 才是让 `custom` 事件在整个运行中流动的原因。

`process()` 接收图发出的每个事件，并负责按 `event["method"]` 过滤。声明只负责开启上游发射，不会收窄 `process()` 看到的内容。有效值为 Pregel stream mode：`"messages"`、`"tools"`、`"custom"`、`"values"`、`"updates"`、`"checkpoints"`、`"tasks"`、`"debug"`。每个 transformer 必须声明它要处理的每个 mode——被省略的 mode 不会被图发出，也永远不会到达 `process()`。

### StreamChannel

`StreamChannel` 是 transformer 用于流式推送值的投影原语。它总是在 `stream.extensions.<name>` 上暴露一个可迭代的 stream。构造函数参数决定每次 `push()` 是否也将值作为 `custom:<name>` 事件流入运行的主事件流——也就是说，投影的值是否在迭代原始协议事件时可见。

| 需求 | 使用方式 |
| --- | --- |
| 仅作为侧信道投影 | `new StreamChannel<T>()` |
| 同时将每次 push 流入主事件流 | `new StreamChannel<T>(name)` |

具名 channel 的 payload 必须可序列化，因为每个 push 的值也会成为主事件流中的一个 `custom:<name>` 协议事件。Promise、异步迭代器、类实例等进程内句柄应放在匿名 channel 中。

stream handler 负责管理 channel 的生命周期。一旦 `init()` 返回一个 channel，handler 会在运行结束时为你关闭或失败它。Transformer 只负责 push 值。

### 示例：具名 channel

向 `StreamChannel` 传入字符串名称，即可通过 `stream.extensions` 暴露流式投影，*同时* 将每个 push 的值作为 `custom:<name>` 协议事件转发到运行的主事件流中：

```ts
import { StreamChannel } from "@langchain/langgraph";

const toolActivityTransformer = () => {
  const activity = new StreamChannel<{
    name: string;
    status: "started" | "finished" | "error";
  }>("toolActivity");

  return {
    init: () => ({ toolActivity: activity }),
    process(event) {
      if (event.method === "tools") {
        const data = event.params.data as { tool_name?: string; event?: string };
        if (data.tool_name && data.event) {
          activity.push({
            name: data.tool_name,
            status: data.event === "tool-error" ? "error" : "started",
          });
        }
      }
      return true;
    },
  };
};
```

### 示例：匿名 channel

不传名称时，channel 只是一个侧信道投影——可以在 `stream.extensions` 上访问，但对迭代原始事件的消费者不可见。当投影需要持有不可序列化的进程内句柄（Promise、异步迭代器、类实例）时，这是正确选择。

下面的示例将匿名 channel 与 `get_stream_writer` 配合使用，让图节点发出 `custom` channel 事件，然后由 transformer 将其排入投影：

```ts
import { StreamChannel } from "@langchain/langgraph";

const customTransformer = () => {
  const custom = new StreamChannel<unknown>();

  return {
    init: () => ({ custom }),
    process(event) {
      if (event.method === "custom") {
        custom.push(event.params.data);
      }
      return true;
    },
  };
};
```

### 示例：终值投影

当投影不应流入主事件流时，可以使用匿名 stream、Promise 或其他进程内对象：

```ts
const statsTransformer = () => {
  let totalTokens = 0;
  let resolveTotal!: (value: number) => void;
  const totalTokensPromise = new Promise<number>((resolve) => {
    resolveTotal = resolve;
  });

  return {
    init: () => ({ totalTokens: totalTokensPromise }),
    process(event) {
      if (event.method === "messages") {
        const data = event.params.data as { usage?: { output_tokens?: number } };
        totalTokens += data.usage?.output_tokens ?? 0;
      }
      return true;
    },
    finalize: () => resolveTotal(totalTokens),
  };
};
```

### 注册方式：调用时 vs 编译时

在调用时传入 transformer，适合本地实验：

```ts
const stream = await graph.streamEvents(input, {
  version: "v3",
  transformers: [statsTransformer, toolActivityTransformer],
});
```

在编译时将 transformer 写入图，适合该图的每次运行都应该产生投影的场景：

```ts
const graph = builder.compile({
  transformers: [statsTransformer, toolActivityTransformer],
});
```

## 相关资源

LangGraph 定义了流式原语。如果在 LangChain 或 Deep Agents 中使用流式，请参考相应产品文档：

- [LangChain agent streaming](/tutorials/LangChain/事件流) 涵盖 ReAct 风格 agent 的消息、工具调用和中间件更新。
- [Deep Agents streaming](https://docs.langchain.com/oss/javascript/deepagents/event-streaming) 涵盖子 agent、嵌套消息和子 agent 工具调用。
- [LangChain 前端模式](/tutorials/LangChain/前端集成) 和 [LangGraph 前端模式](/tutorials/LangGraph/前端概览) 展示了基于流式状态构建的 UI 用例。
- [LangSmith Streaming API](https://docs.langchain.com/langsmith/streaming) 涵盖对部署在 Agent Server 上的图进行流式消费。

线路级别的事件和命令格式定义在 [Agent Protocol](https://github.com/langchain-ai/agent-protocol) 仓库中，可通过 PyPI 上的 [`langchain-protocol`](https://pypi.org/project/langchain-protocol/) 和 npm 上的 [`@langchain/protocol`](https://www.npmjs.com/package/@langchain/protocol) 消费。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/event-streaming) 翻译并二次创作。
