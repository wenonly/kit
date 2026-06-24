---
title: MCP 集成
categories: LangChain
order: 21
date: 2026-06-24
tags:
  - LangChain
  - MCP
---

# MCP 集成

> 通过 Model Context Protocol 让 LangChain Agent 调用任意 MCP 服务器上定义的工具。

Model Context Protocol（MCP）是一个开放协议，标准化了应用程序向 LLM 提供工具和上下文的方式。LangChain Agent 可以通过 `@langchain/mcp-adapters` 库来使用定义在 MCP 服务器上的工具。

`@langchain/mcp-adapters` 让 Agent 能够使用跨多个 MCP 服务器定义的工具，无需为每个外部能力手写封装。

## 访问多个 MCP 服务器

> 代码要点：`MultiServerMCPClient` 支持在同一个客户端里同时连接多个 MCP 服务器。下面的示例同时连接了一个通过 stdio 通信的本地 math 服务器和一个通过 HTTP 通信的远程 weather 服务器，再调用 `client.getTools()` 把所有工具拉回来交给 `createAgent`。

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatAnthropic } from "@langchain/anthropic";
import { createAgent } from "langchain";

const client = new MultiServerMCPClient({
  math: {
    transport: "stdio", // 本地子进程通信
    command: "node",
    // 替换为你的 math_server.js 文件的绝对路径
    args: ["/path/to/math_server.js"],
  },
  weather: {
    transport: "http", // 基于 HTTP 的远程服务器
    // 确保你的 weather 服务器已启动在 8000 端口
    url: "http://localhost:8000/mcp",
  },
});

const tools = await client.getTools();
const agent = createAgent({
  model: "claude-sonnet-4-6",
  tools,
});

const mathResponse = await agent.invoke({
  messages: [{ role: "user", content: "what's (3 + 5) x 12?" }],
});

const weatherResponse = await agent.invoke({
  messages: [{ role: "user", content: "what is the weather in nyc?" }],
});
```

## 创建自己的 MCP 服务器

要创建自己的 MCP 服务器，可以使用 `@modelcontextprotocol/sdk` 库。这个库提供了一种简单的方式来定义工具并把它们作为服务器运行。

### Math 服务器（stdio 传输）

> 代码要点：服务器通过 `ListToolsRequestSchema` 声明可用工具（`add`、`multiply`），通过 `CallToolRequestSchema` 处理实际调用，最后用 `StdioServerTransport` 在标准输入输出上运行。

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "math-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add",
        description: "Add two numbers",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "multiply",
        description: "Multiply two numbers",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["a", "b"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "add": {
      const { a, b } = request.params.arguments as { a: number; b: number };
      return {
        content: [
          {
            type: "text",
            text: String(a + b),
          },
        ],
      };
    }
    case "multiply": {
      const { a, b } = request.params.arguments as { a: number; b: number };
      return {
        content: [
          {
            type: "text",
            text: String(a * b),
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Math MCP server running on stdio");
}

main();
```

### Weather 服务器（SSE 传输）

> 代码要点：与 stdio 版本不同，SSE 传输通过 Express 暴露 `/mcp` 端点，适合作为远程服务部署。

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const app = express();
app.use(express.json());

const server = new Server(
  {
    name: "weather-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_weather",
        description: "Get weather for location",
        inputSchema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Location to get weather for",
            },
          },
          required: ["location"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_weather": {
      const { location } = request.params.arguments as { location: string };
      return {
        content: [
          {
            type: "text",
            text: `It's always sunny in ${location}`,
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

app.post("/mcp", async (req, res) => {
  const transport = new SSEServerTransport("/mcp", res);
  await server.connect(transport);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Weather MCP server running on port ${PORT}`);
});
```

## 传输方式

MCP 支持多种客户端-服务器通信传输机制：

**HTTP 传输**（也称为 `streamable-http`）使用 HTTP 请求进行客户端-服务器通信。

```ts
const client = new MultiServerMCPClient({
  weather: {
    transport: "sse",
    url: "http://localhost:8000/mcp",
  },
});
```

**stdio 传输**——客户端把服务器作为子进程启动，通过标准输入输出通信。最适合本地工具和简单场景。

```ts
const client = new MultiServerMCPClient({
  math: {
    transport: "stdio",
    command: "node",
    args: ["/path/to/math_server.js"],
  },
});
```

## 工具与错误处理

MCP 服务器通过工具暴露可执行函数，LLM 可以调用这些函数来执行操作——查询数据库、调用 API 或与外部系统交互。LangChain 会把 MCP 工具转换为 LangChain 工具，使其可以直接在任何 LangChain Agent 或工作流中使用。

使用 `client.getTools()` 从 MCP 服务器获取工具并传给 Agent：

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";

const client = new MultiServerMCPClient({ ... });
const tools = await client.getTools();
const agent = createAgent({ model: "claude-sonnet-4-6", tools });
```

当 MCP 工具执行失败时（`CallToolResult` 中 `isError: true`），`@langchain/mcp-adapters` 会抛出 `ToolException`。请用 try/catch 包裹工具调用来处理这些错误。与 Python 适配器不同，TypeScript 适配器不会把错误作为失败的 tool message 返回给模型。工具的基本用法可以参阅[工具](/tutorials/LangChain/工具)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/mcp) 翻译并二次创作。
