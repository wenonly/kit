---
title: 流式输出
categories: LangChain
order: 13
date: 2026-06-24
tags:
  - LangChain
  - Streaming
---

# 流式输出

> 让 Agent 的思考与输出像水一样流式涌现，而不是让用户面对漫长的空白等待。

LangChain 内置了一套完整的流式系统，用于在 Agent 运行过程中实时呈现反馈。对于基于 LLM 的应用来说，流式输出是改善用户体验的关键手段：即便完整响应尚未生成，也可以先逐字、逐段地把内容推送给前端，极大缓解大模型的延迟焦虑。

> 新应用建议优先考虑 [事件流](/tutorials/LangChain/14.事件流)。它是 LangChain v1.3 引入的类型化 projection API，把消息、状态、工具调用、子图等内容拆分成各自独立的迭代器，无需再在一个 `stream_mode` chunk 里做条件分支。

## LangChain 流式能力一览

借助 LangChain 的流式系统，你可以在 Agent 运行时实时获取以下信息：

- **Agent 进度**：每个 agent step 完成后推送一次状态更新。
- **LLM tokens**：随着模型生成逐 token 输出。
- **思考 / 推理 tokens**：实时呈现模型的 reasoning 内容（前提是模型暴露了 reasoning 块）。
- **自定义更新**：在工具或节点中通过 `writer` 抛出任意自定义信号（例如 `"Fetched 10/100 records"`）。
- **多模式混合**：可同时订阅 `updates`、`messages`、`custom` 等多种流模式。

## 支持的 stream 模式

调用 `stream` 方法时，通过 `streamMode` 传入以下模式（可单选或数组多选）：

| 模式 | 描述 |
| --- | --- |
| `updates` | 每个 agent step 完成后推送状态更新；同一 step 内的多次更新（如多个节点并发）会分别推送。 |
| `messages` | 来自任意触发 LLM 调用的节点的 `(token, metadata)` 元组流。 |
| `custom` | 节点内通过 stream writer 发出的自定义数据流。 |

## 流式获取 Agent 进度

使用 `streamMode: "updates"` 即可在每个 agent step 后收到一条事件。例如，一个只调用一次工具的 Agent，会依次发出：

- LLM 节点：携带 tool call 请求的 `AIMessage`
- 工具节点：携带执行结果的 `ToolMessage`
- LLM 节点：最终的 AI 回复

通过 `configurable` 传入 `thread_id`，对话就会被 checkpointer 持久化，后续轮次可以复用同一份历史。`thread_id` 与 `streamMode` 相互独立；你还可以在同一位置传入 `context`，为工具的 `runtime.context` 提供运行期数据。

> 代码要点：下面用 `streamEvents` 拿到 v3 事件流对象，再分别用 `for await` 消费 `stream.messages`（每个 message 的 `.text` 是文本 delta 的异步迭代器）和 `stream.toolCalls`（每个工具调用的输入与最终输出）。

```ts
import { createAgent, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import z from "zod";

const getWeather = tool(
  async ({ city }) => {
    return `The weather in ${city} is always sunny!`;
  },
  {
    name: "get_weather",
    description: "Get weather for a given city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [getWeather],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: crypto.randomUUID() } };

const stream = await agent.streamEvents(
  { messages: [{ role: "user", content: "what is the weather in sf" }] },
  { ...config, version: "v3" },
);
await Promise.all([
  (async () => {
    for await (const message of stream.messages) {
      for await (const token of message.text) {
        process.stdout.write(token);
      }
    }
  })(),
  (async () => {
    for await (const call of stream.toolCalls) {
      console.log(`\nTool call: ${call.name}(${JSON.stringify(call.input)})`);
      console.log(`Tool result: ${await call.output}`);
    }
  })(),
]);

const finalState = await stream.output;
// Tool call: get_weather({"city":"San Francisco"})
// Tool result: [object ToolMessage]
// According to the data I have, the weather in San Francisco is always sunny! Would you like current conditions or a short forecast for today or the next few days?
```

> 想让 `thread_id` 真正生效，Agent 必须配置 `checkpointer`。在 LangSmith 部署时会自动提供；本地开发请显式传入，例如 `createAgent({ ..., checkpointer: new MemorySaver() })`。为简洁起见，下文示例省略了 `thread_id`，但生产环境一定要带上。

## 流式获取 LLM tokens

把 `streamMode` 设为 `"messages"`，即可拿到模型生成时的 token 流：

```ts
import z from "zod";
import { createAgent, tool } from "langchain";

const getWeather = tool(
    async ({ city }) => {
        return `The weather in ${city} is always sunny!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string(),
        }),
    }
);

const agent = createAgent({
    model: "gpt-5.4-mini",
    tools: [getWeather],
});

