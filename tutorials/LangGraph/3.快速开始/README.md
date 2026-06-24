---
title: 快速开始
categories: LangGraph
order: 3
date: 2026-06-25
tags:
  - LangGraph
  - 快速开始
---

# 快速开始

本篇教程将带你使用 LangGraph 构建一个计算器 Agent。我们会演示两种不同的 API 风格：Graph API（图 API）和 Functional API（函数式 API）。

::: tip
**在使用 AI 编程助手？**

- 安装 [LangChain Docs MCP server](https://docs.langchain.com/use-these-docs)，让你的 AI 助手能够访问最新的 LangChain 文档和示例。
- 安装 [LangChain Skills](https://github.com/langchain-ai/langchain-skills)，提升你的 AI 助手在 LangChain 生态任务上的表现。
:::

两种 API 风格的选择：

- **[Graph API](#使用-graph-api)**：如果你喜欢用节点和边组成的图来定义 Agent，选这个。
- **[Functional API](#使用-functional-api)**：如果你更喜欢用一个函数来定义 Agent，选这个。

::: info
本示例需要你拥有 [Claude (Anthropic)](https://www.anthropic.com/) 账号并获取 API Key。然后在终端中设置 `ANTHROPIC_API_KEY` 环境变量。
:::

## 使用 Graph API

### 1. 定义工具和模型

在这个示例中，我们使用 Claude Sonnet 4.5 模型，并定义加法、乘法、除法三个工具。

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const model = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  temperature: 0,
});

// 定义工具
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

// 将工具组织为按名称索引的对象
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
};
const tools = Object.values(toolsByName);
// 将工具绑定到模型上
const modelWithTools = model.bindTools(tools);
```

### 2. 定义状态

图的 State 用于存储消息和 LLM 调用次数。

::: tip
LangGraph 中的 State 会在整个 Agent 执行过程中持久存在。

`MessagesValue` 提供了一个内置的 reducer，用于追加消息。`llmCalls` 字段使用 `ReducedValue` 配合 `(x, y) => x + y` 来累加调用计数。
:::

```typescript
import {
  StateGraph,
  StateSchema,
  MessagesValue,
  ReducedValue,
  GraphNode,
  ConditionalEdgeRouter,
  START,
  END,
} from "@langchain/langgraph";
import { z } from "zod/v4";

const MessagesState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(
    z.number().default(0),
    { reducer: (x, y) => x + y }
  ),
});
```

### 3. 定义模型节点

模型节点用于调用 LLM，让 LLM 决定是否需要调用工具。

```typescript
import { SystemMessage } from "@langchain/core/messages";

const llmCall: GraphNode<typeof MessagesState> = async (state) => {
  const response = await modelWithTools.invoke([
    new SystemMessage(
      "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
    ),
    ...state.messages,
  ]);
  return {
    messages: [response],
    llmCalls: 1,
  };
};
```

### 4. 定义工具节点

工具节点用于执行工具调用并返回结果。

```typescript
import { AIMessage, ToolMessage } from "@langchain/core/messages";

const toolNode: GraphNode<typeof MessagesState> = async (state) => {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
};
```

### 5. 定义结束逻辑

条件边函数根据 LLM 是否发起了工具调用，决定路由到工具节点还是结束执行。

```typescript
const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, "toolNode"> = (state) => {
  const lastMessage = state.messages.at(-1);

  // 先检查是否为 AIMessage，再访问 tool_calls
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  // 如果 LLM 发起了工具调用，则路由到工具节点
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  // 否则结束（向用户返回回复）
  return END;
};
```

### 6. 构建并编译 Agent

使用 [`StateGraph`](https://reference.langchain.com/javascript/langchain-langgraph/index/StateGraph) 类构建 Agent，然后调用 [`compile`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html#compile) 方法编译。

```typescript
const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

// 调用 Agent
import { HumanMessage } from "@langchain/core/messages";
const result = await agent.invoke({
  messages: [new HumanMessage("Add 3 and 4.")],
});

for (const message of result.messages) {
  console.log(`[${message.type}]: ${message.text}`);
}
```

::: tip
使用 [LangSmith](https://smith.langchain.com) 来追踪和调试你的 Agent。准备上生产时，请查看[部署](https://docs.langchain.com/langsmith/deployment)文档了解托管方案。

建议同时启用 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会自动监控追踪数据、发现问题并提出修复建议。
:::

恭喜！你已经用 LangGraph Graph API 构建了第一个 Agent。

::: details 完整代码示例

```typescript
// Step 1: 定义工具和模型

import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const model = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  temperature: 0,
});

// 定义工具
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

// 将工具绑定到模型
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
};
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);
```

```typescript
// Step 2: 定义状态

import {
  StateGraph,
  StateSchema,
  MessagesValue,
  ReducedValue,
  GraphNode,
  ConditionalEdgeRouter,
  START,
  END,
} from "@langchain/langgraph";
import * as z from "zod";

const MessagesState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(
    z.number().default(0),
    { reducer: (x, y) => x + y }
  ),
});
```

```typescript
// Step 3: 定义模型节点

import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

const llmCall: GraphNode<typeof MessagesState> = async (state) => {
  return {
    messages: [await modelWithTools.invoke([
      new SystemMessage(
        "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
      ),
      ...state.messages,
    ])],
    llmCalls: 1,
  };
};

// Step 4: 定义工具节点

const toolNode: GraphNode<typeof MessagesState> = async (state) => {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
};
```

```typescript
// Step 5: 定义结束逻辑
import { ConditionalEdgeRouter, END } from "@langchain/langgraph";

