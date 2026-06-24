---
title: 模型
categories: LangChain
order: 6
date: 2026-06-24
tags:
  - LangChain
  - Model
---

# 模型

大语言模型（LLM）是强大的 AI 工具，能够像人类一样理解和生成文本。它们足够通用，无需针对每个任务进行专门训练，就能撰写内容、翻译语言、做摘要和回答问题。

除了文本生成之外，许多模型还支持：

- **工具调用（Tool calling）**：调用外部工具（如数据库查询或 API 调用），并将结果用于回复
- **结构化输出（Structured output）**：让模型的响应遵循预定义的格式
- **多模态（Multimodality）**：处理和返回文本以外的数据，如图像、音频和视频
- **推理（Reasoning）**：模型执行多步推理以得出结论

模型是 Agent 的推理引擎。它们驱动 Agent 的决策过程——决定调用哪些工具、如何解读结果，以及何时给出最终答案。你选择的模型的质量和能力，直接决定了 Agent 的基础可靠性和性能表现。

> LangChain 的标准模型接口让你能够接入众多不同的 provider 集成，方便实验和切换模型，找到最适合你用例的那一个。

---

## 基本用法

模型可以在两种场景下使用：

1. **配合 Agent**：在创建 Agent 时动态指定模型。
2. **独立使用**：直接调用模型（在 Agent 循环之外），用于文本生成、分类、信息提取等不需要 Agent 框架的任务。

同一套模型接口在两种场景下通用，让你可以从小处着手，随着需求增长再扩展到更复杂的 Agent 工作流。

### 初始化模型

在 LangChain 中使用独立模型最简单的方式，是通过 `initChatModel` 从你选择的聊天模型 provider 初始化：

**OpenAI：**

```bash
npm install @langchain/openai
```

```js
import { initChatModel } from "langchain";

process.env.OPENAI_API_KEY = "your-api-key";

const model = await initChatModel("gpt-5.5");
```

**Anthropic：**

```bash
npm install @langchain/anthropic
```

```js
import { initChatModel } from "langchain";

process.env.ANTHROPIC_API_KEY = "your-api-key";

const model = await initChatModel("claude-sonnet-4-6");
```

**Azure OpenAI：**

```bash
npm install @langchain/azure
```

```js
import { initChatModel } from "langchain";

process.env.AZURE_OPENAI_API_KEY = "your-api-key";
process.env.AZURE_OPENAI_ENDPOINT = "your-endpoint";
process.env.OPENAI_API_VERSION = "your-api-version";

const model = await initChatModel("azure_openai:gpt-5.5");
```

**Google Gemini：**

```bash
npm install @langchain/google-genai
```

```js
import { initChatModel } from "langchain";

process.env.GOOGLE_API_KEY = "your-api-key";

const model = await initChatModel("google-genai:gemini-2.5-flash-lite");
```

**AWS Bedrock：**

```bash
npm install @langchain/aws
```

```js
import { initChatModel } from "langchain";

// 按照以下步骤配置凭证：
// https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html

const model = await initChatModel("bedrock:gpt-5.5");

const response = await model.invoke("Why do parrots talk?");
```

### 支持的 Provider 和模型

LangChain 通过专门的集成包支持所有主流模型 provider。每个 provider 包都实现了相同的标准接口，因此你可以在不重写应用逻辑的情况下切换 provider。新的模型名称无需等待 LangChain 更新即可直接使用——provider 包会将模型名称直接传递给 provider 的 API。

---

## 核心方法

| 方法 | 说明 |
|---|---|
| **invoke** | 模型接收消息作为输入，生成完整响应后输出消息 |
| **stream** | 调用模型，但以实时方式流式输出生成的内容 |
| **batch** | 批量向模型发送多个请求，提高处理效率 |

> 除聊天模型外，LangChain 还支持嵌入模型（embedding models）和向量存储（vector stores）等相邻技术。详见集成页面。

---

## 参数

聊天模型通过一系列参数来配置行为。完整支持的参数因模型和 provider 而异，标准参数包括：

