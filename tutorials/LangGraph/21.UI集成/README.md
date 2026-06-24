---
title: UI 集成
categories: LangGraph
order: 21
date: 2026-06-25
tags:
  - LangGraph
  - UI
---

# UI 集成

[Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui) 是一个基于 Next.js 的应用，提供了与任意 LangChain Agent 对话交互的界面。它支持实时聊天、工具调用可视化，以及时间旅行调试（time-travel debugging）和状态分叉（state forking）等高级功能。

无论你是本地运行还是部署到 [LangSmith](/langsmith/observability)，Agent Chat UI 都能与使用 `create_agent` 创建的 Agent 无缝配合，以极少的配置为你的 Agent 提供交互式体验。

Agent Chat UI 完全开源，可以根据你的应用需求进行定制开发。

::: tip 提示
你可以在 Agent Chat UI 中使用生成式 UI（generative UI）。更多信息请参阅 LangGraph 官方的 *Implement generative user interfaces with LangGraph* 教程。
:::

## 快速开始

最快的上手方式是使用官方托管版本：

1. **访问 [Agent Chat UI](https://agentchat.vercel.app)**
2. **连接你的 Agent**：输入你的部署 URL 或本地服务地址
3. **开始对话**：UI 会自动检测并渲染工具调用和中断（interrupt）

## 本地开发

如果需要定制或进行本地调试，可以把 Agent Chat UI 跑在本地。

::: code-group

```bash [使用 npx]
# 创建一个新的 Agent Chat UI 项目
npx create-agent-chat-app --project-name my-chat-ui
cd my-chat-ui

# 安装依赖并启动
pnpm install
pnpm dev
```

```bash [克隆仓库]
# 克隆仓库
git clone https://github.com/langchain-ai/agent-chat-ui.git
cd agent-chat-ui

# 安装依赖并启动
pnpm install
pnpm dev
```

:::

## 连接到你的 Agent

Agent Chat UI 既可以连接[本地服务](/tutorials/LangGraph/LangGraph Studio#设置本地-agent-服务端)，也可以连接[已部署的 Agent](/tutorials/LangGraph/部署)。

启动 Agent Chat UI 后，你需要配置以下几项来连接你的 Agent：

1. **Graph ID**：输入你的图名称（在 `langgraph.json` 文件的 `graphs` 字段中可以找到）
2. **Deployment URL**：你的 Agent 服务端点（例如本地开发用 `http://localhost:2024`，已部署则填对应 URL）
3. **LangSmith API key**（可选）：填入你的 LangSmith API Key（如果使用本地 Agent 服务则不需要）

配置完成后，Agent Chat UI 会自动拉取并展示该 Agent 所有处于中断状态的会话线程。

::: tip 提示
Agent Chat UI 内置了对 **工具调用消息** 和 **工具结果消息** 的渲染支持。如果需要自定义哪些消息需要显示，请参阅官方的 *Hiding Messages in the Chat* 指南。
:::

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/ui) 翻译并二次创作。