const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, "toolNode"> = (state) => {
  const lastMessage = state.messages.at(-1);

  // 先检查是否为 AIMessage，再访问 tool_calls
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  // 如果 LLM 发起了工具调用，则路由到工具节点
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  // 否则结束
  return END;
};
```

```typescript
// Step 6: 构建并编译 Agent
import { HumanMessage } from "@langchain/core/messages";
import { StateGraph, START, END } from "@langchain/langgraph";

const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

// 调用
const result = await agent.invoke({
  messages: [new HumanMessage("Add 3 and 4.")],
});

for (const message of result.messages) {
  console.log(`[${message.type}]: ${message.text}`);
}
```

:::

## 使用 Functional API

如果你更喜欢命令式的编程风格，LangGraph 还提供了 Functional API。这种风格下，你用普通的函数和循环来编排 Agent 逻辑。

### 1. 定义工具和模型

与 Graph API 相同，使用 Claude Sonnet 4.5 模型并定义加法、乘法、除法工具。

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const model = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  temperature: 0,
});

// 定义工具
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

// 将工具绑定到模型
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
};
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);
```

### 2. 定义模型节点

使用 `task()` 包装 LLM 调用，使其成为一个可被 LangGraph 追踪和管理的任务单元。

```typescript
import { task, entrypoint } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";

const callLlm = task({ name: "callLlm" }, async (messages: BaseMessage[]) => {
  return modelWithTools.invoke([
    new SystemMessage(
      "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
    ),
    ...messages,
  ]);
});
```

### 3. 定义工具节点

同样使用 `task()` 包装工具调用。

```typescript
import type { ToolCall } from "@langchain/core/messages/tool";

const callTool = task({ name: "callTool" }, async (toolCall: ToolCall) => {
  const tool = toolsByName[toolCall.name];
  return tool.invoke(toolCall);
});
```

### 4. 定义 Agent

使用 `entrypoint()` 定义 Agent 入口，内部用 `while` 循环来实现"调用 LLM -> 执行工具 -> 再调用 LLM"的循环。

```typescript
import { addMessages } from "@langchain/langgraph";
import { type BaseMessage } from "@langchain/core/messages";

const agent = entrypoint({ name: "agent" }, async (messages: BaseMessage[]) => {
  let modelResponse = await callLlm(messages);

  while (true) {
    // 如果 LLM 没有发起工具调用，说明已经得到最终答案
    if (!modelResponse.tool_calls?.length) {
      break;
    }

    // 并行执行所有工具调用
    const toolResults = await Promise.all(
      modelResponse.tool_calls.map((toolCall) => callTool(toolCall))
    );
    messages = addMessages(messages, [modelResponse, ...toolResults]);
    modelResponse = await callLlm(messages);
  }

  return messages;
});

// 调用 Agent
import { HumanMessage } from "@langchain/core/messages";

const result = await agent.invoke([new HumanMessage("Add 3 and 4.")]);

for (const message of result) {
  console.log(`[${message.getType()}]: ${message.text}`);
}
```

::: tip
使用 [LangSmith](https://smith.langchain.com) 来追踪和调试你的 Agent。准备上生产时，请查看[部署](https://docs.langchain.com/langsmith/deployment)文档了解托管方案。
:::

恭喜！你已经用 LangGraph Functional API 构建了第一个 Agent。

::: details 完整代码示例

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import {
  task,
  entrypoint,
  addMessages,
} from "@langchain/langgraph";
import {
  SystemMessage,
  HumanMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import * as z from "zod";

// Step 1: 定义工具和模型

const model = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  temperature: 0,
});

// 定义工具
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const divide = tool(({ a, b }) => a / b, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

// 将工具绑定到模型
const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
};
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

// Step 2: 定义模型节点

const callLlm = task({ name: "callLlm" }, async (messages: BaseMessage[]) => {
  return modelWithTools.invoke([
    new SystemMessage(
      "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
    ),
    ...messages,
  ]);
});

// Step 3: 定义工具节点

const callTool = task({ name: "callTool" }, async (toolCall: ToolCall) => {
  const tool = toolsByName[toolCall.name];
  return tool.invoke(toolCall);
});

// Step 4: 定义 Agent

const agent = entrypoint({ name: "agent" }, async (messages: BaseMessage[]) => {
  let modelResponse = await callLlm(messages);

  while (true) {
    if (!modelResponse.tool_calls?.length) {
      break;
    }

    // 并行执行所有工具调用
    const toolResults = await Promise.all(
      modelResponse.tool_calls.map((toolCall) => callTool(toolCall))
    );
    messages = addMessages(messages, [modelResponse, ...toolResults]);
    modelResponse = await callLlm(messages);
  }

  return messages;
});

// 调用
const result = await agent.invoke([new HumanMessage("Add 3 and 4.")]);

for (const message of result) {
  console.log(`[${message.type}]: ${message.text}`);
}
```

:::

## 两种 API 如何选择？

- **Graph API** 更适合需要复杂路由、并行分支、状态管理的场景。它把执行流程显式建模为图结构，便于可视化和调试。
- **Functional API** 更适合简单的线性流程，代码更直观、更接近普通的编程思维。适合从 LangChain Agent 迁移过来的开发者。

两种 API 底层共享同一套 LangGraph 运行时，都支持持久化、流式输出、人机协作等能力。你可以根据项目需求自由选择。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/quickstart) 翻译并二次创作。
