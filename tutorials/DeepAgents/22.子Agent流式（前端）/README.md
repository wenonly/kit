---
title: 子 Agent 流式（前端）
categories: DeepAgents
order: 22
date: 2026-06-25
tags:
  - DeepAgents
  - 前端
  - 流式
---

# 子 Agent 流式（前端）

> 展示专家子 Agent 的流式内容、进度追踪和可折叠卡片

当协调者 Agent 派生出专家子 Agent（比如研究员、分析师、撰稿人）时，你需要把协调者的消息和每个子 Agent 的流式输出分开渲染。v1 SDK 将协调者消息保留在根流上，并将子 Agent 以发现快照（discovery snapshots）的形式暴露出来。将快照传给选择器 hook 或组合式函数（如 `useMessages(stream, subagent)`），就可以渲染该专家的作用域流。

这正是 LangChain 前端 SDK 超越扁平聊天记录的地方：子 Agent 是一等公民级别的流实体，拥有自己的状态、消息、工具调用元数据和结果。你的 UI 可以展示委派、进度、错误和最终综合结果，而不需要用户去阅读每个工作者交错输出的 token。

## 为什么使用基于选择器的子 Agent 流

根流专注于协调者对话：

- `stream.messages` 仅包含协调者的消息
- `stream.subagents` 包含带有身份、命名空间和状态的发现快照
- 每个子 Agent 的消息、工具调用和值通过选择器辅助函数读取
- UI 保持清晰：协调者的推理与专家的工作是分离的

这种分离让你可以在一个位置渲染协调者的消息，只在用户需要查看专家工作时才挂载子 Agent 卡片。

对于大型任务，这也让 UI 具备了可扩展性。用户可以浏览协调者的高层计划，只展开他们关心的专家工作，同时仍然保留完整的子 Agent 追踪记录，方便调试、审计或回放。

## 设置 `useStream`

不需要额外的流选项。将流指向你的 Deep Agent，从 `stream.messages` 渲染协调者消息，并使用 `stream.subagents` 为活跃的专家挂载卡片。在聊天布局中，按派生它们的工具调用 ID 来索引子 Agent，这样每张卡片就会出现在委派该工作的协调者回合下方。

