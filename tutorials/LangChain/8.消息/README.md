---
title: 消息
categories: LangChain
order: 8
date: 2026-06-24
tags:
  - LangChain
  - Message
---

# 消息

消息（Message）是 LangChain 中模型上下文的基本单元。它们代表模型的输入和输出，在与 LLM 交互时，承载表示对话状态所需的内容和元数据。

消息对象包含：

- **角色（Role）**：标识消息类型（如 system、user）
- **内容（Content）**：消息的实际内容（文本、图像、音频、文档等）
- **元数据（Metadata）**：可选字段，如响应信息、消息 ID 和 token 用量

LangChain 提供了跨所有模型 provider 通用的标准消息类型，确保无论调用哪个模型，行为都是一致的。

---

## 基本用法

使用消息最简单的方式是创建消息对象，在调用时传给模型：

```js
import { initChatModel, HumanMessage, SystemMessage } from "langchain";

const model = await initChatModel("gpt-5-nano");

const systemMsg = new SystemMessage("You are a helpful assistant.");
const humanMsg = new HumanMessage("Hello, how are you?");

const messages = [systemMsg, humanMsg];
const response = await model.invoke(messages); // 返回 AIMessage
```

### 文本提示词

文本提示词就是字符串——适用于不需要保留对话历史的简单生成任务：

```js
const response = await model.invoke("Write a haiku about spring");
```

适合使用文本提示词的场景：

- 单次独立请求
- 不需要对话历史
- 想要保持最少的代码复杂度

### 消息提示词

你也可以传入消息对象列表：

```js
import { SystemMessage, HumanMessage, AIMessage } from "langchain";

const messages = [
  new SystemMessage("You are a poetry expert"),
  new HumanMessage("Write a haiku about spring"),
  new AIMessage("Cherry blossoms bloom..."),
];
const response = await model.invoke(messages);
```

适合使用消息提示词的场景：

- 管理多轮对话
- 处理多模态内容（图像、音频、文件）
- 包含系统指令

### 字典格式

你也可以直接使用 OpenAI chat completions 格式的字典来指定消息：

```js
const messages = [
  { role: "system", content: "You are a poetry expert" },
  { role: "user", content: "Write a haiku about spring" },
  { role: "assistant", content: "Cherry blossoms bloom..." },
];
const response = await model.invoke(messages);
```

---

## 消息类型

LangChain 提供四种核心消息类型：

| 类型 | 说明 |
|---|---|
| **SystemMessage** | 系统消息，告诉模型如何行动，为交互提供上下文 |
| **HumanMessage** | 用户消息，代表用户输入和与模型的交互 |
| **AIMessage** | AI 消息，模型生成的响应，包含文本内容、工具调用和元数据 |
| **ToolMessage** | 工具消息，代表工具调用的输出结果 |

### SystemMessage（系统消息）

`SystemMessage` 代表一组初始化指令，用于引导模型行为。你可以使用系统消息来设定语气、定义模型角色，以及建立响应准则。

```js
import { SystemMessage, HumanMessage, AIMessage } from "langchain";

const systemMsg = new SystemMessage("You are a helpful coding assistant.");

const messages = [systemMsg, new HumanMessage("How do I create a REST API?")];
const response = await model.invoke(messages);
```

也可以设定详细的角色人设：

```js
import { SystemMessage, HumanMessage } from "langchain";

const systemMsg = new SystemMessage(`
You are a senior TypeScript developer with expertise in web frameworks.
Always provide code examples and explain your reasoning.
Be concise but thorough in your explanations.
`);

const messages = [systemMsg, new HumanMessage("How do I create a REST API?")];
const response = await model.invoke(messages);
```

### HumanMessage（用户消息）

`HumanMessage` 代表用户输入。它可以包含文本、图像、音频、文件以及其他多模态内容。

**文本内容：**

```js
// 消息对象
const response = await model.invoke([
  new HumanMessage("What is machine learning?"),
]);

// 字符串快捷方式
const response = await model.invoke("What is machine learning?");
```

**消息元数据：**

```js
const humanMsg = new HumanMessage({
  content: "Hello!",
  name: "alice",
  id: "msg_123",
});
```

> `name` 字段的行为因 provider 而异——有些用于用户身份识别，有些会忽略。请查阅模型 provider 的参考文档。

### AIMessage（AI 消息）

`AIMessage` 代表模型调用的输出。它可以包含多模态数据、工具调用和特定于 provider 的元数据：

```js
const response = await model.invoke("Explain AI");
console.log(typeof response); // AIMessage
```

> Provider 对不同类型消息的权重和处理方式不同，有时手动创建 `AIMessage` 对象并插入消息历史中（仿佛来自模型）是很有用的：

