---
title: 解释器
categories: DeepAgents
order: 8
date: 2026-06-25
tags:
  - DeepAgents
  - 解释器
---

# 解释器

> 在 Deep Agents 中运行轻量级代码，用于组合工具、编排子 Agent 和转换结构化数据

解释器为 Agent 提供了一个可编程的工作空间，让它们可以在其中探索数据、协调工具调用，并将中间工作保留在模型上下文之外。Agent 通过编写代码来表达意图，然后一个**内存中**的运行时执行这些代码并返回相关结果。

[沙箱](/tutorials/DeepAgents/沙箱)是一种以代码优先的方式来操作环境（如运行命令、安装依赖和编辑文件），而解释器则是一种以代码优先的方式来在 Agent 循环内部工作：组合工具、保持状态，以及决定哪些信息应该返回给模型。

::: warning
解释器目前处于 [**beta**](https://docs.langchain.com/oss/javascript/versioning) 阶段。API 和生命周期行为可能会在版本之间发生变化。
:::

## 为什么要使用解释器？

大多数 Agent 工作在模型推理和工具调用之间交替进行。模型可以在一个轮次中发起多个工具调用，但那一批调用在发出时就固定了。如果没有另一个模型轮次，就无法循环、根据结果分支、重试失败或将一个调用的输出传递给下一个调用，而且每个结果都会返回到模型的上下文中。模型还要决定发起多少次调用，因此让它跨数百个项目分派工作是不可靠的，它往往只覆盖一部分而非全部。

解释器为 Agent 提供了一个运行时来完成这些工作。循环在每次迭代中运行，工具从代码中被调用，中间值保留在变量中，只有紧凑的结果返回给模型。

- [**程序化工具调用（PTC）**](#程序化工具调用-ptc) — 从解释器代码中调用选定的工具，包括循环、重试、分支和并行批处理。
- [**程序化子 Agent**](#程序化子-agent) — 从代码中分派子 Agent，用于大规模输入的扇出、验证和递归工作流。
- [**有状态工作**](#解释器的工作原理) — 在运行时状态中保留中间值，而不会使模型上下文过载。
- [**确定性转换**](#解释器的工作原理) — 用代码对结构化数据进行排序、分组、解析、验证、评分、聚合和探索。

## 选择模式

在 Agent 循环内部使用解释器来编写代码：组合工具、保持状态以及控制返回给模型的内容。对环境使用[沙箱](/tutorials/DeepAgents/沙箱)来编写代码：shell 命令、包安装、测试、文件系统编辑和操作系统级执行。

| 需求 | 使用 |
| --- | --- |
| 一两个简单的外部调用 | 普通工具调用 |
| 循环、分支、重试或聚合结果的小程序 | 解释器 |
| 需要从代码中运行的多个选定工具调用 | 带有[程序化工具调用（PTC）](#程序化工具调用-ptc)的解释器 |
| 许多独立工作单元、多视角或对大规模输入的递归分析 | 带有[程序化子 Agent](#程序化子-agent)的解释器 |
| Shell 命令、包安装、测试或完整的操作系统文件系统访问 | [沙箱](/tutorials/DeepAgents/沙箱) |

## 快速开始

安装 QuickJS 中间件包，然后在 `create_deep_agent` 上通过 `middleware` 参数传递解释器中间件。

::: code-group

```bash [npm]
npm install deepagents @langchain/quickjs
```

```bash [pnpm]
pnpm add deepagents @langchain/quickjs
```

```bash [yarn]
yarn add deepagents @langchain/quickjs
```

:::

```typescript
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "openai:gpt-5.5",
  middleware: [createCodeInterpreterMiddleware()],
});
```

## 解释器的工作原理

中间件为 Agent 添加了一个 `eval` 工具。当有需要时，Agent 会编写 JavaScript 并调用 `eval`；你不需要直接调用解释器。该工具在持久化上下文中运行代码，捕获 `console.log`，并返回最后一个表达式的结果。

Agent 可以编写如下代码：

```javascript
const rows = [
  { team: "alpha", score: 8 },
  { team: "beta", score: 13 },
  { team: "alpha", score: 21 },
];

const totals = rows.reduce((acc, row) => {
  acc[row.team] = (acc[row.team] ?? 0) + row.score;
  console.log(`${row.team} score: ${acc[row.team]}`)
  return acc;
}, {});

totals;
```

代码运行在 [**QuickJS**](https://github.com/quickjs-ng/quickjs) 上，这是一个轻量级的 JavaScript 运行时。默认情况下，解释器代码无法访问宿主文件系统、网络、shell、包管理器或时钟。它只能进行计算、持有状态和写入 `console.log`，仅此而已。

两个显式桥梁扩展了这种能力：

- **工具**，通过[程序化工具调用（PTC）](#程序化工具调用-ptc)。将一个工具白名单作为异步函数暴露在 `tools` 命名空间下。这些可以是 Agent 自己的工具，也可以是你定义并传入的独立工具。
- **子 Agent**，通过[程序化子 Agent](#程序化子-agent)。从代码中分派已配置的子 Agent，并用纯 JavaScript 进行编排。

程序化工具调用在你[启用它](#启用-ptc)之前是关闭的。当 Agent 拥有子 Agent 时，子 Agent 分派默认开启，你可以关闭它。除非你显式暴露，否则没有其他东西能跨越 QuickJS 边界。

## 程序化工具调用（PTC）

程序化工具调用（PTC）将选定的 Agent 工具暴露在解释器中的全局 `tools` 命名空间下。Agent 不需要请求模型发起一个工具调用、等待结果、然后决定下一步调用，而是可以编写代码，在循环、分支、重试或并行批处理中调用工具。

当中间结果只是下一步的输入时，这非常有用：解释器在返回给模型之前会过滤或聚合它们，使多步骤工作流在 token 使用上更高效。它是模型无关的，由中间件而非特定于提供商的工具调用 API 实现。

中间件将每个白名单工具暴露为 `tools` 下的异步函数。Agent 使用 `await` 调用它，在代码中处理结果，模型只看到最终的解释器输出，而不是每个中间值。工具名称被转换为驼峰命名法，而输入对象仍然遵循工具的 schema，因此名为 `web_search` 的工具变为 `tools.webSearch(...)`：

```typescript
const result: string = await tools.webSearch({
  query: "deepagents interpreters",
});
```

### 启用 PTC

通过显式白名单启用 PTC：

```typescript
import { createDeepAgent } from "deepagents";
import { createCodeInterpreterMiddleware } from "@langchain/quickjs";

const agent = createDeepAgent({
  model: "openai:gpt-5.5",
  middleware: [createCodeInterpreterMiddleware({ ptc: ["web_search"] })],
});
```

PTC 启用后，Agent 可以从解释器代码中调用白名单工具。以下示例并行搜索多个主题，并在返回给模型之前合并结果：

```javascript
const topics = ["retrieval", "memory", "evaluation"];

const results = await Promise.all(
  topics.map((topic) =>
    tools.webSearch({ query: `${topic} best practices 2025` }),
  ),
);

results.join("\n\n");
```

::: warning
PTC 调用目前通过解释器桥接执行，不经过普通工具调用路径。因此，`interruptOn` 审批工作流不会对每个 PTC 调用的工具强制执行。
:::

## 程序化子 Agent

程序化子 Agent 允许解释器通过内置的 `task()` 全局函数，从代码中分派已配置的[子 Agent](/tutorials/DeepAgents/子 Agent)。一个跨越许多独立工作单元的任务——例如审查目录中的每个文件或处理一批工单——变成了一个扇出工作并综合结果的循环。

在以下场景使用程序化子 Agent：

- **扇出与综合**：在多个项目上并行运行同类工作，然后合并结果。
- **验证**：将发现发送给独立的验证子 Agent，只保留已确认的结果。
- **递归工作流**：在解释器变量中保持工作集，选择切片，调用子 Agent，并细化结果。

有关配置、示例、编排模式和安全注意事项，请参阅[程序化子 Agent](#程序化子-agent)。

## 安全性

解释器使用 QuickJS 运行不受信任的 JavaScript，具有严格的默认隔离。将其视为一个有作用域的解释器运行时，而非完整的生产级沙箱后端。

你通过 PTC 暴露的每个工具都是解释器代码可以使用的外部能力。将 PTC 白名单视为权限边界：只暴露 Agent 所需的工具，避免桥接可以访问敏感系统、花费资金、变更数据或调用不受限制网络的广泛工具，除非这种行为是有意为之。

| 能力 | 默认可用 | 如何暴露 |
| --- | --- | --- |
| JavaScript 执行 | 是 | 添加解释器中间件 |
| 顶层 `await` | 是 | 在解释器代码中使用 Promise |
| `console.log` 捕获 | 是 | 通过 `captureConsole: false` 禁用 |
| Agent 工具 | 否 | 添加 PTC 白名单 |
| 文件系统访问 | 否 | 通过 PTC 白名单添加[内置文件系统工具](https://docs.langchain.com/oss/javascript/deepagents/harness#virtual-filesystem-access) |
| 网络访问 | 否 | 通过 PTC 暴露特定网络工具 |
| 挂钟时间或日期时间访问 | 否 | 如需要，暴露显式的时间工具 |
| Shell 命令、包安装、测试、操作系统级执行 | 否 | 使用[沙箱后端](/tutorials/DeepAgents/沙箱) |

## 配置

`createCodeInterpreterMiddleware` 接受以下选项：

| 选项 | 默认值 | 用途 |
| --- | --- | --- |
| `ptc` | 省略 | PTC 白名单：工具名称数组或 `StructuredToolInterface` 实例。 |
| `memoryLimitBytes` | `64 * 1024 * 1024` <br />(64 MB) | QuickJS 内存限制（字节）。 |
| `maxStackSizeBytes` | `320 * 1024` | QuickJS 栈大小限制（字节）。 |
| `executionTimeoutMs` | `5000` | 每次 eval 超时（毫秒）。负值禁用超时。 |
| `systemPrompt` | `null` | 覆盖内置的解释器系统提示。 |
| `maxPtcCalls` | `256` | 每次 eval 的最大 `tools.*` 调用次数。仅在受信任环境中使用 `null`。 |
| `maxResultChars` | `4000` | 从控制台输出、结果和错误字符串中保留的最大字符数。 |
| `toolName` | `"eval"` | 暴露给模型的解释器工具名称。 |
| `captureConsole` | `true` | 是否捕获 `console.log`、`console.warn` 和 `console.error` 输出。 |
| `subagents` | `true` | 暴露内置的 `task()` 全局函数用于[程序化子 Agent](#程序化子-agent)。设为 `false` 以要求子 Agent 分派通过普通 `task` 工具路径。 |

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/interpreters) 翻译并二次创作。
