---
title: LangGraph Studio
categories: LangGraph
order: 20
date: 2026-06-25
tags:
  - LangGraph
  - LangGraph Studio
  - 调试
---

# LangGraph Studio

在本地使用 LangChain 构建 Agent 时，能够可视化 Agent 内部的运行过程、实时交互并在问题发生时进行调试是非常有帮助的。**LangSmith Studio** 是一个免费的图形化界面工具，让你可以在本地机器上开发和测试 LangChain Agent。

Studio 会连接到你本地运行的 Agent，向你展示 Agent 执行的每一个步骤：发送给模型的提示词、工具调用及其结果、以及最终输出。你可以在不编写额外代码或部署服务的情况下，测试不同的输入、检查中间状态并迭代 Agent 的行为。

本页介绍如何使用你本地的 LangChain Agent 设置 Studio。

## 前置条件

在开始之前，请确保你具备以下条件：

- **LangSmith 账号**：在 [smith.langchain.com](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-langgraph-studio) 免费注册或登录。
- **LangSmith API Key**：参考 [创建 API Key](https://docs.langchain.com/langsmith/create-account-api-key) 指南。
- 如果你不希望数据被[追踪](https://docs.langchain.com/langsmith/observability-concepts#traces)到 LangSmith，可以在应用的 `.env` 文件中设置 `LANGSMITH_TRACING=false`。禁用追踪后，不会有任何数据离开你的本地服务器。

## 设置本地 Agent 服务端

### 1. 安装 LangGraph CLI

[LangGraph CLI](https://docs.langchain.com/langsmith/cli) 提供了一个本地开发服务器（也称为 [Agent Server](https://docs.langchain.com/langsmith/agent-server)），负责将你的 Agent 连接到 Studio。

```bash
npx @langchain/langgraph-cli
```

### 2. 准备你的 Agent

如果你已经有一个 LangChain Agent，可以直接使用它。以下示例使用一个简单的邮件 Agent：

```typescript title="agent.ts"
import { createAgent } from "@langchain/langgraph";

function sendEmail(to: string, subject: string, body: string): string {
    // Send an email
    const email = {
        to: to,
        subject: subject,
        body: body
    };
    // ... email sending logic

    return `Email sent to ${to}`;
}

const agent = createAgent({
    model: "gpt-5.5",
    tools: [sendEmail],
    systemPrompt: "You are an email assistant. Always use the sendEmail tool.",
});

export { agent };
```

### 3. 环境变量

Studio 需要 LangSmith API Key 才能连接你的本地 Agent。在项目根目录下创建一个 `.env` 文件，填入你从 [LangSmith](https://smith.langchain.com/settings) 获取的 API Key。

::: warning
请确保 `.env` 文件不会被提交到版本控制系统（如 Git）中。请将其添加到 `.gitignore`。
:::

```bash title=".env"
LANGSMITH_API_KEY=lsv2...
```

### 4. 创建 LangGraph 配置文件

LangGraph CLI 使用配置文件来定位你的 Agent 并管理依赖。在你的应用目录下创建一个 `langgraph.json` 文件：

```json title="langgraph.json"
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:agent"
  },
  "env": ".env"
}
```

[`createAgent`](https://reference.langchain.com/javascript/langchain/index/createAgent) 函数会自动返回一个已编译的 LangGraph 图，这正是配置文件中 `graphs` 键所期望的格式。

::: info
关于配置文件 JSON 对象中每个键的详细说明，请参阅 [LangGraph 配置文件参考](https://docs.langchain.com/langsmith/cli#configuration-file)。
:::

此时，项目结构应该如下所示：

```bash
my-app/
├── src
│   └── agent.ts
├── .env
├── package.json
└── langgraph.json
```

### 5. 安装依赖

```bash
yarn install
```

### 6. 在 Studio 中查看你的 Agent

启动开发服务器，将你的 Agent 连接到 Studio：

```bash
npx @langchain/langgraph-cli dev
```

::: warning Safari 兼容性提示
Safari 会阻止 `localhost` 到 Studio 的连接。要解决这个问题，可以在上述命令中添加 `--tunnel` 参数，通过安全隧道访问 Studio。你需要手动将隧道 URL 添加到允许的来源中——在 Studio UI 中点击 **Connect to a local server**。详见[故障排除指南](https://docs.langchain.com/langsmith/troubleshooting-studio#safari-connection-issues)。
:::

服务器启动后，你的 Agent 可以通过两种方式访问：
- API 地址：`http://127.0.0.1:2024`
- Studio UI 地址：`https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`

![Agent view in the Studio UI](https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=ebd259e9fa24af7d011dfcc568f74be2)

Studio 连接到你的本地 Agent 后，你可以快速迭代 Agent 的行为。运行一个测试输入，在 [LangSmith](https://docs.langchain.com/langsmith/observability-studio) 中查看完整的执行追踪——包括提示词、工具参数、返回值以及 token/延迟指标。当出现问题时，Studio 会捕获异常及其上下文状态，帮助你理解发生了什么。

开发服务器支持热重载——修改提示词或工具签名后，Studio 会立即反映这些变更。你可以从任意步骤重新运行对话线程来测试修改，无需从头开始。这个工作流从简单的单工具 Agent 到复杂的多节点图都能适用。

> **Studio 的核心价值**：无需额外代码或部署，就能获得完整的可视化调试体验。热重载让你可以快速迭代，从任意检查点回放让你可以安全地试验新逻辑。

有关如何运行 Studio 的更多信息，请参考 [LangSmith 文档](https://docs.langchain.com/langsmith/observability)中的以下指南：

- [运行应用](https://docs.langchain.com/langsmith/use-studio#run-application)
- [管理 Assistant](https://docs.langchain.com/langsmith/use-studio#manage-assistants)
- [管理线程](https://docs.langchain.com/langsmith/use-studio#manage-threads)
- [迭代提示词](https://docs.langchain.com/langsmith/observability-studio)
- [调试 LangSmith 追踪](https://docs.langchain.com/langsmith/observability-studio#debug-langsmith-traces)
- [将节点添加到数据集](https://docs.langchain.com/langsmith/observability-studio#add-node-to-dataset)

## 视频指南

<iframe class="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/Mi1gSlHwZLM?si=zA47TNuTC5aH0ahd" title="Studio" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/studio) 翻译并二次创作。
