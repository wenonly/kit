---
title: 自定义配置
categories: DeepAgents
order: 13
date: 2026-06-25
tags:
  - DeepAgents
  - 自定义
---

# 自定义配置

> 学习如何通过系统提示词、工具、子 Agent 等方式自定义 Deep Agents

围绕你的目标构建 Agent 框架。`create_deep_agent` 为你提供了一个生产可用的基础：连接你的数据、塑造它的行为、添加你的用例所需的能力。

`createDeepAgent` 内置了一套预装的框架：文件系统、摘要、子 Agent 和提示词缓存，开箱即用。下面的参数让你定义 Agent 的人设、连接你的数据和工具，并用额外的中间件扩展[默认中间件栈](#默认栈-主-agent)。

```typescript
import { createDeepAgent } from "deepagents";

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  systemPrompt: "You are a helpful assistant.",
  tools: [search, fetchUrl],
  memory: ["./AGENTS.md"],
  skills: ["./skills/"],
});
```

| 参数 | 作用 |
| --- | --- |
| `model` | 指定使用的模型 |
| `systemPrompt` | Agent 的自定义指令 |
| `tools` | Agent 可调用的领域工具 |
| `memory` | 启动时加载的 AGENTS.md 文件 |
| `skills` | 按需加载知识的技能目录 |
| `backend` | 文件系统后端（默认为 StateBackend） |
| `permissions` | 文件系统的路径级访问控制 |
| `subagents` | 用于委派任务的自定义子 Agent |
| `middleware` | 追加到[默认中间件栈](#默认栈-主-agent)之后的额外中间件 |
| `interruptOn` | 在工具调用前暂停以等待人工审批 |
| `responseFormat` | 结构化输出 schema |
| [`contextSchema`](/tutorials/DeepAgents/上下文工程) | 每次运行的运行时上下文 schema（用户 ID、API 密钥、功能开关等） |

完整的参数列表请参见 [`createDeepAgent`](https://reference.langchain.com/javascript/deepagents/types/CreateDeepAgentParams) API 文档。如需从头组装完全自定义的框架，请参阅[配置 Agent 框架](https://docs.langchain.com/oss/javascript/langchain/agents#configure-the-harness)。

::: tip 提示
当你添加工具、子 Agent 和后端时，建议使用 [LangSmith](https://smith.langchain.com?utm_source=docs\&utm_medium=cta\&utm_campaign=langsmith-signup\&utm_content=oss-deepagents-customization) 来追踪每个部分是如何协同工作的。按照[可观测性快速入门](https://docs.langchain.com/langsmith/observability-quickstart)进行设置，并参阅[生产环境部署](/tutorials/DeepAgents/生产环境部署)了解在 LangSmith 上的部署方案。

我们同时建议你启用 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会监控你的 trace，自动发现问题并提出修复建议。
:::

## 模型

以 `provider:model` 格式传入 `model` 字符串，或传入一个已初始化的模型实例。支持的全部模型供应商请参见[支持的模型](/tutorials/DeepAgents/Deep Agents 概览)，经过测试的推荐模型请参见[推荐模型](/tutorials/DeepAgents/Deep Agents 概览)。

::: tip 提示
使用 `provider:model` 格式（例如 `openai:gpt-5.5`）可以快速切换不同模型。
:::

::: code-group

```bash [npm]
npm install @langchain/openai deepagents
```

```bash [pnpm]
pnpm install @langchain/openai deepagents
```

```bash [yarn]
yarn add @langchain/openai deepagents
```

```bash [bun]
bun add @langchain/openai deepagents
```

:::

::: code-group

```typescript [默认参数]
import { createDeepAgent } from "deepagents";

process.env.OPENAI_API_KEY = "your-api-key";

const agent = createDeepAgent({ model: "gpt-5.5" });
// this calls initChatModel for the specified model with default parameters
// to use specific model parameters, use initChatModel directly
```

```typescript [initChatModel]
import { initChatModel } from "langchain";
import { createDeepAgent } from "deepagents";

process.env.OPENAI_API_KEY = "your-api-key";

const model = await initChatModel("gpt-5.5");
const agent = createDeepAgent({
  model,
  temperature: 0,
});
```

```typescript [Model Class]
import { ChatOpenAI } from "@langchain/openai";
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  model: new ChatOpenAI({
    model: "gpt-5.5",
    apiKey: "your-api-key",
    temperature: 0,
  }),
});
```

:::

### Anthropic

👉 阅读 [Anthropic 聊天模型集成文档](https://docs.langchain.com/oss/javascript/integrations/chat/anthropic/)

::: code-group

```bash [npm]
npm install @langchain/anthropic deepagents
```

```bash [pnpm]
pnpm install @langchain/anthropic deepagents
```

```bash [yarn]
yarn add @langchain/anthropic deepagents
```

```bash [bun]
bun add @langchain/anthropic deepagents
```

:::

::: code-group

```typescript [默认参数]
import { createDeepAgent } from "deepagents";

process.env.ANTHROPIC_API_KEY = "your-api-key";

const agent = createDeepAgent({ model: "anthropic:claude-sonnet-4-6" });
// this calls initChatModel for the specified model with default parameters
// to use specific model parameters, use initChatModel directly
```

```typescript [initChatModel]
import { initChatModel } from "langchain";
import { createDeepAgent } from "deepagents";

process.env.ANTHROPIC_API_KEY = "your-api-key";

const model = await initChatModel("claude-sonnet-4-6");
const agent = createDeepAgent({
  model,
  temperature: 0,
});
```

```typescript [Model Class]
import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  model: new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: "your-api-key",
    temperature: 0,
  }),
});
```

:::

### Azure

👉 阅读 [Azure 聊天模型集成文档](https://docs.langchain.com/oss/javascript/integrations/chat/azure/)

::: code-group

```bash [npm]
npm install @langchain/azure deepagents
```

```bash [pnpm]
pnpm install @langchain/azure deepagents
```

```bash [yarn]
yarn add @langchain/azure deepagents
```

```bash [bun]
bun add @langchain/azure deepagents
```

:::

::: code-group

```typescript [默认参数]
import { createDeepAgent } from "deepagents";

process.env.AZURE_OPENAI_API_KEY = "your-api-key";
process.env.AZURE_OPENAI_ENDPOINT = "your-endpoint";
process.env.OPENAI_API_VERSION = "your-api-version";

const agent = createDeepAgent({ model: "azure_openai:gpt-5.5" });
// this calls initChatModel for the specified model with default parameters
// to use specific model parameters, use initChatModel directly
```

```typescript [initChatModel]
import { initChatModel } from "langchain";
import { createDeepAgent } from "deepagents";

process.env.AZURE_OPENAI_API_KEY = "your-api-key";
process.env.AZURE_OPENAI_ENDPOINT = "your-endpoint";
process.env.OPENAI_API_VERSION = "your-api-version";

const model = await initChatModel("azure_openai:gpt-5.5");
const agent = createDeepAgent({
  model,
  temperature: 0,
});
```

```typescript [Model Class]
import { AzureChatOpenAI } from "@langchain/openai";
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  model: new AzureChatOpenAI({
    model: "gpt-5.5",
    azureOpenAIApiKey: "your-api-key",
    azureOpenAIApiEndpoint: "your-endpoint",
    azureOpenAIApiVersion: "your-api-version",
    temperature: 0,
  }),
});
```

:::

### Google Gemini

👉 阅读 [Google GenAI 聊天模型集成文档](https://docs.langchain.com/oss/javascript/integrations/chat/google_generative_ai/)

::: code-group

```bash [npm]
npm install @langchain/google-genai deepagents
```

```bash [pnpm]
pnpm install @langchain/google-genai deepagents
```

```bash [yarn]
yarn add @langchain/google-genai deepagents
```

```bash [bun]
bun add @langchain/google-genai deepagents
```

:::

::: code-group

```typescript [默认参数]
import { createDeepAgent } from "deepagents";

process.env.GOOGLE_API_KEY = "your-api-key";

const agent = createDeepAgent({ model: "google-genai:gemini-3.1-pro-preview" });
// this calls initChatModel for the specified model with default parameters
// to use specific model parameters, use initChatModel directly
```

```typescript [initChatModel]
import { initChatModel } from "langchain";
import { createDeepAgent } from "deepagents";

process.env.GOOGLE_API_KEY = "your-api-key";

const model = await initChatModel("google-genai:gemini-3.1-pro-preview");
const agent = createDeepAgent({
  model,
  temperature: 0,
});
```

```typescript [Model Class]
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  model: new ChatGoogleGenerativeAI({
    model: "gemini-3.1-pro-preview",
    apiKey: "your-api-key",
    temperature: 0,
  }),
});
```

:::

### Bedrock Converse

👉 阅读 [AWS Bedrock 聊天模型集成文档](https://docs.langchain.com/oss/javascript/integrations/chat/bedrock_converse/)

::: code-group

```bash [npm]
npm install @langchain/aws deepagents
```

```bash [pnpm]
pnpm install @langchain/aws deepagents
```

```bash [yarn]
yarn add @langchain/aws deepagents
```

```bash [bun]
bun add @langchain/aws deepagents
```

:::

::: code-group

```typescript [默认参数]
import { createDeepAgent } from "deepagents";

// Follow the steps here to configure your credentials:
// https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html

const agent = createDeepAgent({ model: "bedrock:anthropic.claude-sonnet-4-6" });
// this calls initChatModel for the specified model with default parameters
// to use specific model parameters, use initChatModel directly
```

```typescript [initChatModel]
import { initChatModel } from "langchain";
import { createDeepAgent } from "deepagents";

// Follow the steps here to configure your credentials:
// https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html

const model = await initChatModel("bedrock:anthropic.claude-sonnet-4-6");
const agent = createDeepAgent({
  model,
  temperature: 0,
});
```

```typescript [Model Class]
import { ChatBedrockConverse } from "@langchain/aws";
import { createDeepAgent } from "deepagents";

// Follow the steps here to configure your credentials:
// https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html

const agent = createDeepAgent({
  model: new ChatBedrockConverse({
    model: "anthropic.claude-sonnet-4-6",
    region: "us-east-2",
    temperature: 0,
  }),
});
```

:::

### 其他模型

传入任何[支持的模型字符串](/tutorials/DeepAgents/Deep Agents 概览)，或一个已初始化的模型实例：

```typescript
import { initChatModel } from "langchain";
import { createDeepAgent } from "deepagents";

const model = await initChatModel("provider:model-name");
const agent = createDeepAgent({ model });
```

::: tip 提示
聊天模型会自动重试瞬时 API 故障（使用指数退避策略）。关于默认值、限制以及 `max_retries` / `timeout` 的调参示例，请参阅 LangChain [模型](https://docs.langchain.com/oss/javascript/langchain/models#connection-resilience)页面。
:::

## 工具

除了用于规划、文件管理和子 Agent 生成的[内置工具](/tutorials/DeepAgents/Deep Agents 概览)之外，你还可以提供自定义工具：

::: code-group

```ts [Google]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [internetSearch],
});
```

```ts [OpenAI]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  tools: [internetSearch],
});
```

```ts [Anthropic]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  tools: [internetSearch],
});
```

```ts [OpenRouter]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  tools: [internetSearch],
});
```

```ts [Fireworks]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  tools: [internetSearch],
});
```

```ts [Baseten]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  tools: [internetSearch],
});
```

```ts [Ollama]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  tools: [internetSearch],
});
```

:::

### MCP 工具

::: tip 提示
Deep Agents 全面支持 [Model Context Protocol (MCP)](https://docs.langchain.com/oss/javascript/langchain/mcp) 工具。你可以从任何 MCP 服务器加载工具——数据库、API、文件系统等——然后直接传给 `create_deep_agent`。
:::

安装 `@langchain/mcp-adapters` 以连接 MCP 服务器：

```bash
npm install @langchain/mcp-adapters
```

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createDeepAgent } from "deepagents";

const client = new MultiServerMCPClient({
    my_server: {
        transport: "http",
        url: "http://localhost:8000/mcp",
    },
});

const tools = await client.getTools();

const agent = await createDeepAgent({
    model: "openai:gpt-5.5",
    tools,
});

const result = await agent.invoke({
    messages: [{ role: "user", content: "Use the MCP server to help me." }],
});
```

更多详细的配置选项，包括 stdio 服务器、OAuth 认证、工具过滤和有状态会话，请参阅完整的 [MCP 指南](https://docs.langchain.com/oss/javascript/langchain/mcp)。

## 系统提示词

Deep Agents 内置了一个系统提示词。一个深度 Agent 的价值在于 SDK 在模型之上提供的编排层——规划、虚拟文件系统工具和子 Agent——而模型需要知道这些能力的存在以及何时使用它们。内置提示词教会 Agent 如何使用这套脚手架，这样你就不必为每个项目重新推导它；建议通过 [Profile](/tutorials/DeepAgents/Harness Profile) 或你自己的 `system_prompt=` 来微调，而不是直接照搬。

当中间件添加了特殊工具（如文件系统工具）时，它会将这些工具追加到系统提示词中。

每个深度 Agent 还应该包含一个针对其特定用例的自定义系统提示词：

::: code-group

```ts [Google]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  systemPrompt: researchInstructions,
});
```

```ts [OpenAI]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  systemPrompt: researchInstructions,
});
```

```ts [Anthropic]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  systemPrompt: researchInstructions,
});
```

```ts [OpenRouter]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  systemPrompt: researchInstructions,
});
```

```ts [Fireworks]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  systemPrompt: researchInstructions,
});
```

```ts [Baseten]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  systemPrompt: researchInstructions,
});
```

```ts [Ollama]
import { createDeepAgent } from "deepagents";

