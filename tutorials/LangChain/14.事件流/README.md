---
title: 事件流
categories: LangChain
order: 14
date: 2026-06-24
tags:
  - LangChain
  - Streaming
---

# 事件流

> 用类型化的 projection API，把 Agent 运行过程中的消息、工具调用、状态、自定义事件拆分成独立迭代器，各自消费。

LangChain Agent 底层基于 LangGraph，因此天然支持同一套流式能力。事件流（Event Streaming）是在此之上提供的一层 agent 友好封装，通过 `streamEvents(..., version: "v3")` 暴露。与直接使用 `stream_mode` 不同，事件流返回一个 run 对象，上面挂着多个**类型化 projection**，每个 projection 都可以被独立消费——不再需要在 chunk 元组里做条件判断。

> 对于大多数应用层和前端场景，推荐使用事件流。下面的示例先给一个最简用法。

```ts
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  async ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get weather for a city.",
    schema: z.object({ city: z.string() }),
  }
);

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [getWeather],
});

const stream = await agent.streamEvents(
  { messages: [{ role: "user", content: "What is the weather in SF?" }] },
  { version: "v3" }
);

for await (const message of stream.messages) {
  for await (const delta of message.text) {
    process.stdout.write(delta);
  }
}

const finalState = await stream.output;
```

## 可消费的 projection 一览

| Projection | 用途 |
| --- | --- |
| `for event of stream` | 原始协议事件，包含完整 envelope，可访问任意 channel。 |
| `stream.messages` | 模型消息流，每次 LLM 调用一个。 |
| `message.text` | 该消息的文本 delta 与最终文本。 |
| `message.reasoning` | 思考 / 推理 delta（仅当模型暴露 reasoning 内容时可用）。 |
| `message.toolCalls` | 工具调用参数 chunk 与最终确定的工具调用。 |
| `message.output` | 模型调用完成后的最终 message 对象。 |
| `message.usage` | 提供商返回的 token 使用量元数据。 |
| `stream.values` | Agent 状态快照。 |
| `stream.output` | 最终 agent 状态。 |
| `stream.subgraphs` | 嵌套图运行（子 agent 和普通子图）。 |
| `stream.extensions` | 自定义 transformer projection。 |
| `stream.toolCalls` | 工具执行生命周期：输入、输出 delta、最终输出、错误。 |

`stream.messages` 产出的是 message stream，每个 message stream 又暴露 `.text`、`.reasoning`、`.toolCalls`、`.output`、`.usage` 等子 projection。异步 projection 既可以被迭代（拿实时 delta），也可以被 await（拿最终值）。

## Agent 消息

当你关心每次 LLM 调用产生的模型输出时，使用 `stream.messages`：

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const message of stream.messages) {
  process.stdout.write(`[${message.node}] `);
  for await (const delta of message.text) {
    process.stdout.write(delta);
  }

  const fullMessage = await message.output;
  console.log(fullMessage.content);

  const usage = await message.usage;
  if (usage) {
    console.log(usage);
  }
}
```

`message.output` 给出的是最终化的 AI message（包含提供商特定的 content blocks）。在 TypeScript 里，当你只需要 token 计数等使用量数据时用 `message.usage`；Python 中则从 `message.output.usage_metadata` 读取。

## 推理内容

推理内容的消费方式与文本一致，但只有当所选模型确实输出 reasoning 块时才有数据：

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const message of stream.messages) {
  for await (const delta of message.reasoning) {
    process.stdout.write(`[thinking] ${delta}`);
  }

  for await (const delta of message.text) {
    process.stdout.write(delta);
  }
}
```

模型配置细节请参考 reasoning 指南和对应提供商的集成文档。

## 工具调用

工具调用涉及两个有用的 projection：

- `message.toolCalls`：在模型**正在生成**工具调用参数时，流式获取参数 chunk。
- `stream.toolCalls`：在工具**开始执行后**，流式获取执行生命周期（输入、输出 delta、最终输出、错误）。

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

await Promise.all([
  (async () => {
    for await (const message of stream.messages) {
      for await (const chunk of message.toolCalls) {
        console.log("tool call chunk", chunk);
      }
    }
  })(),
  (async () => {
    for await (const call of stream.toolCalls) {
      console.log(call.name, call.input);
      console.log(await call.output, await call.error);
    }
  })(),
]);
```

## 流式获取子 Agent

当一个 `createAgent` 通过包装工具调用了另一个具名 `createAgent` 时，内部 agent 的事件会以嵌套 namespace 的形式流转。你在 `createAgent` 上传入的 `name=` 就是在事件流中标识该内部 agent 的依据，你可以据此过滤和标注每个 agent 的输出。

具名子 agent 会和普通子图一起出现在 `stream.subgraphs` 上。每个 handle 暴露内部 agent 的 `.messages`、`.values`、`.toolCalls`、`.output`；通过判断 `subagent.name` 来定位特定 agent。

> 代码要点：supervisor agent 通过 `call_weather` 工具调用 weatherAgent，weatherAgent 的消息流出现在 `stream.subgraphs` 上。

```ts
import { createAgent, tool } from "langchain";
import { z } from "zod";

