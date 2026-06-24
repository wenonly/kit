---
title: 自定义中间件
categories: LangChain
order: 11
date: 2026-06-24
tags:
  - LangChain
  - Middleware
---

# 自定义中间件

> 通过实现钩子来构建运行在 Agent 执行流程中特定位置的自定义中间件。

当[内置中间件](/tutorials/LangChain/内置中间件)无法满足需求时，LangChain 允许你编写自己的中间件。自定义中间件的核心思路是：实现若干钩子函数，框架会在 Agent 执行的特定时机自动调用它们。

## 两种钩子风格

LangChain 中间件提供两类钩子：

- **Node-style（节点式）钩子**：在特定执行点顺序运行，适合日志、校验和状态更新。
- **Wrap-style（包裹式）钩子**：包裹在每次模型或工具调用周围，适合重试、缓存和转换。

### Node-style 钩子

节点式钩子在以下时机运行：

| 钩子 | 运行时机 |
|---|---|
| `beforeAgent` | Agent 启动前（每次调用一次） |
| `beforeModel` | 每次调用模型前 |
| `afterModel` | 每次模型响应后 |
| `afterAgent` | Agent 结束后（每次调用一次） |

> 代码要点：下面的中间件在消息数达到上限时提前终止 Agent，并在每次模型返回后打印日志。注意 `beforeModel` 中通过返回 `{ jumpTo: "end" }` 来实现跳转。

```ts
import { createMiddleware, AIMessage } from "langchain";

const createMessageLimitMiddleware = (maxMessages: number = 50) => {
  return createMiddleware({
    name: "MessageLimitMiddleware",
    beforeModel: {
      canJumpTo: ["end"],
      hook: (state) => {
        if (state.messages.length === maxMessages) {
          return {
            messages: [new AIMessage("Conversation limit reached.")],
            jumpTo: "end",
          };
        }
        return;
      },
    },
    afterModel: (state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      console.log(`Model returned: ${lastMessage.content}`);
      return;
    },
  });
};
```

### Wrap-style 钩子

包裹式钩子让你能完全掌控 `handler` 的调用时机：你可以不调用（短路）、调用一次（正常流程）或调用多次（重试逻辑）。

可用钩子：

- `wrapModelCall`：包裹每次模型调用。
- `wrapToolCall`：包裹每次工具调用。

> 代码要点：下面的中间件实现了简单的模型调用重试逻辑——最多重试 `maxRetries` 次，每次失败后继续尝试。

```ts
import { createMiddleware } from "langchain";

const createRetryMiddleware = (maxRetries: number = 3) => {
  return createMiddleware({
    name: "RetryMiddleware",
    wrapModelCall: async (request, handler) => {
      let lastError;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await handler(request);
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    },
  });
};
```

## 状态更新

两类钩子都可以更新 Agent 状态，但机制不同：

- **节点式钩子**：直接返回一个对象（dict），框架通过图的 reducer 将其合并到 Agent 状态中。
- **包裹式钩子**：返回一个 `Command` 对象来注入状态更新。对模型调用返回 `Command` 可在模型响应的同时附带状态更新；对工具调用同理。

### 节点式钩子更新状态

从节点式钩子返回一个对象即可将更新合并到状态。对象的 key 对应状态字段。

```ts
import { createMiddleware } from "langchain";
import * as z from "zod";

const trackingStateSchema = z.object({
  modelCallCount: z.number().default(0),
});

const incrementAfterModel = createMiddleware({
  name: "incrementAfterModel",
  stateSchema: trackingStateSchema,
  afterModel: (state) => {
    return { modelCallCount: state.modelCallCount + 1 };
  },
});
```

### 包裹式钩子更新状态

从 `wrapModelCall` 直接返回 `Command` 即可在模型调用层注入状态更新：