const researchInstructions =
  `You are an expert researcher. ` +
  `Your job is to conduct thorough research, and then ` +
  `write a polished report.`;

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  systemPrompt: researchInstructions,
});
```

:::

### 提示词组装

Deep Agents 从最多四个命名部分组装系统提示词，使得调用者提供的指令、SDK 内置的 Agent 指引以及任何特定于模型的 [Profile](/tutorials/DeepAgents/Harness Profile) 覆盖能够以可预测的优先级共存。如果没有这层分层，一个为 Claude 调优的 Profile 后缀（例如）可能会根据调用顺序覆盖你的 `system_prompt=` 参数，或者被它覆盖；命名槽位使排序变得明确且稳定。

在实践中，大多数调用者只会遇到两个槽位：`USER`（你的 `system_prompt=`）和 `BASE`（SDK 默认值）。选择一个具有内置 Profile 的模型——目前是 Anthropic 或 OpenAI——会增加一个 `SUFFIX`。完整的四部分组装主要在你编写自定义 `HarnessProfile` 或调试为什么某个 Profile 的文本出现在某个位置时才相关。

四个命名部分（每个都可能不存在）：

| 名称 | 来源 | 说明 |
| --- | --- | --- |
| `USER` | 传给 `create_deep_agent` 的 `system_prompt=` 参数 | `str` 或 `SystemMessage`；未设置时省略。 |
| `BASE` | SDK 默认值（`BASE_AGENT_PROMPT`） | 除非被 Profile 的 `CUSTOM` 替换，否则始终存在。 |
| `CUSTOM` | [`HarnessProfile.base_system_prompt`](/tutorials/DeepAgents/Harness Profile) | 当匹配的 Profile 设置了此项时，直接替换 `BASE`。 |
| `SUFFIX` | [`HarnessProfile.system_prompt_suffix`](/tutorials/DeepAgents/Harness Profile) | 当匹配的 Profile 设置了此项时，最后追加。 |

顺序始终是 **`USER` -> (`BASE` 或 `CUSTOM`) -> `SUFFIX`**，用空行（`\n\n`）连接。由此得出两个不变式：

1. **`USER` 始终在最前面。** 调用者的文本优先于任何 SDK 或 Profile 内容，因此无论选择哪个模型，人设/指令都占据优先权。
2. **`SUFFIX` 始终在最后。** Profile 后缀位于最接近对话历史的位置，这正是模型调优指引最可靠地生效的地方。

组装后的形态（✓ = 字段已设置，- = 字段未设置）：

| `system_prompt=` | Profile `base_system_prompt` (`CUSTOM`) | Profile `system_prompt_suffix` (`SUFFIX`) | 最终组装的系统提示词 |
| --- | :---: | :---: | --- |
| `None` | - | - | `BASE` |
| `None` | - | ✓ | `BASE` + `SUFFIX` |
| `None` | ✓ | - | `CUSTOM` |
| `None` | ✓ | ✓ | `CUSTOM` + `SUFFIX` |
| `str` | - | - | `USER` + `BASE` |
| `str` | - | ✓ | `USER` + `BASE` + `SUFFIX` |
| `str` | ✓ | - | `USER` + `CUSTOM` |
| `str` | ✓ | ✓ | `USER` + `CUSTOM` + `SUFFIX` |

实际示例——内置 Profile（Anthropic、OpenAI）只附带 `system_prompt_suffix`，因此一个典型调用落在 `str` + `-` + `✓` 行：

```python
agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    system_prompt="You are a customer-support agent for ACME Corp.",
)
# Final = USER + BASE + SUFFIX
#       = "You are a customer-support agent for ACME Corp."
#         + "\n\n"
#         + BASE_AGENT_PROMPT
#         + "\n\n"
#         + <Claude-specific guidance>
```

> **注意：** 传入 `SystemMessage`（而非字符串）会触发不同的拼接路径：右侧组装（`BASE` 或 `CUSTOM` 加上 `SUFFIX`）会作为额外的文本内容块追加到消息已有的 `content_blocks` 中。同样的逻辑排序仍然适用（调用者块在前），调用者块上的任何 `cache_control` 标记都会被保留——这对于放置显式的 Anthropic 提示词缓存断点很有用。

::: details 子 Agent 提示词

[提示词组装](#提示词组装)的覆盖规则同样适用于声明式[子 Agent](/tutorials/DeepAgents/子 Agent)：每个子 Agent 针对**它自己的模型**重新运行 Profile 解析，然后将解析到的 Profile 的 `base_system_prompt` / `system_prompt_suffix` 应用于其编写的 `system_prompt`。子 Agent 的 `system_prompt` 扮演 `BASE` 角色；`CUSTOM` 和 `SUFFIX` 来自与子 Agent 模型匹配的 Profile（可能与主 Agent 的 Profile 不同）。

| `spec["system_prompt"]` | Profile `base_system_prompt` (`CUSTOM`) | Profile `system_prompt_suffix` (`SUFFIX`) | 最终子 Agent 系统提示词 |
| --- | :---: | :---: | --- |
| 编写的 | - | - | 编写的 |
| 编写的 | - | ✓ | 编写的 + `SUFFIX` |
| 编写的 | ✓ | - | `CUSTOM` |
| 编写的 | ✓ | ✓ | `CUSTOM` + `SUFFIX` |

子 Agent 没有 `USER` 段。Spec 中编写的 `system_prompt` 是最接近的等价物，并留在 `BASE` 槽位。一个只附带 `system_prompt_suffix` 的 Profile（内置 Anthropic / OpenAI Profile 的常见情况）只是追加到子 Agent 作者编写的内容后面。一个设置了 `base_system_prompt` 的 Profile 将会*完全替换*编写的提示词。

:::

::: details 通用子 Agent 提示词

自动添加的[通用子 Agent](/tutorials/DeepAgents/子 Agent) 遵循[提示词组装](#提示词组装)的覆盖规则，但多了一层：通用子 Agent 的基础提示词解析顺序为 **`general_purpose_subagent.system_prompt`（如果已设置）-> `HarnessProfile.base_system_prompt`（如果已设置）-> SDK 通用默认值**。Profile 后缀无论哪种情况都会叠加在最上面。

这两个覆盖字段都可以携带基础提示词替换，但它们不可互换。`general_purpose_subagent.system_prompt` 是通用子 Agent 专用的配置；`base_system_prompt` 是一个全局覆盖，主要针对主 Agent。当两者都设置时，**通用子 Agent 专用意图在通用子 Agent 中胜出**，这样同时调整两个字段的用户就不会看到他们的 GP 覆盖被静默丢弃：

```python
register_harness_profile(
    "anthropic",
    HarnessProfile(
        base_system_prompt="You are ACME's support orchestrator.",  # main agent
        general_purpose_subagent=GeneralPurposeSubagentProfile(
            system_prompt="You are a research subagent. Cite sources.",  # GP subagent
        ),
        system_prompt_suffix="Always think step by step.",
    ),
)
```

| 栈 | 最终系统提示词 |
| --- | --- |
| 主 Agent | `"You are ACME's support orchestrator." + SUFFIX` |
| 通用子 Agent | `"You are a research subagent. Cite sources." + SUFFIX` |

如果 `general_purpose_subagent.system_prompt` 未设置，通用子 Agent 回退到 `base_system_prompt`（如果已设置），最后回退到 SDK 通用默认值。

:::

## 中间件

Deep Agents 支持任何[中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/overview)，包括下面列出的内置中间件、LangChain 的预构建中间件、供应商特定的中间件以及你自己编写的自定义中间件。

将中间件传递给 `createDeepAgent` 的 `middleware` 参数。自定义中间件会追加到[默认中间件栈](#默认栈-主-agent)中的 [`PatchToolCallsMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createPatchToolCallsMiddleware) 之后。

