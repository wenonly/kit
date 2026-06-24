---
title: UI 集成
categories: LangChain
order: 23
date: 2026-06-24
tags:
  - LangChain
  - UI
---

# UI 集成

LangChain 官方提供了开箱即用的 **Agent Chat UI**，让你无需从零搭建前端就能与任意 LangChain 智能体（Agent）进行对话交互。本文介绍如何快速接入这款 UI，以及如何在本地进行定制开发。

## Agent Chat UI 是什么

Agent Chat UI 是一个基于 Next.js 的对话应用，它提供了与 LangChain 智能体进行对话式交互的界面，支持以下核心能力：

- 实时聊天与流式输出
- 工具调用（tool call）可视化展示
- 时间旅行调试（time-travel debugging）
- 状态分叉（state forking）

它最适合配合 [`create_agent`](/tutorials/LangChain/Agent（create_agent）) 创建的智能体使用，无论你是本地运行还是已经部署到 LangSmith，都可以用极少的配置接入。Agent Chat UI 完全开源，可以根据自身应用需求做二次开发。

> 想在 UI 中渲染生成式界面（generative UI）？请参考 LangGraph 官方的 *Implement generative user interfaces with LangGraph* 教程。

## 快速开始：使用托管版本

最快的体验方式是直接使用官方托管的 Agent Chat UI：

1. 打开 Agent Chat UI 站点
2. 填入你的部署 URL（或本地服务地址）
3. 开始对话——UI 会自动识别并渲染工具调用与中断（interrupt）

## 本地开发

如果你需要定制 UI 或进行本地调试，可以把 Agent Chat UI 跑在本地。

### 方式一：使用 npx 脚手架

```bash
# 创建一个新的 Agent Chat UI 项目
npx create-agent-chat-app --project-name my-chat-ui
cd my-chat-ui

# 安装依赖并启动
pnpm install
pnpm dev
```

### 方式二：克隆仓库

直接从官方仓库 clone 源码，自行修改后启动，适合深度定制场景。

## 连接到你的 Agent

Agent Chat UI 既可以连本地服务，也可以连已部署的智能体。启动 UI 后，需要配置以下几项：

| 配置项 | 说明 |
| --- | --- |
| **Graph ID** | 你的图名称，可在 `langgraph.json` 的 `graphs` 字段中找到 |
| **Deployment URL** | Agent 服务端点，例如本地开发用 `http://localhost:2024`，已部署则填对应 URL |
| **LangSmith API key**（可选） | 接入 LangSmith 时使用；如果只是连接本地 Agent 服务，可以不填 |

> 代码要点：配置完成后，Agent Chat UI 会自动拉取并展示该智能体所有处于中断状态的会话线程。

Agent Chat UI 内置了对 **工具调用消息** 和 **工具结果消息** 的渲染支持。如果需要隐藏或自定义某些消息，请参考官方的 *Hiding Messages in the Chat* 指南。

## 小结

Agent Chat UI 让你可以专注于智能体本身的逻辑，而不用在通用聊天 UI 上重复造轮子。一旦本地跑通，下一步通常是把它接到 [前端集成](/tutorials/LangChain/前端集成) 的更复杂模式中，或者直接走 [部署](/tutorials/LangChain/部署) 流程上线。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/ui) 翻译并二次创作。
