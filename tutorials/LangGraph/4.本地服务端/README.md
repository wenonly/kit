---
title: 本地服务端
categories: LangGraph
order: 4
date: 2026-06-25
tags:
  - LangGraph
  - 本地开发
---

# 本地服务端

本篇指南将教你如何在本地运行 LangGraph 应用，包括安装 CLI、创建项目、启动服务和在 Studio 中测试。

## 前置条件

在开始之前，请确保你已准备好：

- 一个 [LangSmith](https://smith.langchain.com/settings) API Key —— 免费注册即可获取。

## 1. 安装 LangGraph CLI

首先，安装 LangGraph CLI 工具：

```shell
npm install --save-dev @langchain/langgraph-cli
```

## 2. 创建 LangGraph 应用

使用官方模板 [`new-langgraph-project-js`](https://github.com/langchain-ai/new-langgraphjs-project) 创建新应用。该模板展示了一个单节点应用，你可以在其基础上扩展自己的逻辑。

```shell
npm create langgraph
```

::: details 在现有项目中添加 LangGraph

如果你已经有一个包含 LangGraph Agent 的项目，可以使用 `config` 命令自动生成 `langgraph.json` 配置文件：

```shell
npm create langgraph config
```

该命令会扫描你的项目中的 LangGraph Agent（如 `createAgent()`、`StateGraph.compile()` 或 `workflow.compile()` 模式），并生成包含所有已导出 Agent 的配置文件。

示例输出：

```json
{
  "node_version": "24",
  "graphs": {
    "agent": "./src/agent.ts:agent",
    "searchAgent": "./src/search.ts:searchAgent"
  },
  "env": ".env"
}
```

::: tip
只有**已导出**的 Agent 才会被纳入配置。如果某个 Agent 没有被导出，命令会给出警告，提示你添加 `export` 关键字。
:::

:::

## 3. 安装依赖

进入新创建的 LangGraph 应用根目录，安装依赖。以 `edit` 模式安装后，你对代码的本地修改会被服务端即时使用：

```shell
cd path/to/your/app
npm install
```

## 4. 创建 `.env` 文件

新应用的根目录下有一个 `.env.example` 文件。将其复制为 `.env` 文件，并填入必要的 API Key：

```bash
LANGSMITH_API_KEY=lsv2...
```

> 建议将 `.env` 加入 `.gitignore`，避免将敏感信息提交到版本控制中。

## 5. 启动 Agent 服务端

在本地启动 LangGraph API 服务端：

```shell
npx @langchain/langgraph-cli dev
```

示例输出：

```
INFO:langgraph_api.cli:

        Welcome to

╦  ┌─┐┌┐┌┌─┐╔═╗┬─┐┌─┐┌─┐┬ ┬
║  ├─┤││││ ┬║ ╦├┬┘├─┤├─┘├─┤
╩═╝┴ ┴┘└┘└─┘╚═╝┴└─┴ ┴┴  ┴ ┴

- 🚀 API: http://127.0.0.1:2024
- 🎨 Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
- 📚 API Docs: http://127.0.0.1:2024/docs

This in-memory server is designed for development and testing.
For production use, please use LangSmith Deployment.
```

`langgraph dev` 命令以内存模式启动 Agent 服务端。这种模式适合开发和测试。生产环境请使用带有持久化存储后端的部署方式，详情请参考 [Platform setup overview](https://docs.langchain.com/langsmith/platform-setup)。

## 6. 在 Studio 中测试你的应用

[Studio](https://docs.langchain.com/langsmith/studio) 是一个专门的 UI 工具，可以连接 LangGraph API 服务端，让你在本地可视化、交互和调试你的应用。访问 `langgraph dev` 输出中提供的 Studio URL 即可开始测试：

```
https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
```

如果你的 Agent 服务端运行在自定义的主机/端口上，只需更新 URL 中的 `baseUrl` 查询参数。例如，服务端运行在 `http://myhost:3000`：

```
https://smith.langchain.com/studio/?baseUrl=http://myhost:3000
```

::: details Safari 兼容性
Safari 在连接 localhost 服务端时存在限制。使用 `--tunnel` 标志创建安全隧道：

```shell
langgraph dev --tunnel
```
:::

## 7. 测试 API

服务端启动后，你可以通过 SDK 或 REST API 与它交互。

### 使用 JavaScript SDK

1. 安装 LangGraph JS SDK：

```shell
npm install @langchain/langgraph-sdk
```

2. 发送消息给助手（无线程运行）：

```js
import { Client } from "@langchain/langgraph-sdk";

// 如果你修改了默认端口，需要设置 apiUrl
const client = new Client({ apiUrl: "http://localhost:2024"});

const streamResponse = client.runs.stream(
  null, // 无线程运行（Threadless run）
  "agent", // Assistant ID
  {
    input: {
      "messages": [
        { "role": "user", "content": "What is LangGraph?"}
      ]
    },
    streamMode: "messages-tuple",
  }
);

for await (const chunk of streamResponse) {
  console.log(`Receiving new event of type: ${chunk.event}...`);
  console.log(JSON.stringify(chunk.data));
  console.log("\n\n");
}
```

### 使用 REST API

```bash
curl -s --request POST \
    --url "http://localhost:2024/runs/stream" \
    --header 'Content-Type: application/json' \
    --data "{
        \"assistant_id\": \"agent\",
        \"input\": {
            \"messages\": [
                {
                    \"role\": \"human\",
                    \"content\": \"What is LangGraph?\"
                }
            ]
        },
        \"stream_mode\": \"messages-tuple\"
    }"
```

## 接下来

现在你已经在本地运行了一个 LangGraph 应用，接下来可以探索部署和高级功能：

- **[部署快速入门](https://docs.langchain.com/langsmith/deployment-quickstart)**：使用 LangSmith 部署你的 LangGraph 应用。
- **[LangSmith](https://docs.langchain.com/langsmith/observability)**：了解 LangSmith 的基础概念。
- **[SDK 参考](https://reference.langchain.com/javascript/modules/_langchain_langgraph-sdk.html)**：探索 SDK API 参考。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/local-server) 翻译并二次创作。
