---
title: Deep Agents 概览
categories: DeepAgents
order: 1
date: 2026-06-25
tags:
  - DeepAgents
  - 概览
---

# Deep Agents 概览

> 构建能够规划任务、调用子 Agent、利用文件系统处理复杂场景的智能体

Deep Agents 是目前最简便的 LLM 驱动 Agent 和应用开发方式——它内置了任务规划、文件系统上下文管理、子 Agent 派生以及长期记忆等能力。无论是简单的单步任务，还是复杂的多步骤工作流，Deep Agents 都能胜任。

Deep Agents 开箱即提供以下核心能力：

- **在环境中执行操作**：通过工具调用、文件读写、代码执行来完成动作
- **连接你的数据**：在合适的时机加载记忆、技能和领域知识
- **管理不断增长的上下文**：在长时间运行中自动压缩历史、卸载大体量结果
- **并行处理任务**：将工作委托给在独立上下文窗口中运行的通用或专用子 Agent
- **保持人在回路**：在关键决策点暂停以获取人工审批
- **持续改进**：基于实际使用情况更新记忆、技能和提示词

下面我们会逐一拆解每个组件，详见[核心能力](#核心能力)。

## 快速上手

```ts
import * as z from "zod";
// npm install deepagents langchain @langchain/core
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";

const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createDeepAgent({
  tools: [getWeather],
  systemPrompt: "You are a helpful assistant",
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  })
);
```

想动手构建自己的 Agent 和应用？请阅读[快速开始](/tutorials/DeepAgents/快速开始)和[自定义配置](/tutorials/DeepAgents/自定义配置)。

::: tip 提示
使用 [LangSmith](https://smith.langchain.com?utm_source=docs\&utm_medium=cta\&utm_campaign=langsmith-signup\&utm_content=oss-deepagents-overview) 可以追踪请求、调试 Agent 行为、评估输出质量。按照[可观测性快速入门](https://docs.langchain.com/langsmith/observability-quickstart)完成配置即可。准备上线时，请参考[生产环境部署](/tutorials/DeepAgents/生产环境部署)了解 LangSmith 的部署选项。
:::

## 核心能力

![Agent harness capabilities by category](https://mintcdn.com/langchain-5e9cc07a/jtty0O--UJOKG0nK/oss/images/agent_harness_capabilities.svg?fit=max&auto=format&n=jtty0O--UJOKG0nK&q=85&s=0ff671d72badd0844826660dfcb04391)

Deep Agents 本质上是一个 ["Agent 框架（harness）"](https://docs.langchain.com/oss/javascript/concepts/products#agent-harnesses-like-the-deep-agents-sdk)。它与其他 Agent 框架共享相同的核心工具调用循环，但额外内置了一系列能力，使 Agent 在处理真实任务时更加可靠：

- [**执行环境**](#执行环境)：工具、虚拟文件系统、可选沙箱和 REPL（解释器）
- [**上下文管理**](#上下文管理)：技能、记忆、摘要、上下文卸载和提示词缓存
- [**任务委派**](#任务委派)：子 Agent 派生与任务规划
- [**人工引导**](#人工引导)：人在回路的审批与中断

[`deepagents`](https://www.npmjs.com/package/deepagents) 是一个独立库，构建在 [LangChain](https://docs.langchain.com/oss/javascript/langchain/) 的 Agent 核心模块之上，并使用 [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/) 的工具链来支持生产环境运行。

[LangChain](https://docs.langchain.com/oss/javascript/langchain/) 提供了 Agent 的核心构建模块。想深入了解 LangChain、LangGraph 和 Deep Agents 三者的关系，可以阅读 [Frameworks, runtimes, and harnesses](https://docs.langchain.com/oss/javascript/concepts/products)。与 Anthropic 官方 harness 的对比，请参考[框架对比](/tutorials/DeepAgents/框架对比)。

如果你不需要这些内置能力，只想构建自定义 Agent，可以考虑使用 LangChain 的 [`createAgent`](https://docs.langchain.com/oss/javascript/langchain/agents) 或直接搭建 [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/overview) 自定义工作流。

## 执行环境

执行环境是 Agent 的"活动场所"，包含四个层次：

- **[工具](#工具与-mcp)**：Agent 可调用的自定义函数、API 和数据库
- **[虚拟文件系统](#虚拟文件系统)**：由可插拔后端支撑的文件工具
- **[文件系统权限](#文件系统权限)**：声明式地控制 Agent 可读写的路径
- **[代码执行](#代码执行)**：沙箱化的 Shell 执行和进程内 JavaScript 解释器

此外，**[流式传输](#流式传输)** 让你能够通过类型化事件流实时掌握消息、工具调用、返回值和委派任务的执行情况。

### 工具与 MCP

通过 `tools=` 参数，你可以传入自定义函数、LangChain 工具或来自任意 [MCP server](/tutorials/DeepAgents/工具与 MCP) 的工具。Deep Agents 全面支持 [Model Context Protocol (MCP)](https://docs.langchain.com/oss/javascript/langchain/mcp)，可通过标准接口连接数据库、API、文件系统等。

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[search, fetch_page, run_query],
)
```

更多关于自定义工具定义、MCP server 使用以及完整内置工具列表的信息，请参考[工具与 MCP](/tutorials/DeepAgents/工具与 MCP)。

### 虚拟文件系统

Harness 提供了一个可配置的虚拟文件系统，支持多种[可插拔后端](/tutorials/DeepAgents/虚拟文件系统后端)：内存状态、本地磁盘、LangGraph Store、组合路由，或带有[权限规则](/tutorials/DeepAgents/文件系统权限)的自定义后端。

后端支持以下文件系统操作：

| 工具         | 说明                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ls`         | 列出目录中的文件及其元数据（大小、修改时间）                                                                                                  |
| `read_file`  | 读取文件内容（带行号），支持大文件的 offset/limit 分段读取。还支持以多模态内容块的形式返回非文本文件（图片、视频、音频和文档）。见下方支持的扩展名。 |
| `write_file` | 创建新文件                                                                                                                                    |
| `edit_file`  | 执行精确的字符串替换（支持全局替换模式）                                                                                                      |
| `glob`       | 按模式匹配查找文件（如 `**/*.py`）                                                                                                            |
| `grep`       | 搜索文件内容，支持多种输出模式（仅文件名、带上下文的内容、计数）                                                                              |
| `execute`    | 在环境中运行 Shell 命令（仅在[沙箱后端](/tutorials/DeepAgents/沙箱)中可用）                                                                   |

::: details 支持的多模态文件扩展名
| 类型   | 扩展名                                                                   |
| ------ | ------------------------------------------------------------------------ |
| 图片   | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.heic`, `.heif`               |
| 视频   | `.mp4`, `.mpeg`, `.mov`, `.avi`, `.flv`, `.mpg`, `.webm`, `.wmv`, `.3gpp` |
| 音频   | `.wav`, `.mp3`, `.aiff`, `.aac`, `.ogg`, `.flac`                         |
| 文档   | `.pdf`, `.ppt`, `.pptx`                                                  |
:::

::: details 不使用默认文件系统工具
如果不想让模型看到上述文件系统工具，可以注册一个 [Harness Profile](/tutorials/DeepAgents/Harness Profile)，通过 `excluded_tools` 将它们隐藏：

```python
from deepagents import HarnessProfile, register_harness_profile

register_harness_profile(
    "anthropic:claude-sonnet-4-6",
    HarnessProfile(
        excluded_tools=frozenset(
            {"ls", "read_file", "write_file", "edit_file", "glob", "grep"}
        ),
    ),
)
```

注意：通过 `excluded_middleware` 移除 [`FilesystemMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createFilesystemMiddleware) 本身是被有意禁止的——它是[默认中间件栈](/tutorials/DeepAgents/自定义配置)中必需的脚手架。请使用 `excluded_tools` 仅隐藏模型可见的工具表面，而保留中间件本身。要移除 `task` 工具，请参考[运行无子 Agent 模式](/tutorials/DeepAgents/子 Agent)。
:::

虚拟文件系统还被 Harness 的其他能力所使用，包括技能、记忆、代码执行和上下文管理。你在为 Deep Agents 构建自定义工具和中间件时，同样可以使用这个文件系统。

更多信息请参考[虚拟文件系统后端](/tutorials/DeepAgents/虚拟文件系统后端)。

### 文件系统权限

Harness 支持声明式权限规则，用于控制 Agent 可读写哪些文件和目录。权限规则适用于上述内置文件系统工具，按声明顺序求值，采用"先匹配先生效"（first-match-wins）的语义。

创建 Agent 时，通过 `permissions=` 参数传入规则列表。每条规则包含：

- `operations`：`"read"` 和/或 `"write"`
- `paths`：文件或目录的 Glob 模式
- `mode`：`"allow"` 或 `"deny"`

规则从上到下依次求值，第一条匹配的规则生效。如果没有规则匹配，则操作默认被允许。

这套模型让你可以将 Agent 限制在特定目录（例如 `/workspace/`），保护 `.env` 或凭据等敏感文件，并可以给子 Agent 比父 Agent 更窄的访问权限。

权限不适用于[沙箱后端](/tutorials/DeepAgents/沙箱)，因为后者通过 `execute` 工具支持任意命令执行。如需自定义校验逻辑，请使用[后端策略钩子](/tutorials/DeepAgents/虚拟文件系统后端)。

完整的规则结构、示例和子 Agent 继承机制，请参考[文件系统权限](/tutorials/DeepAgents/文件系统权限)。

### 代码执行

Deep Agents 支持两种代码执行方式：

- [沙箱后端](/tutorials/DeepAgents/沙箱)暴露 `execute` 工具，在隔离环境中运行 Shell 命令。
- [解释器](/tutorials/DeepAgents/解释器)添加 `eval` 工具，在受限的 QuickJS 运行时中执行 JavaScript。

当 Agent 需要安装依赖、运行测试、调用 CLI 或与操作系统文件系统交互时，使用沙箱后端。沙箱后端实现了 `SandboxBackendProtocolV2` 接口；检测到该接口后，Harness 会自动将 `execute` 工具添加到 Agent 的可用工具中。

当 Agent 需要一个轻量的可编程层——比如循环、批处理、确定性数据转换或程序化工具调用时，使用解释器。解释器不提供 Shell 访问、包安装以及文件系统和网络访问。

沙箱配置、供应商和文件传输 API 请参考[沙箱](/tutorials/DeepAgents/沙箱)。QuickJS 运行时和程序化工具调用请参考[解释器](/tutorials/DeepAgents/解释器)。

### 流式传输

[事件流](/tutorials/DeepAgents/事件流)将 Agent 的运行过程以类型化投影的方式暴露出来，涵盖消息、工具调用、返回值和输出。Deep Agents 还增加了 `stream.subagents`，使每个委派任务都拥有独立的句柄，包含各自的消息流、工具调用流和嵌套子 Agent 流。

## 上下文管理

上下文管理组件控制 Agent 知道什么、能在 token 限制内运行多久，以及跨会话保留什么。它包含四个层次：

- **[技能](#技能)**：按需从技能文件中渐进式加载的领域知识
- **[记忆](#记忆)**：启动时从 `AGENTS.md` 文件加载的持久化指令和偏好
- **[摘要与上下文卸载](#摘要与上下文卸载)**：自动压缩对话历史和大体积工具返回结果
- **[提示词缓存](#提示词缓存)**：静态提示词部分可被缓存，在支持的模型上加速推理并降低成本

### 技能

技能（Skills）为你的 Deep Agent 打包了专用工作流、领域知识和自定义指令。

每个技能遵循 [Agent Skills 标准](https://agentskills.io/)，放在一个包含 `SKILL.md` 文件的目录中。技能还可以包含脚本、模板、参考文档和其他辅助资源。

Deep Agents 采用渐进式披露（progressive disclosure）来加载技能：Agent 在启动时仅读取 `SKILL.md` 的 frontmatter，只有当任务需要时才读取完整技能内容。这使得启动上下文保持紧凑，同时仍能按需提供丰富的能力。

更多信息请参考[技能](/tutorials/DeepAgents/技能)。

### 记忆

记忆（Memory）为你的 Deep Agent 提供跨会话的持久上下文，例如编码风格、偏好、约定和项目规范。

记忆使用 [`AGENTS.md` 文件](https://agents.md/)，在创建 Agent 时通过 `memory` 参数传入。与技能不同，记忆文件始终被加载，内容存储在配置好的后端（`StateBackend`、`StoreBackend` 或 `FilesystemBackend`）中。

Agent 还能根据交互和反馈自动更新记忆，使偏好和模式可以延续，无需在每个会话中重复声明。

配置详情和示例请参考[自定义配置中的 Memory 部分](/tutorials/DeepAgents/自定义配置)。

### 摘要与上下文卸载

Harness 通过管理上下文，使 Deep Agent 能在 token 限制内处理长时间运行的任务，同时将最相关的信息保留在作用域内。

这个上下文流程包含四个部分：

- **输入上下文**：系统提示词、记忆、技能和工具提示定义了 Agent 的起始状态。
- **压缩**：内置的卸载和摘要机制压缩对话历史和大体积中间结果。
- **隔离**：子 Agent 将重型子任务隔离处理，仅返回最终结果（见[任务委派](#任务委派)）。
- **长期记忆**：虚拟文件系统中的持久化存储使信息可以跨线程传递。

这些机制共同支持超出单个上下文窗口的多步骤任务，同时减少手动裁剪上下文和 token 消耗。

配置详情请参考[上下文工程](/tutorials/DeepAgents/上下文工程)。

### 提示词缓存

对于 Anthropic 模型，`create_deep_agent` 会自动对系统提示词的静态部分应用提示词缓存——即基础 Agent 指令、记忆和技能内容等在每一轮都会重复的部分。这避免了跨调用重复处理相同 token，从而降低长时间运行 Agent 的延迟和成本。

使用 Anthropic 模型时，提示词缓存默认启用，无需额外配置。

其他供应商的缓存方案，请参考 [Middleware 集成](https://docs.langchain.com/oss/javascript/integrations/middleware#official-integrations)中各供应商对应的缓存中间件。

## 任务委派

任务委派组件使 Agent 能将大问题拆解为更小、可并行的工作单元。它包含两个层次：

- **[任务规划](#任务规划)**：内置的 `write_todos` 工具用于结构化任务跟踪
- **[子 Agent](#子-agent)**：处理隔离子任务的临时子 Agent

### 任务规划

Harness 提供了一个 `write_todos` 工具，让 Agent 在执行过程中维护一个结构化的任务列表。

任务支持状态跟踪（`'pending'`、`'in_progress'`、`'completed'`），并持久化在 Agent 状态中。这为 Agent 提供了一个轻量的规划层，用于组织长时间运行和多步骤的工作。

### 子 Agent

Harness 内置了一个 `task` 工具，允许主 Agent 为隔离的、长时间运行的、多步骤的或并行的任务创建临时子 Agent。

子 Agent 执行提供以下特性：

- **全新上下文**：每次调用都创建一个带有独立上下文的新 Agent 实例。
- **自主执行**：子 Agent 独立运行直到完成。
- **单次交接**：它向主 Agent 返回一份最终报告。
- **可配置策略**：使用[默认的 `general-purpose` 子 Agent](/tutorials/DeepAgents/子 Agent)（默认启用），或定义[自定义子 Agent](/tutorials/DeepAgents/子 Agent)。
- **无状态消息**：子 Agent 是无状态的，无法发送多条消息。
- **上下文和 token 效率**：重型子任务的工作保持隔离，并被压缩为紧凑的结果。

::: details 不使用子 Agent（禁用 `task` 工具）
要运行不带 `task` 工具的 Agent，请参考[运行无子 Agent 模式](/tutorials/DeepAgents/子 Agent)。不要尝试通过 `excluded_middleware` 移除 [`SubAgentMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createSubAgentMiddleware)——这是被有意禁止的。正确的做法是通过 [Harness Profile](/tutorials/DeepAgents/Harness Profile) 禁用自动添加的子 Agent，并且不通过 `subagents=` 传入任何同步子 Agent。异步子 Agent 不受影响。完整的中间件栈顺序请参考[默认中间件栈](/tutorials/DeepAgents/自定义配置)。
:::

更多信息请参考[子 Agent](/tutorials/DeepAgents/子 Agent)。

## 人工引导

人工引导组件让人类能在运行时控制 Agent 行为，并设置 Agent 工作的文件系统权限。

### 人在回路

Deep Agents 与 LangGraph 中断机制集成，可在敏感工具调用前暂停以获取审批。通过 `create_deep_agent` 的 `interrupt_on` 参数启用此行为。

`interrupt_on` 接受一个工具名到中断配置的映射。例如，`interrupt_on={"edit_file": True}` 会在每次编辑前暂停，让你审批调用、添加指导或修改工具输入后再执行。

这为破坏性操作、昂贵的 API 调用和交互式调试提供了一层运行时安全与控制。

更多信息请参考[人机协作](/tutorials/DeepAgents/人机协作)。

## 开始使用

- [**快速开始**](/tutorials/DeepAgents/快速开始) — 构建你的第一个 Deep Agent
- [**自定义配置**](/tutorials/DeepAgents/自定义配置) — 了解自定义选项
- [**Deep Agents Code**](/tutorials/DeepAgents/Deep Agents Code) — 使用 Deep Agents Code
- [**ACP**](/tutorials/DeepAgents/ACP) — 通过 ACP 在代码编辑器中使用 Deep Agent
- [**API 参考**](https://reference.langchain.com/javascript/modules/deepagents.html) — 查看 `deepagents` API 文档

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/overview) 翻译并二次创作。
