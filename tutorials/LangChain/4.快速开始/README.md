---
title: 快速开始
categories: LangChain
order: 4
date: 2026-06-24
tags:
  - LangChain
---

# 快速开始

本篇将带你用几分钟时间创建一个功能完整的 AI 代理（Agent）。我们将从一个简单的天气代理开始，然后逐步构建一个能够分析文学作品的真实研究代理。

> **使用 AI 编程助手？** 可以安装 LangChain Docs MCP server，让你的 AI 助手获取最新的 LangChain 文档和示例；还可以安装 LangChain Skills 来提升代理在 LangChain 生态任务中的表现。

## 安装依赖

首先安装必要的包：

```bash
npm install deepagents langchain @langchain/core
# Requires Node.js 22+
```

## 配置 API Key

从任意支持的模型提供商获取 API Key（例如 Google Gemini 或 OpenAI），然后设置环境变量。

以 OpenAI 为例：

```bash
export OPENAI_API_KEY="your-api-key"
```

以 Google Gemini 为例：

```bash
export GOOGLE_API_KEY="your-api-key"
```

以 Anthropic 为例：

```bash
export ANTHROPIC_API_KEY="your-api-key"
```

其他支持的厂商包括 OpenRouter、Fireworks、Baseten、Ollama、Azure、AWS Bedrock、HuggingFace 等。完整列表请查阅[支持的聊天模型集成](https://docs.langchain.com/oss/javascript/integrations/providers/overview)。

## 构建基础代理

下面创建一个简单的代理，它能回答问题并调用工具。这个示例代理使用一个语言模型、一个基础的天气函数作为工具，以及一个简单的提示词来引导行为：

```js
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);

const agent = createAgent({
  model: "gpt-5.5",
  tools: [getWeather],
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in San Francisco?" }],
  })
);
```

当你运行这段代码并让代理查询旧金山的天气时，代理会理解你的意图——"需要查询旧金山这个城市的天气"——因此自动调用 `get_weather` 工具，传入城市名称，再用返回结果生成最终回复。

> 你可以通过更改模型名称和设置对应的 API Key 来使用任何支持的模型。比如把 `"gpt-5.5"` 换成 `"gemini-3.1-pro-preview"` 并设置 `GOOGLE_API_KEY` 即可切换到 Google Gemini。

建议同时使用 LangSmith 来追踪代理内部发生了什么。设置以下环境变量即可开始记录追踪：

```bash
export LANGSMITH_TRACING="true"
export LANGSMITH_API_KEY="..."
```

## 构建真实世界的代理

接下来我们构建一个更有趣的代理——一个能回答关于文本文件问题的研究代理。在这个过程中，你将学到以下概念：

- 编写详细的系统提示词（system prompt）来改善代理行为
- 创建与外部数据交互的工具
- 配置模型参数以获得一致的响应
- 添加对话记忆（memory）实现多轮交互
- 使用 Deep Agents 获得内置高级功能
- 测试你的代理

### 第 1 步：定义系统提示词

系统提示词定义了代理的角色和行为。保持具体且可操作：

```typescript
const SYSTEM_PROMPT = `You are a literary data assistant.

## Capabilities

- \`fetch_text_from_url\`: loads document text from a URL into the conversation.
Do not guess line counts or positions—ground them in tool results from the saved file.`;
```

> 系统提示词是影响代理行为最重要的因素之一。一个好的系统提示词应该明确代理的能力边界、行为准则和输出格式。

### 第 2 步：创建工具

工具让模型能够通过调用你定义的函数来与外部系统交互。下面这个工具可以从给定 URL 加载文档：

```typescript
import { tool } from "@langchain/core/tools";
import { createAgent, initChatModel } from "langchain";
import { z } from "zod";

const fetchTextFromUrl = tool(
  async ({ url }: { url: string }): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; quickstart-research/1.0)",
        },
        signal: controller.signal,
      });
      if (!resp.ok) {
        return `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;
      }
      return await resp.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Fetch failed: ${msg}`;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  {
    name: "fetch_text_from_url",
    description: "Fetch the document from a URL.",
    schema: z.object({ url: z.string().url() }),
  },
);
```

Zod 是一个用于验证和解析预定义 schema 的库。你可以用它来定义工具的输入 schema，确保代理只传入正确类型的参数。你也可以使用 JSON schema 对象来定义 `schema` 属性，但需要注意 JSON schema 不会在运行时进行验证。

### 第 3 步：配置模型

设置语言模型及其参数：

```typescript
import { initChatModel } from "langchain";

const model = await initChatModel("gpt-5.5", {
  temperature: 0.5,
  timeout: 300,
  maxTokens: 25000,
});
```

> `temperature` 控制输出的随机性——值越低越确定，值越高越有创意。`timeout` 设置请求超时时间（毫秒）。不同厂商的初始化参数可能略有不同，请参考各自的文档。

### 第 4 步：添加记忆

为代理添加记忆，使其在多轮交互中保持状态：

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
```

> `MemorySaver` 是一个内存中的检查点存储器，适合开发和测试。在生产环境中，应使用持久化的 checkpointer，将消息历史保存到数据库中。

### 第 5 步：创建并运行代理

现在把所有组件组装起来并运行。这里同时展示 LangChain 代理和 Deep Agents 两种方式——两者的主要区别在于 Deep Agents 内置了规划、文件系统工具、子代理等常用能力：

```typescript
async function main() {
  const agent = createAgent({
    model,
    tools: [fetchTextFromUrl],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const deepAgent = createDeepAgent({
    model,
    tools: [fetchTextFromUrl],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const content = `Project Gutenberg hosts a full plain-text copy of F. Scott Fitzgerald's The Great Gatsby.
URL: https://www.gutenberg.org/files/64317/64317-0.txt