```ts
import * as z from "zod";
import { createMiddleware } from "langchain";
import { Command } from "@langchain/langgraph";

const usageTrackingStateSchema = z.object({
  lastModelCallTokens: z.number().optional(),
});

const trackUsage = createMiddleware({
  name: "trackUsage",
  stateSchema: usageTrackingStateSchema,
  wrapModelCall: async (request, handler) => {
    const response = await handler(request);
    return new Command({ update: { lastModelCallTokens: 150 } });
  },
});
```

`Command` 会经过图的 reducer，因此更新会正确应用——消息是累加而非替换的。

### 多个中间件组合

当多个中间件都返回响应时，框架遵循以下规则传递 `AIMessage`：

- **AIMessage 逐层流动**：每个中间件的 `handler()` 接收的是上一层产生的 `AIMessage`。当中间件返回 `AIMessage` 时，它就成了下一层 handler 的输入。
- **不触碰消息的 Command 是透传的**：如果 `Command` 的状态更新没有涉及 `messages`，框架视其为消息流的 no-op，下一层 handler 收到的是此中间件之前那层产生的 `AIMessage`。
- **Reducer 行为与重试安全**：Command 仍通过 reducer 应用（消息累加，外层优先）。重试逻辑会丢弃之前调用的 command。

```ts
import * as z from "zod";
import { createMiddleware } from "langchain";
import { Command, StateSchema, ReducedValue } from "@langchain/langgraph";
import { AIMessage, SystemMessage } from "@langchain/core/messages";

/** 后写覆盖 reducer：两个中间件都写时，外层覆盖内层 */
const customMiddlewareStateSchema = new StateSchema({
  traceLayer: new ReducedValue(z.string().optional(), {
    reducer: (a, b) => b,
  }),
});

const outerMiddleware = createMiddleware({
  name: "OuterMiddleware",
  stateSchema: customMiddlewareStateSchema,
  wrapModelCall: async (_request, handler) => {
    await handler(_request);
    return new Command({
      update: {
        traceLayer: "outer",
        messages: [new SystemMessage({ content: "[Outer ran]" })],
      },
    });
  },
});

const innerMiddleware = createMiddleware({
  name: "InnerMiddleware",
  stateSchema: customMiddlewareStateSchema,
  wrapModelCall: async (_request, handler) => {
    await handler(_request);
    return new Command({
      update: {
        traceLayer: "inner",
        messages: [new SystemMessage({ content: "[Inner ran]" })],
      },
    });
  },
});
```

## 创建中间件

`createMiddleware` 除了钩子之外，还接受三个在编译期被 Agent 工厂拾取的配置字段：

- **stateSchema**：用自定义字段扩展 Agent 状态。
- **tools**：注册随中间件一起提供的额外工具（如 to-do list 中间件的 `write_todos`）。
- **streamTransformers**：注册 scope-aware 的流转换器工厂。

下面是一个完整的日志中间件示例，同时演示了同步和异步钩子：

```ts
import { createMiddleware, type AgentState } from "langchain";

const loggingMiddleware = createMiddleware({
  name: "LoggingMiddleware",
  beforeModel: (state: AgentState) => {
    console.log(`About to call model with ${state.messages.length} messages`);
    return;
  },
  afterModel: (state: AgentState) => {
    const last = state.messages[state.messages.length - 1];
    console.log(`Model returned: ${last.content}`);
    return;
  },
  // 如需异步版本，返回 Promise 即可
});

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  middleware: [loggingMiddleware],
});
```

## 小结

自定义中间件的能力边界很宽：从简单的日志打印，到复杂的重试、缓存、状态追踪和流转换，都可以通过组合不同的钩子实现。关键原则是——**节点式钩子用于在特定时机做副作用，包裹式钩子用于控制调用的执行本身**。

更多中间件实战示例，可以参考[中间件概览](/tutorials/LangChain/中间件概览)和[结构化输出](/tutorials/LangChain/结构化输出)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/middleware/custom) 翻译并二次创作。
