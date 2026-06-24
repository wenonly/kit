---
title: LangGraph Studio
categories: LangChain
order: 25
date: 2026-06-24
tags:
  - LangChain
  - LangGraph
---

# LangGraph Studio

本地开发 LangChain 智能体时，如果能 **看到 Agent 内部每一步发生了什么**、实时交互、在出错时快速定位问题，调试效率会大幅提升。**LangSmith Studio**（简称 Studio）就是为此而生的一款免费可视化界面，它运行在本地机器上，连接到你本地运行的 Agent。

Studio 会把 Agent 每一步的关键信息都展示出来：发给模型的 prompt、工具调用及其结果、最终输出。你可以测试不同输入、查看中间状态、迭代 Agent 行为——整个过程不需要额外写代码，也不用先部署。

> 小贴士：如果你希望在本地之外部署 Agent，请参考 [部署](/tutorials/LangChain/部署)。

## 前置准备

开始前请确认具备以下条件：

- **LangSmith 账号**：在 [smith.langchain.com](https://smith.langchain.com) 免费注册或登录
- **LangSmith API key**：按官方 *Create an API key* 指南创建

> 如果你不希望任何数据被 trace 到 LangSmith，在应用 `.env` 里设置 `LANGSMITH_TRACING=false` 即可。关闭 tracing 后，不会有任何数据离开本地服务器。

## 搭建本地 Agent Server

Studio 通过本地的 **Agent Server** 来连接你的 Agent，整个搭建流程分 6 步。

### 1. 安装 LangGraph CLI

LangGraph CLI 提供了一个本地开发服务器，也就是 Agent Server，负责把你的 Agent 暴露给 Studio：

```bash
npx @langchain/langgraph-cli
```

### 2. 准备你的 Agent

如果你已经有一个 LangChain Agent，可以直接使用。这里以一个简单的邮件智能体为例：

**agent.ts**

```ts
import { createAgent } from "@langchain/agents";

function sendEmail(to: string, subject: string, body: string): string {
  const email = {
    to,
    subject,
    body,
  };
  // ... email sending logic

  return `Email sent to ${to}`;
}

const agent = createAgent({
  model: "gpt-5.5",
  tools: [sendEmail],
  systemPrompt: "You are an email assistant. Always use the send_email tool.",
});
```

### 3. 配置环境变量

Studio 需要 LangSmith API key 才能连接你的本地 Agent。在项目根目录创建 `.env` 文件并填入 key：

> 警告：务必确认 `.env` 不会被 Git 等版本控制工具提交。

**.env**

```
LANGSMITH_API_KEY=lsv2...
```

### 4. 创建 LangGraph 配置文件

LangGraph CLI 通过配置文件来定位你的 Agent 并管理依赖。在应用目录创建 `langgraph.json`：

**langgraph.json**

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:agent"
  },
  "env": ".env"
}
```

> 代码要点：`createAgent` 会自动返回一个编译后的 LangGraph 图，这正是 `graphs` 字段所期望的对象。各字段更详细的含义请参考 LangGraph 官方的 *configuration file reference*。

此时项目的目录结构大致如下：

```
my-app/
├── src
│   └── agent.ts
├── .env
└── langgraph.json
```

### 5. 安装依赖

```bash
yarn install
```

### 6. 在 Studio 中查看你的 Agent

启动开发服务器，让 Agent 接入 Studio：

```bash
npx @langchain/langgraph-cli dev
```

> 注意：Safari 会阻止到 Studio 的 localhost 连接。遇到这种情况，在命令后加 `--tunnel` 参数通过安全隧道访问。

服务器起来后，你的 Agent 会同时通过两个入口可用：

- API：`http://127.0.0.1:2024`
- Studio UI：`https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`

连上 Studio 后，你就可以快速迭代 Agent 行为：运行测试输入、查看完整执行 trace（包含 prompts、工具参数、返回值、token 与延迟指标）。出现异常时，Studio 会连同周边状态一起捕获，帮你理解到底发生了什么。

开发服务器支持 **热重载**——修改 prompt 或工具签名后，Studio 会即时反映变化；你还可以从任意步骤重新运行会话线程，无需从头开始。这个工作流可以从单工具 Agent 一直扩展到复杂的多节点图。

更多用法可以参考 LangSmith 官方文档中的：

- Run application
- Manage assistants
- Manage threads
- Iterate on prompts
- Debug LangSmith traces
- Add node to dataset

## 视频教程

官方提供了配套的视频教程，演示了从本地 Agent 到部署 Agent 的完整流程。对于部署相关内容，请移步 [部署](/tutorials/LangChain/部署)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/studio) 翻译并二次创作。
