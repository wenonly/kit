---
title: Harness Profile
categories: DeepAgents
order: 14
date: 2026-06-25
tags:
  - DeepAgents
  - Profile
---

# Harness Profile

> 为不同 Provider 和模型打包默认配置，Deep Agents 会在选择模型时自动应用这些配置

**Harness Profile**（框架配置档案）允许你把一组配置打包起来，当 Deep Agents 选中某个 provider 或具体模型时自动应用。这些配置包括：系统提示词微调、工具描述覆盖、排除指定工具或中间件、追加额外中间件，以及对通用子 Agent 的编辑。它是你在不修改 `createDeepAgent` 调用点的前提下，针对特定模型微调框架行为的主要手段。你可以用 `HarnessProfileOptions` 来构建 Profile，用 `parseHarnessProfileConfig` 来[加载或保存 YAML/JSON 配置文件](#从配置文件加载-profile)。Deep Agents 内置了 OpenAI 和 Anthropic（Claude）模型的 Harness Profile。

::: tip 提示
Provider Profile（用于控制模型构造参数，如 `temperature`）和插件注册系统是 Python 专属功能。TypeScript SDK 仅支持 Harness Profile。
:::

## Harness Profile 详解

一个 Harness Profile 描述了 `createDeepAgent` 在构造聊天模型之后应用的提示词组装、工具可见性、中间件和默认子 Agent 调整：

```typescript
import { registerHarnessProfile } from "deepagents";

registerHarnessProfile("openai:gpt-5.5", {
  systemPromptSuffix: "Respond in under 100 words.",
  excludedTools: ["execute"],
  excludedMiddleware: ["SummarizationMiddleware"],
  generalPurposeSubagent: { enabled: false },
});
```

以下是可用的配置字段：

**`baseSystemPrompt`**（`string`）
替换 Deep Agents 的基础系统提示词（即[提示词组装](/tutorials/DeepAgents/自定义配置)中的 `CUSTOM`）。

**`systemPromptSuffix`**（`string`）
在组装后的基础提示词末尾追加文本（即[提示词组装](/tutorials/DeepAgents/自定义配置)中的 `SUFFIX`）；作用于主 Agent、声明式子 Agent 和自动添加的通用子 Agent。

**`toolDescriptionOverrides`**（`Record<string, string>`）
按工具名称覆盖单个工具的描述。

**`excludedTools`**（`string[]`）
从工具集中移除特定的框架级工具。按工具名称匹配，作为注入后的过滤器应用，因此可以同时捕获用户提供的和中间件提供的工具。

**`excludedMiddleware`**（`string[]`）
从组装的中间件栈中移除特定中间件。按每个中间件的 `.name` 属性匹配。不能包含必需的脚手架名称（`FilesystemMiddleware`、`SubAgentMiddleware`）。

**`extraMiddleware`**（`AgentMiddleware[] | (() => AgentMiddleware[])`）
在用户中间件之后追加到栈中的额外中间件。可以是静态数组，也可以是零参数工厂函数，每次构造 Agent 时返回新实例。

**`generalPurposeSubagent`**（`GeneralPurposeSubagentConfig`）
禁用、重命名或重新设置通用子 Agent 的提示词（包含 `enabled`、`description`、`systemPrompt`）。

::: tip 提示
调用方提供的 `systemPrompt` 始终位于组装提示词的最前面，而 `systemPromptSuffix` 始终位于最后面——无论选择哪个模型。相同的叠加规则也适用于子 Agent：每个子 Agent 会根据自己的模型重新运行 Profile 解析。完整的逐场景说明（主 Agent、子 Agent 和通用子 Agent）请参阅[提示词组装](/tutorials/DeepAgents/自定义配置)。
:::

::: warning
在 `excludedMiddleware` 中列出 `FilesystemMiddleware` 或 `SubAgentMiddleware` 会在构造时抛出异常——它们是必需的脚手架。如果想在不移除中间件的情况下隐藏其工具，请改用 `excludedTools`。
:::

::: details 预配置模型实例的查找顺序
当你传入预配置的聊天模型实例而非 `provider:model` 字符串时，框架会从实例中合成规范的 `provider:identifier` 键，并按以下顺序查找：

1. 精确的 `provider:identifier` 匹配
2. 仅标识符匹配（仅当标识符已包含 `:` 时）
3. 仅 Provider 回退
:::

## 注册键格式

两种 Profile 类型都使用相同的键格式：

- **Provider 级别** —— 纯 Provider 名称，如 `"openai"`，适用于该 Provider 的所有模型。
- **模型级别** —— 完全限定的 `provider:model` 键，如 `"openai:gpt-5.5"`，仅适用于该特定模型。

当 Provider 级别和模型级别的 Profile 同时存在时，它们会在解析时合并。未设置的模型级别字段从 Provider 级别 Profile 继承；显式的模型级别值会覆盖它们。

在已有键下重新注册会将新 Profile 合并到前一个之上——而不是替换。各字段的合并规则请参阅[合并语义](#合并语义)。

::: tip 提示
没有通配符键可以匹配所有 Provider。如果要在所有地方应用相同的覆盖（例如无论选择哪个模型都去掉 `TodoListMiddleware`），请在你使用的每个 Provider 键下注册 Profile。Profile 专用于依赖所选模型的调整。不依赖模型的全局调整应在 `createDeepAgent` 调用点进行。
:::

## 合并语义

| 字段                                     | 合并行为                                          |
| ---------------------------------------- | ------------------------------------------------- |
| `baseSystemPrompt`、`systemPromptSuffix` | 设置时新值生效；否则继承                          |
| `toolDescriptionOverrides`               | 按键合并映射；共享键上新值生效                    |
| `excludedTools`、`excludedMiddleware`    | 集合并集                                          |
| `extraMiddleware`                        | 按名称合并：新实例替换同名的已有实例，新条目追加  |
| `generalPurposeSubagent`                 | 按字段合并（未设置的字段继承）                    |

## Provider Profile

Provider Profile（用于控制模型构造参数，如 `temperature`）是 Python 专属功能，TypeScript SDK 中不可用。

## 从配置文件加载 Profile

对于基于 YAML/JSON 的工作流，可以使用 `parseHarnessProfileConfig`。它会验证并从具有 camelCase 键的普通对象构建 `HarnessProfile`。运行时状态——`extraMiddleware` 实例——无法在 JSON/YAML 中表示，必须通过编程方式设置。

```yaml
# profile.yaml
baseSystemPrompt: You are helpful.
systemPromptSuffix: Respond briefly.
excludedTools:
  - execute
  - grep
excludedMiddleware:
  - SummarizationMiddleware
generalPurposeSubagent:
  enabled: false
```

```typescript
import { readFileSync } from "fs";
import YAML from "yaml";
import { parseHarnessProfileConfig, registerHarnessProfile } from "deepagents";

const raw = YAML.parse(readFileSync("profile.yaml", "utf-8"));
registerHarnessProfile("openai", parseHarnessProfileConfig(raw));
```

要将 Profile 序列化回 JSON/YAML，使用 `serializeProfile`：

```typescript
import { serializeProfile } from "deepagents";

const data = serializeProfile(profile); // JSON-compatible object
```

包含非空 `extraMiddleware` 的 Profile 无法序列化——如果存在中间件实例，`serializeProfile` 会抛出异常。

## 以插件形式分发 Profile

插件注册系统（通过包入口点）是 Python 专属功能。在 TypeScript 中，请在应用启动时或包的初始化代码中直接调用 `registerHarnessProfile`。

## 相关文档

- [**Harness**](/tutorials/DeepAgents/Deep Agents 概览) —— 框架能力概览
- [**Models**](/tutorials/DeepAgents/自定义配置) —— 配置模型 Provider 和参数
- [**自定义配置**](/tutorials/DeepAgents/自定义配置) —— 完整的 `createDeepAgent` 配置面

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/profiles) 翻译并二次创作。
