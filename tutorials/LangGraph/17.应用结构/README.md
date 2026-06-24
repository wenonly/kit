---
title: 应用结构
categories: LangGraph
order: 17
date: 2026-06-25
tags:
  - LangGraph
  - 部署
---

# 应用结构

一个 LangGraph 应用由以下几部分组成：一个或多个图（graph）、一个配置文件（`langgraph.json`）、一个声明依赖的文件，以及一个可选的 `.env` 环境变量文件。

本指南将展示典型的应用目录结构，并说明如何提供必要的配置来通过 [LangSmith 部署平台](/langsmith/deployment)部署应用。

::: info LangSmith 部署平台
LangSmith Deployment 是一个托管平台，用于部署和扩展 LangGraph Agent。它负责处理基础设施、扩缩容和运维问题，让你可以直接从代码仓库部署有状态的、长时间运行的 Agent。详见[部署文档](/langsmith/deployment)。
:::

## 核心概念

要通过 LangSmith 部署，需要提供以下信息：

1. 一个 [LangGraph 配置文件](#配置文件)（`langgraph.json`），指定应用的依赖、图和环境变量。
2. 实现[应用逻辑的图](#图)。
3. 一个指定[依赖](#依赖)的文件。
4. 应用运行所需的[环境变量](#环境变量)。

## 目录结构

下面是一个典型的应用目录结构示例：

```plaintext
my-app/
├── src # all project code lies within here
│   ├── utils # optional utilities for your graph
│   │   ├── tools.ts # tools for your graph
│   │   ├── nodes.ts # node functions for your graph
│   │   └── state.ts # state definition of your graph
│   └── agent.ts # code for constructing your graph
├── package.json # package dependencies
├── .env # environment variables
└── langgraph.json # configuration file for LangGraph
```

::: info 提示
LangGraph 应用的目录结构可能因编程语言和包管理器的不同而有所变化。
:::

## 配置文件

`langgraph.json` 是一个 JSON 文件，指定了部署 LangGraph 应用所需的依赖、图、环境变量和其他设置。

关于该 JSON 文件支持的所有键，请参阅 [LangGraph 配置文件参考](/langsmith/cli#configuration-file)。

::: tip
[LangGraph CLI](/langsmith/cli) 默认使用当前目录下的 `langgraph.json` 配置文件。
:::

### 示例

以下是一个完整的配置文件示例：

- 依赖将从本地目录中的依赖文件（如 `package.json`）加载。
- 单个图将从文件 `./your_package/your_file.js` 中加载名为 `agent` 的函数。
- 环境变量 `OPENAI_API_KEY` 以内联方式设置。

```json
{
  "dependencies": ["."],
  "graphs": {
    "my_agent": "./your_package/your_file.js:agent"
  },
  "env": {
    "OPENAI_API_KEY": "secret-key"
  }
}
```

## 依赖

LangGraph 应用可能依赖其他 TypeScript/JavaScript 库。

要让依赖正确设置，通常需要指定以下信息：

1. 目录中一个指定依赖的文件（如 `package.json`）。
2. 在[配置文件](#配置文件)中的 `dependencies` 键，指定运行 LangGraph 应用所需的依赖。
3. 如果需要额外的二进制文件或系统库，可以在[配置文件](#配置文件)中使用 `dockerfile_lines` 键来指定。

## 图

在[配置文件](#配置文件)中使用 `graphs` 键来指定部署的 LangGraph 应用中可用的图。

你可以在配置文件中指定一个或多个图。每个图由一个名称（必须唯一）和以下两种路径之一来标识：(1) 已编译的图，或 (2) 一个生成图的函数所在的位置。

## 环境变量

如果你在本地使用已部署的 LangGraph 应用，可以在[配置文件](#配置文件)的 `env` 键中配置环境变量。

对于生产环境部署，通常建议在部署环境中配置环境变量，而不是写在配置文件里。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/application-structure) 翻译并二次创作。