```js
import { AIMessage, SystemMessage, HumanMessage } from "langchain";

const aiMsg = new AIMessage("I'd be happy to help you with that question!");

const messages = [
  new SystemMessage("You are a helpful assistant"),
  new HumanMessage("Can you help me?"),
  aiMsg, // 插入，仿佛来自模型
  new HumanMessage("Great! What's 2+2?"),
];

const response = await model.invoke(messages);
```

**AIMessage 主要属性：**

| 属性 | 类型 | 说明 |
|---|---|---|
| `text` | string | 消息的文本内容 |
| `content` | string \| ContentBlock[] | 消息的原始内容 |
| `contentBlocks` | ContentBlock.Standard[] | 标准化的内容块（见下文） |
| `tool_calls` | ToolCall[] \| None | 模型发起的工具调用，无调用时为空 |
| `id` | string | 消息的唯一标识符 |
| `usage_metadata` | UsageMetadata \| None | 使用情况元数据，包含 token 计数 |
| `response_metadata` | ResponseMetadata \| None | 响应元数据 |

#### 工具调用

模型发出工具调用时，调用信息会包含在 `AIMessage` 中：

```js
const modelWithTools = model.bindTools([getWeather]);
const response = await modelWithTools.invoke("What's the weather in Paris?");

for (const toolCall of response.tool_calls) {
  console.log(`Tool: ${toolCall.name}`);
  console.log(`Args: ${toolCall.args}`);
  console.log(`ID: ${toolCall.id}`);
}
```

#### Token 用量

`AIMessage` 可以在其 `usage_metadata` 字段中保存 token 计数等使用元数据：

```js
import { initChatModel } from "langchain";

const model = await initChatModel("gpt-5-nano");

const response = await model.invoke("Hello!");
console.log(response.usage_metadata);

// {
//   "output_tokens": 304,
//   "input_tokens": 8,
//   "total_tokens": 312,
//   "input_token_details": {
//     "cache_read": 0
//   },
//   "output_token_details": {
//     "reasoning": 256
//   }
// }
```

#### 流式与分块

在流式传输过程中，你会收到 `AIMessageChunk` 对象，它们可以合并为完整的消息对象：

```js
import { AIMessageChunk } from "langchain";

let finalChunk;
for (const chunk of chunks) {
  finalChunk = finalChunk ? finalChunk.concat(chunk) : chunk;
}
```

### ToolMessage（工具消息）

对于支持工具调用的模型，AI 消息可以包含工具调用。工具消息用于将单个工具执行的结果传回模型。

工具可以直接生成 `ToolMessage` 对象：

```js
import { AIMessage, ToolMessage } from "langchain";

const aiMessage = new AIMessage({
  content: [],
  tool_calls: [
    {
      name: "get_weather",
      args: { location: "San Francisco" },
      id: "call_123",
    },
  ],
});

const toolMessage = new ToolMessage({
  content: "Sunny, 72°F",
  tool_call_id: "call_123",
});

const messages = [
  new HumanMessage("What's the weather in San Francisco?"),
  aiMessage, // 模型的工具调用
  toolMessage, // 工具执行结果
];

const response = await model.invoke(messages); // 模型处理结果
```

**ToolMessage 主要属性：**

| 属性 | 类型 | 说明 |
|---|---|---|
| `content` | string（必填） | 工具调用的字符串化输出 |
| `tool_call_id` | string（必填） | 此消息响应的工具调用 ID，必须与 AIMessage 中的工具调用 ID 匹配 |
| `name` | string（必填） | 被调用的工具名称 |
| `artifact` | dict | 不会发送给模型但可以被程序访问的附加数据 |

> `artifact` 字段存储不会发送给模型的补充数据，适用于存储原始结果、调试信息或下游处理数据，而不会弄乱模型的上下文。例如，检索工具可以从文档中检索一段文字供模型参考，其中消息内容包含模型将引用的文本，而 artifact 可以包含文档标识符或其他元数据供应用使用。

```js
import { ToolMessage } from "langchain";

// artifact 可供下游使用
const artifact = { document_id: "doc_123", page: 0 };

const toolMessage = new ToolMessage({
  content: "It was the best of times, it was the worst of times.",
  tool_call_id: "call_123",
  name: "search_books",
  artifact,
});
```

---

## 消息内容

消息内容是发送给模型的数据载荷。消息有一个 `content` 属性，它是松散类型的，支持字符串和未类型化对象列表（如字典）。这允许在 LangChain 聊天模型中直接支持 provider 原生结构，如多模态内容。

LangChain 聊天模型接受 `content` 属性中的消息内容，可以包含：