| 参数 | 类型 | 说明 |
|---|---|---|
| `model` | string（必填） | 要使用的模型名称或标识符，也可用 `:` 格式同时指定 provider，例如 `openai:o1` |
| `apiKey` | string | provider 身份验证所需的 API Key，通常通过环境变量设置 |
| `temperature` | number | 控制模型输出的随机性。值越高回复越有创意，越低越确定 |
| `maxTokens` | number | 限制响应中的 token 总数，控制输出长度 |
| `timeout` | number | 等待模型响应的最大时间（秒），超时则取消请求 |
| `maxRetries` | number（默认 6） | 请求失败时的最大重试次数。使用指数退避加抖动策略。网络错误、速率限制（429）和服务器错误（5xx）会自动重试，客户端错误（如 401、404）不会重试 |

使用 `initChatModel` 时，以内联参数形式传入：

```js
const model = await initChatModel("claude-sonnet-4-6", {
  temperature: 0.7,
  timeout: 30,
  maxTokens: 1000,
  maxRetries: 6,
});
```

### 连接韧性

LangChain 聊天模型会自动以指数退避策略重试失败的 API 请求。默认情况下，对网络错误、速率限制（429）和服务器错误（5xx）最多重试 6 次。401（未授权）和 404 等客户端错误不会重试。

你可以在创建模型时调整 `maxRetries` 和 `timeout`，然后将该实例传给 `createAgent`、`createDeepAgent`，或独立调用：

```js
import { ChatAnthropic } from "@langchain/anthropic";

const model = new ChatAnthropic({
  model: "google_genai:gemini-3.5-flash",
  maxRetries: 10, // 网络不稳定时增加重试次数（默认: 6）
  timeout: 120_000, // 毫秒；连接慢时增加
});
```

> 对于在不稳定网络上运行的长时间 Agent 任务，建议将 `maxRetries` 提高到 10-15，并配置 checkpointer 以便在失败后保留进度。

---

## 调用方式

调用模型才能生成输出。有三种主要调用方式，各自适用于不同场景。

### invoke

调用模型最直接的方式是使用 `invoke()`，传入单条消息或消息列表：

```js
// 单条消息
const response = await model.invoke("Why do parrots have colorful feathers?");
console.log(response);
```

也可以传入消息列表来表示对话历史，每条消息都有角色（role）字段：

```js
const conversation = [
  { role: "system", content: "You are a helpful assistant that translates English to French." },
  { role: "user", content: "Translate: I love programming." },
  { role: "assistant", content: "J'adore la programmation." },
  { role: "user", content: "Translate: I love building applications." },
];

const response = await model.invoke(conversation);
console.log(response); // AIMessage("J'adore créer des applications.")
```

也可以使用消息对象：

```js
import { HumanMessage, AIMessage, SystemMessage } from "langchain";

const conversation = [
  new SystemMessage("You are a helpful assistant that translates English to French."),
  new HumanMessage("Translate: I love programming."),
  new AIMessage("J'adore la programmation."),
  new HumanMessage("Translate: I love building applications."),
];

const response = await model.invoke(conversation);
console.log(response); // AIMessage("J'adore créer des applications.")
```

### stream

大多数模型可以在生成输出的同时进行流式传输。逐字显示输出能显著改善用户体验，特别是对于较长的响应。

调用 `stream()` 返回一个迭代器，在产出输出分块时逐个 yield。你可以使用循环实时处理每个分块：

```js
const stream = await model.stream("Why do parrots have colorful feathers?");
for await (const chunk of stream) {
  console.log(chunk.text);
}
```

> 与 `invoke()` 返回单个 `AIMessage` 不同，`stream()` 返回多个 `AIMessageChunk` 对象，每个包含一部分输出文本。重要的是，流中的每个分块都可以通过累加拼接成完整消息：

```js
let full = null;
for await (const chunk of stream) {
  full = full ? full.concat(chunk) : chunk;
  console.log(full.text);
}

console.log(full.contentBlocks);
// [{"type": "text", "text": "The sky is typically blue..."}]
```

LangChain 聊天模型还可以通过 `streamEvents()` 流式传输语义事件，简化基于事件类型和其他元数据的过滤：

```js
const stream = await model.streamEvents("Hello");
for await (const event of stream) {
  if (event.event === "on_chat_model_start") {
    console.log(`Input: ${event.data.input}`);
  }
  if (event.event === "on_chat_model_stream") {
    console.log(`Token: ${event.data.chunk.text}`);
  }
  if (event.event === "on_chat_model_end") {
    console.log(`Full message: ${event.data.output.text}`);
  }
}
```

