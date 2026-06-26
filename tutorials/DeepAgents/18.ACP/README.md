---
title: ACP
categories: DeepAgents
order: 18
date: 2026-06-25
tags:
  - DeepAgents
  - ACP
---

# ACP

> 通过 Agent Client Protocol (ACP) 暴露 Deep Agents，与代码编辑器和 IDE 集成

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/get-started/introduction) 标准化了编程 Agent 与代码编辑器或 IDE 之间的通信。通过 ACP 协议，你可以在任何兼容 ACP 的客户端中使用自定义 Deep Agent，让你的代码编辑器提供项目上下文并接收丰富的更新。

::: tip 提示
ACP 专为 Agent-编辑器集成设计。如果你想让你的 Agent 调用外部服务器托管的工具，请参阅 [Model Context Protocol (MCP)](https://docs.langchain.com/oss/javascript/langchain/mcp/)。
:::

## 快速开始

安装 ACP 集成包：

::: code-group

```bash [npm]
npm install deepagents-acp
```

```bash [yarn]
yarn add deepagents-acp
```

```bash [pnpm]
pnpm add deepagents-acp
```

:::

然后通过 ACP 暴露一个 Deep Agent。

这会以 stdio 模式启动一个 ACP 服务器（它从 stdin 读取请求，向 stdout 写入响应）。实际使用中，你通常将其作为由 ACP 客户端（例如你的编辑器）启动的命令来运行，客户端随后通过 stdio 与服务器通信。

```typescript
import { startServer } from "deepagents-acp";

await startServer({
  agents: {
    name: "coding-assistant",
    description: "AI coding assistant with filesystem access",
  },
  workspaceRoot: process.cwd(),
});
```

你也可以在不编写任何代码的情况下使用 CLI：

```bash
npx deepagents-acp
```

- [**Deep Agents ACP on npm**](https://www.npmjs.com/package/deepagents-acp) — `deepagents-acp` 包同时提供了 CLI 和编程 API，用于通过 ACP 暴露 Deep Agent。

## 客户端

Deep Agent 可以在任何能运行 ACP Agent 服务器的地方工作。一些知名的 ACP 客户端包括：

- [Zed](https://zed.dev/docs/ai/external-agents)
- [JetBrains IDEs](https://www.jetbrains.com/help/ai-assistant/acp.html)
- Visual Studio Code（通过 [vscode-acp](https://github.com/formulahendry/vscode-acp)）
- Neovim（通过兼容 ACP 的插件）

### Zed

通过在 Zed 设置中添加你的 Deep Agent 来注册它（Linux 上为 `~/.config/zed/settings.json`，macOS 上为 `~/Library/Application Support/Zed/settings.json`）：

**简单设置（无需代码）：**

```json
{
  "agent": {
    "profiles": {
      "deepagents": {
        "name": "DeepAgents",
        "command": "npx",
        "args": ["deepagents-acp"],
        "env": {
          "ANTHROPIC_API_KEY": "sk-ant-..."
        }
      }
    }
  }
}
```

**带 CLI 选项：**

```json
{
  "agent": {
    "profiles": {
      "deepagents": {
        "name": "DeepAgents",
        "command": "npx",
        "args": [
          "deepagents-acp",
          "--name", "my-assistant",
          "--skills", "./skills",
          "--debug"
        ],
        "env": {
          "ANTHROPIC_API_KEY": "sk-ant-..."
        }
      }
    }
  }
}
```

**自定义服务器脚本：**

如需更多控制，创建一个 TypeScript 服务器脚本：

```typescript
// server.ts
import { startServer } from "deepagents-acp";

await startServer({
  agents: {
    name: "my-agent",
    description: "My custom coding agent",
    skills: ["./skills/"],
  },
});
```

然后在 Zed 中指向它：

```json
{
  "agent": {
    "profiles": {
      "my-agent": {
        "name": "My Agent",
        "command": "npx",
        "args": ["tsx", "./server.ts"]
      }
    }
  }
}
```

打开 Zed 的 Agents 面板，开始一个 Deep Agents 会话。

### ACP Registry

Deep Agents 已在 [ACP Agent Registry](https://agentclientprotocol.com/registry/index) 中注册，可在 Zed 和 JetBrains IDE 中一键安装。当 ACP 客户端支持注册表时，用户无需任何手动配置即可发现并安装 Deep Agents。

## CLI 参考

CLI 是启动 ACP 服务器最快的方式。它不需要任何代码——只需运行 `npx deepagents-acp` 并连接你的编辑器。

```bash
npx deepagents-acp [options]
```

| 选项 | 简写 | 说明 |
| --- | --- | --- |
| `--name <name>` | `-n` | Agent 名称（默认：`"deepagents"`） |
| `--description <desc>` | `-d` | Agent 描述 |
| `--model <model>` | `-m` | LLM 模型（默认：`"claude-sonnet-4-5-20250929"`） |
| `--workspace <path>` | `-w` | 工作区根目录（默认：当前工作目录） |
| `--skills <paths>` | `-s` | 逗号分隔的技能路径 |
| `--memory <paths>` | | 逗号分隔的 AGENTS.md 路径 |
| `--debug` | | 启用调试日志输出到 stderr |
| `--help` | `-h` | 显示帮助信息 |
| `--version` | `-v` | 显示版本号 |

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic/Claude 模型的 API 密钥（必需） |
| `OPENAI_API_KEY` | OpenAI 模型的 API 密钥 |
| `DEBUG` | 设为 `"true"` 启用调试日志 |
| `WORKSPACE_ROOT` | `--workspace` 标志的替代方式 |

## 编程 API

### `startServer`

便捷函数，一次调用即可创建并启动服务器：

```typescript
import { startServer } from "deepagents-acp";

const server = await startServer({
  agents: {
    name: "coding-assistant",
    description: "AI coding assistant with filesystem access",
  },
  workspaceRoot: process.cwd(),
});
```

### `DeepAgentsServer`

如需完全控制，请直接使用 `DeepAgentsServer` 类：

```typescript
import { DeepAgentsServer } from "deepagents-acp";

const server = new DeepAgentsServer({
  agents: [
    {
      name: "code-agent",
      description: "Full-featured coding assistant",
      model: "claude-sonnet-4-5-20250929",
      skills: ["./skills/"],
      memory: ["./.deepagents/AGENTS.md"],
    },
    {
      name: "reviewer",
      description: "Code review specialist",
      systemPrompt: "You are a code review expert...",
    },
  ],
  serverName: "my-deepagents-acp",
  serverVersion: "1.0.0",
  workspaceRoot: process.cwd(),
  debug: true,
});

await server.start();
```

#### 服务器选项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `agents` | `DeepAgentConfig \| DeepAgentConfig[]` | 必填 | Agent 配置（单个或数组） |
| `serverName` | `string` | `"deepagents-acp"` | ACP 服务器名称 |
| `serverVersion` | `string` | `"0.0.1"` | 服务器版本 |
| `workspaceRoot` | `string` | `process.cwd()` | 工作区根目录 |
| `debug` | `boolean` | `false` | 启用调试日志 |

#### Agent 配置

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | 唯一的 Agent 名称（必需） |
| `description` | `string` | Agent 描述 |
| `model` | `string` | LLM 模型（默认：`"claude-sonnet-4-5-20250929"`） |
| `tools` | `StructuredTool[]` | 自定义 LangChain 工具 |
| `systemPrompt` | `string` | 自定义系统提示词 |
| `middleware` | `AgentMiddleware[]` | 附加到[默认栈](/tutorials/DeepAgents/自定义配置)的自定义中间件 |
| `backend` | `AnyBackendProtocol` | 文件系统后端 |
| `skills` | `string[]` | 技能源路径 |
| `memory` | `string[]` | 记忆源路径（AGENTS.md） |
| `interruptOn` | `Record<string, boolean \| InterruptOnConfig>` | 需要用户审批的工具（HITL） |
| `commands` | `Array<{ name, description, input? }>` | 自定义斜杠命令 |

## 自定义

### 多 Agent

你可以从单个服务器暴露多个 Agent。ACP 客户端在创建会话时选择使用哪个 Agent：

```typescript
const server = new DeepAgentsServer({
  agents: [
    { name: "code-agent", description: "General coding" },
    { name: "reviewer", description: "Code reviews" },
  ],
});
```

::: tip 提示
某些 ACP 客户端（如 Zed）目前没有提供在 Agent 之间选择的 UI。在这种情况下，考虑为每个 Agent 运行独立的服务器实例，每个实例只包含一个 Agent。
:::

### 斜杠命令

服务器向 IDE 注册内置的斜杠命令：`/plan`、`/agent`、`/ask`、`/clear` 和 `/status`。你还可以为每个 Agent 定义自定义命令：

```typescript
const server = new DeepAgentsServer({
  agents: {
    name: "my-agent",
    commands: [
      { name: "test", description: "Run the project's test suite" },
      { name: "lint", description: "Run linter and fix issues" },
      {
        name: "deploy",
        description: "Deploy to staging",
        input: { hint: "environment (staging or production)" },
      },
    ],
  },
});
```

### 人机协作

使用 `interruptOn` 在 Agent 运行敏感工具之前要求 IDE 中的用户审批：

```typescript
const server = new DeepAgentsServer({
  agents: {
    name: "careful-agent",
    interruptOn: {
      execute: { allowedDecisions: ["approve", "edit", "reject"] },
      write_file: true,
    },
  },
});
```

当 Agent 调用受保护的工具时，IDE 会提示用户允许或拒绝该操作，并可选择为当前会话记住该决定。

### 自定义工具

```typescript
import { DeepAgentsServer } from "deepagents-acp";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const searchTool = tool(
  async ({ query }) => {
    return `Results for: ${query}`;
  },
  {
    name: "search",
    description: "Search the codebase",
    schema: z.object({ query: z.string() }),
  },
);

const server = new DeepAgentsServer({
  agents: {
    name: "search-agent",
    tools: [searchTool],
  },
});

await server.start();
```

### 自定义后端

```typescript
import { DeepAgentsServer } from "deepagents-acp";
import { CompositeBackend, FilesystemBackend, StateBackend } from "deepagents";

const server = new DeepAgentsServer({
  agents: {
    name: "custom-agent",
    backend: new CompositeBackend({
      routes: [
        {
          prefix: "/workspace",
          backend: new FilesystemBackend({ rootDir: "./workspace" }),
        },
        { prefix: "/", backend: new StateBackend() },
      ],
    }),
  },
});

await server.start();
```

### 技能与记忆

```typescript
import { startServer } from "deepagents-acp";

await startServer({
  agents: {
    name: "project-agent",
    description: "Agent with project-specific knowledge",
    skills: ["./skills/", "~/.deepagents/skills/"],
    memory: ["./.deepagents/AGENTS.md"],
  },
  workspaceRoot: process.cwd(),
});
```

::: tip 提示
有关协议详情和编辑器支持，请参阅上游 ACP 文档：

- 介绍：[https://agentclientprotocol.com/get-started/introduction](https://agentclientprotocol.com/get-started/introduction)
- 客户端/编辑器：[https://agentclientprotocol.com/get-started/clients](https://agentclientprotocol.com/get-started/clients)
:::

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/acp) 翻译并二次创作。
