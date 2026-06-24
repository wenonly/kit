# LangChain 中文教程模块设计

- **日期**: 2026-06-24
- **目标**: 在 VitePress 站点的顶部导航"自定义库"右侧新增"教程"分类，首期填充 LangChain JS 核心教程（27 篇，中文翻译 + 二次创作）。

## 背景与动机

现有站点（`https://wenonly.github.io/kit/`）的顶层导航结构为：我的分类 / 我的归档 / 我的标签 / 自定义库 / 展示柜 / 我的项目。用户希望增加一个独立的"教程"分类，用于承载体系化的技术教程（首期为 LangChain），与零散的博客文章 (`posts/`) 区分开。

LangChain JS 官方文档地址：`https://docs.langchain.com/oss/javascript/langchain/overview`。左侧导航（Mintlify 渲染）共 27 个核心页面（不含 API reference、各类集成），覆盖从概览到部署的完整核心内容。

## 范围

**包含**:
- 新增 `DocGroup.Tutorial` 与对应的 rewrites 规则。
- 新建 `configs/tutorial.ts` 生成 sidebar 与 nav 子项。
- 修改 `config.mts` 注册"教程" nav（位于"自定义库"右侧）和 sidebar。
- 创建 27 个 `tutorials/LangChain/<编号>.<标题>/README.md` 文件，内容为基于英文原稿的中文翻译 + 二次创作（补充示例注释、调整语气、保留代码块）。

**不包含**:
- LangChain API reference 翻译。
- LangChain 各类 provider/集成（OpenAI、Anthropic 等单独文档）。
- LangGraph、LangSmith 独立章节（仅在 LangChain 教程中引用到时简要提及）。
- 未来其他教程系列（React、Vue 等）—— 架构上预留扩展位，但本次不实现。

## 用户决策记录

| 决策点 | 选择 |
|---|---|
| 语言 | 翻译为中文 |
| 范围 | 核心教程篇（27 篇，不含 API reference / 集成） |
| 内容处理 | 翻译 + 二次创作（补充理解、注释、示例） |
| 实现方案 | 方案 A：新建独立 `tutorials/` 目录 + 扩展 rewrites 系统 |

## 架构设计

### 1. rewrites 系统扩展

**文件**: `.vitepress/configs/rewrites.ts`

在 `DocGroup` 枚举末尾新增:

```typescript
export enum DocGroup {
  ReactComponents = "react-components",
  ReactHooks = "react-hooks",
  Utils = "utils",
  OtherUtils = "other-utils",
  Demo = "Demo",
  Blog = "blog",
  Tutorial = "tutorial",  // 新增
}
```

在 `rewritesConfig` 数组中、Blog 条目之前新增:

```typescript
{
  from: "tutorials/:category/:postName/README.md",
  to: "tutorials/:category/:title.md",
  group: DocGroup.Tutorial,
  sidebarName: ":title",
},
```

**机制说明**: `generateFullRewrites()` 会扫描所有 `.md` 文件，匹配 `tutorials/:category/:postName/README.md` 模式。`postName` 是源文件夹名（如 `1.概览`），`title`、`categories`、`order` 来自 frontmatter。输出 URL 为 `tutorials/LangChain/LangChain 概览.md`，sidebar 显示名使用 frontmatter 的 `title`。

### 2. 新建 `configs/tutorial.ts`

**文件**: `.vitepress/configs/tutorial.ts`

参考 `blog.ts` 的组织方式，但分组逻辑不同：

- 按 `categories` frontmatter 分组（如 `LangChain`）。
- 组内按 frontmatter 的 `order` 字段升序排序；无 `order` 时按 `postName`（文件夹名）升序。
- 每个 `categories` 生成一个 sidebar 分组（`/tutorials/<categories>/`）和一个 nav 子项。

导出:
- `tutorialRewrites: RewritesConfigItem[]` —— 过滤 `DocGroup.Tutorial`。
- `tutorialSideBar: DefaultTheme.Sidebar` —— 按分类分组的侧边栏，键为 `/tutorials/<categories>`。
- `tutorialNav: DefaultTheme.NavItemWithLink[]` —— 每个分类一项，`link` 指向该分类下 `order` 最小的文章。

### 3. `config.mts` 注册

**文件**: `.vitepress/config.mts`

- `import { tutorialNav, tutorialSideBar } from "./configs/tutorial";`
- 在 `nav` 数组中"自定义库"项之后插入"教程"项，其 `items` 使用 `tutorialNav`。
- 在 `sidebar` 对象中合并 `tutorialSideBar`（展开键值对）。

### 4. 源文件组织

```
tutorials/
└── LangChain/
    ├── 1.概览/
    │   └── README.md
    ├── 2.设计哲学/
    │   └── README.md
    ├── ... (共 27 个子目录)
    └── 27.部署/
        └── README.md
```

每个 `README.md` 的 frontmatter:

```yaml
---
title: LangChain 概览         # 显示在 sidebar 和 URL
categories: LangChain          # 决定分组
order: 1                       # 决定排序
date: 2026-06-24               # 创建日期
tags:
  - LangChain
  - Agent
---
```

**约定**:
- 文件夹名前缀数字（`1.`、`2.`...）仅用于源码可读性和默认排序，不进入输出 URL。
- `title` 使用中文，可能包含英文专有名（如 `MCP 集成`、`LangGraph Studio`）。
- 代码块保留英文原样，注释视情况翻译。
- 在每篇末尾标注原文链接。

