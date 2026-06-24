---
title: 护栏
categories: LangChain
order: 19
date: 2026-06-24
tags:
  - LangChain
  - Guardrails
---

# 护栏

> 在 Agent 执行的关键节点加入校验和过滤，防止敏感信息泄漏、不当内容输出和违规操作。

护栏（Guardrails）帮助你在 Agent 执行流程的关键节点上对内容进行校验和过滤，从而构建安全、合规的 AI 应用。它们可以在问题发生之前检测敏感信息、执行内容策略、校验输出质量、阻止不安全行为。

常见用例包括：

- 防止 PII（个人身份信息）泄漏
- 检测并阻止 prompt injection（提示注入）攻击
- 屏蔽不当或有害内容
- 强制执行业务规则和合规要求
- 校验输出质量和准确性

实现护栏的核心思路是利用中间件，在 Agent 执行流程的关键节点上拦截处理——可以在 Agent 启动前、完成后，或者在模型调用和工具调用前后进行校验。如果不熟悉中间件机制，请先阅读[中间件概览](/tutorials/LangChain/9.中间件概览)。

LangChain 既提供了内置护栏（如 PII 检测、人机协作），也提供了灵活的中间件系统用于构建自定义护栏，两种方式可以互补使用。

## 内置护栏

### PII 检测

LangChain 提供了内置的 PII（Personally Identifiable Information，个人身份信息）检测中间件，可以检测对话中常见的 PII 类型，包括邮箱、信用卡号、IP 地址等。该中间件非常适合医疗、金融等有合规要求的应用，需要清洗日志的客服 Agent，以及任何处理敏感用户数据的场景。

PII 中间件支持多种处理策略：

| 策略 | 说明 | 示例 |
| --- | --- | --- |
| `redact` | 替换为 `[REDACTED_{PII_TYPE}]` | `[REDACTED_EMAIL]` |
| `mask` | 部分遮蔽（例如保留最后 4 位） | `****-****-****-1234` |
| `hash` | 替换为确定性哈希值 | `a8f5f167...` |
| `block` | 检测到时直接抛出异常 | Error thrown |

> 代码要点：下面示例同时挂载了三条 PII 中间件——分别对邮箱做 `redact`、信用卡做 `mask`、API key 做 `block`。`applyToInput: true` 表示在用户输入送入模型之前就完成处理。

```ts
import { createAgent, piiRedactionMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-5.4",
  tools: [customerServiceTool, emailTool],
  middleware: [
    // 在用户输入送入模型前，把邮箱替换为 [REDACTED_EMAIL]
    piiRedactionMiddleware({
      piiType: "email",
      strategy: "redact",
      applyToInput: true,
    }),
    // 在用户输入送入模型前，对信用卡号做部分遮蔽
    piiRedactionMiddleware({
      piiType: "credit_card",
      strategy: "mask",
      applyToInput: true,
    }),
    // 检测到 API key 时直接抛出错误
    piiRedactionMiddleware({
      piiType: "api_key",
      detector: /sk-[a-zA-Z0-9]{32}/,
      strategy: "block",
      applyToInput: true,
    }),
  ],
});

// 当用户提供 PII 时，会按策略被处理
const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content:
        "My email is john.doe@example.com and card is 5105-1051-0510-5100",
    },
  ],
});
```

内置 PII 类型包括：`email`（邮箱）、`credit_card`（信用卡号，Luhn 校验）、`ip`（IP 地址）、`mac_address`（MAC 地址）、`url`（URL）。

常用配置项：

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `piiType` | 要检测的 PII 类型（内置或自定义） | 必填 |
| `strategy` | 处理策略（`"block"`、`"redact"`、`"mask"`、`"hash"`） | `"redact"` |
| `detector` | 自定义检测正则 | `undefined`（使用内置） |
| `applyToInput` | 在模型调用前检查用户消息 | `true` |
| `applyToOutput` | 在模型调用后检查 AI 消息 | `false` |
| `applyToToolResults` | 在工具执行后检查工具结果 | `false` |

### 人机协作

LangChain 还提供了内置的人机协作中间件，用于在执行敏感操作前要求人类审批。这是针对高风险决策最有效的护栏之一，典型场景包括金融交易与转账、删除或修改生产数据、向外部发送通信，以及任何具有重大业务影响的操作。

> 代码要点：`humanInTheLoopMiddleware` 通过 `interruptOn` 配置需要审批的工具，安全操作可设为 `false` 跳过审批。更多细节请参阅[人机协作](/tutorials/LangChain/18.人机协作)。

```ts
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { MemorySaver, Command } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-5.4",
  tools: [searchTool, sendEmailTool, deleteDatabaseTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        // 敏感操作需要审批
        send_email: { allowAccept: true, allowEdit: true, allowRespond: true },
        delete_database: {
          allowAccept: true,
          allowEdit: true,
          allowRespond: true,
        },
        // 安全操作自动放行
        search: false,
      },
    }),
  ],
  checkpointer: new MemorySaver(),
});

// 人机协作需要 thread_id 来持久化状态
const config = { configurable: { thread_id: "some_id" } };

// Agent 会在执行敏感工具前暂停，等待审批
let result = await agent.invoke(
  { messages: [{ role: "user", content: "Send an email to the team" }] },
  config,
);

result = await agent.invoke(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  config, // 同一个 thread_id 用于恢复暂停的对话
);
```

## 自定义护栏

