---
title: 内置中间件
categories: LangChain
order: 10
date: 2026-06-24
tags:
  - LangChain
  - Middleware
---

# 内置中间件

> 为常见 Agent 场景准备的生产级中间件。

LangChain 和 Deep Agents 一起提供了一批预置中间件，覆盖了开发中最常见的需求。每一款都经过了生产级验证，并支持按需配置。

## 厂商无关中间件一览

下面这些中间件可以与任意 LLM 提供商搭配使用：

| 中间件 | 说明 |
|---|---|
| Summarization | 当对话接近 token 上限时自动摘要历史消息。 |
| Human-in-the-loop | 在工具执行前暂停，等待人工审批。 |
| Model call limit | 限制模型调用次数，防止成本失控。 |
| Tool call limit | 通过限制调用次数来管控工具执行。 |
| Model fallback | 主模型失败时自动切换到备用模型。 |
| PII detection | 检测并处理个人敏感信息（PII）。 |
| To-do list | 为 Agent 配备任务规划与跟踪能力。 |
| LLM tool selector | 在调用主模型前，先用 LLM 挑选相关工具。 |
| Tool retry | 以指数退避策略自动重试失败的工具调用。 |
| Model retry | 以指数退避策略自动重试失败的模型调用。 |
| LLM tool emulator | 出于测试目的，用 LLM 模拟工具执行结果。 |
| Context editing | 通过裁剪或清空工具使用记录来管理上下文。 |
| Provider tool search | 将工具托管到提供商的 server-side tool search，按需暴露。 |
| Filesystem | 为 Agent 提供文件系统，用于存储上下文与长期记忆。 |
| Subagent middleware | 使 Agent 能够派生子 Agent。 |

接下来挑几个最常用的展开介绍。

## Summarization（摘要）

当对话历史接近模型的上下文窗口时，Summarization 会自动把较早的消息压缩成一段文字摘要，同时保留最近的原始消息。它适用于：

- 会超出上下文窗口的长对话。
- 历史记录丰富的多轮对话。
- 需要保留完整对话上下文的应用。

需要注意，摘要是一种**面向文本**的上下文压缩手段，不会对图片、音频、视频等多模态负载做缩放或下采样。被 `keep` 保留的近期消息仍会保留其原始多模态块；而较早被摘要的多模态消息则只会以文字摘要的形式存在。对于图片密集的应用，建议把媒体资源存储在文件系统或对象存储中，通过 URL 或文件引用在消息历史中传递。

```ts
import { createAgent, summarizationMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-5.5",
  tools: [weatherTool, calculatorTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-5.4-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
});
```

### 配置参数

- **model**（必填）：用于生成摘要的模型，可以传模型标识字符串或 `BaseChatModel` 实例。
- **trigger**：触发摘要的条件，支持 `fraction`（占模型上下文大小的比例）、`tokens`（绝对 token 数）、`messages`（消息条数）。单个条件对象内部为 AND 逻辑；传入数组时为 OR 逻辑。
- **keep**：摘要后要保留多少上下文，三选一：`fraction`、`tokens`、`messages`，默认 `{ messages: 20 }`。
- **tokenCounter**：自定义 token 计数函数，默认按字符数估算。
- **summaryPrompt**：自定义摘要 prompt 模板，需包含 `{messages}` 占位符。
- **trimTokensToSummarize**：生成摘要时最多包含的 token 数，默认 `4000`。

> 当使用 `fraction` 时，中间件依赖模型的 profile 数据（`langchain@1.1.0` 起支持）。如果取不到，可以改用其他条件，或手动指定 profile。

### 触发条件示例

```ts
import { createAgent, summarizationMiddleware } from "langchain";

// 单个条件：tokens 和 messages 同时满足才触发
const agent = createAgent({
  model: "gpt-5.5",
  tools: [weatherTool, calculatorTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-5.4-mini",
      trigger: { tokens: 4000, messages: 10 },
      keep: { messages: 20 },
    }),
  ],
});

// 多个条件：数组中任意一项满足即触发
const agent2 = createAgent({
  model: "gpt-5.5",
  tools: [weatherTool, calculatorTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-5.4-mini",
      trigger: [{ tokens: 3000, messages: 6 }],
      keep: { messages: 20 },
    }),
  ],
});

// 使用比例
const agent3 = createAgent({
  model: "gpt-5.5",
  tools: [weatherTool, calculatorTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-5.4-mini",
      trigger: { fraction: 0.8 },
      keep: { fraction: 0.3 },
    }),
  ],
});
```

## Human-in-the-loop（人工介入）

在工具真正执行之前暂停 Agent，等待人工批准、编辑或拒绝工具调用。适用于：

- 需要人工审批的高风险操作（数据库写入、金融交易等）。
- 合规要求必须有人工监督的场景。
- 靠人工反馈引导 Agent 的长对话。

> 该中间件需要 checkpointer 来跨中断持久化状态。

```ts
import { createAgent, humanInTheLoopMiddleware } from "langchain";

function readEmailTool(emailId: string): string {
  /** 根据 ID 读取邮件（mock） */
  return `Email content for ID: ${emailId}`;
}

function sendEmailTool(recipient: string, subject: string, body: string): string {
  /** 发送邮件（mock） */
  return `Email sent to ${recipient} with subject '${subject}'`;
}

const agent = createAgent({
  model: "gpt-5.5",
  tools: [readEmailTool, sendEmailTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        sendEmailTool: {
          allowedDecisions: ["approve", "edit", "reject"],
        },
        readEmailTool: false, // 不拦截
      },
    }),
  ],
});
```

