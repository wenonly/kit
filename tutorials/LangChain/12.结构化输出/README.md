---
title: 结构化输出
categories: LangChain
order: 12
date: 2026-06-24
tags:
  - LangChain
---

# 结构化输出

> 让 Agent 返回类型确定、格式可预测的结构化数据。

结构化输出（Structured Output）让 Agent 不再返回需要解析的自然语言文本，而是返回有类型约束的结构化数据。这对于下游程序消费 Agent 的输出至关重要——你拿到的是可以信赖的对象，而不是一段需要正则提取的字符串。

> 本篇聚焦于 `createAgent` 创建的 Agent 如何使用结构化输出。如果你只想在模型层面（而非 Agent 层面）使用，请参阅 Models - Structured output。

## 基本用法

LangChain 的预置 ReAct Agent `createAgent` 自动处理了结构化输出。你只需要设置 `responseFormat`，当模型生成结构化数据后，它会被捕获、验证，并放入 Agent 最终状态的 `structuredResponse` 字段中。

```ts
type ResponseFormat =
  | ZodSchema // 一个 Zod schema
  | StandardSchema // 任意 Standard Schema 实现
  | Record<string, unknown>; // 一个 JSON Schema

const agent = createAgent({
  // ...
  responseFormat: ResponseFormat | ResponseFormat[];
};
```

## 两种策略

`responseFormat` 支持两种策略，LangChain 会根据模型能力自动选择：

- **Provider strategy（提供商原生策略）**：某些模型提供商（如 OpenAI、xAI、Gemini、Anthropic）原生支持结构化输出，这是最可靠的方式。
- **Tool calling strategy（工具调用策略）**：对于不支持原生结构化输出的模型，LangChain 通过一次额外的工具调用来实现等效效果，兼容所有支持工具调用的模型。

你可以用 `toolStrategy()` 或 `providerStrategy()` 显式指定策略：

```ts
import { toolStrategy, providerStrategy } from "langchain";

const agent = createAgent({
  // 如果模型支持，使用 provider 原生策略
  responseFormat: providerStrategy(z.object({ /* ... */ })),
  // 或强制使用工具调用策略
  // responseFormat: toolStrategy(z.object({ /* ... */ })),
});
```

结构化响应最终放在 Agent 最终状态的 `structuredResponse` 字段。

## Provider strategy 示例

当模型提供商原生支持结构化输出时（如 OpenAI、Gemini、Anthropic Claude），这是最可靠的方法。提供商会在 API 层面强制 schema 约束，保证输出严格符合定义。

> 代码要点：下面用 Zod 定义了一个联系人信息 schema，Agent 会从自然语言中提取结构化的联系人数据。

```ts
import * as z from "zod";
import { createAgent, providerStrategy } from "langchain";

const ContactInfo = z.object({
  name: z.string().describe("姓名"),
  email: z.string().describe("邮箱地址"),
  phone: z.string().describe("电话号码"),
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  responseFormat: providerStrategy(ContactInfo),
});

const result = await agent.invoke({
  messages: [
    { role: "user", content: "Extract contact info from: John Doe, john@example.com, (555) 123-4567" },
  ],
});

console.log(result.structuredResponse);
// { name: "John Doe", email: "john@example.com", phone: "(555) 123-4567" }
```

> 如果你直接把 schema 传给 `responseFormat`（不包 `providerStrategy`），且模型支持原生结构化输出，效果完全等价。如果模型不支持，Agent 会自动回退到工具调用策略。

## Tool calling strategy 示例

对于不支持原生结构化输出的模型，工具调用策略是通用方案，只要模型支持工具调用就能用（现代模型基本都支持）。

> 代码要点：用 `toolStrategy` 包装一个产品评论分析 schema，Agent 通过一次工具调用返回结构化结果。

```ts
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const ProductReview = z.object({
  rating: z.number().min(1).max(5).optional(),
  sentiment: z.enum(["positive", "negative"]),
  keyPoints: z
    .array(z.string())
    .describe("评论要点，小写，每条 1-3 个词"),
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  responseFormat: toolStrategy(ProductReview),
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "Analyze this review: 'Great product: 5 out of 5 stars. Fast shipping, but expensive'",
    },
  ],
});

console.log(result.structuredResponse);
// { rating: 5, sentiment: "positive", keyPoints: ["fast shipping", "expensive"] }
```

### 自定义工具消息内容

`toolMessageContent` 参数让你自定义结构化输出生成后出现在对话历史中的工具消息内容：

```ts
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const MeetingAction = z.object({
  task: z.string().describe("具体任务"),
  assignee: z.string().describe("负责人"),
  priority: z.enum(["low", "medium", "high"]).describe("优先级"),
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  responseFormat: toolStrategy(MeetingAction, {
    toolMessageContent: "Action item captured and added to meeting notes!",
  }),
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "From our meeting: Sarah needs to update the project timeline as soon as possible",
    },
  ],
});

console.log(result.structuredResponse);
// { task: "update the project timeline", assignee: "Sarah", priority: "high" }
```

如果不设置 `toolMessageContent`，工具消息会默认显示 `"Returning structured response: {...}"`。

## 错误处理

`toolStrategy` 的 `options.handleError` 支持自定义错误处理策略：

- `true`（默认）：捕获所有错误，使用默认错误模板重试。
- `false`：不重试，让异常向上传播。
- `(error: ToolStrategyError) => string | Promise<string>`：用返回的消息重试，或抛出错误。

## 同时使用工具与结构化输出

如果同时指定了 `tools` 和 `responseFormat`，模型必须支持同时使用工具和结构化输出。大多数现代模型都支持这种组合，但在使用前建议确认目标模型的能力。

## 小结

结构化输出把 Agent 从"返回文字"升级到"返回数据"，是与下游系统集成的关键能力。选择策略时的经验法则：**模型支持原生结构化输出就用 provider strategy，否则用 tool calling strategy**——后者是万能兜底方案。

更多 Agent 高阶用法，可参阅[中间件概览](/tutorials/LangChain/中间件概览)和[内置中间件](/tutorials/LangChain/内置中间件)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/structured-output) 翻译并二次创作。
