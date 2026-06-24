---
title: 前端集成
categories: LangChain
order: 24
date: 2026-06-24
tags:
  - LangChain
  - Frontend
---

# 前端集成

当智能体（Agent）跑起来之后，如何把它"接"到一个真正可交互的前端？LangChain 提供了一套专门面向 Agent 应用的前端 SDK，让你可以基于 [`create_agent`](/tutorials/LangChain/Agent（create_agent）) 构建出支持实时流式输出、工具可视化、[人机协作](/tutorials/LangChain/人机协作)审批等丰富交互的界面。

本文是前端集成的总览篇，先建立整体架构认知，再逐项展开各个模式。

## 整体架构

所有前端集成模式都遵循同一个架构：**`createAgent` 后端通过 SDK 的 stream API 把状态流式推送给前端**。

- 后端：`createAgent` 会产出一个编译后的 LangGraph 图，该图对外暴露 streaming API。
- 前端：通过 stream handle 连接到这个 API，获得 **响应式状态**——包括 messages、tool calls、interrupts、values 以及会话元数据——你用任何框架（React / Vue / Svelte / Angular）来渲染这些状态都可以。

> 代码要点：下面的示例展示了一个最小可用的 Agent + 前端组合。后端用 `MemorySaver` 做 checkpointer，前端用 `useStream`（Angular 是 `injectStream`）订阅流。

**agent.ts**

```ts
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "openai:gpt-5.5",
  tools: [getWeather, searchWeb],
  checkpointer: new MemorySaver(),
});
```

**不同框架的 hook 入口**

```ts
import { useStream } from "@langchain/react";      // React
import { useStream } from "@langchain/vue";        // Vue
import { useStream } from "@langchain/svelte";     // Svelte
import { injectStream } from "@langchain/angular"; // Angular
```

## 为什么选择 LangChain 前端 SDK

市面上的 AI UI 库大多只能帮你把流式文本拼到聊天记录里。LangChain 的 SDK 则暴露了生产级 Agent 必需的更丰富语义：

| 能力 | UI 层能做什么 |
| --- | --- |
| **Durable threads（持久会话）** | 刷新页面、切换设备、重新加入运行中的任务都不丢状态 |
| **Typed agent state（类型化状态）** | 不只是 messages，还能渲染 todos、流水线产物、引用、沙箱文件、指标等任意业务对象 |
| **Tool-call lifecycle（工具调用生命周期）** | 把 pending / completed / failed 的工具调用展示成专属 UI 卡片，而不是原始 JSON |
| **Interrupts（中断）** | 暂停执行等待人工审批、编辑或补全信息，恢复时从断点继续 |
| **Checkpoints（检查点）** | 基于持久化快照构建编辑、重试、分支、审计、时间旅行等流程 |
| **Nested execution（嵌套执行）** | 可视化 Deep Agents、子智能体、图节点，无需把所有内容压扁到一个流里 |
| **Framework-native reactivity（框架原生响应式）** | 同一协议下，React / Vue / Svelte / Angular 各自保留惯用的 hooks / composables / stores / signals |

这些原语组合起来，让你的 UI 能够让用户在 Agent 工作过程中 **查看、引导、暂停、恢复、分叉**。

## 类型推断

给 `useStream`（Angular 是 `injectStream`）传入类型参数后，`stream.messages`、`stream.toolCalls`、`stream.interrupt`、`stream.values` 等响应式状态都会有完整的类型安全。直接把后端的 agent 类型 `typeof myAgent` 作为类型参数传入，TypeScript 就会从编译后的图自动推断状态 schema：

```ts
import type { myAgent } from "./agent";

const stream = useStream<typeof myAgent>({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
});
```

自定义的 state key 会自动推断，无需手写 interface。

## 常用前端模式

### 渲染消息与输出

- **Markdown messages**：解析并渲染流式 markdown，支持正确的格式和代码高亮
- **Structured output**：把类型化的 Agent 响应渲染成自定义 UI 组件，而不是纯文本
- **Reasoning tokens**：在可折叠块中展示模型的思考过程
- **Generative UI**：用 `json-render` 等方案从自然语言 prompt 渲染出 AI 生成的界面

### 展示 Agent 动作

- **Tool calling**：把工具调用渲染成类型安全的丰富 UI 卡片，带 loading 和 error 状态
- **Headless tools**：在客户端调用浏览器/设备 API，同时保留 Agent 端的类型化 schema
- **Human-in-the-loop**：暂停智能体等待人工审查，支持 approve / reject / edit 工作流

### 管理会话

- **Branching chat**：编辑消息、重新生成回复、在会话分支间导航
- **Message queues**：在 Agent 处理期间排队多条消息，按顺序消费

### 高级流式

- **Join & rejoin streams**：断开后再重连到运行中的 Agent 流，不丢进度
- **Time travel**：在会话历史的任意检查点查看、导航、恢复执行

## 如何选择模式

从你的产品要回答的 UX 问题出发：

| 如果用户需要… | 推荐从哪开始 |
| --- | --- |
| 理解 Agent 在做什么 | Tool calling + reasoning tokens |
| 安全地审批敏感操作 | [人机协作](/tutorials/LangChain/人机协作) |
| 在运行期间继续提交任务 | Message queues |
| 离开后再回到长任务 | Join & rejoin streams |
| 从更早的轮次编辑或重试 | Branching chat + time travel |
| 把状态渲染成"应用"而非"聊天" | Structured output + generative UI + Deep Agents 前端模式 |

## 与组件库集成

stream API 本身是 UI 无关的，可以和任何组件库或生成式 UI 框架搭配。组件库负责表现层，LangChain SDK 在底层负责 Agent 运行时状态、可恢复性、中断和检查点语义。

- **AI Elements**：可组合的 shadcn/ui 组件，包含 Conversation、Message、Tool、Reasoning
- **assistant-ui**：无头 React 框架，内置线程管理、分支和附件支持
- **OpenUI**：面向数据密集型报告和仪表盘的生成式 UI 库，使用 `openui-lang` 组件 DSL

## 小结

前端集成的关键是把 Agent 的运行时状态完整地映射到 UI 层。选好模式后，可以继续深入到具体的 [人机协作](/tutorials/LangChain/人机协作) 或 [自定义中间件](/tutorials/LangChain/自定义中间件) 章节，配合 [可观测性](/tutorials/LangChain/可观测性) 一起打磨产品体验。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/frontend/overview) 翻译并二次创作。