::: tip 提示
代码示例中使用 `useStream<typeof myAgent>` 来获得类型安全的流状态。关于 [Python](https://docs.langchain.com/oss/python/langchain/frontend/overview#type-inference) 或 [JavaScript](https://docs.langchain.com/oss/javascript/langchain/frontend/overview#type-inference) 后端的类型推断，请参阅相应文档。
:::

::: code-group

```tsx [React]
import { useStream } from "@langchain/react";
import { AIMessage, HumanMessage } from "langchain";

const AGENT_URL = "http://localhost:2024";

export function DeepAgentChat() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_subagent_cards",
  });
  const subagents = [...stream.subagents.values()];
  const subagentsByCallId = new Map(subagents.map((s) => [s.id, s]));

  return (
    <div>
      {stream.messages.map((msg) => {
        const turnSubagents = AIMessage.isInstance(msg)
          ? (msg.tool_calls ?? [])
              .map((tc) => subagentsByCallId.get(tc.id ?? ""))
              .filter((s): s is NonNullable<typeof s> => !!s)
          : [];

        return (
          <div key={msg.id}>
            {HumanMessage.isInstance(msg) && <HumanBubble>{msg.text}</HumanBubble>}
            {AIMessage.isInstance(msg) && msg.text.trim() && (
              <AIBubble>{msg.text}</AIBubble>
            )}
            {turnSubagents.map((subagent) => (
              <SubagentCard key={subagent.id} stream={stream} subagent={subagent} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { computed } from "vue";
import { useStream } from "@langchain/vue";
import { AIMessage, HumanMessage } from "langchain";

const AGENT_URL = "http://localhost:2024";

const stream = useStream<typeof myAgent>({
  apiUrl: AGENT_URL,
  assistantId: "deep_agent_subagent_cards",
});

const subagentsByCallId = computed(
  () => new Map([...stream.subagents.value.values()].map((s) => [s.id, s]))
);

function subagentsForMessage(msg: unknown) {
  if (!AIMessage.isInstance(msg)) return [];
  return (msg.tool_calls ?? [])
    .map((tc) => subagentsByCallId.value.get(tc.id ?? ""))
    .filter(Boolean);
}
</script>

<template>
  <div>
    <div
      v-for="msg in stream.messages.value"
      :key="msg.id"
    >
      <HumanBubble v-if="HumanMessage.isInstance(msg)">
        {{ msg.text }}
      </HumanBubble>
      <AIBubble v-else-if="AIMessage.isInstance(msg) && msg.text.trim()">
        {{ msg.text }}
      </AIBubble>
      <SubagentCard
        v-for="subagent in subagentsForMessage(msg)"
        :key="subagent.id"
        :stream="stream"
        :subagent="subagent"
      />
    </div>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { useStream } from "@langchain/svelte";

  const AGENT_URL = "http://localhost:2024";

  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_subagent_cards",
  });
</script>

<div>
  {#each stream.messages as msg (msg.id)}
    <Message {msg} />
  {/each}
  {#each [...stream.subagents.values()] as subagent (subagent.id)}
    <SubagentCard {stream} {subagent} />
  {/each}
</div>
```

```ts [Angular]
import { Component, computed } from "@angular/core";
import { injectStream } from "@langchain/angular";

const AGENT_URL = "http://localhost:2024";

@Component({
  selector: "app-deep-agent-chat",
  template: `
    @for (msg of stream.messages(); track msg.id) {
      <app-message [message]="msg" />
    }
    @for (subagent of subagents(); track subagent.id) {
      <app-subagent-card [stream]="stream" [subagent]="subagent" />
    }
  `,
})
export class DeepAgentChatComponent {
  stream = injectStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_subagent_cards",
  });

  subagents = computed(() => [...this.stream.subagents().values()]);
}
```

:::

## 提交消息

通过根流提交消息。Deep Agent 工作流通常涉及多层嵌套子图，如果你的 Agent 会深度委派，请设置一个合适的递归限制：

```ts
stream.submit(
  { messages: [{ type: "human", content: text }] },
  { config: { recursion_limit: 100 } }
);
```

::: tip 提示
Deep Agents 默认设置了 10,000 的递归限制，对于大多数多专家设置来说已经足够。如有需要，可以通过 `config.recursion_limit` 覆盖。
:::

## SubagentDiscoverySnapshot

每个 [SubagentDiscoverySnapshot](https://reference.langchain.com/javascript/langchain-react/SubagentDiscoverySnapshot) 是线程内运行的子 Agent 的轻量级发现记录。它告诉你的 UI：某个子 Agent 存在，它在子 Agent 树中的位置，以及它处于什么生命周期状态。

快照**不包含**子 Agent 的流式消息或工具调用。你需要将快照传给选择器 hook（如 `useMessages(stream, subagent)` 或 `useToolCalls(stream, subagent)`）。这些 hook 使用快照命名空间，仅在对应的卡片或面板挂载时才订阅子 Agent 的流式数据。

## 构建 SubagentCard

每张子 Agent 卡片展示专家的名称、状态、流式内容和工具调用。使用选择器 hook 订阅子 Agent 命名空间：

```tsx
import { useState } from "react";
import { AIMessage } from "langchain";
import {
  useMessages,
  useToolCalls,
  type AnyStream,
  type SubagentDiscoverySnapshot,
} from "@langchain/react";

function SubagentCard({
  stream,
  subagent,
}: {
  stream: AnyStream;
  subagent: SubagentDiscoverySnapshot;
}) {
  const [expanded, setExpanded] = useState(true);
  const messages = useMessages(stream, subagent);
  const toolCalls = useToolCalls(stream, subagent);

  const lastAIMessage = messages
    .filter(AIMessage.isInstance)
    .at(-1);

  const displayContent =
    lastAIMessage?.text ?? subagent.output ?? "";

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={subagent.status} />
          <div>
            <h4 className="font-semibold capitalize">{subagent.name}</h4>
            <p className="text-xs text-gray-500">
              {toolCalls.length} tool call{toolCalls.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={subagent.status} />
        </div>
      </button>

      {expanded && displayContent && (
        <div className="border-t px-4 py-3">
          <div className="prose prose-sm max-w-none line-clamp-6">
            {displayContent}
            {subagent.status === "running" && (
              <span className="inline-block h-4 w-1 animate-pulse bg-blue-500" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 进度追踪

展示一个进度条和计数器，让用户知道有多少子 Agent 已经完成：

```tsx
function SubagentProgress({
  subagents,
}: {
  subagents: SubagentDiscoverySnapshot[];
}) {
  const completed = subagents.filter((s) => s.status === "complete").length;
  const total = subagents.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Subagent progress</span>
        <span>
          {completed}/{total} complete
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

## 在消息中渲染子 Agent 卡片

关键的布局模式是：从根流渲染协调者消息，并将子 Agent 卡片附加到派生它们的 AI 消息上：

```tsx
function DeepAgentLayout({ stream }: { stream: AnyStream }) {
  const subagents = [...stream.subagents.values()];
  const subagentsByCallId = new Map(subagents.map((s) => [s.id, s]));

  return (
    <div className="space-y-3">
      {stream.messages.map((message) => {
        const turnSubagents = AIMessage.isInstance(message)
          ? (message.tool_calls ?? [])
              .map((tc) => subagentsByCallId.get(tc.id ?? ""))
              .filter((s): s is SubagentDiscoverySnapshot => !!s)
          : [];

        return (
          <div key={message.id}>
            <Message message={message} />
            {turnSubagents.length > 0 && (
              <div className="ml-4 space-y-3 border-l-2 border-blue-200 pl-4">
                <SubagentProgress subagents={subagents} />
                {turnSubagents.map((subagent) => (
                  <SubagentCard key={subagent.id} stream={stream} subagent={subagent} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

你可以将内联卡片与全局子 Agent 视图结合：按派生它们的协调者工具调用索引子 Agent 来生成对话中的卡片，并使用 `stream.subagents` 构建一个持久侧边栏来汇总所有活跃工作者。这样用户既获得了局部上下文，又能鸟瞰整个运行的全貌。

## 最佳实践

- **只在需要的地方挂载选择器**。作用域内的消息和工具调用只有在卡片调用 `useMessages(stream, subagent)` 或 `useToolCalls(stream, subagent)` 时才会流式传输。
- **显示专家名称**。`subagent.name` 告诉用户哪个工作者正在活跃。
- **使用可折叠卡片**。在有 5 个以上子 Agent 的工作流中，自动折叠已完成的卡片，让用户专注于活跃的工作。
- **仅在需要时覆盖递归限制**。Deep Agents 设置了较高的默认递归限制；只有异常深度的自定义工作流才需要传入 `config.recursion_limit`。
- **按子 Agent 处理错误**。一个子 Agent 失败不应该让整个 UI 崩溃。在该子 Agent 的卡片中显示错误，同时其他子 Agent 继续运行。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/frontend/subagent-streaming) 翻译并二次创作。
