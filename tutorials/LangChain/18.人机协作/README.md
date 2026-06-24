---
title: 人机协作
categories: LangChain
order: 18
date: 2026-06-24
tags:
  - LangChain
---

# 人机协作

> 在 Agent 执行敏感操作前暂停并等待人类决策，让 AI 既能自主推进，又不越界。

人机协作（Human-in-the-Loop，简称 HITL）中间件让你能在 Agent 调用工具的关键节点插入人类审核。当模型提议执行某个需要把关的动作（例如写文件、执行 SQL、发送邮件），中间件会暂停执行并等待人类决策；图状态由 LangGraph 的持久化层保存，因此可以安全暂停、稍后再恢复。

人类的决策决定了下一步走向：原样批准（`approve`）、修改后再执行（`edit`）、拒绝并给出反馈（`reject`）、或直接用人类回复作为工具结果（`respond`，常用于 "ask_user" 类工具）。

## 决策类型

中间件定义了四种内置的人类响应方式：

| 决策类型 | 说明 | 典型场景 |
| --- | --- | --- |
| `approve` | 原样批准工具调用并执行 | 按原样发送邮件草稿 |
| `edit` | 修改后再执行工具调用 | 修改收件人后再发送邮件 |
| `reject` | 拒绝工具调用，并将反馈写入对话 | 拒绝邮件草稿并说明如何重写 |
| `respond` | 跳过工具执行，直接把人类回复当作工具结果 | 回答 "ask_user" 提示并直接给出答复 |

每个工具可用的决策类型由你在 `interruptOn` 中配置的策略决定。当多个工具调用同时被暂停时，每个动作都需要单独给出决策，且决策顺序必须与中断请求中的动作顺序一致。

## 配置中断

要启用 HITL，把 `humanInTheLoopMiddleware` 加到 Agent 的 `middleware` 列表中。你需要提供一个"工具名 → 审批配置"的映射：中间件在匹配到对应工具调用时会触发中断。

> 代码要点：以下示例展示了如何按工具精细配置审批策略——`write_file` 允许全部四种决策；`execute_sql` 只允许 `approve` / `reject`（禁止编辑）；`read_data` 设为 `false` 表示安全操作、无需审批。同时，HITL 必须配合 checkpointer 才能在中断后恢复，开发期可用 `MemorySaver`，生产环境建议使用 `AsyncPostgresSaver` 等持久化后端。

```ts
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-5.4",
  tools: [writeFileTool, executeSQLTool, readDataTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        write_file: true, // 所有决策（approve/edit/reject/respond）都允许
        execute_sql: {
          allowedDecisions: ["approve", "reject"], // 不允许编辑
          description: "🚨 SQL execution requires DBA approval",
        },
        // 安全操作，无需审批
        read_data: false,
      },
      // 中断消息的前缀，会与工具名和参数拼接成完整描述
      // 例如："Tool execution pending approval: execute_sql with query='DELETE FROM...'"
      // 每个工具可在自己的配置里通过 "description" 覆盖该前缀
      descriptionPrefix: "Tool execution pending approval",
    }),
  ],
  // 人机协作必须配合 checkpointer 才能处理中断
  // 生产环境请使用 AsyncPostgresSaver 等持久化后端
  checkpointer: new MemorySaver(),
});
```

配置项概览：

- `interruptOn`：工具名到审批配置的映射。
  - 直接设为 `true` 表示允许全部决策；设为 `false` 表示该工具无需审批。
  - 也可传入对象：`allowedDecisions` 限制可用决策类型，`description` 自定义提示文案。

## 响应中断

调用 Agent 后，它会执行到完成或遇到中断为止。中断触发时，`invoke` 返回的 `GraphOutput` 会带一个 `__interrupt__` 字段，其中包含待审核的动作。你可以把这些动作展示给审核人，等拿到决策后再恢复执行。

> 代码要点：恢复执行使用 `Command({ resume: { decisions: [...] } })`，并传入与首次调用相同的 `thread_id`。下面的示例先触发中断、再以 `approve` 恢复。

```ts
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

// 必须提供 thread_id，把执行与对话线程绑定，才能在中断后恢复
const config = { configurable: { thread_id: "some_id" } };

// 运行到命中中断为止
const result = await agent.invoke(
  {
    messages: [new HumanMessage("Delete old records from the database")],
  },
  config,
);

// 中断里包含完整的 HITL 请求：action_requests 与 review_configs
console.log(result.__interrupt__);
// > [
// >    Interrupt(
// >       value: {
// >          action_requests: [
// >             {
// >                name: 'execute_sql',
// >                arguments: { query: 'DELETE FROM records WHERE created_at < NOW() - INTERVAL \'30 days\';' },
// >                description: 'Tool execution pending approval\n\nTool: execute_sql\nArgs: {...}'
// >             }
// >          ],
// >          review_configs: [
// >             {
// >                action_name: 'execute_sql',
// >                allowed_decisions: ['approve', 'reject']
// >             }
// >          ]
// >       }
// >    )
// > ]

// 以 approve 决策恢复执行
await agent.invoke(
  new Command({
    resume: { decisions: [{ type: "approve" }] }, // 或 "reject"
  }),
  config, // 同一个 thread_id 用于恢复暂停的对话
);
```

