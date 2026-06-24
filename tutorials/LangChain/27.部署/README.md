---
title: 部署
categories: LangChain
order: 27
date: 2026-06-24
tags:
  - LangChain
  - Deploy
---

# 部署

当 LangChain 智能体准备好上线时，**LangSmith** 提供了一个面向 Agent 工作负载的托管平台。传统托管服务通常是为 **无状态、短生命周期** 的 Web 应用设计的，而 LangGraph 天生是为 **有状态、长时运行**、需要持久化状态与后台执行的 Agent 而生。LangSmith 会接管基础设施、扩缩容和运维相关的事务，让你可以直接从 Git 仓库部署。

## 前置准备

开始前请确认：

- 一个 GitHub 账号
- 一个 LangSmith 账号（可免费注册）

> 小贴士：建议先按 [LangGraph Studio](/tutorials/LangChain/LangGraph Studio) 的本地 Agent Server 指南把应用跑通，再做部署。

## 部署你的 Agent

### 1. 在 GitHub 上创建仓库

要部署到 LangSmith，你的应用代码必须放在一个 GitHub 仓库里——公开或私有仓库都支持。先把代码 push 到仓库。

### 2. 部署到 LangSmith

1. **进入 Deployment 页面**：登录 LangSmith，在左侧边栏选择 **Deployments**
2. **新建部署**：点击 **+ New Deployment** 按钮，右侧会弹出填写表单
3. **关联仓库**：如果是首次使用，或要添加此前未连接的私有仓库，点击 **Add new account**，按提示连接 GitHub 账号
4. **部署仓库**：选择应用对应的仓库，点击 **Submit** 开始部署

> 注意：首次部署大约需要 15 分钟。可以在 **Deployment details** 视图查看进度。

### 3. 在 Studio 中测试应用

部署完成后：

1. 点击刚创建的 deployment 查看详情
2. 点击右上角的 **Studio** 按钮，Studio 会打开并展示你的图

### 4. 获取部署的 API URL

在 LangGraph 的 **Deployment details** 视图中，点击 **API URL** 即可复制到剪贴板。

### 5. 测试 API

#### JavaScript

先安装 LangGraph JS SDK：

```bash
npm install @langchain/langgraph-sdk
```

然后给 Agent 发一条消息：

```ts
const { Client } = await import("@langchain/langgraph-sdk");

const client = new Client({
  apiUrl: "your-deployment-url",
  apiKey: "your-langsmith-api-key",
});

const streamResponse = client.runs.stream(
  null, // Threadless run
  "agent", // Name of agent. Defined in langgraph.json.
  {
    input: {
      messages: [
        { role: "user", content: "What is LangGraph?" },
      ],
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

#### REST API

也可以直接用 `curl` 调用：

```bash
curl -s --request POST \
    --url <DEPLOYMENT_URL>/runs/stream \
    --header 'Content-Type: application/json' \
    --header "X-Api-Key: <LANGSMITH API KEY>" \
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

> 代码要点：`assistant_id` 就是 `langgraph.json` 里 `graphs` 字段对应的 key。`stream_mode` 可选 `messages`、`updates` 等多种模式，根据前端需要选择。

## 其他托管方式

除了 SaaS 托管，LangSmith 还提供 **自托管（self-hosted）** 和 **混合（hybrid）** 方案。更多细节请参考官方的 *Platform setup overview*。

## 小结

把本地跑通的 Agent 推到 GitHub，几分钟内就能部署到 LangSmith；再配合 [可观测性](/tutorials/LangChain/可观测性) 和 [UI 集成](/tutorials/LangChain/UI 集成)，你就拥有了一个完整可监控、可交互的生产级 Agent 应用。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/deploy) 翻译并二次创作。
