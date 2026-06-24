---
title: 部署
categories: LangGraph
order: 22
date: 2026-06-25
tags:
  - LangGraph
  - Deployment
---

# 部署

> 把你的 Agent 从本地推向云端——LangSmith 提供了专为有状态、长时间运行的 Agent 设计的托管平台。

本指南将向你展示如何将 Agent 部署到 **[LangSmith Cloud](https://docs.langchain.com/langsmith/deploy-to-cloud)**——一个专为 Agent 工作负载设计的全托管平台。借助 Cloud 部署，你可以直接从 GitHub 仓库部署，LangSmith 会负责基础设施、扩缩容和运维等一切事务。

传统的托管平台是为无状态、短生命周期的 Web 应用构建的。而 LangSmith Cloud **专为有状态、长时间运行的 Agent 而生**，支持持久化状态和后台执行。

::: tip 更多部署选项
除了 Cloud 之外，LangSmith 还提供多种部署方式，包括 [混合部署（hybrid）](https://docs.langchain.com/langsmith/hybrid)、[独立服务器（standalone server）](https://docs.langchain.com/langsmith/deploy-standalone-server)、以及[带控制面的自托管](https://docs.langchain.com/langsmith/deploy-with-control-plane)。更多信息请参考 [部署概览](https://docs.langchain.com/langsmith/deployment)。
:::

## 前提条件

在开始之前，请确保你具备以下条件：

- 一个 [GitHub 账号](https://github.com/)
- 一个 [LangSmith 账号](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-deploy)（免费注册）

## 部署你的 Agent

### 1. 在 GitHub 上创建仓库

你的应用代码必须存放在 GitHub 仓库中才能在 LangSmith 上部署。支持公开和私有仓库。在开始快速部署之前，请先按照[本地服务端设置指南](/tutorials/LangGraph/LangGraph%20Studio#设置本地-agent-服务端)确保你的应用与 LangGraph 兼容，然后将代码推送到仓库。

### 2. 部署到 LangSmith

按以下步骤操作：

1. **进入 LangSmith 部署页面**：登录 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-deploy)，在左侧边栏选择 **Deployments**。
2. **创建新部署**：点击 **+ New Deployment** 按钮，会弹出一个面板让你填写必要字段。
3. **关联仓库**：如果你是首次使用，或者要添加一个之前未连接过的私有仓库，点击 **Add new account** 按钮并按照提示关联你的 GitHub 账号。
4. **部署仓库**：选择你的应用仓库，点击 **Submit** 开始部署。这个过程大约需要 15 分钟。你可以在 **Deployment details** 视图中查看状态。

### 3. 在 Studio 中测试你的应用

部署完成后：

1. 选择你刚创建的部署，查看详情。
2. 点击右上角的 **Studio** 按钮。Studio 会打开并显示你的图。

### 4. 获取部署的 API URL

1. 在 LangGraph 的 **Deployment details** 视图中，点击 **API URL** 将其复制到剪贴板。

### 5. 测试 API

现在你可以测试 API 了：

::: code-group

```shell [TypeScript]
# 1. 安装 LangGraph SDK
npm install @langchain/langgraph-sdk
```

```typescript [TypeScript - 调用]
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "your-deployment-url", apiKey: "your-langsmith-api-key" });

const streamResponse = client.runs.stream(
  null,    // Threadless run
  "agent", // Name of agent. Defined in langgraph.json.
  {
    input: {
      "messages": [
        { "role": "user", "content": "What is LangGraph?"}
      ]
    },
    streamMode: "messages",
  }
);

for await (const chunk of streamResponse) {
  console.log(`Receiving new event of type: ${chunk.event}...`);
  console.log(JSON.stringify(chunk.data));
  console.log("\n\n");
}
```

```bash [REST API]
curl -s --request POST \
    --url <DEPLOYMENT_URL>/runs/stream \
    --header 'Content-Type: application/json' \
    --header "X-Api-Key: <LANGSMITH API KEY> \
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
        \"stream_mode\": \"updates\"
    }"
```

:::

> 以上 REST API 示例中 `assistant_id` 的值 `agent` 是在 `langgraph.json` 中定义的 Agent 名称。请根据你的实际配置替换。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/deploy) 翻译并二次创作。