### 5. 内容生产流程

对 27 篇教程逐一:
1. `curl` 抓取英文 HTML 原稿。
2. 提取 `<main>` 中的正文（Mintlify 服务端渲染内容）。
3. 翻译为中文，并做二次创作:
   - 补充代码示例的行内注释。
   - 对官方文档中简略处增加解释性段落。
   - 调整语气为教程风（"我们"、"接下来"等）。
   - 保留原文的代码块、API 名称、类型签名不动。
4. 套用 frontmatter 模板写入对应 `README.md`。

## 27 篇教程清单

| order | 文件夹 | title | 抓取源 |
|---:|---|---|---|
| 1 | 1.概览 | LangChain 概览 | `/langchain/overview` |
| 2 | 2.设计哲学 | 设计哲学 | `/langchain/philosophy` |
| 3 | 3.安装 | 安装 | `/langchain/install` |
| 4 | 4.快速开始 | 快速开始 | `/langchain/quickstart` |
| 5 | 5.Agent | Agent（create_agent） | `/langchain/agents` |
| 6 | 6.模型 | 模型 | `/langchain/models` |
| 7 | 7.工具 | 工具 | `/langchain/tools` |
| 8 | 8.消息 | 消息 | `/langchain/messages` |
| 9 | 9.中间件概览 | 中间件概览 | `/langchain/middleware/overview` |
| 10 | 10.内置中间件 | 内置中间件 | `/langchain/middleware/built-in` |
| 11 | 11.自定义中间件 | 自定义中间件 | `/langchain/middleware/custom` |
| 12 | 12.结构化输出 | 结构化输出 | `/langchain/structured-output` |
| 13 | 13.流式输出 | 流式输出 | `/langchain/streaming` |
| 14 | 14.事件流 | 事件流 | `/langchain/event-streaming` |
| 15 | 15.上下文工程 | 上下文工程 | `/langchain/context-engineering` |
| 16 | 16.短期记忆 | 短期记忆 | `/langchain/short-term-memory` |
| 17 | 17.长期记忆 | 长期记忆 | `/langchain/long-term-memory` |
| 18 | 18.人机协作 | 人机协作 | `/langchain/human-in-the-loop` |
| 19 | 19.护栏 | 护栏 | `/langchain/guardrails` |
| 20 | 20.检索RAG | 检索（RAG） | `/langchain/retrieval` |
| 21 | 21.MCP集成 | MCP 集成 | `/langchain/mcp` |
| 22 | 22.可观测性 | 可观测性 | `/langchain/observability` |
| 23 | 23.UI集成 | UI 集成 | `/langchain/ui` |
| 24 | 24.前端集成 | 前端集成 | `/langchain/frontend/overview` |
| 25 | 25.LangGraphStudio | LangGraph Studio | `/langchain/studio` |
| 26 | 26.运行时 | 运行时 | `/langchain/runtime` |
| 27 | 27.部署 | 部署 | `/langchain/deploy` |

## 错误处理与边界

- **网络抓取失败**: 单篇失败时记录 URL 并继续其他篇，最终汇总失败列表重试。不阻塞整体流程。
- **VitePress dev 验证**: 完成后 `pnpm dev` 检查:
  - "教程" nav 出现在"自定义库"右侧。
  - 展开"教程"看到"LangChain"子项。
  - 点击进入后侧边栏列出 27 篇，按 `order` 排序。
  - URL 形如 `/tutorials/LangChain/LangChain 概览`。
- **rewrites 冲突**: `tutorials/` 前缀与现有所有模式（`posts/`、`packages/`、`examples/`）互不重叠，无冲突。
- **sidebar 合并**: `tutorialSideBar` 的键（如 `/tutorials/LangChain`）不与现有 sidebar 键冲突。

## 测试计划

无自动化测试（仓库无 lint/test runner）。手动验证:
1. `pnpm dev` 启动后无构建错误。
2. 顶部导航顺序：`我的分类 / 我的归档 / 我的标签 / 自定义库 / 教程 / 展示柜 / 我的项目`。
3. "教程" → "LangChain" 跳转到第一篇（`order: 1`）。
4. 侧边栏 27 篇齐全且按 `order` 排序。
5. 抽样点击 3 篇（首篇、中间篇、末篇），URL 与内容渲染正确。
6. 首篇 frontmatter 的 `categories` 值与 sidebar 分组名一致。

## 实现步骤（粗粒度）

1. 改 `rewrites.ts`：加 `Tutorial` 枚举 + rewritesConfig 模式。
2. 新建 `configs/tutorial.ts`：实现 `tutorialSideBar` 与 `tutorialNav` 导出。
3. 改 `config.mts`：import 上述导出，注册"教程" nav（位于"自定义库"右侧）和 sidebar。
4. 创建 `tutorials/LangChain/` 目录结构（27 个子目录）。
5. 并发抓取 27 篇英文原稿到 `/tmp/lc-src/*.md`。
6. 逐篇翻译 + 二次创作为中文 `README.md`。
7. `pnpm dev` 本地验证 nav、sidebar、URL 重写。
8. 抽样检查 1-2 篇渲染效果。

## 未来扩展

架构上预留了对其他教程系列的支持:
- 新建 `tutorials/React/` 即可自动出现在"教程" nav 子菜单。
- 新建 `tutorials/Vue/` 同理。
- 无需改动 `rewrites.ts` 或 `tutorial.ts` 逻辑，只需新增源文件。
