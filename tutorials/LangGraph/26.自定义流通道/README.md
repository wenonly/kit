---
title: 自定义流通道
categories: LangGraph
order: 26
date: 2026-06-25
tags:
  - LangGraph
  - Frontend
  - Streaming
---

# 自定义流通道

> 通过服务端流转换器（Stream Transformer）将自定义数据推送到命名通道，并在前端使用 `useExtension` 和 `useChannel` 读取。

LangGraph Agent 的流式输出远不止消息（messages）和工具调用（tool calls）。通过服务端的 **流转换器（stream transformer）**，你可以检查甚至改写流向客户端的协议事件，并在一个命名的 **自定义通道（custom channel）** 上发布你自己的结构化数据。前端则通过两个选择器来读取该通道的数据：[`useExtension`](https://reference.langchain.com/javascript/langchain-react/useExtension) 用于获取最新的载荷（payload），而 [`useChannel`](https://reference.langchain.com/javascript/langchain-react/useChannel) 则是原始事件的"逃生舱"，当你需要事件历史而非单值时使用。

接下来，我们通过一个客服 Agent 的实际场景来理解这套机制。这个 Agent 的转换器会在每个事件到达浏览器之前，对其中的 PII（个人身份信息，包括邮箱、电话号码、社会安全号码、信用卡号、IP 地址）进行脱敏处理，并在一个 `redaction-stats` 通道上实时发布脱敏统计。侧边栏面板会实时渲染这些统计数字。

## 自定义通道的工作原理

一个自定义通道有两端。服务端，一个 [`StreamTransformer`](https://reference.langchain.com/javascript/langchain-langgraph/index/StreamTransformer) 会打开一个命名的 [`StreamChannel`](https://reference.langchain.com/javascript/langchain-langgraph/index/StreamChannel)，并将载荷推送上去。客户端，选择器订阅匹配的 `custom:<name>` 通道，将载荷作为响应式状态暴露出来。

转换器的 `process` 方法会在每个协议事件上运行。它可以直接就地修改事件（在本例中，就是从 `messages`、`tools` 和 `values` 数据中擦除 PII），并在有内容需要汇报时推送侧通道更新。

客户端选择器（`useExtension`、`useChannel`）随 v1 前端 SDK 包一起发布（`@langchain/react`、`@langchain/vue`、`@langchain/svelte`、`@langchain/angular`）。

::: info
流转换器和 `StreamChannel` 需要 `@langchain/langgraph>=1.3.1`。
:::

下面是创建脱敏统计转换器的完整代码。它打开了一个名为 `redaction-stats` 的远程通道，并在每次脱敏时推送一条带时间戳的更新载荷：

```ts
import { StreamChannel } from "@langchain/langgraph";
import type { ProtocolEvent, StreamTransformer } from "@langchain/langgraph";

export const createRedactionStatsTransformer = (): StreamTransformer<{
  redactionStats: StreamChannel<RedactionStatsEvent>;
}> => {
  // Open a remote channel named "redaction-stats".
  const redactionStats = StreamChannel.remote<RedactionStatsEvent>("redaction-stats");
  const counts = emptyCounts();

  return {
    init: () => ({ redactionStats }),

    process(event: ProtocolEvent): boolean {
      // Redact event.params.data in place and tally what was found.
      const delta = redactInPlace(event, counts);
      if (Object.keys(delta).length > 0) {
        // Publish a payload on the channel.
        redactionStats.push({
          kind: "update",
          at: Date.now(),
          delta,
          counts: { ...counts },
          total: totalRedactions(counts),
        });
      }
      return true; // Keep the (now-redacted) event in the stream.
    },
  };
};
```

> 关键点：`process` 返回 `true` 表示"保留这个事件继续流式传输"。转换器的作用是**透明地增强**流，而不是拦截它。即便你已经脱敏了内容，消息和工具调用仍然会正常到达前端。

创建好转换器后，在构建 Agent 时将其附加进去即可：

```ts
import { createAgent } from "langchain";

const agent = createAgent({
  model: "anthropic:claude-haiku-4-5",
  tools: [...],
  streamTransformers: [createRedactionStatsTransformer],
});
```

转换器推送的载荷类型由你自行定义。下面的客户端示例读取的就是这个数据结构：

```ts
type PiiType = "email" | "phone" | "ssn" | "credit_card" | "ip_address";

type RedactionStatsEvent = {
  kind: "update";
  at: number;
  delta: Partial<Record<PiiType, number>>;
  counts: Record<PiiType, number>;
  total: number;
};
```

## 配置 `useStream`

像往常一样配置 [`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream)。自定义通道选择器接收的就是这里返回的 `stream` 句柄。

::: info
下面的代码示例使用 `useStream<typeof myAgent>` 来获得类型安全的流状态。关于后端类型推断，请参阅 [Python](/tutorials/LangChain/前端集成) 或 [JavaScript](/tutorials/LangChain/前端集成) 的类型推断说明。
:::

::: code-group

```tsx [React]
import { useStream } from "@langchain/react";

const AGENT_URL = "http://localhost:2024";

export function RedactionChat() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "custom_stream_channel",
  });

  return <RedactionStatsPanel stream={stream} />;
}
```

```vue [Vue]
<script setup lang="ts">
import { useStream } from "@langchain/vue";

