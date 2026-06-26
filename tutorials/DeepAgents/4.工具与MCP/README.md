---
title: 工具与 MCP
categories: DeepAgents
order: 4
date: 2026-06-25
tags:
  - DeepAgents
  - 工具
---

# 工具与 MCP

> 将 Deep Agents 连接到自定义函数、API、数据库以及任意 MCP 服务器

Deep Agents 可以调用你定义的任何工具、任何 [LangChain 工具](https://docs.langchain.com/oss/javascript/langchain/tools)，以及来自任何 [MCP 服务器](#mcp-工具) 的工具。通过 `tools=` 参数将它们传递给 `createDeepAgent`，与[内置 harness 工具](/tutorials/DeepAgents/Deep Agents Code)（用于规划、文件管理和子 Agent 派生）一起使用。

```typescript
import { createDeepAgent } from "deepagents";

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  tools: [search, fetchUrl, runQuery],
});
```

## 自定义工具

你可以将任何可调用对象——普通函数、LangChain `@tool` 装饰器修饰的函数，或工具字典——直接传递给 `tools=`。Deep Agents 会从函数签名和文档字符串中自动推断工具的 schema，所以在大多数情况下你不需要单独定义 schema。

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

关于定义和使用 LangChain 工具的完整细节（工具字典、`StructuredTool`、返回类型、错误处理等），请参阅 [Tools](https://docs.langchain.com/oss/javascript/langchain/tools)。

## MCP 工具

> Deep Agents 全面支持 [Model Context Protocol (MCP)](https://docs.langchain.com/oss/javascript/langchain/mcp)——这是一个连接 Agent 与外部服务的开放标准。你可以从任何 MCP 服务器加载工具，并直接传递给 `createDeepAgent`。

MCP 是一个开放协议，它让 Agent 能够通过标准接口连接到一个不断增长的服务器生态系统——数据库、API、文件系统、浏览器等等。你不需要为每个服务编写自定义集成代码，只需将 Deep Agents 指向一个 MCP 服务器，它就能获得该服务器暴露的所有工具。

安装 `@langchain/mcp-adapters` 来连接 MCP 服务器：

```bash
npm install @langchain/mcp-adapters
```

```typescript
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

关于详细的配置选项——包括 stdio 服务器、OAuth 认证、工具过滤和有状态会话——请参阅完整的 [MCP 指南](https://docs.langchain.com/oss/javascript/langchain/mcp)。

## 内置 harness 工具

除了你提供的工具之外，每个 Deep Agent 还附带了一组来自 harness 的内置工具：

| 工具          | 描述                                               |
| ------------- | -------------------------------------------------- |
| `ls`          | 列出目录中的文件                                   |
| `read_file`   | 读取文件内容（支持分页和多模态）                   |
| `write_file`  | 创建新文件                                         |
| `edit_file`   | 在文件中执行精确的字符串替换                       |
| `glob`        | 查找匹配 glob 模式的文件                           |
| `grep`        | 搜索文件内容                                       |
| `execute`     | 运行 shell 命令（仅限沙箱后端）                    |
| `task`        | 派生子 Agent 来处理委托的任务                      |
| `write_todos` | 管理结构化的待办事项列表                           |

关于每个内置工具的完整说明，请参阅 [Harness 功能](/tutorials/DeepAgents/Deep Agents Code)。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/tools) 翻译并二次创作。
