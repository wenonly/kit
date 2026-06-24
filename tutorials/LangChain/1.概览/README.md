---
title: LangChain 概览
categories: LangChain
order: 1
date: 2026-06-24
tags:
  - LangChain
  - Agent
---

# LangChain 概览

LangChain 提供了 `createAgent`：一个极简、高度可配置的代理（Agent）框架。你可以从模型、工具、提示词和中间件中自由组合，搭建出完全契合业务场景的代理。

> **核心理念：Agent = Model + Harness（模型 + 外壳）。** 这里的"外壳"指的是模型循环之外的一切内容——提示词、工具，以及所有塑造代理行为的中间件。从基础原语出发，按需组合即可。

## LangChain 生态定位

LangChain 生态包含三个层次，各有侧重：

- **Deep Agents**：开箱即用的代理，内置自动上下文压缩、虚拟文件系统、子代理生成等功能。适合需要"全家桶"能力的复杂场景。
- **LangChain（`createAgent`）**：高度可定制的外壳，可以精细调整以适配你的用例和数据。Deep Agents 本身也构建在 LangChain 代理之上。
- **LangGraph**：底层编排框架，适合需要将确定性流程与代理工作流结合的高级需求。

此外，**LangSmith** 贯穿所有框架，提供追踪、调试和评估能力。建议在开发之初就接入 LangSmith，设置 `LANGSMITH_TRACING=true` 并填入 API Key 即可开始。

## 创建一个代理

下面演示如何用 LangChain 创建一个带自定义工具的简单代理：

```js
// First install: npm install langchain zod @langchain/openai
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);

const agent = createAgent({
  model: "gpt-5.5",
  tools: [getWeather],
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in San Francisco?" }],
  })
);
```

上面的代码做了三件事：定义了一个查询天气的工具、创建代理、然后调用代理并传入用户消息。当代理收到"旧金山天气如何"的问题时，它会自动识别需要调用 `get_weather` 工具，并用返回结果生成最终回复。

> 如果你还不知道如何安装 LangChain，请先阅读[安装指南](../3.安装/README.md)。安装完成后，可以参考[快速开始](../4.快速开始/README.md)来构建你的第一个完整应用。

## 核心优势

### 统一的模型接口

为聊天模型、嵌入模型等提供跨厂商的统一接口。只需极少的代码改动即可切换模型，让你的应用始终跟得上最新技术，避免厂商锁定。支持 [OpenAI、Anthropic、Google 等主流厂商](https://docs.langchain.com/oss/javascript/integrations/providers/overview)。

### 高度可配置的外壳

从 `createAgent` 这个极简外壳起步，通过中间件逐步添加能力。无论护栏（Guardrails）、重试、路由还是自定义工具策略，都只按需引入，不多不少。

### 基于 LangGraph 构建

LangChain 的代理构建在 LangGraph 之上，因此天然拥有 LangGraph 的持久化执行（durable execution）、人机协作（human-in-the-loop）、状态持久化等能力。

> 关于 LangGraph 的底层编排能力，后续章节会深入介绍。这里只需记住：LangChain 代理 = LangGraph 的高层封装 + 便捷的 API。

### 使用 LangSmith 调试

在一个界面中查看追踪（trace）、工具调用、状态转换和延迟。快速定位失败点、评估输出质量、用真实执行数据持续改进代理行为。

## 小结

LangChain 的设计哲学是"从简到繁"——先用 `createAgent` 搭起骨架，再通过中间件和工具逐步增强。接下来的章节将从设计哲学、安装、快速开始等方面，带你一步步走进 LangChain 的世界。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview) 翻译并二次创作。