const AGENT_URL = "http://localhost:2024";

const stream = useStream<typeof myAgent>({
  apiUrl: AGENT_URL,
  assistantId: "custom_stream_channel",
});
</script>

<template>
  <RedactionStatsPanel :stream="stream" />
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { useStream } from "@langchain/svelte";

  const AGENT_URL = "http://localhost:2024";

  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "custom_stream_channel",
  });
</script>

<RedactionStatsPanel {stream} />
```

```ts [Angular]
import { Component } from "@angular/core";
import { injectStream } from "@langchain/angular";

const AGENT_URL = "http://localhost:2024";

@Component({
  selector: "app-redaction-chat",
  template: `<app-redaction-stats-panel [stream]="stream" />`,
})
export class RedactionChatComponent {
  stream = injectStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "custom_stream_channel",
  });
}
```

:::

## 使用 `useExtension` 读取最新载荷

`useExtension` 订阅一个 `custom:<name>` 通道，返回转换器推送的最新载荷——已经解包并且有类型。当 UI 只需要当前值时（比如实时计数器、进度百分比、状态徽章），它是最符合人体工程学的选择。

传入通道名称时，使用不带前缀的裸名称（`"redaction-stats"`），而不是 `custom:` 前缀的形式：

::: code-group

```tsx [React]
import { useExtension } from "@langchain/react";

const latest = useExtension<RedactionStatsEvent>(stream, "redaction-stats");
// latest?.total, latest?.counts.email, latest?.delta
```

```vue [Vue]
import { useExtension } from "@langchain/vue";

const latest = useExtension<RedactionStatsEvent>(stream, "redaction-stats");
// latest.value?.total
```

```svelte [Svelte]
import { useExtension } from "@langchain/svelte";

const latest = useExtension<RedactionStatsEvent>(stream, "redaction-stats");
// latest?.total
```

```ts [Angular]
import { injectExtension } from "@langchain/angular";

const latest = injectExtension<RedactionStatsEvent>(stream, "redaction-stats");
// latest()?.total
```

:::

返回值的形式遵循各框架的响应式模型：在 React 和 Svelte 中是普通值，在 Vue 中是 `Ref`（用 `latest.value` 访问），在 Angular 中是 Signal（用 `latest()` 调用）。在第一条载荷到达之前，值为 `undefined`。

此外，可选的第三个参数 `target` 可以将订阅范围限定在某个命名空间内——这与 `useMessages(stream, node)` 将消息范围限定在某个图节点的方式相同。详见 [图执行（前端）](/tutorials/LangGraph/图执行（前端）) 中的命名空间定位。

## 使用 `useChannel` 缓冲原始事件

`useChannel` 是原始事件的逃生舱。它订阅一个或多个通道，返回底层协议事件的有界缓冲区（bounded buffer），而非单个解包值。当你需要事件历史而非最新值时（例如事件日志或审计跟踪），或者需要读取高层选择器未覆盖的通道时，就该用它了。

传入时使用完整的通道 ID（`"custom:redaction-stats"`）：

::: code-group

```tsx [React]
import { useChannel } from "@langchain/react";