const getWeather = tool(
  async ({ city }) => `It's always sunny in ${city}!`,
  { name: "get_weather", schema: z.object({ city: z.string() }) }
);

const weatherAgent = createAgent({
  model: "openai:gpt-5.5",
  tools: [getWeather],
  name: "weather_agent",
});

const callWeather = tool(
  async ({ query }) => {
    const result = await weatherAgent.invoke({
      messages: [{ role: "user", content: query }],
    });
    return result.messages.at(-1)?.text ?? "";
  },
  { name: "call_weather", schema: z.object({ query: z.string() }) }
);

const supervisor = createAgent({
  model: "openai:gpt-5.5",
  tools: [callWeather],
  name: "supervisor",
});

const stream = await supervisor.streamEvents(
  { messages: [{ role: "user", content: "What's the weather in Boston?" }] },
  { version: "v3" }
);

for await (const subagent of stream.subgraphs) {
  if (subagent.name !== "weather_agent") continue;
  process.stdout.write(`${subagent.name}: `);
  for await (const message of subagent.messages) {
    for await (const token of message.text) {
      process.stdout.write(token);
    }
  }
  process.stdout.write("\n");
}
```

从工具中触发的普通 `StateGraph` 子图也会出现在 `stream.subgraphs` 上——在 `.compile(name=...)` 时设置 name 即可在 `subagent.graph_name` 中获得标签。具名子 agent 与普通子图共享 `stream.subgraphs` projection，区分它们靠你在循环中写的过滤逻辑。

## 状态与最终输出

用 `stream.values` 获取状态快照，用 `stream.output` 获取最终 agent 状态：

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const snapshot of stream.values) {
  console.log(snapshot);
}

const finalState = await stream.output;
```

## 多 projection 并发消费

在 JavaScript 中需要同时消费多个 projection 时，用 `Promise.all` 并发：

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

await Promise.all([
  (async () => {
    for await (const message of stream.messages) {
      console.log(await message.text);
    }
  })(),
  (async () => {
    for await (const call of stream.toolCalls) {
      console.log(call.name, call.input);
    }
  })(),
]);
```

要访问未被类型化 projection 暴露的 channel，或检查完整事件 envelope，可直接迭代原始协议事件：

```ts
for await (const event of stream) {
  console.log(event.method, event.params.namespace, event.params.data);
}
```

## 自定义更新

当应用需要内置 projection 之外的投影（例如检索进度、artifacts、领域特定事件）时，可以使用自定义 stream transformer：

```ts
const stream = await agent.streamEvents(input, {
  version: "v3",
  transformers: [toolActivityTransformer],
});

for await (const activity of stream.extensions.toolActivity) {
  console.log(activity);
}
```

### 在中间件上注册 transformer

> 中间件注册 transformer 需要 `langchain@1.4.3` 或更高版本。

中间件可以在 hooks 和 tools 之外声明 stream transformer factory。在 TypeScript 中，通过 `createMiddleware` 的 `streamTransformers` 传入一个 factory 元组，每个 factory 形如 `() => StreamTransformer<any>`（零参数），在每个 scope 调用一次。每次返回新的 transformer 以保持各子图隔离。

```ts
import { createAgent, createMiddleware } from "langchain";

const toolActivityMiddleware = createMiddleware({
  name: "ToolActivityMiddleware",
  streamTransformers: [toolActivityTransformer],
});

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [getWeather],
  middleware: [toolActivityMiddleware],
});
```

在编译期，`createAgent` 会把中间件注册的 factory 与直接传给 `createAgent` 的 `streamTransformers` 合并。最终在编译图上的顺序为：

1. 内置的 `ToolCallTransformer`
2. 中间件注册的 factory（按中间件顺序）
3. 调用方通过 `createAgent` 传入的 `streamTransformers`

这个顺序既保证了内置工具调用 projection 排在消费者前面，又让调用方传入的 transformer 拥有最终决定权。

## 小结

事件流是 LangChain v1.3 起推荐的流式消费方式。它用类型化 projection 取代了旧式 stream_mode 元组分支，让消息、工具调用、状态、子图等关注点各自独立。前端 UI、日志监控、多 Agent 编排场景都能从中受益。

如果需要更底层的 Pregel stream 模式（`values`、`debug` 等），可以回到 [流式输出](/tutorials/LangChain/13.流式输出) 查阅；想了解 Agent 如何在对话中保持记忆，请继续阅读 [短期记忆](/tutorials/LangChain/16.短期记忆)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/event-streaming) 翻译并二次创作。
