---
title: 可观测性
categories: LangChain
order: 22
date: 2026-06-24
tags:
  - LangChain
  - LangSmith
---

# 可观测性

> 用 LangSmith 追踪 Agent 的每一步执行，看清它调用了哪些工具、生成了什么 prompt、如何做出决策。

在用 LangChain 构建和运行 Agent 时，你需要看清它的行为：调用了哪些工具、生成了什么 prompt、如何做出决策。通过 `createAgent` 创建的 LangChain Agent 会自动支持通过 LangSmith 进行追踪（tracing）。LangSmith 是一个用于捕获、调试、评估和监控 LLM 应用行为的平台。

**追踪（Trace）** 记录了 Agent 执行的每一步——从初始用户输入到最终响应，包括所有工具调用、模型交互和决策点。这些执行数据帮助你调试问题、评估不同输入下的表现，以及监控生产环境中的使用模式。

## 前置条件

开始之前，请确保你已具备：

- **LangSmith 账号**：在 [smith.langchain.com](https://smith.langchain.com) 免费注册或登录。
- **LangSmith API key**：按照 "Create an API key" 指南创建。

## 启用追踪

所有 LangChain Agent 都自动支持 LangSmith 追踪。要启用它，只需设置以下环境变量：

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=<your-api-key>
```

## 快速开始

无需额外代码即可把追踪日志上报到 LangSmith。像平常一样运行 Agent 代码即可：

```ts
import { createAgent } from "@langchain/agents";

function sendEmail(to: string, subject: string, body: string): string {
  // ... 邮件发送逻辑
  return `Email sent to ${to}`;
}

function searchWeb(query: string): string {
  // ... 网页搜索逻辑
  return `Search results for: ${query}`;
}

const agent = createAgent({
  model: "gpt-5.5",
  tools: [sendEmail, searchWeb],
  systemPrompt:
    "You are a helpful assistant that can send emails and search the web.",
});

// 运行 Agent —— 所有步骤都会被自动追踪
const response = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "Search for the latest AI news and email a summary to john@example.com",
    },
  ],
});
```

默认情况下，追踪日志会记录到名为 `default` 的项目中。要配置自定义项目名，请参考下方的"记录到项目"。

## 选择性追踪

你可以使用 LangSmith 的 `tracing_context` 上下文管理器，选择只追踪特定调用或应用的某些部分：

> 代码要点：通过显式传入 `LangChainTracer` 实例到 `callbacks`，可以精确控制哪些调用会被追踪；不传入 tracer 的调用（且未设置 `LANGSMITH_TRACING`）则不会被追踪。

```ts
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

// 这次调用会被追踪
const tracer = new LangChainTracer();
await agent.invoke(
  {
    messages: [
      { role: "user", content: "Send a test email to alice@example.com" },
    ],
  },
  { callbacks: [tracer] },
);

// 这次调用不会被追踪（前提是 LANGSMITH_TRACING 未设置）
await agent.invoke({
  messages: [{ role: "user", content: "Send another email" }],
});
```

## 记录到项目

### 静态方式

通过设置 `LANGSMITH_PROJECT` 环境变量，可以为整个应用指定一个自定义项目名：

```bash
export LANGSMITH_PROJECT=my-agent-project
```

### 动态方式

也可以针对特定操作以编程方式设置项目名：

```ts
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ projectName: "email-agent-test" });
await agent.invoke(
  {
    messages: [
      { role: "user", content: "Send a test email to alice@example.com" },
    ],
  },
  { callbacks: [tracer] },
);
```

## 自定义元数据与标签

你可以在追踪上附加自定义元数据和标签，方便后续在 LangSmith 中筛选和查询：

```ts
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ projectName: "email-agent-test" });
await agent.invoke(
  {
    messages: [
      { role: "user", content: "Send a test email to alice@example.com" },
    ],
  },
  {
    tags: ["production", "email-assistant", "v1.0"],
    metadata: {
      userId: "user123",
      sessionId: "session456",
      environment: "production",
    },
  },
);
```

这些自定义元数据和标签会被附加到 LangSmith 中的追踪记录上。

## 小结

可观测性是 Agent 从开发走向生产的关键一环：只需设置 `LANGSMITH_TRACING=true` 和 `LANGSMITH_API_KEY`，`createAgent` 创建的 Agent 就会自动上报全链路追踪。配合项目分组、标签和元数据，你可以在 LangSmith 中高效地调试、评估和监控 Agent 行为。如果需要回顾 Agent 的创建方式，请参阅[快速开始](/tutorials/LangChain/4.快速开始)与[Agent](/tutorials/LangChain/5.Agent)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/observability) 翻译并二次创作。