- 字符串
- provider 原生格式的内容块列表
- LangChain 标准内容块列表

### 多模态内容示例

```js
import { HumanMessage } from "langchain";

// 字符串内容
const humanMessage = new HumanMessage("Hello, how are you?");

// Provider 原生格式（如 OpenAI）
const humanMessage = new HumanMessage({
  content: [
    { type: "text", text: "Hello, how are you?" },
    {
      type: "image_url",
      image_url: { url: "https://example.com/image.jpg" },
    },
  ],
});

// 标准内容块列表
const humanMessage = new HumanMessage({
  contentBlocks: [
    { type: "text", text: "Hello, how are you?" },
    { type: "image", url: "https://example.com/image.jpg" },
  ],
});
```

---

## 标准内容块（Content Blocks）

LangChain 为消息内容提供了跨 provider 的标准表示。消息对象实现了 `contentBlocks` 属性，会将 `content` 属性延迟解析为标准的、类型安全的表示。

例如，`ChatAnthropic` 或 `ChatOpenAI` 生成的消息会以各自 provider 的格式包含 thinking 或 reasoning 块，但可以被延迟解析为一致的 `ReasoningContentBlock` 表示。

> 内容块是在 LangChain v1 中作为消息的新属性引入的，用于标准化跨 provider 的内容格式，同时保持与现有代码的向后兼容。内容块不是 `content` 属性的替代品，而是一个以标准化格式访问消息内容的新属性。

### 核心内容块

**文本块（Text）：**

```js
{
  type: "text",
  text: "Hello world",
  annotations: []
}
```

**推理块（Reasoning）：**

```js
{
  type: "reasoning",
  reasoning: "The user is asking about..."
}
```

### 多模态内容块

| 块类型 | type 值 | 说明 |
|---|---|---|
| Image | `"image"` | 图像数据，支持 url / base64 data / fileId |
| Audio | `"audio"` | 音频数据，支持 url / base64 data / fileId |
| Video | `"video"` | 视频数据，支持 url / base64 data / fileId |
| File | `"file"` | 通用文件（PDF 等），支持 url / base64 data / fileId |
| PlainText | `"text-plain"` | 文档文本（.txt, .md） |

> 每种多模态块在 base64 编码数据时需要提供 `mimeType`。

### 工具调用内容块

| 块类型 | type 值 | 说明 |
|---|---|---|
| ToolCall | `"tool_call"` | 函数调用，包含 name、args、id |
| ToolCallChunk | `"tool_call_chunk"` | 流式工具调用的分片 |
| InvalidToolCall | `"invalid_tool_call"` | 格式错误的调用 |
| ServerToolCall | `"server_tool_call"` | 服务端执行的工具调用 |
| ServerToolCallChunk | `"server_tool_call_chunk"` | 流式服务端工具调用分片 |
| ServerToolResult | `"server_tool_result"` | 服务端工具执行结果 |

可以使用 `ContentBlock` 类型导入：

```js
import { ContentBlock } from "langchain";

// 文本块
const textBlock = {
  type: "text",
  text: "Hello world",
};

// 图像块
const imageBlock = {
  type: "image",
  url: "https://example.com/image.png",
  mimeType: "image/png",
};
```

### 多模态输入示例

**图像输入（URL / Base64 / File ID）：**

```js
// 从 URL
const message = new HumanMessage({
  content: [
    { type: "text", text: "Describe the content of this image." },
    {
      type: "image",
      source_type: "url",
      url: "https://example.com/path/to/image.jpg",
    },
  ],
});

// 从 base64 数据
const message = new HumanMessage({
  content: [
    { type: "text", text: "Describe the content of this image." },
    {
      type: "image",
      source_type: "base64",
      mime_type: "image/jpeg",
      data: "AAAAIGZ0eXBtcDQyAAAAAGlzb21tcDQyAAACAGlzb2...",
    },
  ],
});

// 从 provider 管理的 File ID
const message = new HumanMessage({
  content: [
    { type: "text", text: "Describe the content of this image." },
    { type: "image", source_type: "id", id: "file-abc123" },
  ],
});
```

> 并非所有模型都支持所有文件类型。请查阅模型 provider 的参考文档了解支持的格式和大小限制。

---

## 配合聊天模型使用

聊天模型接受消息对象序列作为输入，返回 `AIMessage` 作为输出。交互通常是无状态的，因此一个简单的对话循环就是用不断增长的消息列表调用模型。

推荐进一步阅读：

- 持久化和管理对话历史的内置功能
- 管理上下文窗口的策略，包括消息裁剪和摘要压缩

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/messages) 翻译并二次创作。
