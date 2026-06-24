---
title: 中断
categories: LangGraph
order: 13
date: 2026-06-25
tags:
  - LangGraph
  - 中断
  - 人机协作
---

# 中断

> 中断（Interrupt）让你可以在图执行的任意位置暂停，等待外部输入后再继续——这是实现人机协作（HITL）的核心原语。

中断机制的工作原理是：在图节点中任意位置调用 `interrupt()` 函数，LangGraph 就会利用其[持久化](/tutorials/LangGraph/持久化)层保存当前图状态，然后无限期等待你恢复执行。恢复时通过 `Command` 把外部输入传入，该输入会成为 `interrupt()` 调用的返回值，节点继续执行。

与静态断点（在特定节点前后暂停）不同，中断是**动态的**：它可以放在代码的任何位置，也可以根据业务逻辑有条件地触发。

- **检查点帮你保存进度**：checkpointer 会写入精确的图状态，即使遇到错误也能恢复。
- **`thread_id` 是你的指针**：通过 `{ configurable: { thread_id: ... } }` 告诉 checkpointer 加载哪个线程的状态。
- **中断负载通过 `__interrupt__` 暴露**：你传给 `interrupt()` 的值会出现在返回结果的 `__interrupt__` 字段中，让你知道图正在等待什么。

你选择的 `thread_id` 实际上就是持久化游标。复用它就能恢复同一个检查点；换一个新值则会启动一个状态为空的全新线程。

## 用 `interrupt` 暂停执行