### batch

批量处理独立请求可以显著提升性能并降低成本，因为处理可以并行进行：

```js
const responses = await model.batch([
  "Why do parrots have colorful feathers?",
  "How do airplanes fly?",
  "What is quantum computing?",
]);
for (const response of responses) {
  console.log(response);
}
```

通过 `maxConcurrency` 控制最大并行数：

```js
model.batch(listOfInputs, {
  maxConcurrency: 5, // 限制为 5 个并行调用
});
```

---

## 工具调用

模型可以请求调用工具来执行任务，例如从数据库获取数据、搜索网络或运行代码。工具有两个部分组成：

1. **Schema**：包含工具名称、描述和参数定义（通常是 JSON Schema）
2. **执行函数**：实际运行的函数

> 你可能听到过"function calling"（函数调用）这个术语。我们将其与"tool calling"（工具调用）互换使用。

要让模型使用你定义的工具，需要通过 `bindTools` 绑定。在后续调用中，模型可以根据需要选择调用已绑定的任意工具：

```js
import { tool } from "langchain";
import * as z from "zod";
import { ChatOpenAI } from "@langchain/openai";

const getWeather = tool(
  (input) => `It's sunny in ${input.location}.`,
  {
    name: "get_weather",
    description: "Get the weather at a location.",
    schema: z.object({
      location: z.string().describe("The location to get the weather for"),
    }),
  },
);

const model = new ChatOpenAI({ model: "gpt-5.5" });
const modelWithTools = model.bindTools([getWeather]);

const response = await modelWithTools.invoke("What's the weather like in Boston?");
const toolCalls = response.tool_calls || [];
for (const tool_call of toolCalls) {
  console.log(`Tool: ${tool_call.name}`);
  console.log(`Args: ${tool_call.args}`);
}
```

> 使用 Agent 时，Agent 循环会自动处理工具的执行；单独使用模型时，你需要自己执行模型请求的工具并将结果传回模型。

更多内容详见[工具](/tutorials/LangChain/工具)。

---

## 结构化输出

你可以要求模型按照给定的 schema 返回响应。这对于确保输出可被轻松解析和在后续处理中使用非常有用。LangChain 支持多种 schema 类型和方法。

**使用 Zod schema（推荐）：**

```js
import * as z from "zod";

const Movie = z.object({
  title: z.string().describe("The title of the movie"),
  year: z.number().describe("The year the movie was released"),
  director: z.string().describe("The director of the movie"),
  rating: z.number().describe("The movie's rating out of 10"),
});

const modelWithStructure = model.withStructuredOutput(Movie);

const response = await modelWithStructure.invoke("Provide details about the movie Inception");
console.log(response);
// {
//   title: "Inception",
//   year: 2010,
//   director: "Christopher Nolan",
//   rating: 8.8,
// }
```

> 注意：传入 Zod schema 时，模型输出会使用 Zod 的 `parse` 方法进行校验。

也可以使用原生 JSON Schema：

```js
const jsonSchema = {
  title: "Movie",
  description: "A movie with details",
  type: "object",
  properties: {
    title: { type: "string", description: "The title of the movie" },
    year: { type: "integer", description: "The year the movie was released" },
    director: { type: "string", description: "The director of the movie" },
    rating: { type: "number", description: "The movie's rating out of 10" },
  },
  required: ["title", "year", "director", "rating"],
};

