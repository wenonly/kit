---
title: 检索（RAG）
categories: LangChain
order: 20
date: 2026-06-24
tags:
  - LangChain
  - RAG
---

# 检索（RAG）

> 让 Agent 在推理时动态获取外部知识，突破 LLM 的上下文窗口和知识时效限制。

大语言模型（LLM）虽然强大，但有两个关键局限：

- **有限的上下文**——无法一次性消化整个文档库。
- **静态的知识**——训练数据冻结在某个时间点。

检索（Retrieval）通过在查询时动态获取相关的外部知识来解决这些问题。这就是 **检索增强生成（Retrieval-Augmented Generation，RAG）** 的基础：用与具体场景相关的信息来增强 LLM 的回答。

## 从检索到 RAG

检索让 LLM 在运行时获取相关上下文。但大多数真实应用会再进一步：它们把检索与生成**集成**在一起，产出有依据、感知上下文的回答。这就是 RAG 的核心思想——检索流水线成为更大系统的基础，把搜索与生成结合起来。

典型的检索流水线包括：加载文档（loader）→ 切分（splitter）→ 向量化（embeddings）→ 存入向量库（vector store）→ 查询时按相似度召回。每个组件都是模块化的：你可以替换 loader、splitter、embeddings 或 vector store，而无需重写应用逻辑。

## 构建知识库

**知识库（knowledge base）** 是检索过程中使用的文档或结构化数据的仓库。如果你需要自定义知识库，可以使用 LangChain 的 document loader 和 vector store 从自己的数据中构建。构建好可搜索的知识库后，就可以在其上搭建最小化的 RAG 流程。

## RAG 架构

RAG 有多种实现方式，取决于系统需求。下面分别介绍每种类型。

| 架构 | 说明 | 控制力 | 灵活性 | 延迟 | 典型用例 |
| --- | --- | --- | --- | --- | --- |
| **2-Step RAG** | 检索总是在生成之前执行，简单可预测 | 高 | 低 | 快 | FAQ、文档问答机器人 |
| **Agentic RAG** | 由 LLM 驱动的 Agent 在推理过程中决定何时、如何检索 | 低 | 高 | 可变 | 可访问多种工具的研究助手 |
| **Hybrid RAG** | 结合两种方式的特点，加入校验步骤 | 中 | 中 | 可变 | 需要质量校验的领域问答 |

### 2-Step RAG

在 **2-Step RAG** 中，检索步骤始终在生成步骤之前执行。这种架构简单且可预测，适用于"先检索相关文档再生成回答"这一前提非常明确的场景。

### Agentic RAG

**Agentic RAG** 把检索增强生成与 Agent 推理结合起来。与"先检索再回答"不同，由 LLM 驱动的 Agent 会逐步推理，在交互过程中自主决定**何时**以及**如何**检索信息。Agent 把检索工具当成众多工具中的一种，按需调用。

> 代码要点：下面的示例把 `fetch_url` 封装成一个工具交给 Agent，Agent 会在需要时自行决定是否抓取某个 URL 的内容。

```ts
import { tool, createAgent } from "langchain";

const fetchUrl = tool(
  (url: string) => {
    return `Fetched content from ${url}`;
  },
  { name: "fetch_url", description: "Fetch text content from a URL" },
);

const agent = createAgent({
  model: "claude-sonnet-4-0",
  tools: [fetchUrl],
  systemPrompt,
});
```

#### 扩展示例：基于 llms.txt 的 Agentic RAG

这个示例实现了一个 **Agentic RAG 系统**，帮助用户查询 LangGraph 文档。Agent 先加载 `llms.txt`（列出所有可用文档 URL），再根据用户问题动态调用 `fetch_documentation` 工具来获取和处理相关内容。

> 代码要点：`fetch_documentation` 工具会先校验 URL 是否在允许域名内，再抓取内容。`systemPrompt` 把 `llms.txt` 内容注入，让 Agent 知道有哪些文档可查。

```ts
import { tool, createAgent, HumanMessage } from "langchain";
import * as z from "zod";

const ALLOWED_DOMAINS = ["https://langchain-ai.github.io/"];
const LLMS_TXT = "https://langchain-ai.github.io/langgraph/llms.txt";

const fetchDocumentation = tool(
  async (input) => {
    if (!ALLOWED_DOMAINS.some((domain) => input.url.startsWith(domain))) {
      return `Error: URL not allowed. Must start with one of: ${ALLOWED_DOMAINS.join(", ")}`;
    }
    const response = await fetch(input.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  },
  {
    name: "fetch_documentation",
    description: "Fetch and convert documentation from a URL",
    schema: z.object({
      url: z.string().describe("The URL of the documentation to fetch"),
    }),
  },
);

const llmsTxtResponse = await fetch(LLMS_TXT);
const llmsTxtContent = await llmsTxtResponse.text();

const systemPrompt = `
You are an expert TypeScript developer and technical assistant.
Your primary role is to help users with questions about LangGraph and related tools.

Instructions:

1. If a user asks a question you're unsure about—or one that likely involves API usage,
   behavior, or configuration—you MUST use the \`fetch_documentation\` tool to consult the relevant docs.
2. When citing documentation, summarize clearly and include relevant context from the content.
3. Do not use any URLs outside of the allowed domain.
4. If a documentation fetch fails, tell the user and proceed with your best expert understanding.

You can access official documentation from the following approved sources:

${llmsTxtContent}

You MUST consult the documentation to get up to date documentation
before answering a user's question about LangGraph.

Your answers should be clear, concise, and technically accurate.
`;

const tools = [fetchDocumentation];

const agent = createAgent({
  model: "claude-sonnet-4-0",
  tools,
  systemPrompt,
  name: "Agentic RAG",
});

const response = await agent.invoke({
  messages: [
    new HumanMessage(
      "Write a short example of a langgraph agent using the " +
        "prebuilt create react agent. the agent should be able " +
        "to look up stock pricing information.",
    ),
  ],
});

console.log(response.messages.at(-1)?.content);
```

### Hybrid RAG

Hybrid RAG 结合了 2-Step RAG 和 Agentic RAG 的特点。它引入了中间步骤，如查询预处理、检索校验和生成后检查。这类系统比固定流水线更灵活，同时保持了对执行的一定控制。典型组件包括：

- **查询增强（Query enhancement）**：修改输入问题以提升检索质量。可以改写模糊查询、生成多个变体，或用额外上下文扩展查询。
- **检索校验（Retrieval validation）**：评估检索到的文档是否相关且充分。如果不充分，系统可能会优化查询并重新检索。
- **答案校验（Answer validation）**：检查生成的答案是否准确、完整，以及是否与源内容对齐。必要时，系统会重新生成或修订答案。

这种架构通常支持上述步骤之间的多次迭代，适合查询模糊或不够明确的场景、需要校验或质量控制的系统，以及涉及多数据源或迭代优化的流程。

## 小结

检索是 RAG 的基础：2-Step RAG 简单可控、Agentic RAG 灵活自主、Hybrid RAG 取两者之长。在 LangChain 中，Agent 通过 `tool` 把检索能力封装成可调用的工具，再交给 `createAgent` 自主决策。如果想了解工具的更多用法，请参阅[工具](/tutorials/LangChain/7.工具)；想了解 Agent 本身，请参阅[Agent](/tutorials/LangChain/5.Agent)。

---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/retrieval) 翻译并二次创作。
