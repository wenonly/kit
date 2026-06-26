---
title: 快速开始
categories: DeepAgents
order: 2
date: 2026-06-25
tags:
  - DeepAgents
  - 快速开始
---

# 快速开始

> 几分钟内构建你的第一个 Deep Agent

本教程将带你一步步创建一个具备任务规划、文件系统工具和子 Agent 能力的 Deep Agent。我们将构建一个能够执行研究并撰写报告的研究型 Agent。

::: tip 提示
**在使用 AI 编程助手？**

- 安装 [LangChain Docs MCP server](https://docs.langchain.com/use-these-docs)，让你的 Agent 获取最新的 LangChain 文档和示例。
- 安装 [LangChain Skills](https://github.com/langchain-ai/langchain-skills)，提升 Agent 在 LangChain 生态任务中的表现。
:::

## 前置条件

开始之前，请确保你已拥有某个模型供应商的 API Key（例如 Gemini、Anthropic、OpenAI）。

::: tip 注意
Deep Agents 需要模型支持[工具调用（tool calling）](https://docs.langchain.com/oss/javascript/langchain/models#tool-calling)。关于如何配置模型，请参考[自定义配置](/tutorials/DeepAgents/自定义配置)。
:::

## 第一步：安装依赖

::: code-group

```bash [npm]
npm install deepagents langchain @langchain/core @langchain/tavily
```

```bash [yarn]
yarn add deepagents langchain @langchain/core @langchain/tavily
```

```bash [pnpm]
pnpm add deepagents langchain @langchain/core @langchain/tavily
```

:::

::: tip 注意
本教程使用 [Tavily](https://tavily.com/) 作为示例搜索服务，你也可以替换为任何搜索 API（如 DuckDuckGo、SerpAPI、Brave Search）。
:::

## 第二步：设置 API Key

::: code-group

```bash [Google]
export GOOGLE_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [OpenAI]
export OPENAI_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [Anthropic]
export ANTHROPIC_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [OpenRouter]
export OPENROUTER_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [Fireworks]
export FIREWORKS_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [Baseten]
export BASETEN_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [Ollama]
# Local: Ollama must be running on your machine
# Cloud: Set your Ollama API key for hosted inference
export OLLAMA_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash [Other]
# Set the API key for your provider
export <PROVIDER>_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

:::

Deep Agents 支持任意 [LangChain 聊天模型](https://docs.langchain.com/oss/javascript/deepagents/models#supported-models)，请根据你的供应商设置对应的 API Key。

## 第三步：创建搜索工具

```ts
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general",
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: "general" | "news" | "finance";
    includeRawContent?: boolean;
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });
    return await tavilySearch._call({ query });
  },
  {
    name: "internet_search",
    description: "Run a web search",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("Search topic category"),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include raw content"),
    }),
  },
);
```

## 第四步：创建 Deep Agent

通过 `model` 参数传入 `provider:model` 格式的字符串，或传入一个[已初始化的模型实例](https://docs.langchain.com/oss/javascript/deepagents/models#configure-model-parameters)。所有支持的供应商请见[supported models](https://docs.langchain.com/oss/javascript/deepagents/models#supported-models)，经过测试的推荐模型请见[suggested models](https://docs.langchain.com/oss/javascript/deepagents/models#suggested-models)。

::: code-group

```ts [Google]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

```ts [OpenAI]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

```ts [Anthropic]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

```ts [OpenRouter]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

```ts [Fireworks]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

```ts [Baseten]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

```ts [Ollama]
import { createDeepAgent } from "deepagents";

// System prompt to steer the agent to be an expert researcher
const researchInstructions = `You are an expert researcher. Your job is to conduct thorough research and then write a polished report.

You have access to an internet search tool as your primary means of gathering information.

## \`internet_search\`

Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.
`;

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

:::

## 第五步：运行 Agent

```ts
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is langgraph?" }],
});

// Print the agent's response
console.log(result.messages[result.messages.length - 1].content);
```

::: tip 提示
使用 [LangSmith](https://smith.langchain.com?utm_source=docs\&utm_medium=cta\&utm_campaign=langsmith-signup\&utm_content=oss-deepagents-quickstart) 追踪 Agent 的规划步骤、工具调用和子 Agent 委派过程。按照[可观测性快速入门](https://docs.langchain.com/langsmith/observability-quickstart)完成设置。

我们还建议你配置 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会监控你的追踪记录、检测问题并提出修复建议。
:::

## 运行原理是什么？

你的 Deep Agent 会自动完成以下步骤：

1. **规划方案**：使用内置的 [`write_todos`](https://docs.langchain.com/oss/javascript/deepagents/harness#task-planning) 工具拆解研究任务。
2. **执行研究**：调用 `internet_search` 工具收集信息。
3. **管理上下文**：使用文件系统工具（[`write_file`](https://docs.langchain.com/oss/javascript/deepagents/harness#virtual-filesystem-access)、[`read_file`](https://docs.langchain.com/oss/javascript/deepagents/harness#virtual-filesystem-access)）卸载大量搜索结果。
4. **派生子 Agent**：根据需要将复杂子任务委派给专用子 Agent。
5. **综合报告**：将研究发现汇总为连贯的最终回复。

## 示例

更多 Agent 模式和应用，请参考 GitHub 上的 [Examples](https://github.com/langchain-ai/deepagents/tree/main/examples)。

## 流式传输

Deep Agents 基于 LangGraph 内置了[流式传输](https://docs.langchain.com/oss/javascript/langchain/event-streaming)能力，可以实时获取 Agent 执行的更新。这让你能够逐步观察输出，审查和调试 Agent 及子 Agent 的工作过程，包括工具调用、工具结果和 LLM 响应。

## 下一步

现在你已经构建了第一个 Deep Agent，可以继续探索：

- **自定义你的 Agent**：了解[自定义选项](/tutorials/DeepAgents/自定义配置)，包括自定义系统提示词、工具和子 Agent。
- **添加长期记忆**：启用跨会话的[持久记忆](/tutorials/DeepAgents/记忆)。
- **部署到生产环境**：使用 [Managed Deep Agents](https://docs.langchain.com/langsmith/managed-deep-agents-overview) 在 LangSmith 中创建、运行和管理 Deep Agent。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/quickstart) 翻译并二次创作。