const modelWithStructure = model.withStructuredOutput(jsonSchema, {
  method: "jsonSchema",
});
```

此外，任何实现了 Standard Schema 规范的 schema 库也受支持，运行时通过 schema 的 `~standard.validate()` 方法校验。

---

## 高级主题

### 模型配置文件（Model Profiles）

> 需要 `langchain>=1.1`。

LangChain 聊天模型可以通过 `profile` 属性暴露一组支持的功能和能力：

```js
model.profile;
// {
//   maxInputTokens: 400000,
//   imageInputs: true,
//   reasoningOutput: true,
//   toolCalling: true,
//   ...
// }
```

模型配置数据让应用能够动态适配模型能力。例如：

- 摘要中间件可根据模型的上下文窗口大小触发摘要
- `createAgent` 中的结构化输出策略可自动推断（如检查是否支持原生结构化输出）
- 可根据支持的模态和最大输入 token 数限制模型输入

> 模型配置文件目前是 beta 功能，格式可能会变化。

### 多模态（Multimodal）

某些模型可以处理和返回非文本数据，如图像、音频和视频。你可以通过提供内容块（content blocks）来向模型传入非文本数据：

```js
const response = await model.invoke("Create a picture of a cat");
console.log(response.contentBlocks);
// [
//   { type: "text", text: "Here's a picture of a cat" },
//   { type: "image", data: "...", mimeType: "image/jpeg" },
// ]
```

### 推理（Reasoning）

许多模型能够执行多步推理来得出结论。如果底层模型支持，你可以展示推理过程以更好地理解模型如何得出最终答案：

```js
const stream = model.stream("Why do parrots have colorful feathers?");
for await (const chunk of stream) {
  const reasoningSteps = chunk.contentBlocks.filter((b) => b.type === "reasoning");
  console.log(reasoningSteps.length > 0 ? reasoningSteps : chunk.text);
}
```

### 本地模型

LangChain 支持在你自己的硬件上本地运行模型。这在数据隐私至关重要、你想调用自定义模型，或想避免使用云端模型产生的费用时非常有用。**Ollama** 是本地运行聊天和嵌入模型最简单的方式之一。

### 提示词缓存（Prompt Caching）

许多 provider 提供提示词缓存功能，以减少重复处理相同 token 时的延迟和成本。你可以在三个层面启用缓存：

- **隐式 provider 缓存**：provider 在请求命中缓存时自动传递成本节省，无需配置。例如 OpenAI 和 Gemini
- **Provider 级别显式控制**：provider 允许你手动指定缓存点以获得更大控制权。例如 `ChatOpenAI` 通过 `prompt_cache_key`，Anthropic 通过 `cache_control`
- **应用层**：在应用层面对请求进行缓存管理

> 缓存使用情况会反映在模型响应的 usage metadata 中。

### 服务端工具使用

某些 provider 支持服务端工具调用循环：模型可以在单个对话轮次中与网络搜索、代码解释器等工具交互并分析结果，无需在客户端管理 `ToolMessage` 对象。

### Base URL 和代理设置

你可以为实现了 OpenAI Chat Completions API 的 provider 配置自定义 base URL。许多模型 provider 提供兼容 OpenAI 的 API（如 Together AI、vLLM）：

```js
const model = initChatModel("MODEL_NAME", {
  modelProvider: "openai",
  baseUrl: "BASE_URL",
  apiKey: "YOUR_API_KEY",
});
```

> 对于 OpenRouter 和 LiteLLM，推荐使用专用集成 `ChatOpenRouter` 和 `ChatLiteLLM`。

### Token 用量

许多模型 provider 在调用响应中返回 token 用量信息。这些信息会包含在对应模型生成的 `AIMessage` 对象上。详见[消息](/tutorials/LangChain/消息)。

### 调用配置（Invocation Config）

调用模型时，可以通过 `config` 参数传入 `RunnableConfig` 对象，提供对执行行为、回调和元数据追踪的运行时控制：

```js
const response = await model.invoke("Tell me a joke", {
  runName: "joke_generation", // 自定义运行名称
  tags: ["humor", "demo"], // 分类标签
  metadata: { user_id: "123" }, // 自定义元数据
  callbacks: [myCallbackHandler], // 回调处理器
});
```

### 动态模型选择

动态模型在运行时根据当前状态和上下文进行选择，从而实现复杂的路由逻辑和成本优化。通过 `wrapModelCall` 中间件修改请求中的模型：

```js
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, createMiddleware } from "langchain";

const basicModel = new ChatOpenAI({ model: "gpt-5.4-mini" });
const advancedModel = new ChatOpenAI({ model: "gpt-5.5" });

const dynamicModelSelection = createMiddleware({
  name: "DynamicModelSelection",
  wrapModelCall: (request, handler) => {
    // 根据对话复杂度选择模型
    const messageCount = request.messages.length;

    return handler({
      ...request,
      model: messageCount > 10 ? advancedModel : basicModel,
    });
  },
});

const agent = createAgent({
  model: "gpt-5.4-mini", // 基础模型（messageCount <= 10 时使用）
  tools,
  middleware: [dynamicModelSelection],
});
```

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/models) 翻译并二次创作。