[`interrupt`](https://reference.langchain.com/javascript/langchain-langgraph/index/interrupt) 函数会暂停图执行，并把一个值返回给调用方。当你在节点中调用 `interrupt` 时，LangGraph 会保存当前图状态，等待你用输入值恢复执行。

使用 `interrupt` 需要三个前提：

1. 一个 **checkpointer** 来持久化图状态（生产环境请使用持久化 checkpointer）。
2. 配置中提供一个 **thread ID**，让运行时知道从哪个状态恢复。
3. 在希望暂停的位置调用 `interrupt()`（负载必须是 JSON 可序列化的）。

```typescript
import { interrupt } from "@langchain/langgraph";

async function approvalNode(state: State) {
    // 暂停并请求批准
    const approved = interrupt("Do you approve this action?");

    // Command({ resume: ... }) 提供的值会返回到这个变量
    return { approved };
}
```

当你调用 `interrupt` 时，会发生以下事情：

1. **图执行被挂起**，精确停在中断调用点。
2. **状态被保存**，通过 checkpointer 持久化以便后续恢复；生产环境应使用数据库等持久化后端。
3. **值返回给调用方**，出现在 `__interrupt__` 字段中，可以是任意 JSON 可序列化值（字符串、对象、数组等）。
4. **图无限期等待**，直到你恢复执行。
5. **恢复时，响应被传回节点**，成为 `interrupt()` 调用的返回值。

## 恢复中断

中断暂停执行后，你需要再次调用图并传入一个包含 resume 值的 `Command` 来恢复。resume 值会被传回 `interrupt` 调用，让节点带着外部输入继续执行。

```typescript
import { Command } from "@langchain/langgraph";

// 首次运行 —— 遇到中断并暂停
// thread_id 是回到已保存检查点的持久化指针
const config = { configurable: { thread_id: "thread-1" } };
const result = await graph.invoke({ input: "data" }, config);

// 查看被中断的内容
// __interrupt__ 镜像了你传给 interrupt() 的每个负载
console.log(result.__interrupt__);
// [{ value: 'Do you approve this action?', ... }]

// 用人类的回复恢复执行
// Command({ resume }) 的值会从节点内的 interrupt() 返回
await graph.invoke(new Command({ resume: true }), config);
```

**恢复执行的关键要点：**

- 恢复时必须使用与中断发生时**相同的 thread ID**。
- 传给 `new Command({ resume: ... })` 的值会成为 `interrupt()` 调用的返回值。
- 恢复时节点会**从头重新执行**（而不是从 `interrupt` 调用行继续），因此中断之前的代码会再次运行。
- 你可以传入任意 JSON 可序列化值作为 resume 值。

::: warning
`new Command({ resume: ... })` 是**唯一**设计为作为 `invoke()` / `stream()` / `stream_events()` 输入的 `Command` 模式。其他 `Command` 参数（`update`、`goto`、`graph`）是供[从节点函数返回](/tutorials/LangGraph/Pregel 运行时)使用的。不要把 `new Command({ update: ... })` 当作输入来继续多轮对话——请传入一个普通的输入对象。
:::

## 常见模式

中断解锁的核心能力是暂停执行并等待外部输入。以下是一些典型用例：

- [审批工作流](#批准或拒绝)：在执行关键操作（API 调用、数据库变更、金融交易）前暂停。
- [处理多个中断](#处理多个中断)：当单次调用中恢复多个中断时，将中断 ID 与 resume 值配对。
- [审查与编辑](#审查与编辑状态)：让人类在继续前审查并修改 LLM 输出或工具调用。
- [中断工具调用](#工具中的中断)：在执行工具调用前暂停，以便审查和编辑。
- [验证人类输入](#验证人类输入)：在进入下一步前暂停以验证人类输入。

### 结合流式输出处理 HITL 中断

在构建带人机协作工作流的交互式 Agent 时，你可以使用[事件流](/tutorials/LangGraph/事件流)在处理中断的同时消费消息块和状态快照。

使用 `graph.stream_events(..., version="v3")` 返回的类型化投影，在循环中消费直到运行完成：

- 通过 `stream.messages` 逐 token 流式获取 AI 回复。
- 通过 `stream.values` 观察每步的状态快照。
- 通过 `stream.interrupted` 检测中断，从 `stream.interrupts` 读取负载。
- 用 `Command(resume=...)` 再次调用 `stream_events` 恢复执行，循环直到 `stream.interrupted` 为 false。

```ts
import { Command } from "@langchain/langgraph";

let streamInput: Record<string, unknown> | Command = initialInput;

while (true) {
  const stream = await graph.streamEvents(streamInput, {
    ...config,
    version: "v3",
  });

  // 流式获取 LLM 消息块（包括子图中的），随到随处理
  for await (const message of stream.messages) {
    for await (const token of message.text) {
      displayStreamingContent(token);
    }
  }

  // 运行结束（或暂停）后，检查是否有中断并恢复
  if (!stream.interrupted) {
    const finalState = await stream.output;
    break;
  }

  const interruptInfo = stream.interrupts[0].payload;
  const userResponse = await getUserInput(interruptInfo);
  streamInput = new Command({ resume: userResponse });
}
```

- **`stream.messages`**：聊天模型的输出内容块；遍历 `message.text` 获取 token 增量。对于嵌套子图，从 `stream.subgraphs[*].messages` 读取消息块。
- **`stream.values`**：每步之后的完整状态快照。
- **`stream.interrupted` / `stream.interrupts`**：每次运行后检查图是否暂停；从 `stream.interrupts` 读取负载。
- **`Command(resume=...)`**：作为下一次 `streamEvents` 的输入来恢复；循环直到运行完成且无中断。

### 处理多个中断

当并行分支同时触发中断时（例如扇出到多个各自调用 `interrupt()` 的节点），你可能需要在一次调用中恢复多个中断。此时需要把每个中断 ID 映射到对应的 resume 值，确保每个响应在运行时配对到正确的中断。

```typescript
import {
  Annotation,
  Command,
  END,
  INTERRUPT,
  MemorySaver,
  START,
  StateGraph,
  interrupt,
  isInterrupted,
} from "@langchain/langgraph";

const State = Annotation.Root({
  vals: Annotation<string[]>({
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
});

function nodeA(_state: typeof State.State) {
  const answer = interrupt("question_a") as string;
  return { vals: [`a:${answer}`] };
}

function nodeB(_state: typeof State.State) {
  const answer = interrupt("question_b") as string;
  return { vals: [`b:${answer}`] };
}

const graph = new StateGraph(State)
  .addNode("a", nodeA)
  .addNode("b", nodeB)
  .addEdge(START, "a")
  .addEdge(START, "b")
  .addEdge("a", END)
  .addEdge("b", END)
  .compile({ checkpointer: new MemorySaver() });

const config = { configurable: { thread_id: "1" } };

async function main() {
  // 步骤1：调用 —— 两个并行节点都命中 interrupt() 并暂停
  const interruptedResult = await graph.invoke({ vals: [] }, config);
  console.log(interruptedResult);
  /*
  {
    vals: [],
    __interrupt__: [
      { id: '...', value: 'question_a' },
      { id: '...', value: 'question_b' }
    ]
  }
  */

  // 步骤2：一次性恢复所有挂起的中断
  const resumeMap: Record<string, string> = {};
  if (isInterrupted(interruptedResult)) {
    for (const i of interruptedResult[INTERRUPT]) {
      if (i.id != null) {
        resumeMap[i.id] = `answer for ${i.value}`;
      }
    }
  }
  const result = await graph.invoke(new Command({ resume: resumeMap }), config);

  console.log("Final state:", result);
  //> Final state: { vals: ['a:answer for question_a', 'b:answer for question_b'] }
}

main().catch(console.error);
```

### 批准或拒绝

中断最常见的用途之一是在关键操作前暂停并请求批准。例如，你可能想让人类批准一次 API 调用、一次数据库变更或其他重要决策。

```typescript
import { interrupt, Command } from "@langchain/langgraph";

const approvalNode: typeof State.Node = (state) => {
  // 暂停执行；负载出现在 result.__interrupt__
  const isApproved = interrupt({
    question: "Do you want to proceed?",
    details: state.actionDetails
  });

  // 根据响应路由
  if (isApproved) {
    return new Command({ goto: "proceed" }); // 提供 resume 负载后运行
  } else {
    return new Command({ goto: "cancel" });
  }
}
```

恢复图时，传 `true` 表示批准，`false` 表示拒绝：

```typescript
// 批准
await graph.invoke(new Command({ resume: true }), config);

// 拒绝
await graph.invoke(new Command({ resume: false }), config);
```

::: details 完整示例
```typescript
import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  StateSchema,
  interrupt,
} from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  actionDetails: z.string(),
  status: z.enum(["pending", "approved", "rejected"]).nullable(),
});

const graphBuilder = new StateGraph(State)
  .addNode("approval", async (state) => {
    // 暴露详情，让调用方可以在 UI 中渲染
    const decision = interrupt({
      question: "Approve this action?",
      details: state.actionDetails,
    });
    return new Command({ goto: decision ? "proceed" : "cancel" });
  }, { ends: ['proceed', 'cancel'] })
  .addNode("proceed", () => ({ status: "approved" }))
  .addNode("cancel", () => ({ status: "rejected" }))
  .addEdge(START, "approval")
  .addEdge("proceed", END)
  .addEdge("cancel", END);

// 生产环境请使用更持久的 checkpointer
const checkpointer = new MemorySaver();
const graph = graphBuilder.compile({ checkpointer });

const config = { configurable: { thread_id: "approval-123" } };
const initial = await graph.invoke(
  { actionDetails: "Transfer $500", status: "pending" },
  config,
);
console.log(initial.__interrupt__);
// [{ value: { question: ..., details: ... } }]

// 用决策恢复；true 路由到 proceed，false 到 cancel
const resumed = await graph.invoke(new Command({ resume: true }), config);
console.log(resumed.status); // -> "approved"
```
:::

### 审查与编辑状态

有时候你想让人类在继续之前审查并编辑图状态的一部分。这对于纠正 LLM 输出、补充缺失信息或做调整非常有用。

```typescript
import { interrupt } from "@langchain/langgraph";

const reviewNode: typeof State.Node = (state) => {
  // 暂停并展示当前内容供审查（出现在 result.__interrupt__）
  const editedContent = interrupt({
    instruction: "Review and edit this content",
    content: state.generatedText
  });

  // 用编辑后的版本更新状态
  return { generatedText: editedContent };
}
```

恢复时提供编辑后的内容：

```typescript
await graph.invoke(
  new Command({ resume: "The edited and improved text" }), // 值成为 interrupt() 的返回值
  config
);
```

::: details 完整示例
```typescript
import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  StateSchema,
  interrupt,
} from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  generatedText: z.string(),
});

const builder = new StateGraph(State)
  .addNode("review", async (state) => {
    // 请求审查者编辑生成的内容
    const updated = interrupt({
      instruction: "Review and edit this content",
      content: state.generatedText,
    });
    return { generatedText: updated };
  })
  .addEdge(START, "review")
  .addEdge("review", END);

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "review-42" } };
const initial = await graph.invoke({ generatedText: "Initial draft" }, config);
console.log(initial.__interrupt__);
// [{ value: { instruction: ..., content: ... } }]

// 用审查者编辑后的文本恢复
const finalState = await graph.invoke(
  new Command({ resume: "Improved draft after review" }),
  config,
);
console.log(finalState.generatedText); // -> "Improved draft after review"
```
:::

### 工具中的中断

你也可以把中断直接放在工具函数内部。这样工具本身在每次被调用时都会暂停等待批准，并允许人类在执行前审查和编辑工具调用。

首先，定义一个使用 `interrupt` 的工具：

```typescript
import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import * as z from "zod";

const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    // 发送前暂停；负载出现在 result.__interrupt__
    const response = interrupt({
      action: "send_email",
      to,
      subject,
      body,
      message: "Approve sending this email?",
    });

    if (response?.action === "approve") {
      // resume 值可以在执行前覆盖输入参数
      const finalTo = response.to ?? to;
      const finalSubject = response.subject ?? subject;
      const finalBody = response.body ?? body;
      return `Email sent to ${finalTo} with subject '${finalSubject}'`;
    }
    return "Email cancelled by user";
  },
  {
    name: "send_email",
    description: "Send an email to a recipient",
    schema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);
```

当你希望审批逻辑与工具本身绑定（使其在图的不同部分可复用）时，这种方式很有用。LLM 可以自然地调用工具，而中断会在工具被调用时暂停执行，让你批准、编辑或取消操作。

::: details 完整示例
```typescript
import { tool } from "@langchain/core/tools";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  StateSchema,
  MessagesValue,
  GraphNode,
  interrupt,
} from "@langchain/langgraph";
import * as z from "zod";

const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    // 发送前暂停；负载出现在 result.__interrupt__
    const response = interrupt({
      action: "send_email",
      to,
      subject,
      body,
      message: "Approve sending this email?",
    });

    if (response?.action === "approve") {
      const finalTo = response.to ?? to;
      const finalSubject = response.subject ?? subject;
      const finalBody = response.body ?? body;
      console.log("[sendEmailTool]", finalTo, finalSubject, finalBody);
      return `Email sent to ${finalTo}`;
    }
    return "Email cancelled by user";
  },
  {
    name: "send_email",
    description: "Send an email to a recipient",
    schema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);

const model = new ChatAnthropic({ model: "claude-sonnet-4-6" }).bindTools([sendEmailTool]);

const State = new StateSchema({
  messages: MessagesValue,
});

const agent: typeof State.Node = async (state) => {
  // LLM 可能决定调用工具；中断在发送前暂停
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const graphBuilder = new StateGraph(State)
  .addNode("agent", agent)
  .addEdge(START, "agent")
  .addEdge("agent", END);

const checkpointer = new MemorySaver();
const graph = graphBuilder.compile({ checkpointer });

const config = { configurable: { thread_id: "email-workflow" } };
const initial = await graph.invoke(
  {
    messages: [
      { role: "user", content: "Send an email to alice@example.com about the meeting" },
    ],
  },
  config,
);
console.log(initial.__interrupt__); // -> [{ value: { action: 'send_email', ... } }]

// 用批准和可选的编辑参数恢复
const resumed = await graph.invoke(
  new Command({
    resume: { action: "approve", subject: "Updated subject" },
  }),
  config,
);
console.log(resumed.messages.at(-1)); // -> send_email 返回的工具结果
```
:::

### 验证人类输入

有时候你需要验证人类输入，如果值无效就重新提示。推荐的做法是**每次节点调用只调用一次 `interrupt()`**，把错误信息存入状态后返回，并用**条件边**循环回到该节点，直到获得有效值。

::: warning
**避免在单个节点内使用 `while True` + `interrupt()` 循环。** 因为每次恢复时节点会从头重新执行（参见[中断规则](#中断规则)），在循环中多次调用 `interrupt()` 会导致每次恢复都重放之前所有迭代：第一次恢复重放 1 次迭代，第二次重放 2 次，以此类推。结果是循环体内的代码被指数级重复执行。
:::

正确的模式：

1. 把重新提示的问题存入状态（如 `pendingQuestion`）。
2. 在节点中**恰好调用一次** `interrupt()`，传入状态中的当前问题。
3. 如果答案无效，返回更新后的 `pendingQuestion`，让下一次调用重新提示。
4. 用 `addConditionalEdges` 路由回该节点，直到收集到有效值。

```ts
import { interrupt } from "@langchain/langgraph";

const getAgeNode: typeof State.Node = (state) => {
  const question = state.pendingQuestion ?? "What is your age?";
  const answer = interrupt(question); // 每次调用恰好执行一次

  if (typeof answer === "number" && answer > 0) {
    return { age: answer, pendingQuestion: null };
  }
  return {
    pendingQuestion: `'${answer}' is not a valid age. Please enter a positive number.`,
  };
};

// builder.addConditionalEdges("collectAge", (state) =>
//   state.age !== null ? END : "collectAge"
// );
```

每次恢复只调用一次 `getAgeNode`，执行一次 `interrupt()`，然后退出。当答案无效时，条件边循环回来，下一次中断用更新后的问题重新提示。

::: details 完整示例
```typescript
import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  StateSchema,
  interrupt,
} from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  age: z.number().nullable(),
  pendingQuestion: z.string().nullable(),
});

const builder = new StateGraph(State)
  .addNode("collectAge", (state) => {
    const question = state.pendingQuestion ?? "What is your age?";
    const answer = interrupt(question); // 每次调用恰好执行一次

    if (typeof answer === "number" && answer > 0) {
      return { age: answer, pendingQuestion: null };
    }
    return { pendingQuestion: `'${answer}' is not a valid age. Please enter a positive number.` };
  })
  .addEdge(START, "collectAge")
  .addConditionalEdges("collectAge", (state) =>
    state.age !== null ? END : "collectAge"
  );

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "form-1" } };
const first = await graph.invoke({ age: null, pendingQuestion: null }, config);
console.log(first.__interrupt__); // -> [{ value: "What is your age?", ... }]

// 提供无效数据；节点通过条件边重新提示
const retry = await graph.invoke(new Command({ resume: "thirty" }), config);
console.log(retry.__interrupt__); // -> [{ value: "'thirty' is not a valid age...", ... }]

// 提供有效数据；路由返回 END，图完成
const final = await graph.invoke(new Command({ resume: 30 }), config);
console.log(final.age); // -> 30
```
:::

## 中断规则

当你在节点中调用 `interrupt` 时，LangGraph 通过抛出一个特殊异常来挂起执行。该异常沿调用栈向上传播，被运行时捕获，运行时随之通知图保存当前状态并等待外部输入。

当执行恢复时（在你提供请求的输入之后），运行时会**从头重启整个节点**——它不会从 `interrupt` 调用的那一行继续。这意味着中断之前的所有代码都会再次执行。因此，使用中断时需要遵循一些重要规则以确保行为符合预期。

### 不要把 `interrupt` 调用包在 try/catch 中

`interrupt` 暂停执行的方式是抛出一个特殊异常。如果你把 `interrupt` 调用包在 try/catch 块中，你会捕获到这个异常，导致中断无法传回图。

- 把 `interrupt` 调用与容易出错的代码分开
- 如需要，可以有条件地捕获错误

::: code-group

```typescript [分离逻辑]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 好：先中断，再单独处理错误条件
  const name = interrupt("What's your name?");
  try {
    await fetchData(); // 这可能失败
  } catch (err) {
    console.error(error);
  }
  return state;
}
```

```typescript [有条件地处理错误]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 好：重新抛出异常可以让中断传回图
  try {
    const name = interrupt("What's your name?");
    await fetchData(); // 这可能失败
  } catch (err) {
    if (error instanceof NetworkError) {
      console.error(error);
    }
    throw error;
  }
  return state;
}
```
:::

不要把 `interrupt` 调用包在裸 try/catch 块中：

```typescript
async function nodeA(state: State) {
    // 坏：把 interrupt 包在裸 try/catch 中会捕获中断异常
    try {
        const name = interrupt("What's your name?");
    } catch (err) {
        console.error(error);
    }
    return state;
}
```

### 不要在节点内改变 `interrupt` 调用的顺序

在单个节点中使用多个中断很常见，但如果处理不当可能导致意外行为。

当节点包含多个中断调用时，LangGraph 会为执行该节点的任务维护一个 resume 值列表。每次恢复执行时，都从节点开头开始。对于遇到的每个中断，LangGraph 检查任务的 resume 列表中是否存在匹配值。匹配是**严格基于索引的**，因此节点内中断调用的顺序很重要。

- 保持 `interrupt` 调用在节点执行间的顺序一致

```typescript
async function nodeA(state: State) {
    // 好：中断调用每次都以相同顺序发生
    const name = interrupt("What's your name?");
    const age = interrupt("What's your age?");
    const city = interrupt("What's your city?");

    return {
        name,
        age,
        city
    };
}
```

- 不要在节点内条件性地跳过 `interrupt` 调用
- 不要使用跨执行不确定的逻辑来循环 `interrupt` 调用（包括 `while True` 验证循环）。请改用条件边（参见[验证人类输入](#验证人类输入)）

::: code-group

```typescript [跳过中断]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 坏：条件性跳过中断会改变顺序
  const name = interrupt("What's your name?");

  // 首次运行时可能跳过这个中断
  // 恢复时可能不跳过 —— 导致索引不匹配
  if (state.needsAge) {
    const age = interrupt("What's your age?");
  }

  const city = interrupt("What's your city?");

  return { name, city };
}
```

```typescript [循环中断]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 坏：基于非确定性数据循环
  // 中断数量在不同执行间会变化
  const results = [];
  for (const item of state.dynamicList || []) {  // 列表可能在运行间变化
    const result = interrupt(`Approve ${item}?`);
    results.push(result);
  }

  return { results };
}
```
:::

### 不要在 `interrupt` 调用中返回复杂值

根据所使用的 checkpointer，复杂值可能无法序列化（例如你无法序列化一个函数）。为了让你的图能适配任何部署环境，最佳实践是只使用可以合理序列化的值。

- 传给 `interrupt` 简单的、JSON 可序列化的类型
- 传包含简单值的字典/对象

::: code-group

```typescript [简单值]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 好：传递可序列化的简单类型
  const name = interrupt("What's your name?");
  const count = interrupt(42);
  const approved = interrupt(true);

  return { name, count, approved };
}
```

```typescript [结构化数据]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 好：传递包含简单值的对象
  const response = interrupt({
    question: "Enter user details",
    fields: ["name", "email", "age"],
    currentValues: state.user || {}
  });

  return { user: response };
}
```
:::

不要传函数、类实例或其他复杂对象给 `interrupt`：

::: code-group

```typescript [函数]
function validateInput(value: string): boolean {
    return value.length > 0;
}

const nodeA: GraphNode<typeof State> = async (state) => {
    // 坏：把函数传给 interrupt
    // 函数无法被序列化
    const response = interrupt({
      question: "What's your name?",
      validator: validateInput  // 这会失败
    });
    return { name: response };
}
```

```typescript [类实例]
class DataProcessor {
    constructor(private config: any) {}
}

const nodeA: GraphNode<typeof State> = async (state) => {
    const processor = new DataProcessor({ mode: "strict" });

    // 坏：把类实例传给 interrupt
    // 实例无法被序列化
    const response = interrupt({
      question: "Enter data to process",
      processor: processor  // 这会失败
    });
    return { result: response };
}
```
:::

### `interrupt` 之前调用的副作用必须是幂等的

因为中断的工作方式是重新运行调用它的节点，所以在 `interrupt` 之前调用的副作用（理想情况下）应该是幂等的。幂等性意味着同一操作可以多次执行而不会改变首次执行之后的结果。

举个例子，你可能在一个节点内有更新记录的 API 调用。如果在该调用之后调用了 `interrupt`，那么节点恢复时该调用会被多次执行，可能覆盖初始更新或创建重复记录。

- 在 `interrupt` 之前使用幂等操作
- 把副作用放在 `interrupt` 调用之后
- 尽可能把副作用分离到单独的节点中

::: code-group

```typescript [幂等操作]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 好：使用 upsert 操作，是幂等的
  // 多次运行结果相同
  await db.upsertUser({
    userId: state.userId,
    status: "pending_approval"
  });

  const approved = interrupt("Approve this change?");

  return { approved };
}
```

```typescript [副作用放在中断之后]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 好：把副作用放在中断之后
  // 确保它只在收到批准后执行一次
  const approved = interrupt("Approve this change?");

  if (approved) {
    await db.createAuditLog({
      userId: state.userId,
      action: "approved"
    });
  }

  return { approved };
}
```

```typescript [分离到不同节点]
const approvalNode: GraphNode<typeof State> = async (state) => {
  // 好：这个节点只处理中断
  const approved = interrupt("Approve this change?");

  return { approved };
}

const notificationNode: GraphNode<typeof State> = async (state) => {
  // 好：副作用发生在单独的节点中
  // 在批准之后运行，所以只执行一次
  if (state.approved) {
    await sendNotification({
      userId: state.userId,
      status: "approved",
    });
  }

  return state;
}
```
:::

不要在 `interrupt` 之前执行非幂等操作，不要在不检查是否存在的情况下创建新记录：

::: code-group

```typescript [创建记录]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 坏：在中断前创建新记录
  // 每次恢复都会创建重复记录
  const auditId = await db.createAuditLog({
    userId: state.userId,
    action: "pending_approval",
    timestamp: new Date()
  });

  const approved = interrupt("Approve this change?");

  return { approved, auditId };
}
```

```typescript [追加到数组]
const nodeA: GraphNode<typeof State> = async (state) => {
  // 坏：在中断前追加到数组
  // 每次恢复都会添加重复条目
  await db.appendToHistory(state.userId, "approval_requested");

  const approved = interrupt("Approve this change?");

  return { approved };
}
```
:::

## 与函数调用式子图配合使用

当在节点中调用子图时，父图会从**调用子图和触发中断的节点开头**恢复执行。同样，**子图**也会从调用 `interrupt` 的节点开头恢复。

```typescript
async function nodeInParentGraph(state: State) {
    someCode(); // <-- 恢复时会重新执行
    // 以函数方式调用子图
    // 子图包含 `interrupt` 调用
    const subgraphResult = await subgraph.invoke(someInput);
    // ...
}

async function nodeInSubgraph(state: State) {
    someOtherCode(); // <-- 恢复时也会重新执行
    const result = interrupt("What's your name?");
    // ...
}
```

## 用中断调试

要调试和测试图，你可以使用静态中断作为断点，逐节点地步进图执行。静态中断在定义的点触发——节点执行前或执行后。你可以在编译图时通过 `interruptBefore` 和 `interruptAfter` 来设置。

::: info
静态中断**不推荐**用于人机协作工作流。请改用 `interrupt` 函数。
:::

::: code-group

```typescript [编译时设置]
const graph = builder.compile({
    interruptBefore: ["node_a"],  // [!code highlight]
    interruptAfter: ["node_b", "node_c"],  // [!code highlight]
    checkpointer,
});

// 给图传入 thread ID
const config = {
    configurable: {
        thread_id: "some_thread"
    }
};

// 运行图直到断点
await graph.invoke(inputs, config);# [!code highlight]

await graph.invoke(null, config);  # [!code highlight]
```

1. 断点在 `compile` 时设置。
2. `interruptBefore` 指定在节点执行前暂停的节点。
3. `interruptAfter` 指定在节点执行后暂停的节点。
4. 启用断点需要 checkpointer。
5. 图运行直到命中第一个断点。
6. 传入 `null` 作为输入来恢复图。这会运行图直到命中下一个断点。

```typescript [运行时设置]
// 运行图直到断点
graph.invoke(inputs, {
    interruptBefore: ["node_a"],  // [!code highlight]
    interruptAfter: ["node_b", "node_c"],  // [!code highlight]
    configurable: {
        thread_id: "some_thread"
    }
});

// 恢复图
await graph.invoke(null, config);  // [!code highlight]
```

1. `graph.invoke` 传入 `interruptBefore` 和 `interruptAfter` 参数。这是运行时配置，每次调用都可以更改。
2. `interruptBefore` 指定在节点执行前暂停的节点。
3. `interruptAfter` 指定在节点执行后暂停的节点。
4. 图运行直到命中第一个断点。
5. 传入 `null` 作为输入来恢复图。这会运行图直到命中下一个断点。
:::

::: tip
要调试你的中断，可以使用 [LangSmith](/tutorials/LangGraph/可观测性)。
:::

### 使用 LangSmith Studio

你可以使用 [LangSmith Studio](https://docs.langchain.com/langsmith/studio) 在 UI 中为图设置静态中断，然后运行图。你也可以使用 UI 在执行的任意时刻检查图状态。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/interrupts) 翻译并二次创作。
