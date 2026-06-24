---
title: 可观测性
categories: LangGraph
order: 23
date: 2026-06-25
tags:
  - LangGraph
  - 可观测性
  - LangSmith
---

# 可观测性

追踪（Trace）是你的应用从输入到输出所经历的一系列步骤。每一个单独的步骤都由一次运行（run）来表示。你可以使用 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-observability) 来可视化这些执行步骤。要使用它，只需[为你的应用启用追踪](https://docs.langchain.com/langsmith/trace-with-langgraph)。启用后，你可以实现以下目标：

- [调试本地运行的应用](https://docs.langchain.com/langsmith/observability-studio#debug-langsmith-traces)
- [评估应用性能](https://docs.langchain.com/oss/javascript/langchain/test/evals)
- [监控应用](https://docs.langchain.com/langsmith/dashboards)

## 前置条件

在开始之前，请确保你具备以下条件：

- **LangSmith 账号**：在 [smith.langchain.com](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-observability) 免费注册或登录。
- **LangSmith API Key**：参考 [创建 API Key](https://docs.langchain.com/langsmith/create-account-api-key) 指南。

## 启用追踪

要为你的应用启用追踪，请设置以下环境变量：

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=<your-api-key>
```

默认情况下，追踪日志会记录到名为 `default` 的项目中。要配置自定义项目名称，请参阅[记录到项目](#记录到项目)。

更多信息请参考[使用 LangGraph 追踪](https://docs.langchain.com/langsmith/trace-with-langgraph)。

> **快速上手提示**：只需两个环境变量就能开启完整的可观测性。建议在项目开发的早期阶段就启用追踪，这样可以更快地发现和定位问题。

## 选择性追踪

你可能希望只追踪特定的调用或应用的某些部分。可以使用 LangSmith 的 `LangChainTracer` 来实现：

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

// This WILL be traced
const tracer = new LangChainTracer();
await agent.invoke(
  {
    messages: [{role: "user", content: "Send a test email to alice@example.com"}]
  },
  { callbacks: [tracer] }
);

// This will NOT be traced (if LANGSMITH_TRACING is not set)
await agent.invoke(
  {
    messages: [{role: "user", content: "Send another email"}]
  }
);
```

> **选择性追踪的妙用**：在开发环境中你可以全量追踪以便调试，但在某些特定场景下（如性能测试、敏感操作），只追踪你关心的部分调用可以减少噪音和成本。

## 记录到项目

### 静态配置

你可以通过设置 `LANGSMITH_PROJECT` 环境变量来为整个应用指定自定义项目名称：

```bash
export LANGSMITH_PROJECT=my-agent-project
```

### 动态配置

你还可以通过编程方式为特定操作设置项目名称：

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ projectName: "email-agent-test" });
await agent.invoke(
  {
    messages: [{role: "user", content: "Send a test email to alice@example.com"}]
  },
  { callbacks: [tracer] }
);
```

> **项目管理的最佳实践**：将不同环境（开发、测试、生产）或不同功能的追踪分别记录到不同的项目中，便于后续的对比分析和团队协作。

## 为追踪添加元数据

你可以使用自定义元数据和标签来标注追踪：

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ projectName: "email-agent-test" });
await agent.invoke(
  {
    messages: [{role: "user", content: "Send a test email to alice@example.com"}]
  },
  config: {
    tags: ["production", "email-assistant", "v1.0"],
    metadata: {
      userId: "user123",
      sessionId: "session456",
      environment: "production"
    }
  },
);
```

这些自定义元数据和标签会被附加到 LangSmith 中的追踪记录上，你可以在 LangSmith 仪表板中按标签或元数据进行筛选和搜索。

::: tip
想了解更多关于如何使用追踪来调试、评估和监控你的 Agent，请参阅 [LangSmith 可观测性文档](https://docs.langchain.com/langsmith/observability)。
:::

## 使用匿名化器防止敏感数据被记录到追踪中

你可能希望对敏感数据进行脱敏处理，防止其被记录到 LangSmith 中。你可以创建[匿名化器](https://docs.langchain.com/langsmith/mask-inputs-outputs#rule-based-masking-of-inputs-and-outputs)并通过配置将其应用到你的图上。以下示例会将追踪中所有匹配社会保障号格式 XXX-XX-XXXX 的内容进行脱敏处理。

```typescript
import { StateGraph } from "@langchain/langgraph";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import { StateAnnotation } from "./state.js";
import { createAnonymizer } from "langsmith/anonymizer"
import { Client } from "langsmith"

const anonymizer = createAnonymizer([
  // Matches SSNs
  { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/, replace: "<ssn>" }
])

const langsmithClient = new Client({ anonymizer })
const tracer = new LangChainTracer({
  client: langsmithClient,
});

export const graph = new StateGraph(StateAnnotation)
  .compile()
  .withConfig({ callbacks: [tracer] });
```

> **数据安全提示**：在处理包含用户隐私信息（如邮箱、电话、身份证号、银行卡号等）的场景中，匿名化器是保障合规性的重要工具。建议在生产环境中始终启用适当的脱敏规则。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/observability) 翻译并二次创作。