for await (const [token, metadata] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "messages" }
)) {
    console.log(`node: ${metadata.langgraph_node}`);
    console.log(`content: ${JSON.stringify(token.contentBlocks, null, 2)}`);
}
```

## 流式发送自定义更新

工具执行过程中，可以通过配置对象上的 `writer` 向外推送任意数据：

```ts
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        // Stream any arbitrary data
        config.writer?.(`Looking up data for city: ${input.city}`);
        // ... fetch city data
        config.writer?.(`Acquired data for city: ${input.city}`);
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string().describe("The city to get weather for."),
        }),
    }
);

const agent = createAgent({
    model: "gpt-5.4-mini",
    tools: [getWeather],
});

for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "custom" }
)) {
    console.log(chunk);
}
```

输出：

```
Looking up data for city: San Francisco
Acquired data for city: San Francisco
```

> 一旦给工具加了 `writer` 参数，在 LangGraph 执行上下文之外直接调用该工具时就必须自行传入 writer 函数，否则会报错。

## 同时订阅多种 stream 模式

把 `streamMode` 传成一个数组即可同时订阅多种模式，输出会是 `[mode, chunk]` 元组，其中 `mode` 标识当前 chunk 来自哪个流：

```ts
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        // Stream any arbitrary data
        config.writer?.(`Looking up data for city: ${input.city}`);
        // ... fetch city data
        config.writer?.(`Acquired data for city: ${input.city}`);
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string().describe("The city to get weather for."),
        }),
    }
);

const agent = createAgent({
    model: "gpt-5.4-mini",
    tools: [getWeather],
});

for await (const [streamMode, chunk] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: ["updates", "messages", "custom"] }
)) {
    console.log(`${streamMode}: ${JSON.stringify(chunk, null, 2)}`);
}
```

## 常见模式

### 流式获取思考 / 推理 tokens

部分模型在给出最终答案前会进行内部推理。你可以在 `streamMode: "messages"` 中过滤出 `type: "reasoning"` 类型的 content block，把这些思考过程也实时流式呈现出来。

> 推理输出默认是关闭的，需要先在模型上启用。具体配置请参考 reasoning 章节和对应提供商的集成文档。快速查询模型是否支持 reasoning，可以访问 models.dev。

使用支持扩展思考的模型实例（例如 `ChatAnthropic`），再在 agent 上订阅 `message.reasoning`：

```ts
import z from "zod";
import { createAgent, tool } from "langchain";
import { ChatAnthropic } from "@langchain/anthropic";

const getWeather = tool(
  async ({ city }) => {
    return `It's always sunny in ${city}!`;
  },
  {
    name: "get_weather",
    description: "Get weather for a given city.",
    schema: z.object({ city: z.string() }),
  },
);

const agent = createAgent({
  model: new ChatAnthropic({
    model: "claude-sonnet-4-6",
    thinking: { type: "enabled", budget_tokens: 5000 },
  }),
  tools: [getWeather],
});

const stream = await agent.streamEvents(
  { messages: [{ role: "user", content: "What is the weather in SF?" }] },
  { version: "v3" },
);
for await (const message of stream.messages) {
  for await (const token of message.reasoning) {
    process.stdout.write(`[thinking] ${token}`);
  }
  for await (const token of message.text) {
    process.stdout.write(token);
  }
}
```

输出：

```
[thinking] The user is asking about the weather in San Francisco. I have a tool
[thinking]  available to get this information. Let me call the get_weather tool
[thinking]  with "San Francisco" as the city parameter.
The weather in San Francisco is: It's always sunny in San Francisco!
```

这种用法与模型提供商无关——LangChain 会通过 `content_blocks` 把 Anthropic 的 `thinking` 块、OpenAI 的 `reasoning` 摘要等不同格式统一归一化为标准的 `"reasoning"` content block 类型。

## 关闭流式

某些场景下你可能想关掉某个模型的逐 token 流式，例如：

- 多 Agent 系统中只允许部分 Agent 流式输出。
- 同时使用支持和不支持流式的模型。
- 部署到 LangSmith 时，不希望某些模型输出被推送到客户端。

在初始化模型时设置 `streaming: false` 即可：

```ts
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-5.5",
  streaming: false,
});
```

> 不是所有 chat model 集成都支持 `streaming` 参数。如果遇到不支持的，可以改用 `disableStreaming: true`，它在基类上提供，适用于所有 chat model。

## 小结

流式输出是 Agent 应用从"能用"到"好用"的关键一跃：它把 LLM 的延迟从阻塞变成渐进式反馈。选择合适的 stream 模式（`updates` 看进度、`messages` 看 token、`custom` 推自定义信号），或者直接升级到 [事件流](/tutorials/LangChain/14.事件流) 拿到更清晰的类型化 projection。

更多进阶内容可参考 [上下文工程](/tutorials/LangChain/15.上下文工程) 和 [短期记忆](/tutorials/LangChain/16.短期记忆)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/streaming) 翻译并二次创作。