Answer as much as you can:

1) How many lines in the complete Gutenberg file contain the substring \`Gatsby\` (count lines, not occurrences within a line, each line ends with a line break).
2) The 1-based line number of the first line in the file that contains \`Daisy\`.
3) A two-sentence neutral synopsis.

Do your best on (1) and (2). If at any point you realize you cannot **verify** an exact answer with
your available tools and reasoning, do not fabricate numbers: use \`null\` for that field and spell out
the limitation in \`how_you_computed_counts\`. If you encounter any errors please report what the error was and what the error message was.`;

  const agentResult = await agent.invoke(
    { messages: [{ role: "user", content }] },
    { configurable: { thread_id: "great-gatsby-lc" } },
  );
  const deepAgentResult = await deepAgent.invoke(
    { messages: [{ role: "user", content }] },
    { configurable: { thread_id: "great-gatsby-da" } },
  );

  const agentMessages = agentResult.messages;
  const deepMessages = deepAgentResult.messages;
  console.log(agentMessages[agentMessages.length - 1]!.content_blocks);
  console.log("\n");
  console.log(deepMessages[deepMessages.length - 1]!.content_blocks);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

> 上述代码使用 `thread_id` 来标识一个对话线程，配合 checkpointer 实现跨调用的状态保持。相同 `thread_id` 的后续调用会自动接上之前的上下文。

<details>
<summary>完整代码（点击展开）</summary>

```typescript
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent } from "deepagents";
import { tool } from "@langchain/core/tools";
import { createAgent, initChatModel } from "langchain";
import { z } from "zod";

const SYSTEM_PROMPT = `You are a literary data assistant.

## Capabilities

- \`fetch_text_from_url\`: loads document text from a URL into the conversation.
Do not guess line counts or positions—ground them in tool results from the saved file.`;

const fetchTextFromUrl = tool(
  async ({ url }: { url: string }): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; quickstart-research/1.0)",
        },
        signal: controller.signal,
      });
      if (!resp.ok) {
        return `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;
      }
      return await resp.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Fetch failed: ${msg}`;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  {
    name: "fetch_text_from_url",
    description: "Fetch the document from a URL.",
    schema: z.object({ url: z.string().url() }),
  },
);

const model = await initChatModel("gemini-3.1-pro-preview", {
  modelProvider: "google-genai",
  temperature: 0.5,
  timeout: 600_000,
  maxTokens: 25000,
  streaming: true,
});

const checkpointer = new MemorySaver();

async function main() {
  const agent = createAgent({
    model,
    tools: [fetchTextFromUrl],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const deepAgent = createDeepAgent({
    model,
    tools: [fetchTextFromUrl],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const content = `Project Gutenberg hosts a full plain-text copy of F. Scott Fitzgerald's The Great Gatsby.
URL: https://www.gutenberg.org/files/64317/64317-0.txt

Answer as much as you can:

1) How many lines in the complete Gutenberg file contain the substring \`Gatsby\`?
2) The 1-based line number of the first line in the file that contains \`Daisy\`.
3) A two-sentence neutral synopsis.`;

  const agentResult = await agent.invoke(
    { messages: [{ role: "user", content }] },
    { configurable: { thread_id: "great-gatsby-lc" } },
  );
  const deepAgentResult = await deepAgent.invoke(
    { messages: [{ role: "user", content }] },
    { configurable: { thread_id: "great-gatsby-da" } },
  );

  console.log(agentResult.messages[agentResult.messages.length - 1]!.content_blocks);
  console.log("\n");
  console.log(deepAgentResult.messages[deepAgentResult.messages.length - 1]!.content_blocks);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

</details>

### 第 6 步：查看结果

运行结果会因模型和执行情况而异，但有一个明显的对比：

**LangChain 代理**的输出大致如下——它尝试回答，但由于缺乏精确计算的工具，只能给出估计值或返回 `null`：

```
**1) Number of lines containing `Gatsby`:** `null`
**2) First line containing `Daisy`:** `null`
**3) Synopsis:** The Great Gatsby follows the mysterious millionaire Jay Gatsby...
**how_you_computed_counts:** I successfully fetched the full text but cannot
deterministically count lines without code execution tools.
```

**Deep Agents** 的输出则精确得多——因为它能利用内置的文件系统工具：

```
**1) Lines containing `Gatsby`:** 258 lines
**2) First line containing `Daisy`:** Line 181
**3) Synopsis:** The Great Gatsby follows the mysterious millionaire Jay Gatsby...
**How counts were computed:** Used `grep` tool to search the saved file for
exact substrings, counted 258 matches for `Gatsby`, first `Daisy` at line 181.
```

这个对比很好地说明了两者的区别：Deep Agents 内置了规划（`write_todos`）、文件系统工具（`grep`、`read_file`）和子代理生成能力，可以自主完成更复杂的任务；而 LangChain 代理则需要你手动实现这些能力，但换来了对代理架构每一层的完全控制。

## 追踪代理调用

随着你的应用变得越来越复杂，能够查看代理内部到底发生了什么至关重要。LangSmith 是最佳选择——设置好 API Key 后，运行脚本，然后在 LangSmith 界面中查看完整的调用链、工具调用、状态转换和延迟数据。

```bash
export LANGSMITH_TRACING="true"
export LANGSMITH_API_KEY="..."
```

> 建议同时启用 LangSmith Engine，它会自动监控追踪数据、检测异常并提出修复建议。

## 接下来

现在你已经拥有了能够理解上下文、智能调用工具、保持对话状态的代理。后续可以继续探索：

- **LangChain 代理**：添加和管理记忆、部署到生产环境
- **Deep Agents**：自定义选项、持久化记忆、部署到生产环境

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/quickstart) 翻译并二次创作。
