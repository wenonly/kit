---
title: 技能
categories: DeepAgents
order: 10
date: 2026-06-25
tags:
  - DeepAgents
  - 技能
---

# 技能

> 学习如何用技能（Skills）扩展你的 Deep Agent 能力

技能（Skills）将领域专业知识——包括工作流、最佳实践、脚本、参考文档和模板——打包成可复用的目录。Agent 在启动时会获得每个技能内容的摘要，只有在任务相关时才会去读取技能内部的完整文件。

通过这种方式，技能帮助你避免上下文膨胀：启动时只加载摘要，需要时才读取完整指令。你可以跨 Agent 和跨项目共享技能，也可以在单个 Agent 中组合多个技能，让每个技能覆盖一种独立的能力。

::: tip 提示
技能功能需要 `deepagents>=1.7.0`。
:::

::: tip 提示
如果你需要开箱即用的技能来提升 Agent 在 LangChain 生态任务上的表现，可以看看 [LangChain Skills](https://github.com/langchain-ai/langchain-skills) 仓库。
:::

## 用法

### 1. 创建顶层技能目录

创建一个目录来存放项目的所有技能，比如在后端根目录下创建 `skills/`。

### 2. 为每个技能创建子目录

每个技能就是一个包含 `SKILL.md` 文件的目录：这个 Markdown 文件以 YAML [frontmatter](#frontmatter-字段)（包含 `name` 和 `description`）开头，后跟 Agent 激活技能时遵循的指令。技能目录还可以选择性包含辅助文件，比如脚本、参考文档和模板。

```
skills/
└── langgraph-docs/
    ├── SKILL.md
    ├── scripts/
    │   └── fetch_docs.py
    ├── references/
    │   ├── api-patterns.md
    │   └── style-guide.md
    └── assets/
        ├── report-template.md
        └── schema.json
```

Deep Agent 技能遵循 [Agent Skills 规范](https://agentskills.io/specification)。

### 3. 编写 `SKILL.md`（含 YAML frontmatter 和指令）

`SKILL.md` 以 YAML [frontmatter](#frontmatter-字段) 开头，后跟 Markdown 指令：

```md
---
name: langgraph-docs
description: Use this skill for requests related to LangGraph in order to fetch relevant documentation to provide accurate, up-to-date guidance.
---

# langgraph-docs

## Overview

This skill explains how to access LangGraph documentation to help answer questions and guide implementation.

## Instructions

### 1. Fetch the documentation index

Use the fetch_url tool to read the following URL:
https://docs.langchain.com/llms.txt

This provides a structured list of all available documentation with descriptions.

### 2. Select relevant documentation

Based on the question, identify 2-4 most relevant documentation URLs from the index. Prioritize:

- Specific how-to guides for implementation questions
- Core concept pages for understanding questions
- Tutorials for end-to-end examples
- Reference docs for API details

### 3. Fetch and synthesize

Use the fetch_url tool to read the selected documentation URLs, then answer the user's question. Give a direct answer first, include the minimum necessary context, and link to the source pages rather than quoting long passages.
```

::: tip 提示
记得在 `SKILL.md` 中引用任何[辅助资源](#添加辅助资源)，描述每个文件包含什么内容以及何时使用。Agent 通过技能指令中的引用来发现这些文件。
:::

### 4. 创建 Agent 时传入技能路径

在创建 Agent 时，通过 `skills` 参数传入顶层技能目录的路径：

```typescript
import { createDeepAgent, FilesystemBackend } from "deepagents";

const backend = new FilesystemBackend({ rootDir: process.cwd() });

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend,
  skills: ["/skills/"],
});
```

上面的例子使用 `FilesystemBackend` 从磁盘加载技能。其他存储选项（包括从远程加载技能）请参见[后端与远程技能加载](#后端与远程技能加载)。

**`skills` 参数说明**（类型 `list[str]`，可选）：

技能来源路径列表。路径必须使用正斜杠，相对于后端根目录。

- 如果省略，不加载任何技能。
- 使用 `StateBackend`（默认）时，通过 `invoke(files={...})` 提供技能文件。使用 `deepagents.backends.utils` 中的 `create_file_data()` 来格式化文件内容；不支持原始字符串。
- 使用 `FilesystemBackend` 时，技能从磁盘加载，路径相对于 `root_dir`。

当多个来源包含同名技能时，后面的来源会覆盖前面的（最后一个生效）。

::: tip 提示
当多个技能来源包含同名技能时，`skills` 数组中后面列出的来源优先（最后一个生效）。这让你可以分层叠加不同来源的技能，比如用项目特定版本覆盖基础技能。
:::

### 5. 调用 Agent

使用 `invoke()` 向 Agent 发送任务。启动时，Agent 会从 [frontmatter](#frontmatter-字段) 中加载每个技能的 `name` 和 `description` 到系统提示中。当任务匹配某个技能的描述时，Agent 会读取该技能的 `SKILL.md` 并遵循其中的指令。

```typescript
const result = await agent.invoke(
  { messages: [{ role: "user", content: "What is LangGraph?" }] },
  { configurable: { thread_id: "1" } },
);
```

## 技能的工作原理

随着 Agent 承担越来越复杂的任务，它需要的上下文也在增长。把所有指令都加载到系统提示中会浪费 token——大部分信息与当前任务无关；而且每次会话都手动提供相同的指导也不可扩展。

技能采用**渐进式披露（progressive disclosure）**机制：Agent 分层加载技能信息，而非一次性全部加载。启动时只看到每个技能的名称和描述；技能被激活时才读取完整的 `SKILL.md` 指令；辅助文件则在此后按需加载。

技能加载分为三个层级，每一层只在任务需要时才增加细节：

| 层级               | 加载内容                                                                                              | 时机                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **1. 元数据**       | `SKILL.md` [frontmatter](#frontmatter-字段) 中的 `name` 和 `description`                              | Agent 启动时，为每个已配置的技能加载                              |
| **2. 指令**         | 完整的 `SKILL.md` 正文                                                                                | 技能被激活时                                                     |
| **3. 资源**         | `scripts/`、`references/` 和 `assets/` 下的[辅助文件](#添加辅助资源)                                  | 激活后按需加载，当指令引用它们时                                  |

下面的示意图展示了在给定时刻 Agent 上下文中会出现什么内容。启动时，每个技能的第 1 层元数据在系统提示中。当技能被激活时，第 2 层指令加入上下文。第 3 层文件在后端上，直到 Agent 在激活后读取它们。

![How skill components map into agent context at startup and activation](https://mintcdn.com/langchain-5e9cc07a/-Q4wgirblfw7Ioet/oss/images/deepagents/skills-composition.svg?fit=max&auto=format&n=-Q4wgirblfw7Ioet&q=85&s=9450c441ece57465053644ede8991271)

随着 Agent 处理任务，它会分层加载技能信息：

![How skills load in layers from metadata to instructions to resources](https://mintcdn.com/langchain-5e9cc07a/-Q4wgirblfw7Ioet/oss/images/deepagents/skills-progressive-disclosure.svg?fit=max&auto=format&n=-Q4wgirblfw7Ioet&q=85&s=ba55587d858f5588bea425dc503e3246)

在 Deep Agents 中，[`SkillsMiddleware`](https://reference.langchain.com/javascript/deepagents/middleware/createSkillsMiddleware)（当你传入 `skills` 时，它是[默认中间件栈](/tutorials/DeepAgents/自定义配置)的一部分）负责前两个层级，第三层由 LLM 处理：

1. **发现**（第 1 层）：Agent 启动时，中间件扫描已配置的技能路径，解析每个 `SKILL.md` 的 [frontmatter](#frontmatter-字段)，将 `name` 和 `description` 字段注入系统提示。
2. **读取**（第 2 层）：Agent 激活技能时，通过 `read_file` 读取完整的 `SKILL.md` 内容。
3. **执行**（第 3 层）：激活后，Agent 遵循技能指令，仅在指令需要时才读取辅助文件（脚本、参考、资源）。

## 何时使用技能

如果你发现自己在给 Agent 重复提供类似的指令——尤其是详细且包含多个步骤的指令——就可以考虑把这些指令固化为技能。这样以后完成类似任务时，Agent 就已经知道该怎么做了。

::: tip 提示
你也可以让 Agent 为你刚完成的任务写一个技能。
:::

技能特别适合固化以下类型的内容：

- **分步工作流**：跨越多个步骤的工作流，类似食谱。
- **领域知识**：指导 Agent 如何为工作流使用工具。例如，包括从哪里获取信息、其他参考信息或脚本。
- **带可执行代码的指令**：将流程与 Agent 可运行的脚本或模块绑定，让它遵循经过测试的逻辑，而不是每次都从指令中重新生成。参见[用技能执行代码](#用技能执行代码)。
- **准则**：为 Agent 提供关于应遵守护栏的支持性指令。例如，遵循特定格式或风格指南，或指定始终运行测试作为工作流的一部分。

## 编写有效的技能

[Agent Skills 规范](https://agentskills.io/specification)包含了如何构建技能以实现可靠发现和激活的指导。以下建议在此基础上面向 Deep Agents 提供实用模式。

**保持 [frontmatter](#frontmatter-字段) 简洁**，`SKILL.md` 正文控制在 5,000 token 以内。每个技能的 frontmatter 会在[发现阶段](#技能的工作原理)加入系统提示，而完整正文只在激活时才被读取。保持两层都小巧意味着你可以加载大量技能而不会挤占上下文窗口。

**编写具体的描述。** 在[发现阶段](#技能的工作原理)，`description` 字段是 Agent 看到的关于每个技能的唯一信息。好的描述应该告诉 Agent 这个技能做什么以及何时激活，并包含 Agent 可以匹配的具体关键词：

```yaml
# Good: specific about what and when
description: >-
  Extract text and tables from PDF files, fill PDF forms, and merge
  multiple PDFs. Use when working with PDF documents or when the user
  mentions PDFs, forms, or document extraction.

# Poor: too vague for reliable matching
description: Helps with PDFs.
```

当你在相关领域有多个技能时，要明确区分它们的描述。重叠的描述会导致 Agent 激活错误的技能或在选项间犹豫。如果两个技能用途相似，考虑合并为一个。

**保持指令聚焦。** Agent Skills 规范建议将 `SKILL.md` 控制在 500 行以内。当指令变长时，把详细的参考材料移到[辅助资源文件](#添加辅助资源)中，并在主 `SKILL.md` 中引用它们：

```
skills/
└── data-pipeline/
    ├── SKILL.md
    └── references/
        ├── schema-reference.md
        └── error-codes.md
```

Agent 只在指令需要时才加载参考文件，这保持了渐进式披露每一层的合理大小。文件引用保持在距 `SKILL.md` 一层深度以内，避免深层嵌套引用链——那会迫使 Agent 经过多次读取才能到达所需信息。

**为 Agent 组织指令结构。** 将 `SKILL.md` 正文写成 Agent 可以遵循的清晰指令：

- 多步工作流的**分步流程**
- 在不同方法间做选择的**决策标准**
- **预期输入输出的示例**，让 Agent 知道成功的样子
- Agent 应处理或标记给用户的**边界情况**

**管理技能数量。** 少量范围明确的技能比大量重叠的技能效果更好。随着具有相似描述的技能数量增加，Agent 选择正确技能的能力会下降。如果你发现有很多相关技能，考虑：

- 将相关能力合并到一个技能中，为每个子任务设独立章节
- 使用参考文件保持主 `SKILL.md` 简洁，同时覆盖多个子任务

::: tip 提示
使用 [`skills-ref` 验证工具](https://github.com/agentskills/agentskills/tree/main/skills-ref)来检查你的 `SKILL.md` [frontmatter](#frontmatter-字段) 是否符合 Agent Skills 规范的命名和格式约定。
:::

## 添加辅助资源

除了 `SKILL.md` 之外，技能目录还可以包含任何额外的文件或目录。[Agent Skills 规范](https://agentskills.io/specification)定义了三种可选目录用于常见的资源类型。Deep Agents 不会在发现或激活时加载这些文件。Agent 只在你的 `SKILL.md` 指令要求时才读取或执行它们。

### `scripts/`

`scripts/` 目录存放 Agent 可以运行的可执行代码，如 API 客户端、数据转换或验证检查。脚本应该：

- 自包含或清晰记录依赖
- 包含有用的错误信息
- 优雅处理边界情况

支持的语言取决于你的 Agent 配置。常见选项包括 Python、Bash 以及 JavaScript 或 TypeScript。要执行脚本而非仅仅读取，请参见[用技能执行代码](#用技能执行代码)。当 Agent 需要 shell 时，使用[沙箱脚本](#沙箱脚本)。

### `references/`

`references/` 目录存放 Agent 按需阅读的补充文档。用于对 `SKILL.md` 来说太详细但仍与特定任务相关的材料，例如：

- `REFERENCE.md` 用于详细的技术参考
- `FORMS.md` 用于表单模板或结构化数据格式
- 领域特定指南（`finance.md`、`legal.md` 等）

保持单个参考文件聚焦。Agent 只在需要时加载它们，所以更小的文件使用更少的上下文。

### `assets/`

`assets/` 目录存放 Agent 使用但不需要作为指令读取的静态资源，例如：

- 文档或配置模板
- 图片（图表、示例）
- 数据文件（查找表、模式）

在 `SKILL.md` 中描述 Agent 何时应打开或复制每个资源。

### 从 `SKILL.md` 引用文件

引用辅助文件时，使用相对于技能根目录的路径：

```md
For API details, see the [reference guide](references/api-patterns.md).

To extract tables from a PDF, run:
scripts/extract.py
```

为引用的每个文件说明它包含什么内容以及 Agent 何时应使用它。保持引用距 `SKILL.md` 一层深度以内。避免深层嵌套引用链——那会迫使 Agent 经过多次读取才能到达所需信息。

## 后端与远程技能加载

Deep Agents 根据你存储和管理技能文件的方式支持不同的后端：

- `StateBackend`：将文件存储在当前线程的 LangGraph Agent 状态中。
- `StoreBackend`：将文件存储在 LangGraph Store 中，实现持久化的跨线程存储。
- `FilesystemBackend`：从磁盘的 `root_dir` 读写技能文件。

::: code-group

```ts [StateBackend]
import { createDeepAgent, StateBackend, type FileData } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const backend = new StateBackend();

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

const skillsFiles: Record<string, FileData> = {};
const skillUrl =
  "https://raw.githubusercontent.com/langchain-ai/deepagentsjs/refs/heads/main/examples/skills/langgraph-docs/SKILL.md";
const response = await fetch(skillUrl);
const skillContent = await response.text();

skillsFiles["/skills/langgraph-docs/SKILL.md"] = createFileData(skillContent);

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.1-pro-preview",
  backend,
  checkpointer, // Required !
  // IMPORTANT: deepagents skill source paths are virtual (POSIX) paths relative to the backend root.
  skills: ["/skills/"],
});

const config = { configurable: { thread_id: `thread-${Date.now()}` } };
const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "what is langraph?" }],
    files: skillsFiles,
  },
  config,
);
```

```ts [StoreBackend]
import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const store = new InMemoryStore();
const backend = new StoreBackend({
  namespace: () => ["filesystem"],
});

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

const skillUrl =
  "https://raw.githubusercontent.com/langchain-ai/deepagentsjs/refs/heads/main/examples/skills/langgraph-docs/SKILL.md";

const response = await fetch(skillUrl);
const skillContent = await response.text();
const fileData = createFileData(skillContent);

await store.put(["filesystem"], "/skills/langgraph-docs/SKILL.md", fileData);

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.1-pro-preview",
  backend,
  store,
  checkpointer,
  // IMPORTANT: deepagents skill source paths are virtual (POSIX) paths relative to the backend root.
  skills: ["/skills/"],
});

const config = {
  recursionLimit: 50,
  configurable: { thread_id: `thread-${Date.now()}` },
};
const result = await agent.invoke(
  { messages: [{ role: "user", content: "what is langraph?" }] },
  config,
);
```

```ts [FilesystemBackend]
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const backend = new FilesystemBackend({ rootDir: process.cwd() });

const agent = await createDeepAgent({
  model: "google-genai:gemini-3.1-pro-preview",
  backend,
  skills: ["./examples/skills/"],
  interruptOn: {
    read_file: true,
    write_file: true,
    delete_file: true,
  },
  checkpointer, // Required!
});

const config = { configurable: { thread_id: `thread-${Date.now()}` } };
const result = await agent.invoke(
  { messages: [{ role: "user", content: "what is langraph?" }] },
  config,
);
```

:::

## 运行时加载技能

当你有大量技能集合但每次运行只需要一部分时，可以根据运行时上下文（如用户角色、租户或请求类型）选择要加载的技能。有两种主要方法：

### 动态技能列表

最简单的方法是在创建 Agent 之前构建 `skills` 数组。根据你拥有的任何运行时上下文选择要包含的技能路径：

```typescript
import { createDeepAgent } from "deepagents";

const SKILLS_BY_ROLE: Record<string, string[]> = {
  engineering: ["/skills/code-review/", "/skills/testing/", "/skills/deployment/"],
  data: ["/skills/sql-analysis/", "/skills/visualization/", "/skills/data-pipeline/"],
  support: ["/skills/ticket-triage/", "/skills/runbook/"],
};

function createAgentForUser(userRole: string) {
  return createDeepAgent({
    model: "anthropic:claude-sonnet-4-6",
    skills: SKILLS_BY_ROLE[userRole] ?? [],
  });
}
```

当技能存在于磁盘或共享后端中，你只需要控制 Agent 看到哪些技能时，这种方法很有效。技能本身不会被复制——你维护一份副本，通过传递不同的路径来改变每次运行的技能集。

::: tip 提示
SDK 只加载你在 `skills` 中传入的来源。它不会自动扫描 CLI 目录，如 `~/.deepagents/...` 或 `~/.agents/...`。

关于 CLI 存储约定，请参见 [App data](/tutorials/DeepAgents/Deep Agents Code)。

::: details 在 SDK 中模拟 CLI 来源顺序
如果你想在 SDK 代码中实现 CLI 风格的分层，按从低到高的优先级顺序显式传入所有期望的来源：

```text
[
"<user-home>/.deepagents/{agent}/skills/",
"<user-home>/.agents/skills/",
"<project-root>/.deepagents/skills/",
"<project-root>/.agents/skills/",
]
```

然后将该有序列表作为 `skills` 传入创建 Agent。
:::

### 命名空间技能

对于每个用户的技能集独立管理的多租户应用，将 `/skills/` 路由到带命名空间工厂的 [StoreBackend](https://reference.langchain.com/javascript/deepagents/backends/StoreBackend)。为每个命名空间填充该用户应有权访问的技能，中间件会在运行时解析到正确的集合：

```typescript
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  skills: ["/skills/"],
  backend: new CompositeBackend({
    default: new StateBackend(),
    routes: {
      "/skills/": new StoreBackend({
        namespace: (ctx) => [
          ctx.assistantId ?? "default",
          ctx.config?.configurable?.user_id ?? "anonymous",
        ],
      }),
    },
  }),
});
```

当不同用户或租户需要可以单独更新的完全独立的技能库时，这种模式很有用。如需一个开箱即用的托管方案来处理技能访问、共享和工作区级别的可见性，请参见 [Fleet skills](https://docs.langchain.com/langsmith/fleet/skills)。

## 子 Agent 的技能

当你使用[子 Agent](/tutorials/DeepAgents/子 Agent) 时，可以配置每种子 Agent 访问哪些技能：

- **通用子 Agent**：当你将 `skills` 传给 `create_deep_agent` 时，自动继承主 Agent 的技能。无需额外配置。
- **自定义子 Agent**：不继承主 Agent 的技能。在每个子 Agent 定义中添加 `skills` 参数，指定该子 Agent 的技能来源路径。

技能状态完全隔离：主 Agent 的技能对子 Agent 不可见，子 Agent 的技能对主 Agent 也不可见。

```typescript
const researchSubagent = {
  name: "researcher",
  description: "Research assistant with specialized skills",
  systemPrompt: "You are a researcher.",
  tools: [webSearch],
  skills: ["/skills/research/", "/skills/web-search/"],  // Subagent-specific skills
};

const agent = await createDeepAgent({
  model: "google_genai:gemini-3.5-flash",
  skills: ["/skills/main/"],  // Main agent and GP subagent get these
  subagents: [researchSubagent],  // Researcher gets only its own skills
});
```

关于子 Agent 配置和技能继承的更多信息，请参见[子 Agent](/tutorials/DeepAgents/子 Agent)。

## 技能权限

生产环境部署通常需要控制三件事：每个用户能看到哪些技能、Agent 是否可以修改技能文件、以及写入是否需要人工审批。你通过 `skills` 参数和[后端路由](#后端与远程技能加载)控制可见性，通过[文件系统权限](/tutorials/DeepAgents/文件系统权限)控制访问，通过 [`interrupt_on`](/tutorials/DeepAgents/人机协作) 或 `mode="interrupt"` 权限规则控制审批。

### 在用户间共享技能

要让每个用户都能访问同一个精心策划的技能库，将 `/skills/` 路由到共享的 [StoreBackend](https://reference.langchain.com/javascript/deepagents/backends/StoreBackend)，并从应用代码或管理工作流中填充它。使用组织范围的命名空间，使该组织中的所有 Agent 解析到同一个存储：

- 按组织 ID 命名以实现工作区范围的技能（参见[强制只读技能](#强制只读技能)）。
- 当每个用户需要独立库时按用户 ID 命名（[命名空间技能](#命名空间技能)）。

用类似 `/company-policies/SKILL.md` 的键和包含 `content` 和 `encoding` 字段的值来填充存储。`/skills/` 路由前缀在从存储读取记录前会被剥离。

如需一个开箱即用的托管方案来处理技能访问、共享和工作区级别的可见性，请参见 [Fleet skills](https://docs.langchain.com/langsmith/fleet/skills)。

你也可以组合共享库和个人库：将 `/skills/shared/` 路由到组织范围的 `StoreBackend`，将 `/skills/personal/` 路由到用户范围的后端，并在 `skills` 中同时传入两个路径。参见[允许 Agent 编辑个人技能](#允许-agent-编辑个人技能)。

### 按用户上下文限制技能

并非每个用户都应该看到每个技能。根据角色、租户或其他请求上下文在运行时控制加载哪些技能。有两种主要方法：

- **[动态技能列表](#动态技能列表)** — 在创建 Agent 之前构建 `skills` 数组。为不同角色或请求类型传入不同的路径列表。适用于技能存在于共享后端且你按路径过滤的场景。
- **[命名空间技能](#命名空间技能)** — 将 `/skills/` 路由到 `StoreBackend`，使用基于用户或租户 ID 的命名空间工厂。为每个命名空间只填充该身份应访问的技能。

这些模式与下面的读写控制配合使用。例如，你可以给管理员比工程师更大的技能集，同时保持两个库都是只读的。

### 强制只读技能

要在不让 Agent 修改的情况下共享技能，将 `/skills/` 路由到共享存储，并用[文件系统权限](/tutorials/DeepAgents/文件系统权限)拒绝 `/skills/**` 下的写操作。Agent 可以发现和读取技能；只有你的应用代码或管理工作流可以更新存储。

::: code-group

```ts [Google]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "google-genai:gemini-3.5-flash",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

```ts [OpenAI]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "openai:gpt-5.4",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

```ts [Anthropic]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

```ts [OpenRouter]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "openrouter:anthropic/claude-sonnet-4-6",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

```ts [Fireworks]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

```ts [Baseten]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "baseten:zai-org/GLM-5.2",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

```ts [Ollama]
import { InMemoryStore } from "@langchain/langgraph";
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const store = new InMemoryStore(); // Good for local dev; omit for LangSmith Deployment

const agent = createDeepAgent({
  model: "ollama:devstral-2",
  backend: new CompositeBackend(new StateBackend(), {
    "/skills/": new StoreBackend({
      namespace: (rt) => ["curated-skills", rt.context.orgId],
    }),
  }),
  skills: ["/skills/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "deny",
    },
  ],
  store,
});
```

:::

用于企业知识库、已批准的工具指令或共享技能包——Agent 从集中管理的上下文中受益，但不应重写事实来源。

### 要求审批才能写入技能

如果 Agent 可以写入技能文件但你希望先经过人工审批，使用 [`interrupt_on`](/tutorials/DeepAgents/人机协作) 或 `mode="interrupt"` 权限规则。两者都会在 `write_file` 或 `edit_file` 运行前暂停，并使用相同的恢复流程。

```typescript
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent } from "deepagents";

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  skills: ["/skills/personal/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/**"],
      mode: "interrupt",
    },
  ],
  checkpointer: new MemorySaver(), // Required to pause and resume
});
```

或者，配置 `interrupt_on={"write_file": True, "edit_file": True}` 来要求所有文件系统写入都需审批，而不仅仅是技能路径。关于处理和恢复中断，请参见[人机协作](/tutorials/DeepAgents/人机协作)。

### 允许 Agent 编辑个人技能

默认情况下，如果后端允许且没有权限规则阻止该路径，Agent 可以写入技能文件。要让 Agent 创建或完善技能而不触及共享库：

1. 将可写路径（如 `/skills/personal/`）路由到用户范围的 `StoreBackend`。
2. 在 `skills` 中传入该路径（以及任何共享路径）。
3. 不要为可写路径添加 `deny` 规则。如果混合使用共享和个人路径，将更具体的规则放在更宽泛的 deny 规则之前（[规则顺序](/tutorials/DeepAgents/文件系统权限)）。

```typescript
import {
  createDeepAgent,
  CompositeBackend,
  StateBackend,
  StoreBackend,
} from "deepagents";

const agent = await createDeepAgent({
  model: "anthropic:claude-sonnet-4-6",
  backend: new CompositeBackend({
    default: new StateBackend(),
    routes: {
      "/skills/shared/": new StoreBackend({
        namespace: (rt) => ["curated-skills", rt.context.orgId],
      }),
      "/skills/personal/": new StoreBackend({
        namespace: (ctx) => [
          "user-skills",
          ctx.config?.configurable?.user_id ?? "anonymous",
        ],
      }),
    },
  }),
  skills: ["/skills/shared/", "/skills/personal/"],
  permissions: [
    {
      operations: ["write"],
      paths: ["/skills/shared/**"],
      mode: "deny",
    },
  ],
});
```

Agent 使用 `write_file` 和 `edit_file` 在可写路径下创建或更新 `SKILL.md` 和辅助文件。要捕获技能格式之外的通用学习，可以将另一个路径（如 `/memories/`）路由到另一个可写后端。关于路由和存储设置，请参见[虚拟文件系统后端](/tutorials/DeepAgents/虚拟文件系统后端)。

## 用技能执行代码

没有代码执行，技能是被动性的：Agent 读取指令并使用其可用工具来遵循。代码执行将技能变为主动能力。一个技能可以附带一个经过测试的脚本来调用 API、转换数据、验证输出或运行流水线——Agent 确定性地执行它，而不是每次从指令中重新生成逻辑。这对于需要精确行为（数据转换、API 集成、合规检查）或依赖于 Agent 无法仅通过工具调用使用的库的工作流尤其有价值。

技能通过[沙箱脚本](#沙箱脚本)执行代码：当 Agent 需要安装依赖、运行测试、调用 CLI 或与操作系统文件系统交互时，它会运行打包的脚本。

### 沙箱脚本

技能可以在 `SKILL.md` 文件旁边包含脚本。在你的 `SKILL.md` 中引用脚本，让 Agent 知道它们的存在以及何时运行：

```
skills/
└── arxiv-search/
    ├── SKILL.md
    └── scripts/
        └── search.ts
```

```md
---
name: arxiv-search
description: Search the arXiv preprint repository for research papers. Use when the user asks about academic papers, recent research, or scientific literature.
---

# arxiv-search

Search arXiv for papers matching the user's query.

## Instructions

1. Run `scripts/search.ts` with the user's query as an argument.
2. Parse the results and present them with title, authors, abstract summary, and link.
3. If the user asks for more detail on a specific paper, fetch the full abstract.
```

Agent 可以从任何后端*读取*脚本，但要*执行*它们，Agent 需要访问 shell，而只有[沙箱后端](/tutorials/DeepAgents/沙箱)提供这种能力。

[沙箱后端](/tutorials/DeepAgents/沙箱)在隔离的容器中运行。存储在沙箱外的技能文件在容器内不可用，这意味着 Agent 无法执行技能脚本或访问技能资源，除非先将它们传输进去。使用[自定义中间件](https://docs.langchain.com/oss/javascript/langchain/middleware/custom)来处理这个传输：

- **`before_agent`**：从后端读取技能文件并上传到沙箱中，这样 Agent 从一开始就可以执行脚本。
- **`after_agent`**：从沙箱下载任何更新或新创建的技能文件并写回后端，以便更改在运行之间持久化。

::: code-group

```ts [Google]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "google-genai:gemini-3.5-flash",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

```ts [OpenAI]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "openai:gpt-5.4",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

```ts [Anthropic]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "anthropic:claude-sonnet-4-6",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

```ts [OpenRouter]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "openrouter:anthropic/claude-sonnet-4-6",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

```ts [Fireworks]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "fireworks:accounts/fireworks/models/qwen3p5-397b-a17b",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

```ts [Baseten]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "baseten:zai-org/GLM-5.2",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

```ts [Ollama]
import { readFile, readdir } from "node:fs/promises";
import { join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMiddleware } from "langchain";
import {
  CompositeBackend,
  createDeepAgent,
  type FileData,
  LangSmithSandbox,
  StoreBackend,
} from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";
import { SandboxClient } from "langsmith/sandbox";

/** Identical skill bundles for every user: one shared store namespace. */
const SKILLS_SHARED_NAMESPACE = ["skills", "builtin"] as const;

function createFileData(content: string): FileData {
  const now = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: now,
    modified_at: now,
  };
}

function normalizeSkillsStoreKey(key: string): string {
  const k = String(key);
  if (k.includes("..") || /[*?]/.test(k)) {
    throw new Error(`Invalid key: ${key}`);
  }
  return k.startsWith("/") ? k : `/${k}`;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

/** Load canonical skill files from disk into the shared store namespace (run once at deploy).
 *  You can retrieve skills from any source (local filesystem, remote URL, etc.).
 */
async function seedSkillStore(store: InMemoryStore) {
  const moduleDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const skillsDir = resolve(moduleDir, "skills");
  const filePaths = await walkFiles(skillsDir);
  for (const filePath of filePaths) {
    const rel = relative(skillsDir, filePath);
    // StoreBackend keys are paths *relative to the routed backend root*.
    // CompositeBackend strips the route prefix (`/skills/`) before delegating,
    // so store keys should look like "/<skillname>/SKILL.md".
    const key = `/${posix.normalize(rel.split("\\").join("/"))}`;
    const content = await readFile(filePath, "utf8");
    await store.put([...SKILLS_SHARED_NAMESPACE], key, createFileData(content));
  }
}

/** Copy shared skill files from the store into the sandbox before each agent run. */
function createSkillSandboxSyncMiddleware(backend: CompositeBackend) {
  return createMiddleware({
    name: "SkillSandboxSyncMiddleware",
    beforeAgent: async (state, runtime) => {
      const store = (runtime as any).store;
      if (!store) {
        throw new Error(
          "Store is required for syncing skills into the sandbox. " +
            "Pass `store` to createDeepAgent and ensure your runtime provides it.",
        );
      }

      const encoder = new TextEncoder();
      const files: Array<[string, Uint8Array]> = [];

      for (const item of await store.search([...SKILLS_SHARED_NAMESPACE])) {
        const normalized = normalizeSkillsStoreKey(String(item.key));
        const data = item.value as FileData;
        // CompositeBackend routes paths and batches uploads to the right backend.
        files.push([
          `/skills${normalized}`,
          encoder.encode(data.content.join("\n")),
        ]);
      }

      if (files.length > 0) await backend.uploadFiles(files);

      return state;
    },
  });
}

async function main() {
  const store = new InMemoryStore();
  await seedSkillStore(store);

  const client = new SandboxClient();
  const lsSandbox = await client.createSandbox();

  const backend = new CompositeBackend(new LangSmithSandbox({ sandbox: lsSandbox }), {
    "/skills/": new StoreBackend({
      store,
      namespace: () => [...SKILLS_SHARED_NAMESPACE],
    } as any),
  });

  try {
    const agent = await createDeepAgent({
      model: "ollama:devstral-2",
      backend,
      skills: ["/skills/"],
      store,
      middleware: [createSkillSandboxSyncMiddleware(backend)],
    });

  } finally {
    await client.deleteSandbox(lsSandbox.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

:::

关于在执行前同时播种技能和记忆并在之后同步回去的完整示例，请参见[使用自定义中间件同步技能和记忆](/tutorials/DeepAgents/生产环境部署)。

## 故障排除

使用 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-skills) 追踪来调试技能发现、对 `SKILL.md` 的 `read_file` 调用以及辅助资源访问。按照[追踪快速入门](https://docs.langchain.com/langsmith/observability-quickstart)进行设置。我们建议你还设置 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会监控你的追踪、检测问题并提出修复建议。

### 技能未被激活

**问题**：Agent 处理任务时没有读取技能的 `SKILL.md`。

**解决方案**：

1. **让描述更具体。** Agent 在[发现阶段](#技能的工作原理)仅从 `description` 字段选择技能。包含技能做什么、何时使用以及 Agent 可以匹配的关键词：

   ```yaml
   # Good
   description: >-
     Search the arXiv preprint repository for research papers. Use when the
     user asks about academic papers, recent research, or scientific literature.

   # Poor
   description: Helps with research.
   ```

2. **减少技能间的重叠。** 如果多个技能有相似的描述，Agent 可能跳过正确的或选错。区分描述或[合并相关技能](#编写有效的技能)。

3. **确认技能在 `skills` 数组中。** 技能只从你创建 Agent 时传入的路径或子 Agent 特定的 `skills` 参数中加载。

### 技能在启动时缺失

**问题**：Agent 在系统提示中未列出某个技能，或对 `SKILL.md` 的 `read_file` 失败。

**解决方案**：

1. **检查技能路径。** 路径必须使用正斜杠，相对于后端根目录。使用 `FilesystemBackend` 时，路径相对于 `root_dir`。使用 `StateBackend` 时，通过 `invoke(files={...})` 使用 `create_file_data()` 传入技能文件。

2. **验证 `SKILL.md` 的 [frontmatter](#frontmatter-字段)。** `name` 必须匹配父目录名并遵循 [Agent Skills 规范](https://agentskills.io/specification)。使用 [`skills-ref` 验证工具](https://github.com/agentskills/agentskills/tree/main/skills-ref)检查格式。

3. **检查文件大小。** Deep Agents 在发现期间会跳过超过 10 MB 的 `SKILL.md` 文件。

4. **检查分层来源。** 当相同技能名出现在多个来源时，[最后一个来源生效](#用法)。来自后面路径的较旧或空技能可能覆盖了你期望的技能。

### 辅助文件未找到

**问题**：Agent 读取了 `SKILL.md` 但无法访问脚本、参考或资源。

**解决方案**：

1. **从 `SKILL.md` 引用文件。** Agent 不会自动发现辅助文件。说明每个文件包含什么以及何时使用。使用从技能根目录的[相对路径](#从-skill-md-引用文件)。

2. **保持路径在技能目录内。** 文件路径相对于后端解析。确认辅助文件存在于指令引用的路径。

3. **将技能同步到沙箱。** 如果你使用[沙箱后端](/tutorials/DeepAgents/沙箱)，容器外的技能文件在复制进去之前不可用。参见[沙箱脚本](#沙箱脚本)和[使用自定义中间件同步技能和记忆](/tutorials/DeepAgents/生产环境部署)。

### 脚本无法运行

**问题**：Agent 读取了脚本但无法运行。

**解决方案**：Agent 可以从任何后端读取脚本，但运行它们需要[沙箱后端](/tutorials/DeepAgents/沙箱)。参见[用技能执行代码](#用技能执行代码)。

### 子 Agent 无法访问技能

**问题**：自定义子 Agent 看不到主 Agent 使用的技能。

**解决方案**：自定义子 Agent 不继承主 Agent 的技能。在每个[子 Agent 定义](#子-agent-的技能)中添加 `skills` 参数，指定该子 Agent 的技能来源路径。通用子 Agent 会自动从 `create_deep_agent` 继承技能。

## 参考

### 技能、记忆和工具

技能、[记忆](/tutorials/DeepAgents/记忆)（`AGENTS.md` 文件）和工具都为 Agent 提供上下文或能力。下表总结了何时选择每一种：

|              | 技能                                                       | 记忆                                                        | 工具                                                                             |
| ------------ | ---------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **目的**     | 通过渐进式披露发现的按需能力                               | 启动时加载的持久上下文                                      | Agent 可以调用的程序化操作                                                       |
| **加载**     | Agent 判定相关时才读取                                     | Agent 启动时加载                                            | 每轮都可用                                                                       |
| **格式**     | 命名目录中的 `SKILL.md`                                    | `AGENTS.md` 文件                                            | 绑定到 Agent 的函数                                                              |
| **分层**     | 用户层，然后项目层（后者覆盖）                             | 用户层，然后项目层（合并）                                  | Agent 创建时定义                                                                 |
| **何时使用** | 指令是任务特定的且可能较大                                 | 上下文始终相关（项目约定、偏好）                            | Agent 需要程序化操作，或无法访问文件系统                                          |

这些是指导原则，不是硬性边界。实际上，技能和记忆处于一个光谱上。Agent 可以在工作中更新自己的技能，捕获新流程并随时间完善指令。这样，技能可以作为一种渐进式披露的记忆形式：Agent 积累并按需检索的上下文，而不是在每次提示时都加载。

### Frontmatter 字段

[Agent Skills 规范](https://agentskills.io/specification)定义了以下 frontmatter 字段：

| 字段            | 必填 | 描述                                                                                          |
| --------------- | ---- | --------------------------------------------------------------------------------------------- |
| `name`          | 是   | 小写字母数字加连字符，1-64 字符。必须匹配父目录名。                                           |
| `description`   | 是   | 技能做什么以及何时使用。最多 1,024 字符。                                                     |
| `license`       | 否   | 许可证名称或对打包许可证文件的引用。                                                          |
| `compatibility` | 否   | 环境要求（系统包、网络访问）。最多 500 字符。                                                 |
| `metadata`      | 否   | 用于额外属性的任意键值对。                                                                    |
| `allowed-tools` | 否   | 预批准工具的空格分隔列表。实验性。                                                            |

```md
---
name: langgraph-docs
description: Use this skill for requests related to LangGraph in order to fetch relevant documentation to provide accurate, up-to-date guidance.
license: MIT
compatibility: Requires internet access for fetching documentation URLs
metadata:
  author: langchain
  version: "1.0"
allowed-tools: fetch_url
---

# langgraph-docs

Instructions for the agent go here. See [Usage](#用法) for a complete example of skill instructions.
```

::: warning
请参阅完整的 [Agent Skills 规范](https://agentskills.io/specification)了解详细约束和验证规则。在 Deep Agents 中，`SKILL.md` 文件必须小于 10 MB。超过此限制的文件会在技能加载时被跳过。
:::

更多示例技能，请参见 [Deep Agents 示例技能](https://github.com/langchain-ai/deepagentsjs/tree/main/examples/skills)。

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/skills) 翻译并二次创作。
