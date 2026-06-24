---
title: 流式输出
categories: LangGraph
order: 12
date: 2026-06-25
tags:
  - LangGraph
  - Streaming
---

# 流式输出

> 让图的执行过程像水一样流式涌现——每一步状态、每一个 token、每一次工具调用，都可以实时感知。

::: tip 推荐事件流
对于新应用，我们推荐使用 [事件流](/tutorials/LangGraph/事件流)——LangGraph v1.2 引入的类型化投影 API。事件流为每个投影（消息、状态、子图、输出）提供独立的迭代器，让你可以分别消费，而不必在一个 `stream_mode` chunk 中做条件分支。
:::

本页介绍 LangGraph 的 stream-mode API。它通过 `updates`、`values`、`messages`、`custom`、`checkpoints`、`tasks`、`debug` 等 stream mode 暴露图的执行过程。当你需要直接访问图运行时事件或特定 stream mode 的输出时使用它。

## 快速上手

### 基本用法

LangGraph 的图通过 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#stream) 方法暴露流式输出，返回一个迭代器：

```typescript
for await (const chunk of await graph.stream(inputs, {
  streamMode: "updates",
})) {
  console.log(chunk);
}
```

::: tip 调试利器
使用 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-streaming) 调试流式事件、检查 token 级别的 LLM 输出、监控延迟。按照 [tracing 快速开始](https://docs.langchain.com/langsmith/trace-with-langgraph) 进行设置。
:::

## Stream 模式一览

向 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#stream) 方法传入以下一个或多个 stream mode（以数组形式）：

| 模式 | 描述 |
| :--- | :--- |
| [values](#图状态) | 每个步骤后的完整状态。 |
| [updates](#图状态) | 每个步骤后的状态更新。同一步骤中的多次更新会分别流式输出。 |
| [messages](#llm-tokens) | 来自 LLM 调用的 `(token, metadata)` 二元组。 |
| [custom](#自定义数据) | 节点内通过 `writer` 配置参数发出的自定义数据。 |
| [tools](#工具进度) | 工具调用生命周期事件（`on_tool_start`、`on_tool_event`、`on_tool_end`、`on_tool_error`）。 |
| [debug](#debug) | 图执行过程中尽可能多的信息。 |

### 图状态

使用 `updates` 和 `values` 这两个 stream mode 来流式获取图执行过程中的状态。

- `updates` 流式输出每个步骤后节点返回的**状态更新**。
- `values` 流式输出每个步骤后的**完整状态**。

```typescript
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  topic: z.string(),
  joke: z.string(),
});

const graph = new StateGraph(State)
  .addNode("refineTopic", (state) => {
    return { topic: state.topic + " and cats" };
  })
  .addNode("generateJoke", (state) => {
    return { joke: `This is a joke about ${state.topic}` };
  })
  .addEdge(START, "refineTopic")
  .addEdge("refineTopic", "generateJoke")
  .addEdge("generateJoke", END)
  .compile();
```

::: code-group

```typescript [updates]
// 使用 updates 模式只流式获取每个步骤后节点返回的状态更新
// 流式输出中包含节点名称以及更新内容
for await (const chunk of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "updates" }
)) {
  for (const [nodeName, state] of Object.entries(chunk)) {
    console.log(`Node ${nodeName} updated:`, state);
  }
}
```

```typescript [values]
// 使用 values 模式流式获取每个步骤后图的完整状态
for await (const chunk of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "values" }
)) {
  console.log(`topic: ${chunk.topic}, joke: ${chunk.joke}`);
}
```

:::

### LLM tokens

使用 `messages` stream mode 可以从图的任何部分（包括节点、工具、子图、任务）**逐 token** 地流式获取大语言模型（LLM）的输出。

[`messages` 模式](#stream-模式一览) 的流式输出是一个二元组 `[message_chunk, metadata]`：

- `message_chunk`：来自 LLM 的 token 或消息片段。
- `metadata`：包含图节点和 LLM 调用相关信息的字典。

> 如果你的 LLM 没有 LangChain 集成，可以用 `custom` 模式来流式获取其输出。详见 [与任意 LLM 配合使用](#与任意-llm-配合使用)。

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, StateSchema, GraphNode, START } from "@langchain/langgraph";
import * as z from "zod";

const MyState = new StateSchema({
  topic: z.string(),
  joke: z.string().default(""),
});

const model = new ChatOpenAI({ model: "gpt-5.4-mini" });

const callModel: GraphNode<typeof MyState> = async (state) => {
  // 调用 LLM 生成关于某个主题的笑话
  // 注意：即使 LLM 通过 .invoke 而非 .stream 调用，message 事件仍然会被发出
  const modelResponse = await model.invoke([
    { role: "user", content: `Generate a joke about ${state.topic}` },
  ]);
  return { joke: modelResponse.content };
};

const graph = new StateGraph(MyState)
  .addNode("callModel", callModel)
  .addEdge(START, "callModel")
  .compile();

// "messages" stream mode 返回 [messageChunk, metadata] 二元组的迭代器
// messageChunk 是 LLM 流式输出的 token，metadata 是包含图节点等信息的字典
for await (const [messageChunk, metadata] of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "messages" }
)) {
  if (messageChunk.content) {
    console.log(messageChunk.content + "|");
  }
}
```

#### 按 LLM 调用过滤

你可以为 LLM 调用关联 `tags`，然后根据 tag 过滤流式输出的 token：

```typescript
import { ChatOpenAI } from "@langchain/openai";

// model1 标记为 "joke"
const model1 = new ChatOpenAI({
  model: "gpt-5.4-mini",
  tags: ['joke']
});
// model2 标记为 "poem"
const model2 = new ChatOpenAI({
  model: "gpt-5.4-mini",
  tags: ['poem']
});

const graph = // ... 定义一个使用这些 LLM 的图

// streamMode 设为 "messages" 以流式获取 LLM token
// metadata 中包含 LLM 调用信息，包括 tags
for await (const [msg, metadata] of await graph.stream(
  { topic: "cats" },
  { streamMode: "messages" }
)) {
  // 通过 metadata 中的 tags 字段过滤，只保留 "joke" 标记的 LLM token
  if (metadata.tags?.includes("joke")) {
    console.log(msg.content + "|");
  }
}
```

::: details 完整示例：按 tags 过滤

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, StateSchema, GraphNode, START } from "@langchain/langgraph";
import * as z from "zod";

// jokeModel 标记为 "joke"
const jokeModel = new ChatOpenAI({
  model: "gpt-5.4-mini",
  tags: ["joke"]
});
// poemModel 标记为 "poem"
const poemModel = new ChatOpenAI({
  model: "gpt-5.4-mini",
  tags: ["poem"]
});

const State = new StateSchema({
  topic: z.string(),
  joke: z.string(),
  poem: z.string(),
});

const callModel: GraphNode<typeof State> = async (state) => {
  const topic = state.topic;
  console.log("Writing joke...");

  const jokeResponse = await jokeModel.invoke([
    { role: "user", content: `Write a joke about ${topic}` }
  ]);

  console.log("\n\nWriting poem...");
  const poemResponse = await poemModel.invoke([
    { role: "user", content: `Write a short poem about ${topic}` }
  ]);

  return {
    joke: jokeResponse.content,
    poem: poemResponse.content
  };
};

const graph = new StateGraph(State)
  .addNode("callModel", callModel)
  .addEdge(START, "callModel")
  .compile();

// streamMode 设为 "messages" 以流式获取 LLM token
for await (const [msg, metadata] of await graph.stream(
  { topic: "cats" },
  { streamMode: "messages" }
)) {
  // 通过 tags 过滤，只保留 "joke" 标记的 token
  if (metadata.tags?.includes("joke")) {
    console.log(msg.content + "|");
  }
}
```

:::

#### 从流中排除消息

使用 `nostream` tag 可以完全将 LLM 输出从流中排除。被标记为 `nostream` 的调用仍然会执行并产生输出，只是其 token 不会在 `messages` 模式中被发出。

这在以下场景很有用：

- 你需要 LLM 输出用于内部处理（例如结构化输出），但不希望将其流式推送到客户端
- 你通过其他渠道（例如自定义 UI 消息）流式推送相同内容，想避免在 `messages` 流中产生重复输出

```ts
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

const streamModel = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });
const internalModel = new ChatAnthropic({
  model: "claude-haiku-4-5-20251001",
}).withConfig({
  tags: ["nostream"],
});

const State = new StateSchema({
  topic: z.string(),
  answer: z.string().optional(),
  notes: z.string().optional(),
});

const contentToText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (
          typeof block === "object" &&
          block !== null &&
          "text" in block &&
          typeof (block as { text?: unknown }).text === "string"
        ) {
          return (block as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const writeAnswer = async (state: typeof State.State) => {
  const r = await streamModel.invoke([
    { role: "user", content: `Reply briefly about ${state.topic}` },
  ]);
  return { answer: contentToText(r.content) };
};

const internalNotes = async (state: typeof State.State) => {
  // 由于 nostream，此模型的 token 不会出现在 streamMode: "messages" 中
  const r = await internalModel.invoke([
    { role: "user", content: `Private notes on ${state.topic}` },
  ]);
  return { notes: contentToText(r.content) };
};

const graph = new StateGraph(State)
  .addNode("writeAnswer", writeAnswer)
  .addNode("internal_notes", internalNotes)
  .addEdge(START, "writeAnswer")
  .addEdge("writeAnswer", "internal_notes")
  .compile();

const stream = await graph.streamEvents(
  { topic: "AI", answer: "", notes: "" },
  { version: "v3" },
);
```

#### 按节点过滤

如果你只想流式获取特定节点的 token，使用 `streamMode: "messages"` 并通过 metadata 中的 `langgraph_node` 字段过滤：

```typescript
// "messages" stream mode 返回 [messageChunk, metadata] 二元组
for await (const [msg, metadata] of await graph.stream(
  inputs,
  { streamMode: "messages" }
)) {
  // 通过 metadata 中的 langgraph_node 字段过滤
  // 只保留指定节点的 token
  if (msg.content && metadata.langgraph_node === "some_node_name") {
    // ...
  }
}
```

::: details 完整示例：从特定节点流式获取 LLM token

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, StateSchema, GraphNode, START } from "@langchain/langgraph";
import * as z from "zod";

const model = new ChatOpenAI({ model: "gpt-5.4-mini" });

const State = new StateSchema({
  topic: z.string(),
  joke: z.string(),
  poem: z.string(),
});

const writeJoke: GraphNode<typeof State> = async (state) => {
  const topic = state.topic;
  const jokeResponse = await model.invoke([
    { role: "user", content: `Write a joke about ${topic}` }
  ]);
  return { joke: jokeResponse.content };
};

const writePoem: GraphNode<typeof State> = async (state) => {
  const topic = state.topic;
  const poemResponse = await model.invoke([
    { role: "user", content: `Write a short poem about ${topic}` }
  ]);
  return { poem: poemResponse.content };
};

const graph = new StateGraph(State)
  .addNode("writeJoke", writeJoke)
  .addNode("writePoem", writePoem)
  // 并发执行写笑话和写诗
  .addEdge(START, "writeJoke")
  .addEdge(START, "writePoem")
  .compile();

for await (const [msg, metadata] of await graph.stream(
  { topic: "cats" },
  { streamMode: "messages" }
)) {
  // 通过 langgraph_node 过滤，只保留 writePoem 节点的 token
  if (msg.content && metadata.langgraph_node === "writePoem") {
    console.log(msg.content + "|");
  }
}
```

:::

### 自定义数据

要从 LangGraph 节点或工具内部发送**用户自定义数据**，按以下步骤操作：

1. 使用 `LangGraphRunnableConfig` 中的 `writer` 参数发出自定义数据。
2. 调用 `.stream()` 时设置 `streamMode: "custom"` 来在流中接收自定义数据。你可以组合多个模式（如 `["updates", "custom"]`），但至少要包含 `"custom"`。

::: code-group

```typescript [节点]
import { StateGraph, StateSchema, GraphNode, START, LangGraphRunnableConfig } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  query: z.string(),
  answer: z.string(),
});

const node: GraphNode<typeof State> = async (state, config) => {
  // 使用 writer 发出自定义键值对（例如进度更新）
  config.writer({ custom_key: "Generating custom data inside node" });
  return { answer: "some data" };
};

const graph = new StateGraph(State)
  .addNode("node", node)
  .addEdge(START, "node")
  .compile();

const inputs = { query: "example" };

// 设置 streamMode: "custom" 以在流中接收自定义数据
for await (const chunk of await graph.stream(inputs, { streamMode: "custom" })) {
  console.log(chunk);
}
```

```typescript [工具]
import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import * as z from "zod";

const queryDatabase = tool(
  async (input, config: LangGraphRunnableConfig) => {
    // 使用 writer 发出自定义键值对（例如进度更新）
    config.writer({ data: "Retrieved 0/100 records", type: "progress" });
    // 执行查询
    // 发出另一个自定义键值对
    config.writer({ data: "Retrieved 100/100 records", type: "progress" });
    return "some-answer";
  },
  {
    name: "query_database",
    description: "Query the database.",
    schema: z.object({
      query: z.string().describe("The query to execute."),
    }),
  }
);

const graph = // ... 定义一个使用此工具的图

// 设置 streamMode: "custom" 以在流中接收自定义数据
for await (const chunk of await graph.stream(inputs, { streamMode: "custom" })) {
  console.log(chunk);
}
```

:::

### 工具进度

使用 `tools` stream mode 可以实时获取工具执行的生命周期事件。这对于在工具运行时显示进度指示器、部分结果和错误状态非常有用。

`tools` stream mode 发出四种事件类型：

| 事件 | 触发时机 | Payload |
| --- | --- | --- |
| `on_tool_start` | 工具调用开始 | `name`, `input`, `toolCallId` |
| `on_tool_event` | 工具产出中间数据 | `name`, `data`, `toolCallId` |
| `on_tool_end` | 工具返回最终结果 | `name`, `output`, `toolCallId` |
| `on_tool_error` | 工具抛出错误 | `name`, `error`, `toolCallId` |

#### 定义会流式进度的工具

要发出 `on_tool_event` 事件，需要将工具函数定义为 **async generator**（`async function*`）。每次 `yield` 会向流中发送中间数据，`return` 值作为工具的最终结果。

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod/v4";

const searchFlights = tool(
  async function* (input) {
    const airlines = ["United", "Delta", "American", "JetBlue"];
    const completed: string[] = [];

    for (let i = 0; i < airlines.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      completed.push(airlines[i]);

      // 每次 yield 都会向流发出一个 on_tool_event
      yield {
        message: `Searching ${airlines[i]}...`,
        progress: (i + 1) / airlines.length,
        completed,
      };
    }

    // return 值成为工具结果（ToolMessage.content）
    return JSON.stringify({
      flights: [
        { airline: "United", price: 450, duration: "5h 30m" },
        { airline: "Delta", price: 520, duration: "5h 15m" },
      ],
    });
  },
  {
    name: "search_flights",
    description: "Search for available flights to a destination.",
    schema: z.object({
      destination: z.string(),
      date: z.string(),
    }),
  }
);
```

::: info
现有的返回 `Promise` 的工具完全兼容。它们会发出 `on_tool_start` 和 `on_tool_end` 事件，但不会发出 `on_tool_event` 事件。
:::

#### 在服务端消费工具事件

向 `graph.stream()` 传入 `streamMode: ["tools"]`（或与其他模式组合）：

```typescript
for await (const [mode, chunk] of await graph.stream(
  { messages: [{ role: "user", content: "Find flights to Tokyo" }] },
  { streamMode: ["updates", "tools"] }
)) {
  if (mode === "tools") {
    switch (chunk.event) {
      case "on_tool_start":
        console.log(`Tool started: ${chunk.name}`, chunk.input);
        break;
      case "on_tool_event":
        console.log(`Tool progress: ${chunk.name}`, chunk.data);
        break;
      case "on_tool_end":
        console.log(`Tool finished: ${chunk.name}`, chunk.output);
        break;
      case "on_tool_error":
        console.error(`Tool failed: ${chunk.name}`, chunk.error);
        break;
    }
  }
}
```

#### 在 React 中使用 `useStream` 跟踪工具进度

来自 `@langchain/langgraph-sdk/react` 的 [`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream) hook 在你的 stream mode 中包含 `"tools"` 时，会暴露一个 `toolProgress` 数组。每个元素是一个 `ToolProgress` 对象，跟踪正在运行的工具的当前状态：

| 字段 | 描述 |
| --- | --- |
| `name` | 工具名称 |
| `state` | 当前生命周期状态：`"starting"`、`"running"`、`"completed"` 或 `"error"` |
| `toolCallId` | 来自 LLM 的工具调用 ID |
| `input` | 工具的输入参数 |
| `data` | `on_tool_event` 最近一次产出的数据 |
| `result` | 最终结果，在 `on_tool_end` 时设置 |
| `error` | 错误信息，在 `on_tool_error` 时设置 |

```typescript
import { useStream } from "@langchain/langgraph-sdk/react";

function Chat() {
  const stream = useStream({
    assistantId: "my-agent",
    streamMode: ["values", "tools"],
  });

  // 过滤出正在运行的工具
  const activeTools = stream.toolProgress.filter(
    (t) => t.state === "starting" || t.state === "running"
  );

  return (
    <div>
      {stream.messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* 显示正在运行的工具的进度卡片 */}
      {activeTools.map((tool) => (
        <ToolProgressCard
          key={tool.toolCallId ?? tool.name}
          name={tool.name}
          state={tool.state}
          data={tool.data}
        />
      ))}
    </div>
  );
}
```

::: details 完整示例：带工具进度的旅行规划 Agent

这个示例展示了一个完整的 Agent，其工具使用 async generator 向 React UI 流式推送搜索进度。

**Agent 定义：**

```typescript
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint-memory";
import { z } from "zod/v4";

const searchFlights = tool(
  async function* (input) {
    const airlines = ["United", "Delta", "American", "JetBlue"];
    const completed: string[] = [];

    for (let i = 0; i < airlines.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      completed.push(`${airlines[i]}: checked`);
      yield {
        message: `Searching ${airlines[i]}...`,
        progress: (i + 1) / airlines.length,
        completed,
      };
    }

    return JSON.stringify({
      flights: [
        { airline: "United", price: 450, duration: "5h 30m" },
        { airline: "Delta", price: 520, duration: "5h 15m" },
      ],
    });
  },
  {
    name: "search_flights",
    description: "Search for available flights.",
    schema: z.object({
      destination: z.string(),
      departure_date: z.string(),
    }),
  }
);

const checkHotels = tool(
  async function* (input) {
    const hotels = ["Grand Hyatt", "Marriott", "Hilton"];
    const completed: string[] = [];

    for (let i = 0; i < hotels.length; i++) {
      await new Promise((r) => setTimeout(r, 400));
      completed.push(`${hotels[i]}: available`);
      yield {
        message: `Checking ${hotels[i]}...`,
        progress: (i + 1) / hotels.length,
        completed,
      };
    }

    return JSON.stringify({
      hotels: [
        { name: "Grand Hyatt", price: 250, rating: 4.5 },
        { name: "Marriott", price: 180, rating: 4.2 },
      ],
    });
  },
  {
    name: "check_hotels",
    description: "Check hotel availability.",
    schema: z.object({
      city: z.string(),
      check_in: z.string(),
      nights: z.number(),
    }),
  }
);

export const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4o-mini" }),
  tools: [searchFlights, checkHotels],
  checkpointer: new MemorySaver(),
});
```

**带进度卡片的 React 组件：**

```typescript
import { useStream } from "@langchain/langgraph-sdk/react";

function TravelPlanner() {
  const stream = useStream<typeof agent>({
    assistantId: "travel-agent",
    streamMode: ["values", "tools"],
  });

  const activeTools = stream.toolProgress.filter(
    (t) => t.state === "starting" || t.state === "running"
  );

  return (
    <div>
      {stream.messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}

      {activeTools.map((tool) => {
        const data = tool.data as {
          message?: string;
          progress?: number;
          completed?: string[];
        } | undefined;

        return (
          <div key={tool.toolCallId ?? tool.name}>
            <strong>{tool.name}</strong>
            {data?.message && <p>{data.message}</p>}
            {data?.progress != null && (
              <div style={{ width: "100%", background: "#eee" }}>
                <div
                  style={{
                    width: `${data.progress * 100}%`,
                    background: "#4CAF50",
                    height: 8,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}
            {data?.completed?.map((step, i) => (
              <div key={i}>&#10003; {step}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

:::

#### `tools` vs `custom` stream mode

两者都能呈现工具进度，但用途不同：

- **`tools`**——自动发出结构化的生命周期事件（`on_tool_start`、`on_tool_event`、`on_tool_end`、`on_tool_error`），你的工具只需使用 `async function*` 即可，无需额外代码。`useStream` hook 开箱即用提供响应式 `toolProgress` 数组。
- **`custom`**——通过 `config.writer()` 让你完全控制发出什么数据、何时发出。当你需要不符合工具生命周期的自由格式数据，或者想从节点（不仅仅是工具）流式推送时使用。

### 子图输出

要在流式输出中包含[子图](/tutorials/LangGraph/使用子图)的输出，可以在父图的 `.stream()` 方法中设置 `subgraphs: true`。这样会同时流式输出父图和所有子图的结果。

输出以 `[namespace, data]` 二元组的形式流式输出，其中 `namespace` 是指向子图被调用节点路径的元组，例如 `["parent_node:<task_id>", "child_node:<task_id>"]`。

```typescript
for await (const chunk of await graph.stream(
  { foo: "foo" },
  {
    // 设置 subgraphs: true 以流式获取子图输出
    subgraphs: true,
    streamMode: "updates",
  }
)) {
  console.log(chunk);
}
```

::: details 完整示例：从子图流式输出

```typescript
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import { z } from "zod/v4";

// 定义子图
const SubgraphState = new StateSchema({
  foo: z.string(), // 注意此 key 与父图状态共享
  bar: z.string(),
});

const subgraphBuilder = new StateGraph(SubgraphState)
  .addNode("subgraphNode1", (state) => {
    return { bar: "bar" };
  })
  .addNode("subgraphNode2", (state) => {
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

for await (const chunk of await graph.stream(
  { foo: "foo" },
  {
    streamMode: "updates",
    // 设置 subgraphs: true 以流式获取子图输出
    subgraphs: true,
  }
)) {
  console.log(chunk);
}
```

输出：

```
[[], {'node1': {'foo': 'hi! foo'}}]
[['node2:dfddc4ba-c3c5-6887-5012-a243b5b377c2'], {'subgraphNode1': {'bar': 'bar'}}]
[['node2:dfddc4ba-c3c5-6887-5012-a243b5b377c2'], {'subgraphNode2': {'foo': 'hi! foobar'}}]
[[], {'node2': {'foo': 'hi! foobar'}}]
```

**注意**：我们不仅收到了节点更新，还收到了 namespace，它告诉我们数据来自哪个图（或子图）。
:::

### Debug

使用 `debug` stream mode 可以在图执行过程中获取尽可能多的信息。流式输出包含节点名称以及完整状态：

```typescript
for await (const chunk of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "debug" }
)) {
  console.log(chunk);
}
```

### 同时使用多种模式

你可以传入数组作为 `streamMode` 参数，同时流式输出多种模式。

输出将是 `[mode, chunk]` 二元组，其中 `mode` 是 stream mode 的名称，`chunk` 是该模式流式输出的数据：

```typescript
for await (const [mode, chunk] of await graph.stream(inputs, {
  streamMode: ["updates", "custom"],
})) {
  console.log(chunk);
}
```

## 高级用法

### 与任意 LLM 配合使用

你可以使用 `streamMode: "custom"` 来流式获取**任何 LLM API** 的数据——即使该 API **没有**实现 LangChain chat model 接口。

这让你可以集成原始 LLM 客户端或提供自己流式接口的外部服务，使 LangGraph 对自定义场景非常灵活。

```typescript
import { StateGraph, GraphNode, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({ result: z.string() });

const callArbitraryModel: GraphNode<typeof State> = async (state, config) => {
  // 调用任意模型并流式输出的示例节点
  // 假设你有一个会产出 chunk 的流式客户端
  // 使用自定义流式客户端生成 LLM token
  for await (const chunk of yourCustomStreamingClient(state.topic)) {
    // 使用 writer 向流中发送自定义数据
    config.writer({ custom_llm_chunk: chunk });
  }
  return { result: "completed" };
};

const graph = new StateGraph(State)
  .addNode("callArbitraryModel", callArbitraryModel)
  // 根据需要添加其他节点和边
  .compile();

// 设置 streamMode: "custom" 以在流中接收自定义数据
for await (const chunk of await graph.stream(
  { topic: "cats" },
  { streamMode: "custom" }
)) {
  // chunk 中包含从 LLM 流式输出的自定义数据
  console.log(chunk);
}
```

::: details 完整示例：流式任意 chat model

```typescript
import { StateGraph, StateSchema, MessagesValue, GraphNode, START, LangGraphRunnableConfig } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import OpenAI from "openai";

const openaiClient = new OpenAI();
const modelName = "gpt-5.4-mini";

async function* streamTokens(modelName: string, messages: any[]) {
  const response = await openaiClient.chat.completions.create({
    messages,
    model: modelName,
    stream: true,
  });

  let role: string | null = null;
  for await (const chunk of response) {
    const delta = chunk.choices[0]?.delta;

    if (delta?.role) {
      role = delta.role;
    }

    if (delta?.content) {
      yield { role, content: delta.content };
    }
  }
}

// 这是我们的工具
const getItems = tool(
  async (input, config: LangGraphRunnableConfig) => {
    let response = "";
    for await (const msgChunk of streamTokens(
      modelName,
      [
        {
          role: "user",
          content: `Can you tell me what kind of items i might find in the following place: '${input.place}'. List at least 3 such items separating them by a comma. And include a brief description of each item.`,
        },
      ]
    )) {
      response += msgChunk.content;
      config.writer?.(msgChunk);
    }
    return response;
  },
  {
    name: "get_items",
    description: "Use this tool to list items one might find in a place you're asked about.",
    schema: z.object({
      place: z.string().describe("The place to look up items for."),
    }),
  }
);

const State = new StateSchema({
  messages: MessagesValue,
});

const callTool: GraphNode<typeof State> = async (state) => {
  const aiMessage = state.messages.at(-1);
  const toolCall = aiMessage.tool_calls?.at(-1);

  const functionName = toolCall?.function?.name;
  if (functionName !== "get_items") {
    throw new Error(`Tool ${functionName} not supported`);
  }

  const functionArguments = toolCall?.function?.arguments;
  const args = JSON.parse(functionArguments);

  const functionResponse = await getItems.invoke(args);
  const toolMessage = {
    tool_call_id: toolCall.id,
    role: "tool",
    name: functionName,
    content: functionResponse,
  };
  return { messages: [toolMessage] };
};

const graph = new StateGraph(State)
  // 这是工具调用图节点
  .addNode("callTool", callTool)
  .addEdge(START, "callTool")
  .compile();
```

让我们用一个包含 tool call 的 [`AIMessage`](https://reference.langchain.com/javascript/langchain-core/messages/AIMessage) 来调用图：

```typescript
const inputs = {
  messages: [
    {
      content: null,
      role: "assistant",
      tool_calls: [
        {
          id: "1",
          function: {
            arguments: '{"place":"bedroom"}',
            name: "get_items",
          },
          type: "function",
        }
      ],
    }
  ]
};

for await (const chunk of await graph.stream(
  inputs,
  { streamMode: "custom" }
)) {
  console.log(chunk.content + "|");
}
```

:::

### 为特定 chat model 禁用流式

如果你的应用混合使用支持流式和不支持流式的模型，你可能需要为不支持流式的模型显式禁用流式。

在初始化模型时设置 `streaming: false`：

```typescript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "o1-preview",
  // 设置 streaming: false 以禁用 chat model 的流式输出
  streaming: false,
});
```

::: info
并非所有 chat model 集成都支持 `streaming` 参数。如果你的模型不支持，可以改用 `disableStreaming: true`，该参数在基类上提供，适用于所有 chat model。
:::

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/streaming) 翻译并二次创作。
