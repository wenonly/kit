---
title: Todo 列表（前端）
categories: DeepAgents
order: 21
date: 2026-06-25
tags:
  - DeepAgents
  - 前端
  - Todo
---

# Todo 列表（前端）

> 从 Agent 状态同步的实时 Todo 列表，追踪 Agent 的执行进度

并非所有的 Agent 交互都是聊天对话。有时候 Agent 正在执行一个多步骤计划，这时候展示进度的最佳方式就是一个**实时更新的 Todo 列表**。Deep Agent 的 Todo 列表模式会直接从 Agent 状态中读取 `todos` 数组，在 Agent 执行计划的过程中，将每个条目及其当前状态渲染出来。它本质上是一个基于你聊天所用的 `useStream` hook 构建的进度仪表盘。它告诉我们：Agent 状态可以驱动任何 UI，而不仅仅是消息气泡。

## 工作原理

Deep Agent 内置了一个 **`todos` 状态**，用于在 Agent 执行计划时追踪任务进度。随着 Agent 的执行，它会将每个 Todo 的状态从 `"pending"` 更新为 `"in_progress"`，最终变为 `"completed"`。[`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream) hook 通过 `stream.values.todos` 暴露这个状态，你的 UI 就可以响应式地渲染它。

整个流程是这样的：

1. 用户提交请求
2. Agent 创建计划，并在其状态中填充 `todos`
3. Agent 开始执行每个 Todo，状态依次经历 `pending` → `in_progress` → `completed`
4. `stream.values.todos` 随 Agent 进度实时更新
5. 你的 UI 根据当前状态重新渲染 Todo 列表

## 设置 `useStream`

不需要任何特殊配置。将 [`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream) 指向你的 Agent，然后从 `stream.values` 中读取 `todos` 即可。

::: tip 提示
代码示例中使用 `useStream<typeof myAgent>` 来获得类型安全的流状态。关于 [Python](https://docs.langchain.com/oss/python/langchain/frontend/overview#type-inference) 或 [JavaScript](https://docs.langchain.com/oss/javascript/langchain/frontend/overview#type-inference) 后端的类型推断，请参阅相应文档。
:::

::: code-group

```tsx [React]
import { useStream } from "@langchain/react";

const AGENT_URL = "http://localhost:2024";

export function TodoAgent() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  const todos = stream.values?.todos ?? [];

  return (
    <div>
      <TodoList todos={todos} />
      {stream.messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { useStream } from "@langchain/vue";
import { computed } from "vue";

const AGENT_URL = "http://localhost:2024";

const stream = useStream<typeof myAgent>({
  apiUrl: AGENT_URL,
  assistantId: "deep_agent_todo_list",
});

const todos = computed(() => stream.values.value?.todos ?? []);
</script>

<template>
  <div>
    <TodoList :todos="todos" />
    <Message
      v-for="msg in stream.messages.value"
      :key="msg.id"
      :message="msg"
    />
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { useStream } from "@langchain/svelte";

  const AGENT_URL = "http://localhost:2024";

  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  const todos = $derived(stream.values?.todos ?? []);
</script>

<div>
  <TodoList {todos} />
  {#each stream.messages as msg (msg.id)}
    <Message message={msg} />
  {/each}
</div>
```

```ts [Angular]
import { Component, computed } from "@angular/core";
import { injectStream } from "@langchain/angular";

const AGENT_URL = "http://localhost:2024";

@Component({
  selector: "app-todo-agent",
  template: `
    <div>
      <app-todo-list [todos]="todos()" />
      @for (msg of stream.messages(); track msg.id) {
        <app-message [message]="msg" />
      }
    </div>
  `,
})
export class TodoAgentComponent {
  stream = injectStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  todos = computed(() => this.stream.values()?.todos ?? []);
}
```

:::

## 构建 TodoList 组件

Todo 列表会渲染每个条目，包括状态图标、颜色编码和反映当前状态的可视化样式：

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const completed = todos.filter((t) => t.status === "completed").length;
  const percentage = todos.length
    ? Math.round((completed / todos.length) * 100)
    : 0;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent Progress</h2>
        <span className="text-sm text-gray-500">
          {completed}/{todos.length} tasks
        </span>
      </div>

      <ProgressBar percentage={percentage} />

      <ul className="mt-4 space-y-2">
        {todos.map((todo, i) => (
          <TodoItem key={i} todo={todo} />
        ))}
      </ul>
    </div>
  );
}
```

## 进度条

可视化的进度条可以让用户一眼看到整体完成情况：

```tsx
function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Progress</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

## 单个 Todo 条目