对于更精细的护栏需求，你可以创建自定义中间件，在 Agent 执行前后运行。这让你对校验逻辑、内容过滤和安全检查拥有完全控制。

### Agent 前护栏

使用 "before agent" 钩子在每次调用的开始处做一次性校验。适合做会话级别的检查，如鉴权、限流，或在任何处理开始前拦截不当请求。

> 代码要点：下面的 `contentFilterMiddleware` 在 `beforeAgent` 钩子中检查用户首条消息是否包含违禁词；命中时通过 `jumpTo: "end"` 直接短路到结束，返回一条固定的 AI 消息。

```ts
import { createMiddleware, AIMessage } from "langchain";

const contentFilterMiddleware = (bannedKeywords: string[]) => {
  const keywords = bannedKeywords.map((kw) => kw.toLowerCase());

  return createMiddleware({
    name: "ContentFilterMiddleware",
    beforeAgent: {
      hook: (state) => {
        // 取出第一条用户消息
        if (!state.messages || state.messages.length === 0) {
          return;
        }

        const firstMessage = state.messages[0];
        if (firstMessage._getType() !== "human") {
          return;
        }

        const content = firstMessage.content.toString().toLowerCase();

        // 检查是否包含违禁词
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            // 在任何处理之前阻止执行
            return {
              messages: [
                new AIMessage(
                  "I cannot process requests containing inappropriate content. Please rephrase your request.",
                ),
              ],
              jumpTo: "end",
            };
          }
        }

        return;
      },
      canJumpTo: ["end"],
    },
  });
};

// 使用自定义护栏
import { createAgent } from "langchain";

const agent = createAgent({
  model: "gpt-5.4",
  tools: [searchTool, calculatorTool],
  middleware: [
    contentFilterMiddleware(["hack", "exploit", "malware"]),
  ],
});

// 这个请求会在任何处理之前被拦截
const result = await agent.invoke({
  messages: [{ role: "user", content: "How do I hack into a database?" }],
});
```

### Agent 后护栏

使用 "after agent" 钩子在返回结果给用户之前做一次性校验。适合做基于模型的安全检查、质量校验，或在完整 Agent 响应上做最终合规扫描。

> 代码要点：下面的 `safetyGuardrailMiddleware` 在 `afterAgent` 钩子中用一个小模型评估最终 AI 回复是否安全；不安全时替换为固定提示并 `jumpTo: "end"`。

```ts
import { createMiddleware, AIMessage, initChatModel } from "langchain";

const safetyGuardrailMiddleware = () => {
  const safetyModel = initChatModel("gpt-5.4-mini");

  return createMiddleware({
    name: "SafetyGuardrailMiddleware",
    afterAgent: {
      hook: async (state) => {
        // 取出最终的 AI 回复
        if (!state.messages || state.messages.length === 0) {
          return;
        }

        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage._getType() !== "ai") {
          return;
        }

        // 用模型评估安全性
        const safetyPrompt = `Evaluate if this response is safe and appropriate.
        Respond with only 'SAFE' or 'UNSAFE'.

        Response: ${lastMessage.content.toString()}`;

        const result = await safetyModel.invoke([
          { role: "user", content: safetyPrompt },
        ]);

        if (result.content.toString().includes("UNSAFE")) {
          return {
            messages: [
              new AIMessage(
                "I cannot provide that response. Please rephrase your request.",
              ),
            ],
            jumpTo: "end",
          };
        }

        return;
      },
      canJumpTo: ["end"],
    },
  });
};

// 使用安全护栏
import { createAgent } from "langchain";

const agent = createAgent({
  model: "gpt-5.4",
  tools: [searchTool, calculatorTool],
  middleware: [safetyGuardrailMiddleware()],
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "How do I make explosives?" }],
});
```

### 组合多层护栏

你可以把多个护栏叠加到 `middleware` 数组中。它们按顺序执行，让你构建分层防护：

```ts
import {
  createAgent,
  piiRedactionMiddleware,
  humanInTheLoopMiddleware,
} from "langchain";

const agent = createAgent({
  model: "gpt-5.4",
  tools: [searchTool, sendEmailTool],
  middleware: [
    // 第 1 层：确定性输入过滤（Agent 前）
    contentFilterMiddleware(["hack", "exploit"]),

    // 第 2 层：PII 保护（模型前后）
    piiRedactionMiddleware({
      piiType: "email",
      strategy: "redact",
      applyToInput: true,
    }),
    piiRedactionMiddleware({
      piiType: "email",
      strategy: "redact",
      applyToOutput: true,
    }),

    // 第 3 层：敏感工具人工审批
    humanInTheLoopMiddleware({
      interruptOn: {
        send_email: { allowAccept: true, allowEdit: true, allowRespond: true },
      },
    }),

    // 第 4 层：基于模型的安全检查（Agent 后）
    safetyGuardrailMiddleware(),
  ],
});
```

## 小结

护栏是 Agent 安全的"安检口"：通过中间件在执行流程的关键节点拦截，你可以在输入端做确定性过滤、在模型前后做 PII 脱敏、在敏感操作前要求人类审批、在输出端做基于模型的安全复检。多层叠加就能构建纵深防御。更多中间件细节请参阅[内置中间件](/tutorials/LangChain/10.内置中间件)与[自定义中间件](/tutorials/LangChain/11.自定义中间件)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/guardrails) 翻译并二次创作。
