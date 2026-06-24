---
title: 图执行（前端）
categories: LangGraph
order: 25
date: 2026-06-25
tags:
  - LangGraph
  - Frontend
---

# 图执行（前端）

> 通过逐节点状态和流式内容，可视化多步骤图管道。

LangGraph Agent 并不是黑盒。每张图都由**命名节点（named nodes）**组成，这些节点按顺序或并行执行：分类、研究、分析、综合。图执行卡片（Graph Execution Cards）模式让这条管道变得可见——为每个节点渲染一张卡片，展示其状态、实时流式输出内容，并追踪整个工作流的完成进度。用户可以清楚地看到 Agent 正在做什么、进行到了哪一步、以及每一步产出了什么结果。

这种模式对于生产级 Agent 尤为有用，因为它把图结构转化成了产品级的用户体验。你不需要把整个运行过程当作一条单一的助手回复来处理，而是可以暴露出 LangGraph 内部使用的检查点、节点名称、状态键和流元数据。

## 图节点如何映射到 UI 卡片

LangGraph 的图定义了一系列节点，每个节点负责一项具体任务。例如，一个研究管道可能包含：

1. **Classify（分类）**：对用户查询进行归类
2. **Research（研究）**：收集相关信息
3. **Analyze（分析）**：从研究结果中得出结论
4. **Synthesize（综合）**：生成最终的、打磨过的回复

每个节点将其输出写入图中状态（state）的特定键。在前端，你不需要把这个映射关系硬编码——[`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream) 会通过 `stream.subgraphs` 自动发现运行中的每个节点，并为每个观测到的步骤暴露一个 [`SubgraphDiscoverySnapshot`](https://reference.langchain.com/javascript/langchain-react/SubgraphDiscoverySnapshot)：

```ts
// 节点会被自动发现——无需硬编码列表
const graphNodes = [...stream.subgraphs.values()];

// 每个快照都携带节点名称和当前状态
graphNodes.forEach((node) => {
  console.log(node.nodeName, node.status); // "classify", "running"
});
```

你可以用 `node.nodeName` 作为进度条标签和卡片标题，然后把每个快照传给 `useMessages(stream, node)` 来渲染该节点范围内的流式内容——无需把 UI 和图状态键名耦合在一起。

这个映射关系就成了你的图和 UI 之间的契约。后端作者可以有意识地添加、重命名或重新排序节点，而前端作者则决定每个状态键应该如何被可视化：状态徽章、Markdown 面板、表格、图表、追踪视图或审批卡片。

## 设置 `useStream`

像往常一样接入 [`useStream`](https://reference.langchain.com/javascript/langchain-react/index/useStream)。你会用到的关键属性是 `messages`（用于对话）和 `subgraphs`（用于当前运行中发现的图节点）。将每个发现的子图快照传递给一个选择器（selector），就能读取该节点范围内的消息。

::: info 说明
代码示例使用 `useStream<typeof myAgent>` 来获得类型安全的流状态。关于后端类型推断，请参阅 [前端概览](/tutorials/LangGraph/前端概览) 中的类型推断章节。
:::

::: code-group

```tsx [React]
import { useStream } from "@langchain/react";

const AGENT_URL = "http://localhost:2024";

export function PipelineChat() {
  const stream = useStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "graph_execution_cards",
  });
  const graphNodes = [...stream.subgraphs.values()];

  return (
    <div>
      <PipelineProgress nodes={graphNodes} isLoading={stream.isLoading} />
      <NodeCardList nodes={graphNodes} stream={stream} isLoading={stream.isLoading} />
    </div>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { useStream } from "@langchain/vue";

const AGENT_URL = "http://localhost:2024";

const stream = useStream<typeof myAgent>({
  apiUrl: AGENT_URL,
  assistantId: "graph_execution_cards",
});
</script>

<template>
  <div>
    <PipelineProgress
      :nodes="[...stream.subgraphs.value.values()]"
      :is-loading="stream.isLoading.value"
    />
    <NodeCardList
      :nodes="[...stream.subgraphs.value.values()]"
      :stream="stream"
      :is-loading="stream.isLoading.value"
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
    assistantId: "graph_execution_cards",
  });
</script>

<div>
  <PipelineProgress nodes={[...stream.subgraphs.values()]} isLoading={stream.isLoading} />
  <NodeCardList
    nodes={[...stream.subgraphs.values()]}
    {stream}
    isLoading={stream.isLoading}
  />
</div>
```

```ts [Angular]
import { Component, computed } from "@angular/core";
import { injectStream } from "@langchain/angular";

const AGENT_URL = "http://localhost:2024";