每个条目都有一个状态图标、颜色编码的文字，以及已完成任务的删除线样式：

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const config = {
    pending: {
      icon: "○",
      textClass: "text-gray-600",
      bgClass: "bg-gray-50",
      iconClass: "text-gray-400",
    },
    in_progress: {
      icon: "◉",
      textClass: "text-amber-800",
      bgClass: "bg-amber-50 border-amber-200",
      iconClass: "text-amber-500 animate-pulse",
    },
    completed: {
      icon: "✓",
      textClass: "text-green-800 line-through",
      bgClass: "bg-green-50 border-green-200",
      iconClass: "text-green-500",
    },
  };

  const style = config[todo.status];

  return (
    <li
      className={`flex items-start gap-3 rounded-md border px-3 py-2 ${style.bgClass}`}
    >
      <span className={`mt-0.5 text-lg leading-none ${style.iconClass}`}>
        {style.icon}
      </span>
      <span className={`text-sm ${style.textClass}`}>{todo.content}</span>
    </li>
  );
}
```

`in_progress` 图标使用 `animate-pulse` 来吸引注意力到当前正在执行的任务上。

## 计算进度

直接从 todos 数组中派生进度指标：

```ts
const todos = stream.values?.todos ?? [];

const completed = todos.filter((t) => t.status === "completed").length;
const inProgress = todos.filter((t) => t.status === "in_progress").length;
const pending = todos.filter((t) => t.status === "pending").length;
const percentage = todos.length
  ? Math.round((completed / todos.length) * 100)
  : 0;
```

这些值会随着 Agent 修改其状态而响应式更新，保持进度条和计数器同步。

## 与聊天消息结合

Todo 列表可以与常规聊天界面协同工作。一种实用的布局是将 Todo 列表作为持久侧边栏或顶部面板，下方放置聊天消息：

```tsx
function TodoAgentLayout() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "deep_agent_todo_list",
  });

  const todos = stream.values?.todos ?? [];

  return (
    <div className="flex h-screen flex-col">
      {todos.length > 0 && (
        <div className="border-b bg-gray-50 p-4">
          <TodoList todos={todos} />
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {stream.messages.map((msg) => (
            <Message key={msg.id} message={msg} />
          ))}
        </div>
      </main>

      <ChatInput
        onSubmit={(text) =>
          stream.submit({ messages: [{ type: "human", content: text }] })
        }
        isLoading={stream.isLoading}
      />
    </div>
  );
}
```

::: tip 提示
只在 `todos.length > 0` 时显示 Todo 列表。在 Agent 创建计划之前，没有内容可展示，显示一个空组件只会浪费空间。
:::

## 使用场景

Todo 列表模式适用于任何 Agent 执行结构化计划的场景：

- **项目规划**：Agent 将项目拆分为任务并逐一完成
- **研究工作流**：每个研究问题都成为一个 Todo，Agent 负责调查和完成
- **数据处理**：摄取、验证、转换、导出等步骤各有对应的 Todo
- **引导流程**：Agent 逐步完成设置，每配置好一项服务就勾选一项
- **报告生成**：报告的各章节成为 Todo：收集数据、分析趋势、撰写摘要、格式化输出

## 处理空状态和加载状态

在 Agent 尚未创建计划之前，需要处理初始状态：

```tsx
function TodoList({ todos, isLoading }: { todos: Todo[]; isLoading: boolean }) {
  if (todos.length === 0 && !isLoading) {
    return null;
  }

  if (todos.length === 0 && isLoading) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="animate-spin">⟳</span>
          Agent is creating a plan...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      {/* ... full todo list rendering */}
    </div>
  );
}
```

## 最佳实践

- **醒目地展示 Todo 列表**。它是基于计划的 Agent 的主要进度指示器，不要把它藏在页面底部。
- **为状态切换添加动画**。流畅的过渡让 Agent 感觉更灵敏。在背景色、文字装饰和透明度上使用 CSS 过渡效果。
- **只高亮一个 `in_progress` 条目**。Agent 通常一次只处理一个任务。如果多个条目同时显示为 `in_progress`，界面会变得嘈杂。建议只对第一个进行脉冲动画。
- **折叠或淡化已完成的条目**。随着列表增长，已完成的条目变得不那么重要。降低它们的视觉权重，让用户专注于正在进行的工作。
- **显示进度百分比**。像"已完成 67%"这样一个数字，即使隔着老远也能立刻理解。
- **保持 Todo 列表同步**。由于 `stream.values` 是响应式更新的，Todo 列表会自动保持最新，不需要添加手动轮询或刷新逻辑。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/frontend/todo-list) 翻译并二次创作。