完整的配置选项和集成模式请参阅 Human-in-the-loop 专题文档。

## Model call limit（模型调用上限）

限制模型调用次数，防止 Agent 陷入死循环或产生过高成本。适用于：

- 防止失控的 Agent 发起过多 API 调用。
- 在生产环境强制执行成本控制。
- 在特定调用预算内测试 Agent 行为。

```ts
import { createAgent, modelCallLimitMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-5.5",
  checkpointer: new MemorySaver(), // 线程级限制必需
  tools: [],
  middleware: [
    modelCallLimitMiddleware({
      threadLimit: 10, // 整个线程最多 10 次
      runLimit: 5, // 单次调用最多 5 次
      exitBehavior: "end", // 达到上限后优雅结束
    }),
  ],
});
```

配置选项：

- **threadLimit**：整个线程内模型调用上限，默认不限。
- **runLimit**：单次调用内模型调用上限，默认不限。
- **exitBehavior**：达到上限时的行为，`'end'`（默认，优雅终止）或 `'error'`（抛异常）。

## Tool call limit（工具调用上限）

控制工具被调用的次数，可以全局限制，也可以针对特定工具。适用于：

- 防止对外部 API 的过度调用。
- 限制网页搜索或数据库查询频次。
- 对特定工具施加速率限制。
- 防止 Agent 进入工具调用死循环。

```ts
import { createAgent, toolCallLimitMiddleware } from "langchain";

// 全局限制 + 针对单个工具的限制组合使用
const agent = createAgent({
  model: "gpt-5.5",
  tools: [searchTool, databaseTool],
  middleware: [
    toolCallLimitMiddleware({ threadLimit: 20, runLimit: 10 }),
    toolCallLimitMiddleware({
      toolName: "search",
      threadLimit: 5,
      runLimit: 3,
    }),
  ],
});
```

配置选项：

- **toolName**：指定要限制的工具名，不填则对所有工具生效。
- **threadLimit**：整个线程内的工具调用上限，需 checkpointer。`undefined` 表示不限。
- **runLimit**：单次调用的工具调用上限，每次用户消息后重置。
- **exitBehavior**：达到上限时的行为：
  - `'continue'`（默认）：阻止超限调用并返回错误消息，Agent 继续。
  - `'error'`：立即抛出 `ToolCallLimitExceededError`。
  - `'end'`：立即停止并返回 ToolMessage + AI 消息，仅限单工具场景。

## Model fallback（模型回退）

主模型失败时自动切换到备用模型，增强 Agent 的容错能力。适用于：

- 构建能应对模型宕机的健壮 Agent。
- 通过回退到更便宜的模型来优化成本。
- 跨 OpenAI、Anthropic 等提供商实现冗余。

```ts
import { createAgent, modelFallbackMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  middleware: [
    modelFallbackMiddleware(
      "gpt-5.4-mini", // 第一备选
      "claude-3-5-sonnet-20241022", // 第二备选
    ),
  ],
});
```

## PII detection（敏感信息检测）

使用可配置策略检测并处理对话中的个人敏感信息（PII）。适用于：

- 有合规要求的医疗和金融应用。
- 需要对日志做脱敏的客服 Agent。
- 任何处理敏感用户数据的应用。

```ts
import { createAgent, piiMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-5.5",
  tools: [],
  middleware: [
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
  ],
});
```

### 自定义 PII 类型

通过 `detector` 参数可以创建自定义 PII 类型，支持三种写法：正则字符串、RegExp 对象、自定义函数。

```ts
import { createAgent, piiMiddleware, type PIIMatch } from "langchain";

// 方式一：正则字符串
const agent1 = createAgent({
  model: "gpt-5.5",
  tools: [],
  middleware: [
    piiMiddleware("api_key", {
      detector: "sk-[a-zA-Z0-9]{32}",
      strategy: "block",
    }),
  ],
});

// 方式二：RegExp 对象
const agent2 = createAgent({
  model: "gpt-5.5",
  tools: [],
  middleware: [
    piiMiddleware("phone_number", {
      detector: /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
      strategy: "mask",
    }),
  ],
});

// 方式三：自定义检测函数
function detectSSN(content: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  const pattern = /\d{3}-\d{2}-\d{4}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    matches.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return matches;
}
```

配置选项：

- **piiType**（必填）：要检测的 PII 类型，内置支持 `email`、`credit_card`、`ip`、`mac_address`、`url`，也可传自定义类型名。
- **strategy**：处理策略，默认 `'redact'`。可选：
  - `'block'`：检测到即抛错。
  - `'redact'`：替换为 `[REDACTED_TYPE]`。
  - `'mask'`：部分遮掩（如 `j***@e****.com`）。
- **detector**：自定义检测器，用于内置类型不覆盖的场景。

## 小结

内置中间件覆盖了 Agent 开发中绝大多数横切关注点。对于这些场景，优先使用内置方案；当内置方案不满足时，再考虑编写[自定义中间件](/tutorials/LangChain/自定义中间件)。

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in) 翻译并二次创作。
