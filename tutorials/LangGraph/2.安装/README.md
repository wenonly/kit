---
title: 安装
categories: LangGraph
order: 2
date: 2026-06-25
tags:
  - LangGraph
  - 安装
---

# 安装

本篇介绍如何安装 LangGraph 及相关依赖。整个过程非常简单，几条命令即可搞定。

## 安装 LangGraph 核心包

安装 LangGraph 及其核心依赖 `@langchain/core`：

::: code-group

```bash [npm]
npm install @langchain/langgraph @langchain/core
```

```bash [pnpm]
pnpm add @langchain/langgraph @langchain/core
```

```bash [yarn]
yarn add @langchain/langgraph @langchain/core
```

```bash [bun]
bun add @langchain/langgraph @langchain/core
```

:::

> **环境要求：** LangGraph 需要 Node.js 22 或更高版本。你可以用 `node -v` 检查当前版本。如果版本较低，建议使用 [nvm](https://github.com/nvm-sh/nvm) 或 [fnm](https://github.com/Schniz/fnm) 来管理 Node 版本。

`@langchain/langgraph` 是 LangGraph 的主包，提供 `StateGraph`、`entrypoint`、`task` 等核心 API；`@langchain/core` 包含底层原语（消息类型、工具定义等），是所有上层包的基础依赖。

## 安装 LangChain（可选但推荐）

使用 LangGraph 时通常需要访问 LLM 并定义工具。你可以用任何方式来完成这些工作，但我们在文档中默认使用 [LangChain](/tutorials/LangChain/LangChain 概览) 来集成模型和工具。

安装 LangChain：

::: code-group

```bash [npm]
npm install langchain
```

```bash [pnpm]
pnpm add langchain
```

```bash [yarn]
yarn add langchain
```

```bash [bun]
bun add langchain
```

:::

## 安装模型提供商集成

LangGraph 本身不绑定特定的 LLM 提供商。如果你使用 LangChain 来集成模型，需要根据你选择的厂商安装对应的集成包。

安装 OpenAI 集成：

```bash
# Installing the OpenAI integration
npm install @langchain/openai
```

安装 Anthropic 集成：

```bash
# Installing the Anthropic integration
npm install @langchain/anthropic
```

> 如果你使用 pnpm，将 `npm install` 替换为 `pnpm add` 即可；yarn 用户则使用 `yarn add`。

其他常用的厂商包包括：

```bash
# Google Gemini
npm install @langchain/google-genai

# 更多厂商请查阅官方集成列表
```

完整的集成列表请查看[官方集成页面](https://docs.langchain.com/oss/javascript/integrations/providers/overview)。

## 配置环境变量

安装完包之后，需要设置对应厂商的 API Key。以 OpenAI 为例：

```bash
export OPENAI_API_KEY="your-api-key"
```

建议将环境变量写入 `.env` 文件（记得加入 `.gitignore`），或使用 [dotenv](https://github.com/motdotla/dotenv) 来管理。

## 接下来

LangGraph 安装完成后，你可以：

- 跟着[快速开始](/tutorials/LangGraph/快速开始)指南，构建你的第一个 LangGraph Agent。
- 了解如何[在本地运行 LangGraph 服务端](/tutorials/LangGraph/本地服务端)，使用 Studio 进行可视化调试。

> **小贴士：** 强烈建议在开发之初就接入 LangSmith。只需设置 `LANGSMITH_TRACING=true` 和 LangSmith API Key 即可开启追踪，它会自动监控你的 Agent 执行数据、帮助你调试和优化。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/install) 翻译并二次创作。