@Component({
  selector: "app-pipeline-chat",
  template: `
    <div>
      <app-pipeline-progress
        [nodes]="graphNodes()"
        [isLoading]="stream.isLoading()"
      />
      <app-node-card-list
        [nodes]="graphNodes()"
        [stream]="stream"
        [isLoading]="stream.isLoading()"
      />
    </div>
  `,
})
export class PipelineChatComponent {
  stream = injectStream<typeof myAgent>({
    apiUrl: AGENT_URL,
    assistantId: "graph_execution_cards",
  });

  graphNodes = computed(() => [...this.stream.subgraphs().values()]);
}
```

:::

## 将流式 token 路由到节点

随着图的流式输出，每个发现的子图快照都会标识出它属于哪个节点。将该快照传给一个选择器 hook 或 composable，就能读取该节点范围内的消息：

```tsx
import { AIMessage } from "langchain";
import { useMessages, type AnyStream, type SubgraphDiscoverySnapshot } from "@langchain/react";

function NodeCard({
  node,
  stream,
}: {
  node: SubgraphDiscoverySnapshot;
  stream: AnyStream;
}) {
  const messages = useMessages(stream, node);
  const lastAIMessage = messages.find(AIMessage.isInstance);
  const streamingContent = lastAIMessage?.text ?? "";

  return <NodeCardBody node={node} content={streamingContent} />;
}
```

第一个挂载的选择器会为该节点命名空间打开一个范围化的订阅。当节点卡片卸载时，订阅会自动释放。

## 确定节点状态

每个发现的节点都携带其当前状态。直接使用 `node.status` 即可——发现快照会报告 `"pending"`（待处理）、`"running"`（运行中）、`"complete"`（已完成）或 `"error"`（出错）：

```ts
type NodeStatus = SubgraphDiscoverySnapshot["status"];

