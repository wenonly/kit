---
title: 中间件概览
categories: LangChain
order: 9
date: 2026-06-24
tags:
  - LangChain
  - Middleware
---

# 中间件概览

> 在 Agent 执行的每一步都能精确控制与定制行为。

中间件（Middleware）是 LangChain 提供的一种机制，用来更细粒度地控制 Agent 内部发生了什么。借助中间件，你可以把横切关注点（日志、限流、脱敏、重试等）从业务逻辑中抽离出来，让 Agent 的核心代码保持简洁。

## 中间件能做什么

中间件非常适合以下场景：

- 通过日志、分析与调试手段追踪 Agent 行为。
- 对 prompt、工具选择和输出格式进行转换。
- 添加重试、回退和提前终止逻辑。
- 施加速率限制、护栏（guardrails）以及 PII（个人敏感信息）检测。

## 注册中间件

把中间件数组传给 `createAgent` 的 `middleware` 字段即可完成注册。下面是一个同时启用摘要和人工介入（HITL）中间件的示例：

```ts
import {
  createAgent,
  summarizationMiddleware,
  humanInTheLoopMiddleware,
} from "langchain";

const agent = createAgent({
  model: "gpt-5.5",
  tools: [/* ... */],
  middleware: [summarizationMiddleware, humanInTheLoopMiddleware],
});
```

中间件按数组顺序执行，先注册的先运行。你可以按需组合任意数量的内置或自定义中间件。

## Agent 循环与中间件钩子

Agent 的核心循环可以概括为三步：调用模型 → 让模型选择要执行的工具 → 当模型不再调用工具时结束。

中间件在每个步骤的前后都暴露了钩子（hook）：

- 调用模型之前 / 之后
- 执行工具之前 / 之后
- Agent 启动时 / 结束时

这意味着你可以在模型看到输入之前修改它、在工具真正执行前拦截它、或在 Agent 返回前对最终结果做后处理。

## 在 LangGraph 工作流中使用中间件

需要特别强调的是：中间件并不是一个独立的运行时。所有钩子都运行在 `createAgent` 返回的已编译 LangGraph 内部。因此，你可以把整个 Agent（连同它的中间件）作为一个节点或子图嵌入到更大的 `StateGraph` 中，所有中间件钩子都会照常运行。

当你需要的拓扑不只是"循环到完成"这种标准模式时——比如先对输入做分类再路由到不同 Agent、并行扇出任务、或者把 Agent 调用和确定性步骤缝合在一起——就该考虑这种组合方式了。

> 代码要点：下面的示例展示了一个邮件 Agent，它被嵌入到一个更大的图中。`humanInTheLoopMiddleware` 通过工具的 `.name` 进行匹配。在 TypeScript 中，这个名字就是你在 `tool({...}, { name })` 中传入的 `name`。

```ts
import { AgentState, createAgent, humanInTheLoopMiddleware } from "langchain";
import { StateGraph, START } from "@langchain/langgraph";

// 假设 readEmail、sendEmail、classifyNode、route 已在别处定义。
// readEmail / sendEmail 注册时使用的 name 分别为 "read_email" / "send_email"。
const emailAgent = createAgent({
  model: "claude-sonnet-4-6",
  tools: [readEmail, sendEmail],
  middleware: [humanInTheLoopMiddleware({ interruptOn: { send_email: true } })],
});

const graph = new StateGraph(AgentState)
  .addNode("classify", classifyNode)
  .addNode("emailAgent", emailAgent)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", route)
  .compile();
```

无论 HITL 中断、摘要、PII 脱敏还是重试，亦或是任何自定义钩子，都会跟随 Agent 节点一起生效。关于子图 checkpointer 的作用域（按调用还是按线程）等完整组合模式，请参阅官方"Use subgraphs"文档。

## 接下来

- [内置中间件](/tutorials/LangChain/内置中间件)：开箱即用的常用中间件详解。
- [自定义中间件](/tutorials/LangChain/自定义中间件)：用钩子构建你自己的中间件。
- [结构化输出](/tutorials/LangChain/结构化输出)：让 Agent 返回可预测的结构化数据。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/middleware/overview) 翻译并二次创作。