const rawEvents = useChannel(stream, ["custom:redaction-stats"]);
```

```vue [Vue]
import { useChannel } from "@langchain/vue";

const rawEvents = useChannel(stream, ["custom:redaction-stats"]);
// rawEvents.value
```

```svelte [Svelte]
import { useChannel } from "@langchain/svelte";

const rawEvents = useChannel(stream, ["custom:redaction-stats"]);
```

```ts [Angular]
import { injectChannel } from "@langchain/angular";

const rawEvents = injectChannel(stream, ["custom:redaction-stats"]);
// rawEvents()
```

:::

每个条目都是一个原始协议事件，因此载荷位于 `event.params.data` 之下。你需要自行解包：

```ts
function parseRedactionStatsEvents(rawEvents: Event[]): RedactionStatsEvent[] {
  const out: RedactionStatsEvent[] = [];
  for (const event of rawEvents) {
    const data = event.params?.data;
    const payload = data?.payload ?? data;
    if (payload?.kind === "update") out.push(payload);
  }
  return out;
}
```

通过 options 参数控制缓冲行为：

```ts
const rawEvents = useChannel(
  stream,
  ["custom:redaction-stats"],
  undefined, // target namespace
  { bufferSize: 200, replay: true },
);
```

| 选项          | 默认值      | 效果                                                                   |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| `bufferSize`  | `"default"` | 缓冲事件的最大数量。达到上限后，最早的事件会被丢弃。                    |
| `replay`      | `true`      | 选择器挂载时重放通道上已经看过的事件，而不是只接收实时事件。              |

::: info
对于常见场景，优先使用高层选择器（`useExtension`、`useMessages`、`useToolCalls`、`useValues`）。它们返回类型化的、已解包的值，并且只追踪你实际渲染的内容。当你确实需要原始事件流时，才使用 `useChannel`。
:::

## 如何在 `useExtension` 和 `useChannel` 之间选择

两者读取的是同一个自定义通道，但返回内容不同：

|                  | `useExtension`                          | `useChannel`                                                |
| ---------------- | --------------------------------------- | ----------------------------------------------------------- |
| **返回值**        | 最新载荷（`T \| undefined`）             | 原始事件的有界缓冲（`Event[]`）                              |
| **数据形态**      | 已解包、类型化的载荷                     | 原始协议事件；需自行解包 `event.params.data`                  |
| **订阅方式**      | 通道名称（`"redaction-stats"`）          | 完整通道 ID（`["custom:redaction-stats"]`）                  |
| **适用场景**      | 需要当前值                               | 需要历史记录、事件日志或多个通道                              |
| **选项**          | —                                       | `bufferSize`、`replay`                                       |

> 小技巧：一个常见的模式是在同一个通道上同时使用两者——`useExtension` 驱动一个实时摘要面板（当前总计），`useChannel` 则支撑一个滚动的事件日志（记录整个会话期间的每次更新）。

## 适用场景

自定义通道适合任何无法整洁映射到消息、工具调用或图状态的服务端信号：

- **合规与脱敏统计**：被擦除的 PII 数量、被拦截的内容、策略命中等，如上文示例所示。
- **进度报告**：长时间运行的工具发射的完成百分比或步骤标签。
- **实时指标**：运行过程中累积的 token 使用量、延迟或成本。
- **来源与引用**：随着 Agent 为答案补充依据，将被检索到的文档推送到侧面板。
- **领域事件**：后端希望呈现的任何结构化更新，而无需修改消息记录本身。

> 核心思路：如果你的数据"不是一条消息"，但又需要在 UI 上展示，自定义通道就是正确的抽象层。它让你在不污染对话历史的前提下，把后端信号干净地映射到前端的独立视图。

## 相关阅读

- [前端概览](/tutorials/LangGraph/前端概览) — LangGraph 前端流 API 和整体架构。
- [图执行（前端）](/tutorials/LangGraph/图执行（前端）) — 用于多节点流水线的命名空间范围选择器。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/frontend/custom-stream-channels) 翻译并二次创作。
