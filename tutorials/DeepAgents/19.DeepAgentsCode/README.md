---
title: Deep Agents Code
categories: DeepAgents
order: 19
date: 2026-06-25
tags:
  - DeepAgents
  - Code
---

# Deep Agents Code

> 基于 Deep Agents SDK 构建的终端编程 Agent

Deep Agents Code（`dcode`）是一个开源的终端编程 Agent，构建在 [Deep Agents SDK](/tutorials/DeepAgents/快速开始) 之上。它可以与任意大语言模型配合使用，并且支持在会话过程中随时切换模型提供商或模型本身。通过持久化记忆，它能在不同对话之间携带上下文；通过可自定义的技能（Skills），你可以塑造它的行为方式；而审批控制则为代码执行提供了安全门控。

## 快速开始

### 1. 安装并启动

```bash
curl -LsSf https://langch.in/dcode | bash
```

### 2. 添加提供商凭证

Deep Agents Code 可以与任何支持工具调用的大语言模型协作。OpenAI、Anthropic 和 Google 开箱即用。

使用 `/auth` 命令来连接提供商。完整的提供商列表和凭证详情请参阅[模型提供商](/tutorials/DeepAgents/Deep Agents Code)。

::: tip 提示
网络搜索使用 [Tavily](https://tavily.com)。你可以通过 `/auth` 添加密钥，或设置 `TAVILY_API_KEY` 环境变量。详见[启用网络搜索](/tutorials/DeepAgents/Deep Agents Code)。
:::

### 3. 选择模型（可选）

在会话中运行 `/model` 打开交互式模型选择器，或在启动时通过 `--model` 参数指定：

```bash
dcode --model anthropic:claude-opus-4-8
dcode --model openai:gpt-5.5
dcode --model fireworks:accounts/fireworks/models/deepseek-v4-pro
dcode --model baseten:moonshotai/Kimi-K2.7-Code
```

完整的提供商列表、开源权重模型选项和凭证详情，请参阅[模型提供商](/tutorials/DeepAgents/Deep Agents Code)。

### 4. 给 Agent 一个任务

```txt
Create a Python script that prints "Hello, World!"
```

Agent 会理解你的意图，在修改文件之前先以 diff 形式展示提议的变更，等待你批准后再执行。如果需要，它还可以运行 Shell 命令来测试代码、查阅文档或搜索网络以获取最新信息。

### 5. 启用追踪（可选）

要将 Agent 的操作、工具调用和决策过程记录到 LangSmith 中，请在 `~/.deepagents/.env` 中添加以下配置，或在 Shell 中导出这些环境变量：

```bash title="~/.deepagents/.env"
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=optional-project-name  # Specify a project name or default to "deepagents-code"
```

更多详情和用法，请参阅[使用 LangSmith 追踪](#使用-langsmith-追踪)。

::: tip 提示
Deep Agents Code 官方不支持 Windows。Windows 用户可以尝试在 [Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install) 下运行。
:::

## 核心能力

Deep Agents Code 内置了以下能力：

- **文件操作** — 读取、写入和编辑磁盘上的文件。
- **Shell 执行** — 执行命令来运行测试、构建项目、管理依赖以及与版本控制交互。
- **[远程沙箱](/tutorials/DeepAgents/Deep Agents Code)** — 在远程环境中运行 Agent 工具，而非本地机器。
- **网络搜索** — 搜索网络以获取最新信息和文档。需要 [Tavily API 密钥](/tutorials/DeepAgents/Deep Agents Code)。
- **任务规划与跟踪** — 将复杂任务分解为离散步骤并跟踪进度。
- **[子 Agent](/tutorials/DeepAgents/Deep Agents Code)** — 将工作委托给针对特定任务的子 Agent。
- **[记忆存储与检索](/tutorials/DeepAgents/Deep Agents Code)** — 跨会话存储和检索信息，使 Agent 能记住项目规范和已学习的模式。
- **上下文压缩与卸载** — 汇总较旧的对话消息并将原始消息卸载到存储中。
- **人机协作** — 对敏感工具操作要求人工审批。
- **[技能](/tutorials/DeepAgents/Deep Agents Code)** — 通过自定义专业知识和指令扩展 Agent 能力。
- **[MCP 工具](/tutorials/DeepAgents/Deep Agents Code)** — 从 [Model Context Protocol](https://modelcontextprotocol.io/) 服务器加载外部工具。
- **[追踪](#使用-langsmith-追踪)** — 在 LangSmith 中追踪 Agent 操作，用于可观测性和调试。

::: details 完整的内置工具列表
## 内置工具

Agent 自带以下工具，无需额外配置即可使用：

| 工具                      | 描述                                                                                                              | 人机协作             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------- |
| `ls`                      | 列出文件和目录                                                                                                    | -                    |
| `read_file`               | 读取文件内容；对图片、音频、视频和 PDF 返回多模态块                                                              | -                    |
| `write_file`              | 创建或覆盖文件                                                                                                    | 需审批<sup>1</sup>   |
| `edit_file`               | 对现有文件进行精确编辑                                                                                            | 需审批<sup>1</sup>   |
| `glob`                    | 查找匹配模式的文件                                                                                                | -                    |
| `grep`                    | 跨文件搜索文本模式                                                                                                | -                    |
| `execute`                 | 在本地或[远程沙箱](/tutorials/DeepAgents/沙箱)中执行 Shell 命令                                                   | 需审批<sup>1</sup>   |
| `web_search`              | 使用 Tavily 搜索网络（见[启用网络搜索](/tutorials/DeepAgents/Deep Agents Code)）                                    | 需审批<sup>1</sup>   |
| `fetch_url`               | 获取网页并转换为 Markdown                                                                                         | 需审批<sup>1</sup>   |
| `task`                    | 将工作委托给[子 Agent](/tutorials/DeepAgents/子 Agent) 进行并行执行<sup>3</sup>                                    | 需审批<sup>1</sup>   |
| `ask_user`                | 向用户提出自由格式或选择题形式的问题                                                                              | -                    |
| `compact_conversation`    | 汇总较旧的消息，将原始消息卸载到后端存储，并用摘要替换上下文中的原始内容                                          | 混合<sup>2</sup>     |
| `write_todos`             | 为复杂工作创建和管理任务列表                                                                                      | -                    |
| `get_current_thread_id`   | 返回当前线程 ID，供 LangSmith 或 MCP 工具使用                                                                      | -                    |

<sup>1</sup>：潜在破坏性操作在执行前需要用户审批。要跳过人工审批，你可以切换自动审批模式（Shift+Tab）或使用以下选项启动：

```bash
dcode --auto-approve
# shorter alias:
dcode -y
```

::: tip 提示
非交互模式默认禁用 Shell。使用 `-S`/`--shell-allow-list`（或 `DEEPAGENTS_CODE_SHELL_ALLOW_LIST`）设置允许列表。使用 `recommended` 可获得只读安全默认值，或使用 `all` 允许所有命令。详见[非交互模式与管道](#非交互模式与管道)。
:::

<sup>2</sup>：当 token 使用量超过模型感知阈值时，Deep Agents Code 会在后台自动卸载对话。卸载过程通过 LLM 汇总较旧的消息，将原始消息弹出至存储（`/conversation_history/{thread_id}.md`），并用摘要替换上下文中的原始内容。如果需要，Agent 仍可从卸载的文件中检索完整历史。`compact_conversation` 工具允许 Agent（或你）按需触发卸载。作为工具调用时，默认需要用户审批。

<sup>3</sup>：当通过 `config.toml` 中的 `[async_subagents]` 段配置了异步子 Agent 时（见[异步子 Agent](/tutorials/DeepAgents/子 Agent)），会启用额外工具：`start_async_task`、`update_async_task` 和 `cancel_async_task`（均需审批），以及 `check_async_task` 和 `list_async_tasks`。
:::

## 命令参考

```bash
# Use a specific agent configuration
dcode --agent mybot

# Use a specific model (provider:model format or auto-detect)
dcode --model anthropic:claude-opus-4-8
dcode --model gpt-5.5

# Auto-approve tool usage (skip human-in-the-loop prompts)
dcode -y

# list directory contents, then summarize directory as first prompt—the command runs first, then the prompt is submitted
# the prompt does NOT have access to the command output
dcode --startup-cmd "ls -la" -m "Summarize what's in this directory"

# Non-interactive with startup command: show git status before the task runs
# the task does NOT have access to the command output
dcode --startup-cmd "git diff --stat" -n "Review these changes"
```

::: details 命令行选项
| 选项                            | 描述                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-a`, `--agent NAME`            | 使用具名 Agent（拥有独立记忆）。覆盖 `config.toml` 中的 `[agents].recent`。默认：`agent`（若设置了 `[agents].recent` 则使用最近使用的 Agent）                                                                                                                                                                                                                                             |
| `-M`, `--model MODEL`           | 使用特定模型（`provider:model` 格式）                                                                                                                                                                                                                                                                                                                                                   |
| `--model-params JSON`           | 以 JSON 字符串传递给模型的额外参数（如 `'{"temperature": 0.7}'`）                                                                                                                                                                                                                                                                                                                        |
| `--max-retries N`               | 覆盖瞬时模型错误的最大重试次数                                                                                                                                                                                                                                                                                                                                                          |
| `--default-model [MODEL]`       | 设置[默认模型](/tutorials/DeepAgents/Deep Agents Code)（省略 `MODEL` 查看当前默认值）                                                                                                                                                                                                                                                                                                      |
| `--clear-default-model`         | 清除[默认模型](/tutorials/DeepAgents/Deep Agents Code)                                                                                                                                                                                                                                                                                                                                     |
| `-r`, `--resume [ID]`           | 恢复会话：`-r` 恢复最近的会话，`-r <ID>` 恢复指定线程                                                                                                                                                                                                                                                                                                                                    |
| `-m`, `--message TEXT`          | 会话启动时自动提交的初始提示（交互模式）                                                                                                                                                                                                                                                                                                                                                |
| `--skill NAME`                  | 启动时调用某个技能                                                                                                                                                                                                                                                                                                                                                                      |
| `--startup-cmd CMD`             | 在首个提示之前、启动时运行的 Shell 命令。输出会在记录中渲染供你参考，但**不会**添加到 Agent 的消息历史中。要将命令输出传给 Agent，请通过 stdin 管道传入（如 `git diff \| dcode -n "Review these changes"`）。非零退出码和超时会发出警告但不会中止；非交互模式应用 60 秒超时。                                                                                                       |
| `-n`, `--non-interactive TEXT`  | 非交互式运行单个任务并退出。除非设置了 `--shell-allow-list`，否则 Shell 被禁用                                                                                                                                                                                                                                                                                                          |
| `--max-turns N`                 | 限制非交互模式下的 Agent 轮次。超出时以退出码 124 退出。需要 `-n` 或管道 stdin。见[用 `--max-turns` 限制轮次](#非交互模式与管道)                                                                                                                                                                                                                                                          |
| `--timeout SECONDS`             | 非交互模式的硬性墙钟超时。超出时以退出码 124 退出。需要 `-n` 或管道 stdin。见[用 `--timeout` 限制墙钟时间](#非交互模式与管道)                                                                                                                                                                                                                                                              |
| `-q`, `--quiet`                 | 为管道输出提供干净输出——只有 Agent 的响应会输出到 stdout。需要 `-n` 或管道 stdin                                                                                                                                                                                                                                                                                                        |
| `--no-stream`                   | 缓冲完整响应并一次性写入 stdout，而非流式输出。需要 `-n` 或管道 stdin                                                                                                                                                                                                                                                                                                                    |
| `--stdin`                       | 显式从 stdin 读取输入，而非自动检测。当 stdin 不可用或是 TTY 时会明确报错                                                                                                                                                                                                                                                                                                                |
| `-y`, `--auto-approve`          | 自动审批所有工具调用，不弹出提示（禁用人机协作）。在交互式会话中可用 `Shift+Tab` 切换                                                                                                                                                                                                                                                                                                    |
| `-S`, `--shell-allow-list LIST` | 逗号分隔的自动审批 Shell 命令列表，`'recommended'` 使用安全默认值，`'all'` 允许所有命令。同时适用于 `-n` 和交互模式                                                                                                                                                                                                                                                                       |
| `--json`                        | 从管理子命令输出机器可读的 JSON（`agents`、`threads`、`skills`、`update`）。输出封装：`{"schema_version": 1, "command": "...", "data": ...}`                                                                                                                                                                                                                                              |
| `--sandbox TYPE`                | 代码执行的远程沙箱：`none`（默认）、`langsmith`、`agentcore`、`daytona`、`modal`、`runloop`、`e2b`。LangSmith 已内置；AgentCore、Daytona、Modal 和 Runloop 需要额外安装；E2B 需要安装 `langchain-e2b` 包                                                                                                                                                                                  |
| `--sandbox-id ID`               | 复用已有沙箱（跳过创建和清理）                                                                                                                                                                                                                                                                                                                                                          |
| `--sandbox-snapshot-name NAME`  | 要使用或创建的沙箱快照名称（仅 LangSmith）                                                                                                                                                                                                                                                                                                                                              |
| `--sandbox-setup PATH`          | 沙箱创建后运行的设置脚本路径                                                                                                                                                                                                                                                                                                                                                            |
| `--mcp-config PATH`             | 添加显式 MCP 配置作为最高优先级来源（与自动发现的配置合并）                                                                                                                                                                                                                                                                                                                              |
| `--no-mcp`                      | 禁用所有 MCP 工具加载                                                                                                                                                                                                                                                                                                                                                                   |
| `--trust-project-mcp`           | 信任项目级 MCP 配置中的 stdio 服务器（跳过审批提示）                                                                                                                                                                                                                                                                                                                                    |
| `--interpreter`                 | 在主 Agent 上启用 JS 解释器（`js_eval`）中间件。仅限本地模式；需要 `quickjs` 可选依赖                                                                                                                                                                                                                                                                                                    |
| `--interpreter-tools VALUE`     | `js_eval` 的 PTC 允许列表：`safe`、`all` 或逗号分隔的工具名称列表。默认：无 PTC（纯 REPL）                                                                                                                                                                                                                                                                                               |
| `--profile-override JSON`       | 以 JSON 字符串覆盖模型配置字段（如 `'{"max_input_tokens": 4096}'`）。合并到配置文件的 profile 覆盖之上                                                                                                                                                                                                                                                                                   |
| `--acp`                         | 通过 stdio 作为 ACP 服务器运行，而非启动交互式 UI                                                                                                                                                                                                                                                                                                                                        |
| `--update`                      | 检查并安装更新，然后退出                                                                                                                                                                                                                                                                                                                                                                |
| `--auto-update`                 | 开启或关闭自动更新，然后退出                                                                                                                                                                                                                                                                                                                                                            |
| `--install NAME`                | 安装可选额外依赖（如 `quickjs`、`daytona`、`fireworks`），然后退出。添加 `--package` 可将 `NAME` 视为通过 `uv --with` 安装的自定义提供商包而非额外依赖（见[任意提供商](/tutorials/DeepAgents/Deep Agents Code)），添加 `--yes` 可跳过确认提示                                                                                                                                                |
| `-v`, `--version`               | 显示版本号                                                                                                                                                                                                                                                                                                                                                                              |
| `-h`, `--help`                  | 显示帮助信息                                                                                                                                                                                                                                                                                                                                                                            |
:::

::: details CLI 命令
| 命令                                              | 描述                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dcode help`                                      | 显示帮助                                                                                                                                                                                                                                                                                                                                                                                  |
| `dcode agents list`                               | 列出所有 Agent（别名：`ls`）                                                                                                                                                                                                                                                                                                                                                              |
| `dcode agents reset --agent NAME`                 | 清除 Agent 记忆并重置为默认值。支持 `--dry-run`                                                                                                                                                                                                                                                                                                                                           |
| `dcode agents reset --agent NAME --target SOURCE` | 从其他 Agent 复制记忆                                                                                                                                                                                                                                                                                                                                                                     |
| `dcode update`                                    | 检查并安装 Deep Agents Code 更新                                                                                                                                                                                                                                                                                                                                                         |
| `dcode skills list [--project]`                   | 列出所有技能（别名：`ls`）                                                                                                                                                                                                                                                                                                                                                                |
| `dcode skills create NAME [--project]`            | 使用模板 `SKILL.md` 创建新技能。幂等操作——重新创建已存在的技能会打印信息提示而非报错                                                                                                                                                                                                                                                                                                     |
| `dcode skills info NAME [--project]`              | 显示技能详细信息                                                                                                                                                                                                                                                                                                                                                                          |
| `dcode skills delete NAME [--project] [-f]`       | 删除技能及其内容。支持 `--dry-run`                                                                                                                                                                                                                                                                                                                                                        |
| `dcode threads list [--agent NAME] [--limit N]`   | 列出会话（别名：`ls`）。默认限制：20。`-n` 是 `--limit` 的短标志。附加标志：`--sort {created,updated}`、`--branch TEXT`（按 git 分支过滤）、`--cwd [PATH]`（按工作目录过滤；裸标志使用当前目录）、`-v`/`--verbose`（显示包括分支、创建时间和初始提示在内的所有列）、`-r`/`--relative`（相对时间戳） |
| `dcode threads delete ID`                         | 删除会话。支持 `--dry-run`                                                                                                                                                                                                                                                                                                                                                                |
| `dcode mcp login NAME [--mcp-config PATH]`        | 为标记为 `auth: "oauth"` 的 MCP 服务器运行 OAuth 登录流程。见 [MCP 工具](/tutorials/DeepAgents/Deep Agents Code)                                                                                                                                                                                                                                                                            |
| `dcode mcp config`                                | 显示 MCP 配置发现路径                                                                                                                                                                                                                                                                                                                                                                     |
| `dcode config show`                               | 显示每个配置选项的有效值及其来源。见[检查配置](/tutorials/DeepAgents/Deep Agents Code)                                                                                                                                                                                                                                                                                                      |
| `dcode config list`                               | 列出所有可用配置选项及其类型、默认值和可设置位置（别名：`ls`）                                                                                                                                                                                                                                                                                                                            |
| `dcode config get KEY`                            | 显示单个选项的有效值和来源（如 `interpreter.memory_limit_mb`）                                                                                                                                                                                                                                                                                                                            |
| `dcode config path`                               | 显示配置文件位置及每个文件是否存在                                                                                                                                                                                                                                                                                                                                                        |

所有管理子命令都支持 `--json` 输出机器可读格式。详见[命令行选项](#命令行选项)。

破坏性命令（`agents reset`、`skills delete`、`threads delete`）支持 `--dry-run` 来预览将要发生的操作而不做实际更改。在 JSON 模式下，`--dry-run` 返回相同的封装格式，但带有 `dry_run: true` 字段。
:::

## 配置

完整的配置参考——包括 `config.toml` schema、提供商参数、profile 覆盖和 hook 配置——请参阅[配置](/tutorials/DeepAgents/自定义配置)。

Deep Agents Code 将所有配置存储在 `~/.deepagents/` 目录下。在该目录中，每个 Agent 都有自己的子目录（默认：`agent`）：

| 路径                          | 用途                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `~/.deepagents/config.toml`   | 模型和 Agent 默认值、提供商设置、构造器参数、profile 覆盖、主题、更新设置                                   |
| `~/.deepagents/.env`          | 全局 API 密钥和密钥。见[配置](/tutorials/DeepAgents/Deep Agents Code)                                         |
| `~/.deepagents/hooks.json`    | [生命周期事件钩子](/tutorials/DeepAgents/Deep Agents Code)（会话开始/结束、任务完成等）                       |
| `~/.deepagents/<agent_name>/` | 每个 Agent 的记忆、技能和对话线程                                                                          |
| `.deepagents/`（项目根目录）  | 项目特定的记忆和技能，在 git 仓库中运行时加载                                                              |

## 交互模式

像在聊天界面中一样自然地输入即可。Agent 会使用其内置工具、技能和记忆来帮助你完成任务。

::: details 斜杠命令
在 Deep Agents Code 会话中使用以下命令：

- `/model` — 切换模型或打开交互式模型选择器。
- `/agents` — 在预配置的 Agent 之间热切换，无需重新启动。详见[命令参考](#命令参考)。
- `/auth` — 管理模型提供商和服务（如 Tavily 网络搜索）的已存储 API 密钥。详见[提供商凭证](/tutorials/DeepAgents/Deep Agents Code)。
- `/remember [context]` — 审查对话并更新记忆和技能。可选传入额外上下文。
- `/skill:<name> [args]` — 按名称直接调用技能。技能的 `SKILL.md` 指令会连同你提供的参数一起注入到提示中。
- `/skill-creator [task]` — 创建高效 Agent 技能的向导。
- `/offload`（别名 `/compact`） — 通过将消息卸载到存储并用摘要占位符替换来释放上下文窗口空间。如果需要，Agent 可以从卸载的文件中检索完整历史。
- `/tokens` — 显示当前上下文窗口的 token 使用情况明细。
- `/clear` — 清除对话历史并开始新线程。
- `/copy` — 将最新的助手消息复制到剪贴板。
- `/threads` — 浏览和恢复之前的对话线程。
- `/mcp [login <server> \| reconnect]` — 显示活跃的 MCP 服务器和工具。`login <server>` 运行服务器的 OAuth 流程；`reconnect` 加载延迟的登录。
- `/notifications` — 配置启动警告偏好。
- `/reload` — 重新读取 `.env` 文件、刷新配置并重新发现技能，无需重启。对话状态会被保留。覆盖行为见 [`DEEPAGENTS_CODE_` 前缀](/tutorials/DeepAgents/Deep Agents Code)。
- `/theme` — 打开交互式主题选择器来切换配色主题。内置主题以及任何[用户自定义主题](/tutorials/DeepAgents/Deep Agents Code)均可使用。
- `/update` — 在线检查并安装 Deep Agents Code 更新。会自动检测安装方式（uv、Homebrew、pip）并运行相应的升级命令。
- `/auto-update` — 开启或关闭自动更新。
- `/install` — 安装可选额外依赖（如 `quickjs`、`daytona`、`fireworks`）。
- `/trace` — 在 LangSmith 中打开当前线程（需要 `LANGSMITH_API_KEY`）。
- `/editor` — 在外部编辑器中打开当前提示（`$VISUAL` / `$EDITOR`）。见[外部编辑器](/tutorials/DeepAgents/Deep Agents Code)。
- `/timestamps` — 切换消息时间戳页脚。
- `/changelog` — 在浏览器中打开 Deep Agents Code 更新日志。
- `/docs` — 在浏览器中打开文档。
- `/feedback` — 打开 GitHub Issues 页面提交 bug 报告或功能请求。
- `/version` — 显示已安装的 `deepagents-code` 和 SDK 版本。
- `/help` — 显示帮助和可用命令。
- `/quit` — 退出应用。
:::

::: details Shell 命令
输入 `!` 进入 Shell 模式，然后输入你的命令。

```bash
git status
npm test
ls -la
```
:::

::: details 键盘快捷键
**通用**

| 快捷键                                                 | 动作                                   |
| ------------------------------------------------------ | -------------------------------------- |
| `Enter`                                                | 提交提示                               |
| `Shift+Enter`、`Ctrl+J`、`Alt+Enter` 或 `Ctrl+Enter`   | 插入换行                               |
| `@filename`                                            | 自动补全文件并注入内容                 |
| `Shift+Tab` 或 `Ctrl+T`                                | 切换自动审批                           |
| `Ctrl+X`                                               | 在外部编辑器中打开提示                 |
| `Ctrl+N`                                               | 查看待处理通知                         |
| `Ctrl+O`                                               | 展开/折叠最近的工具输出               |
| `Escape`                                               | 中断当前操作                           |
| `Ctrl+C`                                               | 中断或退出                             |
| `Ctrl+D`                                               | 退出                                   |

**提示中的文本编辑**

聊天输入使用标准的 readline 风格绑定：

| 快捷键                       | 动作                       |
| ---------------------------- | -------------------------- |
| `Ctrl+A` 或 `Home`           | 光标移到行首               |
| `Ctrl+E` 或 `End`            | 光标移到行尾               |
| `Ctrl+U`                     | 从光标删除到行首           |
| `Ctrl+K`                     | 从光标删除到行尾           |
| `Ctrl+W` 或 `Ctrl+Backspace` | 删除左边的单词             |
| `Ctrl+Left` / `Ctrl+Right`   | 光标左右移动一个单词       |

::: tip 提示
**macOS 上的 `Cmd+Left` / `Cmd+Right` / `Cmd+Delete`**

终端模拟器会在 `Cmd` 修饰键到达运行的应用程序之前就拦截它们，因此 Deep Agents Code 永远不会直接收到这些按键。相反，终端会将它们转换为上面的 readline 快捷键。

- **Ghostty：** 开箱即用。`Cmd+Left`、`Cmd+Right` 和 `Cmd+Delete` 默认被转换为 `Ctrl+A`、`Ctrl+E` 和 `Ctrl+U`。
- **iTerm2：** 默认未绑定。在 **Settings → Profiles → Keys → Key Mappings** 下以 `Send Text with vim special chars` 方式添加：
  - `Cmd+Left` → `\x01`（Ctrl+A）
  - `Cmd+Right` → `\x05`（Ctrl+E）
  - `Cmd+Delete` → `\x15`（Ctrl+U）
- **Terminal.app：** 没有原生 UI 可进行此重映射。请直接使用基于 `Ctrl` 的快捷键。

按词移动（`Option+Left` / `Option+Right`）以相同方式处理：终端发送 `Esc+b` / `Esc+f`，Deep Agents Code 将其解释为按词左移/右移。
:::
:::

## 非交互模式与管道

使用 `-n` 在不启动交互式 UI 的情况下运行单个任务：

```bash
dcode -n "Write a Python script that prints hello world"
```

每次非交互式运行都会启动一个新线程——对话历史不会在调用之间携带。基于文件的状态（记忆、技能、配置）会持久化保存。

你也可以通过 stdin 管道传入输入。当通过管道传入时，Deep Agents Code 会自动以非交互模式运行：

```bash
echo "Explain this code" | dcode
cat error.log | dcode -n "What's causing this error?"
git diff | dcode -n "Review these changes"
git diff | dcode --skill code-review -n 'summarize changes'
```

当你将管道输入与 `-n` 或 `-m` 结合使用时，管道内容会出现在前面，后面跟上传给标志的文本。

::: tip 提示
管道输入的最大大小为 10 MiB。
:::

非交互模式下默认禁用 Shell 执行。使用 `-S`/`--shell-allow-list` 来启用特定命令（如 `-S "pytest,git,make"`），`recommended` 使用安全默认值，`all` 允许所有命令。

::: details 限制轮次
CI/CD 管道中长时间运行或行为异常的 Agent 可能会无限循环。`--max-turns N` 为操作者提供了一个硬性上限，无需触碰 SDK 内部：

```bash
dcode -n "fix the failing tests" --max-turns 10
```

`N` 必须是正整数，它覆盖了原本用于限制失控循环的内部安全默认值。超出预算时以退出码 124 退出（与 GNU `timeout` 一致），以便 CI 区分预算超限和一般性失败。需要 `-n` 或管道 stdin；否则以退出码 2 退出。

如果需要基于时间的限制而非轮次限制（或两者结合），请参阅[用 `--timeout` 限制墙钟时间](#非交互模式与管道)。
:::

::: details 限制墙钟时间
`--timeout SECONDS` 对非交互式运行强制执行硬性墙钟限制。它以时间预算补充 `--max-turns`（轮次计数）——哪个限制先到达就取消 Agent。

```bash
# Fail fast in CI if the task takes more than 2 minutes
dcode -n "run the test suite and summarise failures" --timeout 120

# Combine with --max-turns—whichever limit is hit first stops the agent
dcode -n "refactor auth module" --timeout 300 --max-turns 20
```

超时时 Agent 被取消，进程以退出码 124 退出——与 `--max-turns` 使用的退出码相同，因此 CI 可以统一处理两种预算超限。需要 `-n` 或管道 stdin；否则以退出码 2 退出。
:::

::: details 干净输出与缓冲
使用 `-q` 获得适合管道传入其他命令的干净输出，使用 `--no-stream` 在写入 stdout 之前缓冲完整响应（而非流式输出）：

```bash
dcode -n "Generate a .gitignore for Python" -q > .gitignore
dcode -n "List dependencies" -q --no-stream | sort
```

在非交互模式下，Agent 会被指示做出合理假设并自主推进，而不是提出澄清问题。它也会优先使用非交互式命令变体（如 `npm init -y`、`apt-get install -y`）。
:::

::: details Shell 执行示例
```bash
# Allow specific commands (validated against the list)
dcode -n "Run the tests and fix failures" -S "pytest,git,make"

# Use the curated safe-command list
dcode -n "Build the project" -S recommended

# Allow any shell command
dcode -n "Fix the build" -S all
```
:::

::: warning
**谨慎使用。**

`-S all`（或 `--shell-allow-list all`）允许 Agent 执行任意 Shell 命令，无需人工确认。
:::

## 使用 LangSmith 追踪

启用 [LangSmith](https://smith.langchain.com?utm_source=docs&utm_medium=cta&utm_campaign=langsmith-signup&utm_content=oss-deepagents-code-overview) 追踪，可以在 LangSmith 项目中查看 Agent 的操作、工具调用和决策过程。

将你的追踪密钥添加到 `~/.deepagents/.env` 中，这样每次会话都会自动启用追踪，无需每个 Shell 单独导出：

```bash title="~/.deepagents/.env"
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=optional-project-name  # Specify a project name or default to "deepagents-code"
```

要为特定项目覆盖配置，请在项目目录的 `.env` 文件中添加相同的密钥。完整的加载顺序请参阅[环境变量](/tutorials/DeepAgents/Deep Agents Code)。

如果你愿意，也可以将这些设置为 Shell 环境变量。Shell 导出始终优先于 `.env` 值，因此这是临时覆盖或测试的好选择：

```bash
export LANGSMITH_TRACING=false
```

::: details 将 Agent 追踪与应用追踪分开
Deep Agents Code 可能产生两种 LangSmith 追踪：

- `Agent traces` 是 Deep Agents Code 自身的模型调用、工具调用、编排和中间件。
- `Shell-command traces` 是由 Deep Agents Code 在 Shell 中为你运行的代码（如测试、脚本或本地 LangGraph 应用）发出的追踪。

要将 Deep Agents Code 自身的追踪发送到专用项目，请设置 `DEEPAGENTS_CODE_LANGSMITH_PROJECT`：

```bash title="~/.deepagents/.env"
# Example value; use any LangSmith project name you want.
DEEPAGENTS_CODE_LANGSMITH_PROJECT=deepagents-code
```

然后为你的应用追踪配置 `LANGSMITH_PROJECT`：

```bash title=".env"
LANGSMITH_PROJECT=customer-support-agent
```

例如，假设你让 Deep Agents Code 调试一个失败的 LangGraph 测试：

```bash
uv run pytest tests/test_escalation_flow.py
```

如果该测试在启用了 LangSmith 追踪的情况下运行你的应用，那么这些应用追踪由 Shell 进程创建，会发送到 `customer-support-agent`。Deep Agents Code 自身的推理和工具使用追踪则发送到 `deepagents-code`。

你还可以使用 [`DEEPAGENTS_CODE_` 前缀](/tutorials/DeepAgents/Deep Agents Code)（如 `DEEPAGENTS_CODE_LANGSMITH_API_KEY`）将 LangSmith 凭证范围限定到 Deep Agents Code。
:::

::: details 将追踪双写到第二个项目
要将 Agent 追踪镜像到第二个 LangSmith 项目，请设置 `DEEPAGENTS_CODE_LANGSMITH_REPLICA_PROJECTS`。这对于将相同的追踪同时发送到个人项目和共享团队项目非常有用。

```bash title="~/.deepagents/.env"
DEEPAGENTS_CODE_LANGSMITH_REPLICA_PROJECTS=team-shared
```

设置该变量且追踪处于活动状态时，每次 Agent 运行都会同时写入主项目（`DEEPAGENTS_CODE_LANGSMITH_PROJECT`，或默认的 `deepagents-code`）和你在此指定的项目。取消设置该变量则照常写入单个项目。
:::

配置完成后，Deep Agents Code 会显示一行带有 LangSmith 项目链接的状态信息。在支持的终端中，点击链接即可直接打开。你也可以使用 `/trace` 打印 URL 并在浏览器中打开。

```sh
✓ LangSmith tracing: 'my-project'
```

::: tip 提示
我们建议你还设置 [LangSmith Engine](https://docs.langchain.com/langsmith/engine)，它会监控你的追踪、检测问题并提出修复建议。
:::

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/code/overview) 翻译并二次创作。