const status: NodeStatus = node.status;
```

## 构建管道进度条

顶部的水平进度条为用户提供了整个管道的鸟瞰视图。每个步骤是一个带标签的段落，随着节点完成而填充：

```tsx
function PipelineProgress({
  nodes,
  isLoading,
}: {
  nodes: SubgraphDiscoverySnapshot[];
  isLoading: boolean;
}) {
  const firstIncompleteIdx = nodes.findIndex((node) => node.status !== "complete");

  return (
    <div className="flex items-center gap-1">
      {nodes.map((node, i) => {
        const isRunning =
          isLoading && node.status !== "complete" && firstIncompleteIdx === i;
        const colors = {
          pending: "bg-gray-200 text-gray-500",
          running: "bg-blue-400 text-white animate-pulse",
          complete: "bg-green-500 text-white",
          error: "bg-red-500 text-white",
        };
        const status = isRunning ? "running" : node.status;

        return (
          <div key={node.id} className="flex items-center">
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status]}`}
            >
              {node.nodeName}
            </div>
            {i < nodes.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-6 ${
                  status === "complete" ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

> 这里我们用 `firstIncompleteIdx` 来推断"当前正在运行的节点"。它的逻辑是：找到第一个状态不是 `complete` 的节点，如果整体处于 `isLoading` 状态，就把它标记为 `running`。这样即使后端还没有推送该节点的 `running` 状态，UI 也能提前给出视觉反馈。

## 构建可折叠的 NodeCard 组件

每个节点都有自己的卡片，展示状态徽章、内容（流式或最终）以及用于长输出的可折叠主体：

```tsx
function NodeCard({
  node,
  stream,
}: {
  node: SubgraphDiscoverySnapshot;
  stream: AnyStream;
}) {
  const [open, setOpen] = useState(node.status === "running");
  const messages = useMessages(stream, node);
  const lastAIMessage = messages.find(AIMessage.isInstance);

  useEffect(() => {
    if (node.status === "running") setOpen(true);
    if (node.status === "complete") setOpen(false);
  }, [node.status]);

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{node.nodeName}</h3>
          <StatusBadge status={node.status} />
        </div>
        <span className={open ? "rotate-90" : ""}>▶</span>
      </button>

      {open && (
        <div className="border-t px-4 py-3">
          <div className="prose prose-sm max-w-none">
            {lastAIMessage?.text?.trim()
              ? <Markdown>{lastAIMessage.text}</Markdown>
              : <p className="italic text-gray-500">Processing...</p>}
          </div>
        </div>
      )}
    </div>
  );
}
```

> 注意 `useEffect` 中的自动折叠逻辑：当节点变为 `running` 时自动展开，变为 `complete` 时自动折叠。这样用户在长管道中始终能看到当前活跃的步骤，而已完成的步骤不会占据太多屏幕空间。

## 流式内容 vs 已完成内容

节点卡片通过范围化消息同时读取流式和最终内容。这避免了假设图节点名称与其写入的状态键一致（例如，在示例图中，`do_research` 节点写入的是 `research` 键）：

| 来源                        | 使用场景                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `useMessages(stream, node)` | 渲染节点范围内的流式和最终消息                                                              |
| `stream.values`             | 读取整图状态，例如最终的 `synthesis` 字段，使用实际的状态键名                              |

核心模式是：在节点卡片中展示最新的范围化 AI 消息，仅在需要图状态字段时才使用 `stream.values`。

因为范围化消息与产生它的节点绑定，UI 可以支持并行图路径而无需从消息顺序中猜测。每张卡片从属于其节点的流事件中更新，已完成的值仍然可以通过 `stream.values` 获取。

```ts
function NodeContent({ stream, node }: { stream: AnyStream; node: SubgraphDiscoverySnapshot }) {
  const messages = useMessages(stream, node);
  const content = messages.find(AIMessage.isInstance)?.text ?? "";

  return <Markdown>{content}</Markdown>;
}
```

::: tip 提示
流式内容可能包含部分 token 或尚未完全成形的 Markdown。如果你渲染 Markdown，请确保你的渲染器能优雅地处理不完整的语法（例如未闭合的加粗标记 `**`）。
:::

## 组合在一起

下面是完整的卡片列表，整合了路由、状态检测和卡片渲染：

```tsx
function NodeCardList({
  nodes,
  stream,
  isLoading,
}: {
  nodes: SubgraphDiscoverySnapshot[];
  stream: AnyStream;
  isLoading: boolean;
}) {
  const firstIncompleteIdx = nodes.findIndex((node) => node.status !== "complete");

  return (
    <div className="space-y-3">
      {nodes.map((node, i) => {
        const isComplete = node.status === "complete";
        const isRunning = isLoading && !isComplete && firstIncompleteIdx === i;
        if (!isComplete && !isRunning) return null;

        return <NodeCard key={node.id} node={node} stream={stream} />;
      })}
    </div>
  );
}
```

> 这里的 `if (!isComplete && !isRunning) return null;` 是一个关键的过滤逻辑：只显示已完成和正在运行的节点卡片。对于尚未开始的节点（`pending` 状态），不渲染卡片，避免用户看到一堆空白占位符。

## 使用场景

图执行卡片适用于任何需要可见性的多步骤管道：

- **研究管道**：分类 → 收集来源 → 分析 → 综合报告
- **内容生成**：大纲 → 草稿 → 事实核查 → 编辑 → 发布
- **数据处理**：采集 → 验证 → 转换 → 聚合 → 导出
- **代码生成**：理解需求 → 规划架构 → 编写代码 → 审查 → 测试
- **决策工作流**：收集上下文 → 评估选项 → 评分备选方案 → 推荐

## 处理动态管道

并非所有图都有一组固定的节点。有些管道会根据输入添加或跳过节点。发现映射表只包含当前线程（thread）中观测到的节点：

```ts
const activeNodes = [...stream.subgraphs.values()];
```

这确保了你的 UI 只显示与当前执行相关的节点的卡片，避免了空白占位卡片。

::: info 说明
如果你的图有条件分支（例如，对于简单的事实查询跳过"Research"步骤），被跳过的节点不会出现在 `stream.subgraphs` 中。你的管道进度条可以只渲染已发现的节点，或者将没有匹配快照的预期节点显示为灰色。
:::

## 最佳实践

- **从流中发现节点**。基于 `stream.subgraphs` 渲染卡片，而不是硬编码预期节点；条件性或被跳过的步骤在运行之前不会出现。
- **将状态键视为 UI 契约**。决定哪些图输出应该足够稳定以供前端渲染，并在图定义旁边记录这些键。
- **使用范围化消息渲染节点卡片**。它们在节点流式输出和完成后都能工作，且不会把 UI 卡片与状态键名耦合。
- **自动折叠已完成的节点**。在长管道中，自动折叠已完成的卡片，让用户可以专注于当前活跃的步骤。
- **展示预估时间**。如果你有每个节点耗时的历史数据，展示时间预估可以设定用户预期。
- **添加全局进度指示器**。用整体进度条（例如"第 2 步，共 4 步"）补充逐节点卡片，放在管道视图的顶部。
- **逐节点处理错误**。如果某个节点失败，在其卡片中展示错误，而不是折叠整个管道。其他节点可能仍然可以成功完成。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/frontend/graph-execution) 翻译并二次创作。
