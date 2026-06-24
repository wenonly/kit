---
title: LangGraph 概览
categories: LangGraph
order: 1
date: 2026-06-25
tags:
  - LangGraph
  - 编排框架
---

# LangGraph 概览

> 用 LangGraph 掌控全局，设计能够可靠处理复杂任务的 Agent。

LangGraph 是一个低层级编排框架和运行时，用于构建、管理和部署长时间运行的有状态 Agent。包括 Klarna、Uber、J.P. Morgan 在内的众多前沿企业都在使用 LangGraph 来驱动他们的 Agent 应用。

LangGraph 非常底层，完全专注于 Agent 的**编排（orchestration）**。在使用 LangGraph 之前，我们建议你先熟悉构建 Agent 时用到的一些基础组件，比如[模型](/tutorials/LangChain/模型)和[工具](/tutorials/LangChain/工具)。

在文档中，我们经常使用 [LangChain](/tutorials/LangChain/LangChain 概览) 组件来集成模型和工具，但你并不一定需要 LangChain 才能使用 LangGraph。如果你刚开始接触 Agent，或者想要更高级的抽象，我们推荐使用 LangChain 的 [Agent（createAgent）](/tutorials/LangChain/Agent（create_agent）)，它为常见的 LLM 和工具调用循环提供了预置的架构。

LangGraph 聚焦于 Agent 编排所需的底层能力：持久化执行（durable execution）、流式输出（streaming）、人机协作（human-in-the-loop）等。

::: details LangChain 产品矩阵是如何组合的

- [Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/overview) 是一个 Agent 外壳（agent harness）：在 LangGraph 之上提供规划、子代理、文件系统工具和上下文管理能力。
- [LangChain](/tutorials/LangChain/LangChain 概览) 是 Agent 框架：为模型、工具和 Agent 循环提供抽象和集成。
- **LangGraph** 是编排运行时：提供持久化执行、流式输出、人机协作和状态持久化。
- [LangSmith](https://docs.langchain.com/langsmith/observability) 是跨框架的平台：用于追踪、评估、提示词管理和部署。
- [LangSmith Engine](https://docs.langchain.com/langsmith/engine) 可以检测你的 LangGraph Agent 追踪中的问题并提出修复建议，你可以直接从 Engine 标签页提交修复 PR。
- [LangSmith Fleet](https://docs.langchain.com/langsmith/fleet/index) 是无代码 Agent 构建器，用于模板、集成和例行自动化。

你可以阅读 [Frameworks, runtimes, and harnesses](https://docs.langchain.com/oss/javascript/concepts/products) 来对比了解开源技术栈。
:::

## 安装

::: code-group

```bash [npm]
npm install @langchain/langgraph @langchain/core
```

```bash [pnpm]
pnpm add @langchain/langgraph @langchain/core
```

```bash [yarn]
yarn add @langchain/langgraph @langchain/core
```

```bash [bun]
bun add @langchain/langgraph @langchain/core
```

:::

安装完成后，来看一个简单的 Hello World 示例：

```typescript
import { StateSchema, MessagesValue, type GraphNode, StateGraph, START, END } from "@langchain/langgraph";

// 定义状态结构，包含一个 messages 字段
const State = new StateSchema({
  messages: MessagesValue,
});

// 定义一个模拟 LLM 节点，返回固定的 "hello world" 响应
const mockLlm: GraphNode<typeof State> = (state) => {
  return { messages: [{ role: "ai", content: "hello world" }] };
};

// 构建图：START -> mock_llm -> END
const graph = new StateGraph(State)
  .addNode("mock_llm", mockLlm)
  .addEdge(START, "mock_llm")
  .addEdge("mock_llm", END)
  .compile();

await graph.invoke({ messages: [{ role: "user", content: "hi!" }] });
```

::: tip
使用 [LangSmith](https://docs.langchain.com/langsmith/observability) 来追踪请求、调试 Agent 行为和评估输出。只需设置 `LANGSMITH_TRACING=true` 和你的 API Key 即可开始。建议同时启用 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会自动监控追踪数据、发现问题并提出修复建议。
:::

## 核心优势

LangGraph 为**任意**长时间运行的有状态工作流或 Agent 提供底层基础设施。它不会抽象掉提示词或架构，而是提供以下核心能力：

- **[持久化](/tutorials/LangGraph/持久化)**：构建能够穿越故障、长时间运行的 Agent，并从上次中断的地方恢复执行。
- **[人机协作](/tutorials/LangGraph/中断)**：在任意节点检查和修改 Agent 状态，融入人类监督。
- **全面的记忆能力**：创建有状态的 Agent，既有用于当前推理的短期工作记忆，也有跨会话的长期记忆。
- **使用 LangSmith 调试**：通过可视化工具深入洞察复杂的 Agent 行为——追踪执行路径、捕获状态转换、提供详细的运行时指标。
- **生产级部署**：使用专为有状态、长时间运行工作流设计的可扩展基础设施，自信地部署复杂的 Agent 系统。

> **LangGraph 与 LangChain 的关系：** LangChain 的 `createAgent` 构建在 LangGraph 之上，因此天然拥有 LangGraph 的持久化执行、人机协作等能力。如果你只需要快速搭建一个 Agent，推荐先用 LangChain；当你需要对执行流程进行更精细的控制时，再深入到 LangGraph 的底层 API。

## LangGraph 生态系统

虽然 LangGraph 可以独立使用，但它也与 LangChain 的任何产品无缝集成，为开发者提供构建 Agent 的完整工具链。为了提升你的 LLM 应用开发体验，可以将 LangGraph 与以下工具搭配使用：

- **[LangSmith 可观测性](https://docs.langchain.com/langsmith/observability)**：在一个界面中追踪请求、评估输出、监控部署。在本地用 LangGraph 原型开发，然后迁移到生产环境时享受集成的可观测性和评估能力，构建更可靠的 Agent 系统。

- **[LangSmith 部署](https://docs.langchain.com/langsmith/deployment)**：使用专为长时间运行的有状态工作流构建的部署平台，轻松部署和扩展 Agent。跨团队发现、复用、配置和共享 Agent，并在 Studio 中进行可视化原型迭代。

- **[LangChain](/tutorials/LangChain/LangChain 概览)**：提供集成和可组合组件来简化 LLM 应用开发，包含构建在 LangGraph 之上的 Agent 抽象。

## 致谢

LangGraph 的灵感来自 [Pregel](https://research.google/pubs/pub37252/) 和 [Apache Beam](https://beam.apache.org/)。公共接口的设计受到了 [NetworkX](https://networkx.org/documentation/latest/) 的启发。LangGraph 由 LangChain Inc.（LangChain 的创造者）开发，但可以不依赖 LangChain 独立使用。

## 小结

LangGraph 是整个 LangChain 生态的编排基石——如果你需要精确控制 Agent 的执行流程、状态管理和错误恢复，LangGraph 就是你的工具。接下来的章节将从安装开始，带你一步步掌握 LangGraph 的使用方法。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/overview) 翻译并二次创作。