默认情况下，Deep Agents 可以访问以下中间件：

### 默认栈（主 Agent）

从第一个到最后一个：

1. [`TodoListMiddleware`](https://reference.langchain.com/javascript/langchain/index/todoListMiddleware)：跟踪和管理待办列表，用于组织 Agent 任务和工作。

2. [`SkillsMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createSkillsMiddleware)：仅在你传入 `skills` 时存在。注入在 todo 中间件**之后**、文件系统中间件**之前**，这样技能元数据在文件工具运行前就可用了。

3. [`FilesystemMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createFilesystemMiddleware)：处理文件系统操作，如读取、写入和目录导航。当你传入 `permissions` 时，文件系统权限强制执行也包含在这里，以便它可以评估 Agent 可能调用的每个工具。

4. [`SubAgentMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createSubAgentMiddleware)：生成和协调子 Agent，用于将任务委派给专门的 Agent。

5. [`SummarizationMiddleware`](https://reference.langchain.com/javascript/langchain/index/summarizationMiddleware)：当对话变长时压缩消息历史以保持在上下文限制内（通过 [createSummarizationMiddleware](https://reference.langchain.com/javascript/deepagents/middleware/createSummarizationMiddleware)）。

6. [`PatchToolCallsMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createPatchToolCallsMiddleware)：当运行在中断后恢复或收到格式错误的工具调用参数时，修复消息历史中悬空的工具调用。在 Anthropic 提示词缓存和下方的尾部栈**之前**运行。

7. [`AsyncSubAgentMiddleware`](https://reference.langchain.com/javascript/deepagents/agent/createDeepAgent)：仅在你配置了异步子 Agent 时存在。

8. **你的 middleware 参数**：你作为 `middleware` 参数传入的可选中间件追加在这里（Patch 之后、尾部栈之前）。

9. **Harness Profile 额外中间件**：来自已解析模型 Profile 的供应商特定中间件（如果有）。

10. **排除工具过滤**：当 Harness Profile 列出了排除工具时，中间件会从 Agent 中移除这些工具。

11. [`AnthropicPromptCachingMiddleware`](https://reference.langchain.com/javascript/langchain/index/anthropicPromptCachingMiddleware)：当你使用 Anthropic 模型时自动添加。在 Patch **之后**且在你的中间件**之后**运行，这样缓存前缀与实际发送给模型的内容匹配。

12. [`MemoryMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createMemoryMiddleware)：仅在你传入 `memory` 时存在。

    > **注意：** `MemoryMiddleware` 放在 Profile 额外中间件和 Anthropic 提示词缓存**之后**，这样对注入记忆的更新不太可能导致 Anthropic 缓存前缀失效。同样的排序问题在 `createDeepAgent` 的实现注释中也有提到。

13. `HumanInTheLoopMiddleware`：仅在你传入 `interruptOn` 时存在。在配置的工具调用处暂停以等待人工审批或输入。

### 默认栈（同步子 Agent）

内置的**通用**子 Agent 和每个声明式同步 `SubAgent` 图使用 `createDeepAgent` 在代码中构建的栈。它在整体形态上与主 Agent 匹配（待办列表、文件系统、摘要、Patch、Profile 额外中间件、Anthropic 缓存、可选权限），但在两个方面有所不同：

- **技能运行在** [`PatchToolCallsMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createPatchToolCallsMiddleware) **之后**（在这些内部 Agent 上；而在主 Agent 上，当设置了 `skills` 时，技能运行在文件系统中间件**之前**）。
- 子 Agent 图内部**没有** [`SubAgentMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createSubAgentMiddleware)（只有父 Agent 暴露 `task` 工具）。

当声明式子 Agent 设置了 `interruptOn` 时，该值会转发给子 Agent 的 `createAgent`，为配置的工具调用接通人机协作处理。

### 预构建中间件

LangChain 公开了额外的预构建中间件，让你可以添加各种功能，如重试、回退或 PII 检测。详见[预构建中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in)。

`deepagents` 包还公开了 [`createSummarizationMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createSummarizationMiddleware) 用于相同的工作流程。更多详情请参阅[摘要](/tutorials/DeepAgents/上下文工程)。

### 供应商特定中间件

关于针对特定 LLM 供应商优化的供应商特定中间件，请参阅[官方集成](https://docs.langchain.com/oss/javascript/integrations/middleware#official-integrations)和[社区集成](https://docs.langchain.com/oss/javascript/integrations/middleware#community-integrations)。

### 自定义中间件

你可以提供额外的中间件来扩展功能、添加工具或实现自定义钩子：

::: code-group

```ts [Google]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

```ts [OpenAI]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "openai:gpt-5.4",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

```ts [Anthropic]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

```ts [OpenRouter]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

```ts [Fireworks]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

```ts [Baseten]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

```ts [Ollama]
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the weather in a city.",
    schema: z.object({
      city: z.string(),
    }),
  },
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // Intercept and log every tool call - demonstrates cross-cutting concern
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[Middleware] Tool call #${callCount}: ${toolName}`);
    console.log(
      `[Middleware] Arguments: ${JSON.stringify(request.toolCall.args)}`,
    );

    // Execute the tool call
    const result = await handler(request);

    // Log the result
    console.log(`[Middleware] Tool call #${callCount} completed`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "ollama:devstral-2",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

:::

::: warning **初始化后不要修改属性**

如果你需要在钩子调用之间跟踪值（例如计数器或累积数据），请使用图状态。
图状态在设计上是线程作用域的，因此在并发下更新是安全的。

**这样做：**

```ts
const customMiddleware = createMiddleware({
  name: "CustomMiddleware",
  beforeAgent: async (state) => {
    return { x: (state.x ?? 0) + 1 }; // Update graph state instead
  },
});
```

**不要**这样做：

```ts
let x = 1;

const customMiddlewareBad = createMiddleware({
  name: "CustomMiddleware",
  beforeAgent: async () => {
    x += 1; // Mutation causes race conditions
  },
});
```

原地修改——例如在 `beforeAgent` 中修改 `state.x`、在 `beforeAgent` 中修改共享变量，或在钩子中修改其他共享值——可能导致难以排查的 bug 和竞态条件，因为许多操作是并发运行的（子 Agent、并行工具和不同线程上的并行调用）。

如果你必须在自定义中间件中使用修改操作，请考虑子 Agent、并行工具或并发 Agent 调用同时运行时会发生什么。
:::

### 解释器

使用[解释器](/tutorials/DeepAgents/解释器)添加一个 `eval` 工具，可以在限定的 QuickJS 运行时中执行 JavaScript。当 Agent 需要以编程方式组合工具、批量处理工作、处理代码中的错误或转换结构化数据，而又不需要完整的 shell 环境时，解释器非常有用。

::: code-group

```ts [Google]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  middleware: [createCodeInterpreterMiddleware()],
});
```

```ts [OpenAI]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  middleware: [createCodeInterpreterMiddleware()],
});
```

```ts [Anthropic]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  middleware: [createCodeInterpreterMiddleware()],
});
```

```ts [OpenRouter]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  middleware: [createCodeInterpreterMiddleware()],
});
```

```ts [Fireworks]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  middleware: [createCodeInterpreterMiddleware()],
});
```

```ts [Baseten]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  middleware: [createCodeInterpreterMiddleware()],
});
```

```ts [Ollama]
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  middleware: [createCodeInterpreterMiddleware()],
});
```

:::

关于设置、程序化工具调用、子 Agent 编排和限制，请参阅[解释器](/tutorials/DeepAgents/解释器)。

## 子 Agent

为了隔离详细工作并避免上下文膨胀，可以使用子 Agent：

::: code-group

```ts [Google]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "google-genai:gemini-3.5-flash", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

```ts [OpenAI]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "openai:gpt-5.4", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

```ts [Anthropic]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "anthropic:claude-sonnet-4-6", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

```ts [OpenRouter]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "openrouter:anthropic/claude-sonnet-4-6", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

```ts [Fireworks]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

```ts [Baseten]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "baseten:zai-org/GLM-5.2", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

```ts [Ollama]
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent, type SubAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Used to research more in depth questions",
  systemPrompt: "You are a great researcher",
  tools: [internetSearch],
  model: "ollama:devstral-2", // Optional override, defaults to main agent model
};
const subagents = [researchSubagent];

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  subagents,
});
```

:::

更多信息请参阅[子 Agent](/tutorials/DeepAgents/子 Agent)。

## 后端

深度 Agent 的工具可以利用虚拟文件系统来存储、访问和编辑文件。默认情况下，深度 Agent 使用 [`StateBackend`](https://reference.langchain.com/javascript/deepagents/backends/StateBackend)。

如果你使用[技能](#技能)或[记忆](#记忆)，必须在创建 Agent 之前将期望的技能或记忆文件添加到后端中。

### StateBackend

存储在 `langgraph` 状态中的线程作用域文件系统后端。

文件在一个线程内通过你的 checkpointer 持久化跨轮次保留，但不会跨线程共享。

```ts
import { createDeepAgent, StateBackend } from "deepagents";

// By default we provide a StateBackend
const agent = createDeepAgent();

// Under the hood, it looks like
const agent2 = createDeepAgent({
  backend: new StateBackend(),
});
```

### FilesystemBackend

本地机器的文件系统。

::: warning
此后端授予 Agent 直接的文件系统读写权限。
请谨慎使用，且仅在合适的环境中使用。
更多信息请参见 [`FilesystemBackend`](/tutorials/DeepAgents/虚拟文件系统后端)。
:::

::: code-group

```ts [Google]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

```ts [OpenAI]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

```ts [Anthropic]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

```ts [OpenRouter]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

```ts [Fireworks]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

```ts [Baseten]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

```ts [Ollama]
import { createDeepAgent, FilesystemBackend } from "deepagents";

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
});
```

:::

::: tip 提示
将 `FilesystemBackend` 包装在 `CompositeBackend` 中，可以防止内部 Agent 数据（卸载的工具结果、对话历史）与你的项目文件一起写入磁盘。请参阅[推荐模式](/tutorials/DeepAgents/虚拟文件系统后端)。
:::

### LocalShellBackend

直接在主机上执行 shell 的文件系统。提供文件系统工具以及用于运行命令的 `execute` 工具。

::: warning
此后端授予 Agent 直接的文件系统读写权限**以及**主机上不受限制的 shell 执行权限。
请极其谨慎地使用，且仅在合适的环境中使用。
更多信息请参见 [`LocalShellBackend`](/tutorials/DeepAgents/虚拟文件系统后端)。
:::

::: code-group

```ts [Google]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend,
});
```

```ts [OpenAI]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  backend,
});
```

```ts [Anthropic]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend,
});
```

```ts [OpenRouter]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend,
});
```

```ts [Fireworks]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend,
});
```

```ts [Baseten]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend,
});
```

```ts [Ollama]
import { createDeepAgent, LocalShellBackend } from "deepagents";

const backend = new LocalShellBackend({ workingDirectory: "." });

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  backend,
});
```

:::

### StoreBackend

提供*跨线程持久化*的长期存储文件系统。

::: code-group

```ts [Google]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

```ts [OpenAI]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

```ts [Anthropic]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

```ts [OpenRouter]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

```ts [Fireworks]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

```ts [Baseten]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

```ts [Ollama]
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  backend: new StoreBackend({
    namespace: (rt) => [rt.serverInfo.user.identity],
  }),
  store,
});
```

:::

> **注意：** 当部署到 [LangSmith Deployment](https://docs.langchain.com/langsmith/deployment) 时，请省略 `store` 参数。平台会自动为你的 Agent 预配存储。

::: tip 提示
`namespace` 参数控制数据隔离。对于多用户部署，请始终设置 [namespace 工厂](/tutorials/DeepAgents/虚拟文件系统后端)来按用户或租户隔离数据。
:::

### ContextHubBackend

在 LangSmith Hub 仓库中的持久化文件系统存储。

更多详情请参见 [`ContextHubBackend`](/tutorials/DeepAgents/虚拟文件系统后端)。

### CompositeBackend

一种灵活的后端，你可以在文件系统中指定不同的路由指向不同的后端。

::: code-group

```ts [Google]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

```ts [OpenAI]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

```ts [Anthropic]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

```ts [OpenRouter]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

```ts [Fireworks]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

```ts [Baseten]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

```ts [Ollama]
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: () => ["memories"],
    }),
  }),
  store,
});
```

:::

更多信息请参阅[虚拟文件系统后端](/tutorials/DeepAgents/虚拟文件系统后端)。

### 沙箱

沙箱是一种特殊的[后端](/tutorials/DeepAgents/虚拟文件系统后端)，它在一个隔离的环境中运行 Agent 代码，拥有自己的文件系统和用于 shell 命令的 `execute` 工具。

当你希望深度 Agent 写文件、安装依赖和运行命令，而又不改变本地机器上的任何东西时，可以使用沙箱后端。

通过在创建深度 Agent 时将沙箱后端传给 `backend` 来配置沙箱：

```typescript
import { createDeepAgent, LangSmithSandbox } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { SandboxClient } from "langsmith/sandbox";

const client = new SandboxClient();
const lsSandbox = await client.createSandbox();

try {
  const agent = createDeepAgent({
    model: new ChatAnthropic({ model: "claude-opus-4-8" }),
    systemPrompt: "You are a coding assistant with sandbox access.",
    backend: new LangSmithSandbox({ sandbox: lsSandbox }),
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Create a hello world Python script and run it",
      },
    ],
  });
} finally {
  await client.deleteSandbox(lsSandbox.name);
}
```

更多信息请参阅[沙箱](/tutorials/DeepAgents/沙箱)。

## 人机协作

某些工具操作可能比较敏感，需要在执行前获得人工批准。
你可以为每个工具配置审批策略：

```ts
import { tool } from "langchain";
import { createDeepAgent } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";

const removeFile = tool(
  async ({ path }: { path: string }) => {
    return `Deleted ${path}`;
  },
  {
    name: "remove_file",
    description: "Delete a file from the filesystem.",
    schema: z.object({
      path: z.string(),
    }),
  },
);

const fetchFile = tool(
  async ({ path }: { path: string }) => {
    return `Contents of ${path}`;
  },
  {
    name: "fetch_file",
    description: "Read a file from the filesystem.",
    schema: z.object({
      path: z.string(),
    }),
  },
);

const notifyEmail = tool(
  async ({
    to,
    subject,
    body,
  }: {
    to: string;
    subject: string;
    body: string;
  }) => {
    return `Sent email to ${to}`;
  },
  {
    name: "notify_email",
    description: "Send an email.",
    schema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  tools: [removeFile, fetchFile, notifyEmail],
  interruptOn: {
    remove_file: true, // Default: approve, edit, reject, respond
    fetch_file: false, // No interrupts needed
    notify_email: { allowedDecisions: ["approve", "reject"] }, // No editing
  },
  checkpointer, // Required!
});
```

你可以为 Agent 和子 Agent 配置工具调用级别的中断，也可以在工具调用内部配置。
更多信息请参阅[人机协作](/tutorials/DeepAgents/人机协作)。

## 技能

你可以使用[技能](/tutorials/DeepAgents/Deep Agents 概览)为深度 Agent 提供新的能力和专业知识。

虽然[工具](#工具)往往覆盖较低层的功能，如原生文件系统操作或规划，但技能可以包含如何完成任务的详细指令、参考信息和其他资产（如模板）。这些文件只有当 Agent 判定该技能对当前提示词有用时才会被加载。

这种渐进式加载减少了 Agent 启动时需要考虑的 token 和上下文量。

示例技能请参见 [Deep Agents 示例技能](https://github.com/langchain-ai/deepagentsjs/tree/main/examples/skills)。

要为深度 Agent 添加技能，将它们作为参数传给 `create_deep_agent`：

### StateBackend

```ts
import { createDeepAgent, StateBackend, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const backend = new StateBackend();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

const skillsFiles: Record<string, FileData> = {};
const skillUrl =
  "https://raw.githubusercontent.com/langchain-ai/deepagentsjs/refs/heads/main/examples/skills/langgraph-docs/SKILL.md";
const response = await fetch(skillUrl);
const skillContent = await response.text();

skillsFiles["/skills/langgraph-docs/SKILL.md"] = createFileData(skillContent);

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.1-pro-preview",
  backend,
  checkpointer, // Required !
  // IMPORTANT: deepagents skill source paths are virtual (POSIX) paths relative to the backend root.
  skills: ["/skills/"],
});

const config = { configurable: { thread_id: `thread-${Date.now()}` } };
const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "what is langraph?" }],
    files: skillsFiles,
  },
  config,
);
```

### StoreBackend

```ts
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const store = new InMemoryStore();
const backend = new StoreBackend({
  namespace: () => ["filesystem"],
});

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

const skillUrl =
  "https://raw.githubusercontent.com/langchain-ai/deepagentsjs/refs/heads/main/examples/skills/langgraph-docs/SKILL.md";

const response = await fetch(skillUrl);
const skillContent = await response.text();
const fileData = createFileData(skillContent);

await store.put(["filesystem"], "/skills/langgraph-docs/SKILL.md", fileData);

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.1-pro-preview",
  backend,
  store,
  checkpointer,
  // IMPORTANT: deepagents skill source paths are virtual (POSIX) paths relative to the backend root.
  skills: ["/skills/"],
});

const config = {
  recursionLimit: 50,
  configurable: { thread_id: `thread-${Date.now()}` },
};
const result = await agent.invoke(
  { messages: [{ role: "user", content: "what is langraph?" }] },
  config,
);
```

### FilesystemBackend

```ts
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const backend = new FilesystemBackend({ rootDir: process.cwd() });

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.1-pro-preview",
  backend,
  skills: ["./examples/skills/"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});

const config = { configurable: { thread_id: `thread-${Date.now()}` } };
const result = await agent.invoke(
  { messages: [{ role: "user", content: "what is langraph?" }] },
  config,
);
```

## 记忆

使用 [`AGENTS.md` 文件](https://agents.md/)为深度 Agent 提供额外的上下文。

你可以在创建深度 Agent 时将一个或多个文件路径传给 `memory` 参数：

### StateBackend

::: code-group

```ts [Google]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [OpenAI]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "openai:gpt-5.4",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Anthropic]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [OpenRouter]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Fireworks]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Baseten]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Ollama]
import { createDeepAgent, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);
const checkpointer = new MemorySaver();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const agent = await createDeepAgent({
  model: "ollama:devstral-2",
  memory: ["/AGENTS.md"],
  checkpointer: checkpointer,
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
    // Seed the default StateBackend's in-state filesystem (virtual paths must start with "/").
    files: { "/AGENTS.md": createFileData(agentsMd) },
  },
  { configurable: { thread_id: "12345" } },
);
```

:::

### StoreBackend

::: code-group

```ts [Google]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [OpenAI]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "openai:gpt-5.4",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Anthropic]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [OpenRouter]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Fireworks]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Baseten]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

```ts [Ollama]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const AGENTS_MD_URL =
  "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

const agentsMd = await fetchText(AGENTS_MD_URL);

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content,
    mimeType: "text/plain",
    created_at: now,
    modified_at: now,
  };
}

const store = new InMemoryStore();
const fileData = createFileData(agentsMd);
await store.put(["filesystem"], "/AGENTS.md", fileData);

const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "ollama:devstral-2",
  backend: new StoreBackend({
    namespace: () => ["filesystem"],
  }),
  store: store,
  checkpointer: checkpointer,
  memory: ["/AGENTS.md"],
});

const result = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content: "Please tell me what's in your memory files.",
      },
    ],
  },
  { configurable: { thread_id: "12345" } },
);
```

:::

### Filesystem

::: code-group

```ts [Google]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

```ts [OpenAI]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "openai:gpt-5.4",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

```ts [Anthropic]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

```ts [OpenRouter]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

```ts [Fireworks]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

```ts [Baseten]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

```ts [Ollama]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

// Checkpointer is REQUIRED for human-in-the-loop
const checkpointer = new MemorySaver();

const agent = await createDeepAgent({
  model: "ollama:devstral-2",
  backend: new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
  memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});
```

:::

## 结构化输出

Deep Agents 支持[结构化输出](https://docs.langchain.com/oss/javascript/langchain/structured-output)。

你可以通过将期望的结构化输出 schema 作为 `responseFormat` 参数传给 `createDeepAgent()` 来设置。
当模型生成结构化数据时，它会被捕获、验证，并返回到 Agent 状态的 `structuredResponse` 键中。

```ts
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
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
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const weatherReportSchema = z.object({
  location: z.string().describe("The location for this weather report"),
  temperature: z.number().describe("Current temperature in Celsius"),
  condition: z
    .string()
    .describe("Current weather condition (e.g., sunny, cloudy, rainy)"),
  humidity: z.number().describe("Humidity percentage"),
  windSpeed: z.number().describe("Wind speed in km/h"),
  forecast: z.string().describe("Brief forecast for the next 24 hours"),
});

const agent = await createDeepAgent({
  responseFormat: weatherReportSchema,
  tools: [internetSearch],
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What's the weather like in San Francisco?",
    },
  ],
});

console.log(result.structuredResponse);
// {
//   location: 'San Francisco, California',
//   temperature: 18.3,
//   condition: 'Sunny',
//   humidity: 48,
//   windSpeed: 7.6,
//   forecast: 'Clear skies with temperatures remaining mild. High of 18°C (64°F) during the day, dropping to around 11°C (52°F) at night.'
// }
```

更多信息和示例请参见 [response format](https://docs.langchain.com/oss/javascript/langchain/structured-output#response-format)。

## 高级用法

`createDeepAgent` 在 `createAgent` 之上预装了一个中间件栈。如需构建一个完全自定义的 Agent——精确选择要包含哪些能力——请参阅[配置 Agent 框架](https://docs.langchain.com/oss/javascript/langchain/agents#configure-the-harness)。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/customization) 翻译并二次创作。
