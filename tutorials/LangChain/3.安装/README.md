---
title: 安装
categories: LangChain
order: 3
date: 2026-06-24
tags:
  - LangChain
---

# 安装

本篇介绍如何安装 LangChain 及相关依赖。整个过程非常简单，只需几条命令即可完成。

## 安装核心包

安装 LangChain 核心包：

```bash
npm install langchain @langchain/core
# Requires Node.js 22+
```

> **环境要求：** LangChain 需要 Node.js 22 或更高版本。你可以用 `node -v` 检查当前版本。如果版本较低，建议使用 [nvm](https://github.com/nvm-sh/nvm) 或 [fnm](https://github.com/Schniz/fnm) 来管理 Node 版本。

`langchain` 是主包，提供 `createAgent` 等核心 API；`@langchain/core` 包含底层原语（消息类型、工具定义等），是所有上层包的基础依赖。

## 安装模型提供商集成

LangChain 支持数以百计的 LLM 和数千种其他集成。这些集成分布在独立的厂商包中，你只需安装自己要用到的那几个。

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

LangChain 安装完成后，你可以：

- 跟着[快速开始](/tutorials/LangChain/快速开始)指南构建你的第一个代理。
- 设置 [LangSmith 追踪](https://docs.langchain.com/oss/javascript/langchain/observability)来调试你的应用——只需设置 `LANGSMITH_TRACING=true` 和 LangSmith API Key 即可。

> **小贴士：** 强烈建议在开发之初就接入 LangSmith Engine。它会自动监控你的追踪数据、发现问题并提出修复建议，帮你少走弯路。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/install) 翻译并二次创作。
