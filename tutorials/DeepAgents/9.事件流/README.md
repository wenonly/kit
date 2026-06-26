---
title: 事件流
categories: DeepAgents
order: 9
date: 2026-06-25
tags:
  - DeepAgents
  - 事件流
---

# 事件流

> 从 Deep Agents 中流式传输子 Agent、消息、工具调用和最终输出

本页涵盖 Deep Agents 特有的流式传输内容——最重要的是通过 `stream.subagents` 从委托的子 Agent 中流式传输。有关通用 Agent 流式传输（`stream.messages`、`stream.values`、工具调用、自定义更新），请参阅 [LangChain Event Streaming](https://docs.langchain.com/oss/javascript/langchain/event-streaming)。

## 流式传输子 Agent

Deep Agents 在 LangGraph 流式传输之上添加了子 Agent 投影。当你想要为每个委托的 `task` 调用获取一个流式句柄时，使用 `stream.subagents`。该投影是轻量级的：它首先发现子 Agent 任务，只有当你访问子 Agent 句柄上的投影时，消息、工具调用和值的流才会被打开。

每个句柄的 `name` 是子 Agent 的配置名称：协调器调用 `task` 工具时传递的 `subagent_type`。Deep Agents 将该名称绑定到委托的运行，因此你在子 Agent 规范中定义的标签就是你在流中过滤和路由的依据。

```ts
const stream = await agent.streamEvents(
  { messages: [{ role: "user", content: "Write me a haiku about the sea" }] },
  { version: "v3" }
);

for await (const subagent of stream.subagents) {
  console.log(subagent.name);
  console.log(await subagent.taskInput);

  for await (const message of subagent.messages) {
    console.log(await message.text);
  }
}
```

## 子 Agent 流字段

每个子 Agent 流暴露与父运行相同类型的投影，例如消息、工具调用、嵌套子 Agent 和最终输出。有关通用父运行流式传输模型，请参阅 [LangChain Event Streaming](https://docs.langchain.com/oss/javascript/langchain/event-streaming)。

TypeScript 使用驼峰式投影名称，如 `toolCalls` 和 `taskInput`。每个子 Agent 流可以暴露 `.messages`、`.toolCalls`、`.values`、`.subagents` 和 `.output`。

| 字段 | 描述 |
| --- | --- |
| `name` | 子 Agent 名称，取自协调器在其 `task` 调用中选择的 `subagent_type`。 |
| `messages` | 子 Agent 发出的消息。 |
| `subagents` | 嵌套的子 Agent 调用。 |
| `output` | 最终的子 Agent 状态，或委托任务的完成信号。 |
| `taskInput` | 传递给 task 工具的提示的 Promise。 |
| `toolCalls` | 限定于该子 Agent 的工具调用。 |

## 跟踪子 Agent 生命周期

当你只需要显示哪些子 Agent 已启动和完成时，使用 `stream.subagents`。除非你访问单个子 Agent 的这些投影，否则你不需要订阅消息或值流。

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

let running = 0;
let completed = 0;
let failed = 0;
const watchers: Promise<void>[] = [];

for await (const subagent of stream.subagents) {
  running += 1;
  console.log(`${subagent.name}: started`);

  watchers.push(
    subagent.output.then(
      () => {
        running -= 1;
        completed += 1;
        console.log(`${subagent.name}: completed`);
      },
      () => {
        running -= 1;
        failed += 1;
        console.log(`${subagent.name}: failed`);
      }
    )
  );
}

await Promise.all(watchers);
console.log({ running, completed, failed });
```

## 流式传输消息

Deep Agents 可以从协调器 Agent 和委托的子 Agent 发出消息。使用 `stream.messages` 获取顶层消息，使用 `subagent.messages` 获取每个委托子 Agent 的消息。

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const message of stream.messages) {
  console.log("[coordinator]", await message.text);
}

for await (const subagent of stream.subagents) {
  for await (const message of subagent.messages) {
    console.log(`[${subagent.name}]`, await message.text);
  }
}
```

## 流式传输工具调用

Deep Agents 在 Agent 树的每个层级暴露工具调用。使用顶层 `stream.tool_calls` 获取协调器工具，使用每个 `subagent.tool_calls` 获取委托工作。

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const call of stream.toolCalls) {
  console.log("[coordinator tool]", call.name, call.input);
  console.log(await call.status);
}

for await (const subagent of stream.subagents) {
  for await (const call of subagent.toolCalls) {
    console.log(`[${subagent.name} tool]`, call.name, call.input);

    const status = await call.status;
    if (status === "finished") {
      console.log(await call.output);
    } else if (status === "error") {
      console.error(await call.error);
    }
  }
}
```

## 流式传输嵌套工作

你可以递归进入子 Agent 流来观察嵌套的子 Agent、消息和工具调用。

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const subagent of stream.subagents) {
  console.log(`subagent ${subagent.name}: started`);

  for await (const toolCall of subagent.toolCalls) {
    console.log(`${toolCall.name}(${JSON.stringify(toolCall.input)})`);

    const status = await toolCall.status;
    if (status === "finished") {
      console.log(await toolCall.output);
    } else if (status === "error") {
      console.error(await toolCall.error);
    }
  }

  for await (const nested of subagent.subagents) {
    console.log(`nested subagent ${nested.name}: started`);
  }
}
```

## 并发消费

协调器和子 Agent 的输出通常交替出现。当你需要实时 UI 更新时，请并发消费投影。

在 JavaScript 中使用并发消费者：

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

await Promise.all([
  (async () => {
    for await (const message of stream.messages) {
      console.log("[coordinator]", await message.text);
    }
  })(),
  (async () => {
    for await (const subagent of stream.subagents) {
      void (async () => {
        for await (const message of subagent.messages) {
          console.log(`[${subagent.name}]`, await message.text);
        }
      })();
    }
  })(),
]);
```

当你需要协调器和所有子 Agent 之间的精确到达顺序时，迭代原始协议事件并使用 `namespace` 来识别来源：

```ts
const stream = await agent.streamEvents(input, { version: "v3" });

for await (const event of stream) {
  if (event.method !== "messages") continue;

  const data = event.params.data;
  if (data.event !== "content-block-delta") continue;

  const block = data.delta ?? {};
  if (block.type === "text-delta") {
    const isSubagent = event.params.namespace.some((seg) => seg.startsWith("tools:"));
    const source = isSubagent ? "subagent" : "coordinator";
    console.log(`[${source}] ${block.text}`);
  }
}
```

## 子 Agent 与子图

`stream.subgraphs` 显示图执行结构。`stream.subagents` 显示产品级别的 Deep Agents 任务委托。对于面向用户的 UI，使用 `stream.subagents`，因为它隐藏了内部图节点并直接暴露了子 Agent 概念。

## 相关阅读

- [LangChain Event Streaming](https://docs.langchain.com/oss/javascript/langchain/event-streaming) 涵盖了通用 Agent 消息和工具调用流式传输概念。
- [子 Agent 前端流式传输](/tutorials/DeepAgents/子 Agent 流式（前端）) 展示了将协调器消息与子 Agent 卡片分离的 UI 模式。
- [LangGraph Event Streaming](https://docs.langchain.com/oss/javascript/langgraph/event-streaming) 涵盖了底层的图流式传输模型。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/event-streaming) 翻译并二次创作。