### 各类决策详解

`approve`：原样批准并执行。

```ts
await agent.invoke(
  new Command({
    // decisions 是一个数组，每个待审核动作对应一条决策，顺序必须一致
    resume: {
      decisions: [
        {
          type: "approve",
        },
      ],
    },
  }),
  config, // 同一个 thread_id 用于恢复暂停的对话
);
```

`edit`：在执行前修改工具调用，需要提供新的工具名和参数。

```ts
await agent.invoke(
  new Command({
    resume: {
      decisions: [
        {
          type: "edit",
          // 修改后的动作：工具名和参数
          editedAction: {
            // 工具名，通常与原动作相同
            name: "new_tool_name",
            // 传给工具的参数
            args: { key1: "new_value", key2: "original_value" },
          },
        },
      ],
    },
  }),
  config,
);
```

`reject`：拒绝调用，并通过 `message` 给出反馈。反馈会被写入对话，帮助 Agent 理解被拒原因并调整后续行为。

```ts
await agent.invoke(
  new Command({
    resume: {
      decisions: [
        {
          type: "reject",
          // 解释为什么拒绝，以及应该怎么做
          message: "No, this is wrong because ..., instead do this ...",
        },
      ],
    },
  }),
  config,
);
```

### 同时处理多个决策

当多个动作同时待审时，按它们的出现顺序逐条给出决策：

```ts
{
  decisions: [
    { type: "approve" },
    {
      type: "edit",
      editedAction: {
        name: "tool_name",
        args: { param: "new_value" },
      },
    },
    { type: "reject", message: "This action is not allowed" },
  ],
}
```

### respond：作为"问用户"工具

`respond` 适用于"问用户"类工具——这类工具的真正实现就是人类的回答。`message` 内容会直接作为工具结果返回，工具本身不会被执行。

```ts
await agent.invoke(
  new Command({
    resume: {
      decisions: [
        {
          type: "respond",
          // 人类的回复，直接作为工具结果返回
          message: "Blue.",
        },
      ],
    },
  }),
  config,
);
```

`message` 会以一条成功的 `ToolMessage` 形式返回给 Agent。当工具被设计成"占位符"来向人类征求澄清时（例如 `ask_user` 工具），就用 `respond`。

## 结合流式输出

你可以用 `stream()` 代替 `invoke()`，在 Agent 运行和处理中断的同时获得实时更新。配合 `streamMode: ["updates", "messages"]` 与 `version: "v2"`，可以在统一的 v2 格式里同时拿到 Agent 进度和 LLM token。

```ts
import { Command } from "@langchain/langgraph";

const config = { configurable: { thread_id: "some_id" } };

// 流式输出直到命中中断
for await (const [mode, chunk] of await agent.stream(
  { messages: [{ role: "user", content: "Delete old records from the database" }] },
  { ...config, streamMode: ["updates", "messages"] },
)) {
  if (mode === "messages") {
    // LLM token
    const [token, metadata] = chunk;
    if (token.content) {
      process.stdout.write(token.content);
    }
  } else if (mode === "updates") {
    // 检查是否命中中断
    if ("__interrupt__" in chunk) {
      console.log(`\n\nInterrupt: ${JSON.stringify(chunk.__interrupt__)}`);
    }
  }
}

// 人类决策后，带流式地恢复执行
for await (const [mode, chunk] of await agent.stream(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  { ...config, streamMode: ["updates", "messages"] },
)) {
  if (mode === "messages") {
    const [token, metadata] = chunk;
    if (token.content) {
      process.stdout.write(token.content);
    }
  }
}
```

更多流模式细节请参阅[流式输出](/tutorials/LangChain/13.流式输出)与[事件流](/tutorials/LangChain/14.事件流)。

## 执行生命周期

中间件定义了一个 `after_model` 钩子，它在模型生成响应之后、工具实际执行之前触发：

1. Agent 调用模型生成响应。
2. 中间件检查响应中是否包含工具调用。
3. 如果存在需要人工介入的调用，中间件构造一个 `HITLRequest`（含 `action_requests` 与 `review_configs`）并调用 interrupt。
4. Agent 等待人类决策。
5. 根据 `HITLResponse` 中的决策：批准或修改后的动作会被执行；被拒绝的调用会合成 `ToolMessage`；`respond` 决策直接把人类回复作为 `ToolMessage` 返回；随后恢复执行。

## 自定义 HITL 逻辑

对于更定制化的流程，你可以直接基于 interrupt 原语和中间件抽象构建自己的 HITL 逻辑。结合上面描述的生命周期，就能把中断灵活嵌入 Agent 的运行流程。如果需要回顾中间件原理，请参阅[中间件概览](/tutorials/LangChain/9.中间件概览)与[自定义中间件](/tutorials/LangChain/11.自定义中间件)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop) 翻译并二次创作。
