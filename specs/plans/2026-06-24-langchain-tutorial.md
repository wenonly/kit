# LangChain 中文教程模块实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 VitePress 站点新增"教程"分类（位于"自定义库"右侧），首期填充 LangChain JS 核心教程 27 篇（中文翻译 + 二次创作）。

**Architecture:** 扩展现有 rewrites 系统——新增 `DocGroup.Tutorial` 枚举值与 `tutorials/` 目录模式；新建 `configs/tutorial.ts` 生成 sidebar/nav；修改 `config.mts` 注册导航与侧边栏。源文件放在 `tutorials/LangChain/<编号>.<标题>/README.md`，frontmatter 驱动输出 URL、sidebar 名、排序。

**Tech Stack:** VitePress、path-to-regexp、gray-matter、dayjs、TypeScript。无测试运行器（仓库无 lint/test），所有验证通过 `pnpm dev` / `pnpm build:docs` 手动进行。

**Spec:** `specs/2026-06-24-langchain-tutorial-design.md`

---

## 文件结构

| 路径 | 操作 | 职责 |
|---|---|---|
| `.vitepress/configs/rewrites.ts` | 修改 | 新增 `DocGroup.Tutorial` 枚举值 + rewritesConfig 模式 |
| `.vitepress/configs/tutorial.ts` | 创建 | 导出 `tutorialSideBar` 和 `tutorialNav`，按 `categories` 分组、按 `order` 排序 |
| `.vitepress/config.mts` | 修改 | import 上述导出，注册"教程" nav 与 sidebar |
| `tutorials/LangChain/<编号>.<标题>/README.md` × 27 | 创建 | 27 篇中文教程源文件 |

**Spec 偏差说明**: spec 写的 rewrites 模式是 `tutorials/:category/:postName/README.md` → `tutorials/:category/:title.md`，但 `generateFullRewrites()` 通过 frontmatter 解析参数，frontmatter 的键是 `categories`（不是 `category`）。本计划采用与现有 blog 模式一致的写法 `tutorials{/:folder}*/:postName/README.md` → `tutorials/:categories/:title.md`，确保参数解析正确。

---

## Task 1: 扩展 rewrites 系统

**Files:**
- Modify: `.vitepress/configs/rewrites.ts:8-15`（DocGroup 枚举）
- Modify: `.vitepress/configs/rewrites.ts:25-80`（rewritesConfig 数组）

- [ ] **Step 1.1: 在 DocGroup 枚举中追加 Tutorial 值**

打开 `.vitepress/configs/rewrites.ts`，找到第 8-15 行的 `DocGroup` 枚举：

```typescript
export enum DocGroup {
  ReactComponents = "react-components",
  ReactHooks = "react-hooks",
  Utils = "utils", // packages/utils
  OtherUtils = "other-utils", // 不在packages/utils的一些包
  Demo = "Demo",
  Blog = "blog",
}
```

在 `Blog = "blog",` 之后、闭合 `}` 之前加入新行：

```typescript
  Blog = "blog",
  Tutorial = "tutorial", // tutorials/<category>/<post>/...
}
```

- [ ] **Step 1.2: 在 rewritesConfig 数组中追加教程模式**

找到 `rewritesConfig` 数组的最后一项（blog 模式，约在第 74-79 行）：

```typescript
  {
    from: "posts{/:folder}*/:postName/README.md",
    to: "posts/:categories/:year/:title.md",
    sidebarName: ":title",
    group: DocGroup.Blog,
  },
];
```

在 blog 条目之后、数组闭合 `];` 之前追加：

```typescript
  {
    from: "posts{/:folder}*/:postName/README.md",
    to: "posts/:categories/:year/:title.md",
    sidebarName: ":title",
    group: DocGroup.Blog,
  },
  {
    from: "tutorials{/:folder}*/:postName/README.md",
    to: "tutorials/:categories/:title.md",
    sidebarName: ":title",
    group: DocGroup.Tutorial,
  },
];
```

- [ ] **Step 1.3: 验证 TypeScript 编译无错**

Run: `cd /Users/taowen/project/kit && pnpm build:docs 2>&1 | head -30`
Expected: 不出现 `rewrites.ts` 的 TS 报错（可能出现其他无关错误，忽略）。

如果出现 `DocGroup.Tutorial` 相关报错，确认枚举值拼写一致。

- [ ] **Step 1.4: 提交**

```bash
cd /Users/taowen/project/kit
git add .vitepress/configs/rewrites.ts
git commit -m "feat(rewrites): 新增 DocGroup.Tutorial 与 tutorials 目录模式"
```

---

## Task 2: 创建 configs/tutorial.ts

**Files:**
- Create: `.vitepress/configs/tutorial.ts`

- [ ] **Step 2.1: 写入完整文件内容**

创建 `.vitepress/configs/tutorial.ts`：

```typescript
import { DefaultTheme } from "vitepress";
import { DocGroup, rewrites, RewritesConfigItem } from "./rewrites";

/**
 * 按教程 categories 分组（如 "LangChain"）。
 * 组内按 frontmatter 的 order 升序；缺省 order 时按 postName（源文件夹名）升序。
 */
function getTutorialSideBarGroupByCategories(
  tutorialConfig: RewritesConfigItem[]
): Record<string, DefaultTheme.SidebarItem[]> {
  const sidebarMap: Record<string, DefaultTheme.SidebarItem[]> = {};
  tutorialConfig
    .slice()
    .sort((pre, nex) => {
      const preOrder = pre.meta?.order ?? pre.from;
      const nexOrder = nex.meta?.order ?? nex.from;
      if (typeof preOrder === "number" && typeof nexOrder === "number") {
        return preOrder - nexOrder;
      }
      return String(preOrder).localeCompare(String(nexOrder));
    })
    .forEach((item) => {
      if (item.meta) {
        const { sidebarName, meta } = item;
        const { categories } = meta;
        if (!categories) return;
        if (!sidebarMap[categories]) sidebarMap[categories] = [];
        sidebarMap[categories].push({
          text: sidebarName,
          link: "/" + item.to.replace(/\.md$/, ""),
        });
      }
    });
  return sidebarMap;
}

function getTutorialSidebar(
  groupMap: Record<string, DefaultTheme.SidebarItem[]>
): DefaultTheme.Sidebar {
  const sidebar: DefaultTheme.Sidebar = {};
  Object.entries(groupMap).forEach(([categories, items]) => {
    sidebar[`/tutorials/${categories}`] = items;
  });
  return sidebar;
}

function getTutorialNav(
  groupMap: Record<string, DefaultTheme.SidebarItem[]>
): DefaultTheme.NavItemWithLink[] {
  const nav: DefaultTheme.NavItemWithLink[] = [];
  Object.entries(groupMap).forEach(([categories, items]) => {
    nav.push({
      text: categories,
      link: items[0]?.link ?? "/",
      activeMatch: `^/tutorials/${categories}/`,
    });
  });
  return nav;
}

export const tutorialRewrites: RewritesConfigItem[] = rewrites.filter(
  (item) => item.group === DocGroup.Tutorial
);
const groupMap = getTutorialSideBarGroupByCategories(tutorialRewrites);
export const tutorialSideBar = getTutorialSidebar(groupMap);
export const tutorialNav = getTutorialNav(groupMap);
```

**说明**:
- 与 `blog.ts` 不同：不做年份二级分组，因为教程按章节顺序而非时间组织。
- `order` 排序兜底为 `postName`（源文件夹名），因此即便 frontmatter 漏写 `order`，`1.概览` 也会排在 `2.设计哲学` 之前。
- `tutorialNav` 每个 `categories` 生成一个 nav 子项，`link` 指向 `order` 最小的那篇。

- [ ] **Step 2.2: 验证 TS 编译无错**

Run: `cd /Users/taowen/project/kit && pnpm build:docs 2>&1 | grep -E "(tutorial|error)" | head -20`
Expected: 不出现 `tutorial.ts` 的 TS 报错。

- [ ] **Step 2.3: 提交**

```bash
cd /Users/taowen/project/kit
git add .vitepress/configs/tutorial.ts
git commit -m "feat(tutorial): 新增 tutorial.ts 生成 sidebar 与 nav"
```

---

## Task 3: 接入 config.mts

**Files:**
- Modify: `.vitepress/config.mts:7-8`（import 区）
- Modify: `.vitepress/config.mts:14-18`（sidebar 变量区，可选）
- Modify: `.vitepress/config.mts:30-47`（nav 数组，在"自定义库"之后插入"教程"）
- Modify: `.vitepress/config.mts:48-65`（sidebar 对象，合并 tutorialSideBar）

- [ ] **Step 3.1: 添加 import**

找到第 7 行：

```typescript
import { blogNav, blogSideBar } from "./configs/blog";
```

在其下方追加一行：

```typescript
import { blogNav, blogSideBar } from "./configs/blog";
import { tutorialNav, tutorialSideBar } from "./configs/tutorial";
```

- [ ] **Step 3.2: 在 nav 数组中插入"教程"项**

找到 nav 数组（约 30-47 行），定位"自定义库"块的结束 `},`（约第 41 行）：

```typescript
      {
        text: "自定义库",
        items: [
          { text: "React组件", link: reactComponentsSidebars[0]?.link ?? "/" },
          { text: "React Hooks", link: reactHooksSidebars[0]?.link ?? "/" },
          { text: "工具函数", link: utilsSidebars[0]?.link ?? "/" },
        ],
      },
      {
        text: "展示柜",
```

在"自定义库"块的 `},` 之后、"展示柜"块之前插入"教程"项：

```typescript
      {
        text: "自定义库",
        items: [
          { text: "React组件", link: reactComponentsSidebars[0]?.link ?? "/" },
          { text: "React Hooks", link: reactHooksSidebars[0]?.link ?? "/" },
          { text: "工具函数", link: utilsSidebars[0]?.link ?? "/" },
        ],
      },
      {
        text: "教程",
        items: tutorialNav,
      },
      {
        text: "展示柜",
```

- [ ] **Step 3.3: 在 sidebar 对象中合并 tutorialSideBar**

找到 sidebar 对象（约 48-65 行）：

```typescript
    sidebar: {
      ...blogSideBar,
      "/react-components": reactComponentsSidebars,
      ...
    },
```

在 `...blogSideBar,` 之后追加 `...tutorialSideBar,`：

```typescript
    sidebar: {
      ...blogSideBar,
      ...tutorialSideBar,
      "/react-components": reactComponentsSidebars,
      ...
    },
```

- [ ] **Step 3.4: 启动 dev server 验证编译**

Run: `cd /Users/taowen/project/kit && timeout 15 pnpm dev 2>&1 | tail -30`
Expected: dev server 启动无 TS 报错（此时 `tutorialNav` 为空数组，nav 中"教程"项暂时没有子菜单是正常的）。

如果启动成功，Ctrl+C 终止。

- [ ] **Step 3.5: 提交**

```bash
cd /Users/taowen/project/kit
git add .vitepress/config.mts
git commit -m "feat(config): 注册教程 nav 与 sidebar"
```

---

## Task 4: 创建 27 篇 stub README（让 nav/sidebar 先跑起来）

**Files:**
- Create: `tutorials/LangChain/1.概览/README.md` 等 27 个

- [ ] **Step 4.1: 创建 27 个目录**

Run:
```bash
cd /Users/taowen/project/kit/tutorials/LangChain
for d in "1.概览" "2.设计哲学" "3.安装" "4.快速开始" "5.Agent" "6.模型" "7.工具" "8.消息" "9.中间件概览" "10.内置中间件" "11.自定义中间件" "12.结构化输出" "13.流式输出" "14.事件流" "15.上下文工程" "16.短期记忆" "17.长期记忆" "18.人机协作" "19.护栏" "20.检索RAG" "21.MCP集成" "22.可观测性" "23.UI集成" "24.前端集成" "25.LangGraphStudio" "26.运行时" "27.部署"; do
  mkdir -p "$d"
done
ls -1
```
Expected: 输出 27 个目录名。

- [ ] **Step 4.2: 为每个目录写入 stub README**

为每个目录写一份仅含 frontmatter 和占位正文的 `README.md`。下方表格列出所有 27 篇的精确 frontmatter：

| 目录 | title | order | tags |
|---|---|---:|---|
| 1.概览 | LangChain 概览 | 1 | LangChain, Agent |
| 2.设计哲学 | 设计哲学 | 2 | LangChain |
| 3.安装 | 安装 | 3 | LangChain |
| 4.快速开始 | 快速开始 | 4 | LangChain |
| 5.Agent | Agent（create_agent） | 5 | LangChain, Agent |
| 6.模型 | 模型 | 6 | LangChain, Model |
| 7.工具 | 工具 | 7 | LangChain, Tool |
| 8.消息 | 消息 | 8 | LangChain, Message |
| 9.中间件概览 | 中间件概览 | 9 | LangChain, Middleware |
| 10.内置中间件 | 内置中间件 | 10 | LangChain, Middleware |
| 11.自定义中间件 | 自定义中间件 | 11 | LangChain, Middleware |
| 12.结构化输出 | 结构化输出 | 12 | LangChain |
| 13.流式输出 | 流式输出 | 13 | LangChain, Streaming |
| 14.事件流 | 事件流 | 14 | LangChain, Streaming |
| 15.上下文工程 | 上下文工程 | 15 | LangChain |
| 16.短期记忆 | 短期记忆 | 16 | LangChain, Memory |
| 17.长期记忆 | 长期记忆 | 17 | LangChain, Memory |
| 18.人机协作 | 人机协作 | 18 | LangChain |
| 19.护栏 | 护栏 | 19 | LangChain, Guardrails |
| 20.检索RAG | 检索（RAG） | 20 | LangChain, RAG |
| 21.MCP集成 | MCP 集成 | 21 | LangChain, MCP |
| 22.可观测性 | 可观测性 | 22 | LangChain, LangSmith |
| 23.UI集成 | UI 集成 | 23 | LangChain, UI |
| 24.前端集成 | 前端集成 | 24 | LangChain, Frontend |
| 25.LangGraphStudio | LangGraph Studio | 25 | LangChain, LangGraph |
| 26.运行时 | 运行时 | 26 | LangChain, Runtime |
| 27.部署 | 部署 | 27 | LangChain, Deploy |

每篇 stub 模板（以 `1.概览` 为例）：

```markdown
---
title: LangChain 概览
categories: LangChain
order: 1
date: 2026-06-24
tags:
  - LangChain
  - Agent
---

# LangChain 概览

> 本篇正在编写中。
```

对 27 个目录依次写入对应的 frontmatter（替换 `title`、`order`、`tags`）。

- [ ] **Step 4.3: 验证 dev server 显示 nav 与 sidebar**

Run: `cd /Users/taowen/project/kit && pnpm dev`
打开浏览器到提示的 URL（通常 `http://localhost:5173/kit/`），验证：
1. 顶部导航顺序为：`我的分类 / 我的归档 / 我的标签 / 自定义库 / 教程 / 展示柜 / 我的项目`。
2. 鼠标悬停"教程"，下拉出现"LangChain"。
3. 点击"LangChain"，跳转到 `/kit/tutorials/LangChain/LangChain 概览`。
4. 左侧 sidebar 显示 27 项，按 `order` 排序（"LangChain 概览" 在最上，"部署" 在最下）。

通过后 Ctrl+C 终止 dev server。

- [ ] **Step 4.4: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/
git commit -m "feat(tutorials): 创建 LangChain 教程目录结构与 27 篇 stub"
```

---

## Task 5: 并发抓取 27 篇英文原稿

**Files:**
- Create (临时): `/tmp/lc-src/01-overview.html` 等 27 个

- [ ] **Step 5.1: 创建抓取目录**

Run: `mkdir -p /tmp/lc-src`

- [ ] **Step 5.2: 并发抓取 27 个 HTML 原稿**

Run（一次性执行，curl 自带并发）：
```bash
cd /tmp/lc-src
declare -a URLS=(
  "01-overview|https://docs.langchain.com/oss/javascript/langchain/overview"
  "02-philosophy|https://docs.langchain.com/oss/javascript/langchain/philosophy"
  "03-install|https://docs.langchain.com/oss/javascript/langchain/install"
  "04-quickstart|https://docs.langchain.com/oss/javascript/langchain/quickstart"
  "05-agents|https://docs.langchain.com/oss/javascript/langchain/agents"
  "06-models|https://docs.langchain.com/oss/javascript/langchain/models"
  "07-tools|https://docs.langchain.com/oss/javascript/langchain/tools"
  "08-messages|https://docs.langchain.com/oss/javascript/langchain/messages"
  "09-middleware-overview|https://docs.langchain.com/oss/javascript/langchain/middleware/overview"
  "10-middleware-builtin|https://docs.langchain.com/oss/javascript/langchain/middleware/built-in"
  "11-middleware-custom|https://docs.langchain.com/oss/javascript/langchain/middleware/custom"
  "12-structured-output|https://docs.langchain.com/oss/javascript/langchain/structured-output"
  "13-streaming|https://docs.langchain.com/oss/javascript/langchain/streaming"
  "14-event-streaming|https://docs.langchain.com/oss/javascript/langchain/event-streaming"
  "15-context-engineering|https://docs.langchain.com/oss/javascript/langchain/context-engineering"
  "16-short-term-memory|https://docs.langchain.com/oss/javascript/langchain/short-term-memory"
  "17-long-term-memory|https://docs.langchain.com/oss/javascript/langchain/long-term-memory"
  "18-human-in-the-loop|https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop"
  "19-guardrails|https://docs.langchain.com/oss/javascript/langchain/guardrails"
  "20-retrieval|https://docs.langchain.com/oss/javascript/langchain/retrieval"
  "21-mcp|https://docs.langchain.com/oss/javascript/langchain/mcp"
  "22-observability|https://docs.langchain.com/oss/javascript/langchain/observability"
  "23-ui|https://docs.langchain.com/oss/javascript/langchain/ui"
  "24-frontend|https://docs.langchain.com/oss/javascript/langchain/frontend/overview"
  "25-studio|https://docs.langchain.com/oss/javascript/langchain/studio"
  "26-runtime|https://docs.langchain.com/oss/javascript/langchain/runtime"
  "27-deploy|https://docs.langchain.com/oss/javascript/langchain/deploy"
)
for entry in "${URLS[@]}"; do
  name="${entry%%|*}"
  url="${entry##*|}"
  curl -sL "$url" -o "${name}.html" &
done
wait
ls -1 | wc -l
```
Expected: 输出 `27`。

- [ ] **Step 5.3: 抽样验证内容不为空**

Run: `wc -c /tmp/lc-src/01-overview.html /tmp/lc-src/15-context-engineering.html /tmp/lc-src/27-deploy.html`
Expected: 每个文件 > 10000 字节。若某个 < 1000 字节，说明抓取失败，单独重试 `curl -sL <url> -o <file>`。

- [ ] **Step 5.4: 提交说明**

**不提交** `/tmp/` 内容（不在仓库内）。无需 commit。

---

## Task 6: 翻译 Cluster A — 入门篇（4 篇）

**Files:**
- Modify: `tutorials/LangChain/1.概览/README.md`
- Modify: `tutorials/LangChain/2.设计哲学/README.md`
- Modify: `tutorials/LangChain/3.安装/README.md`
- Modify: `tutorials/LangChain/4.快速开始/README.md`

**Source files:**
- `/tmp/lc-src/01-overview.html`
- `/tmp/lc-src/02-philosophy.html`
- `/tmp/lc-src/03-install.html`
- `/tmp/lc-src/04-quickstart.html`

- [ ] **Step 6.1: 提取并翻译第 1 篇（LangChain 概览）**

读取 `/tmp/lc-src/01-overview.html`，提取 `<main>` 标签内的正文（跳过 nav、footer、cookie banner）。

按以下原则翻译并二次创作：
- 标题、段落、列表项翻译为中文。
- 代码块保留英文原样；行内注释视情况翻译为中文。
- 对原文简略处补充 1-2 句解释（如 `create_agent` 的 harness 概念，可补充"模型循环之外的所有部分"的注解）。
- 保留 API 名（`createAgent`、`tool`、`invoke`）和类型签名不动。
- 段末追加：

```markdown
---

> 本文基于 [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview) 翻译并二次创作。
```

写入 `tutorials/LangChain/1.概览/README.md`，frontmatter 保持 Task 4 中的内容，正文替换为翻译后的内容。

**验收**: 文件存在；包含至少 1 个 ` ```js ` 代码块；包含官方文档链接；字数 > 500 中文字符。

- [ ] **Step 6.2: 提取并翻译第 2 篇（设计哲学）**

读取 `/tmp/lc-src/02-philosophy.html`，处理同 Step 6.1。

写入 `tutorials/LangChain/2.设计哲学/README.md`，文末追加官方文档链接（URL: `.../philosophy`）。

**验收**: 字数 > 400 中文字符；包含官方文档链接。

- [ ] **Step 6.3: 提取并翻译第 3 篇（安装）**

读取 `/tmp/lc-src/03-install.html`，处理同 Step 6.1。重点保留所有 `npm install`、`pnpm add`、`yarn add` 命令原样。

写入 `tutorials/LangChain/3.安装/README.md`，文末追加官方文档链接（URL: `.../install`）。

**验收**: 至少包含 3 个 `npm install` / `pnpm add` / `yarn add` 代码块；字数 > 300 中文字符。

- [ ] **Step 6.4: 提取并翻译第 4 篇（快速开始）**

读取 `/tmp/lc-src/04-quickstart.html`，处理同 Step 6.1。Quickstart 通常含较多代码，逐段保留并补充行内注释。

写入 `tutorials/LangChain/4.快速开始/README.md`，文末追加官方文档链接（URL: `.../quickstart`）。

**验收**: 包含可运行的 agent 示例代码块；字数 > 800 中文字符。

- [ ] **Step 6.5: 验证 4 篇均能在 dev server 渲染**

Run: `cd /Users/taowen/project/kit && pnpm dev`
浏览器抽样访问 4 个 URL，确认页面正常渲染、代码块语法高亮、frontmatter 不泄漏到正文。

通过后 Ctrl+C。

- [ ] **Step 6.6: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/LangChain/1.概览/ tutorials/LangChain/2.设计哲学/ tutorials/LangChain/3.安装/ tutorials/LangChain/4.快速开始/
git commit -m "docs(tutorials): LangChain 入门篇 4 篇（概览/哲学/安装/快速开始）"
```

---

## Task 7: 翻译 Cluster B — Agent 核心篇（4 篇）

**Files:**
- Modify: `tutorials/LangChain/5.Agent/README.md` (源: `/tmp/lc-src/05-agents.html`, URL: `.../agents`)
- Modify: `tutorials/LangChain/6.模型/README.md` (源: `/tmp/lc-src/06-models.html`, URL: `.../models`)
- Modify: `tutorials/LangChain/7.工具/README.md` (源: `/tmp/lc-src/07-tools.html`, URL: `.../tools`)
- Modify: `tutorials/LangChain/8.消息/README.md` (源: `/tmp/lc-src/08-messages.html`, URL: `.../messages`)

- [ ] **Step 7.1: 翻译第 5 篇（Agent）**

读取 `/tmp/lc-src/05-agents.html`，提取正文，按 Task 6 Step 6.1 的翻译原则处理。这一篇是核心，重点讲清 `createAgent` 的参数（model、tools、middleware、prompt）与执行模型。

写入 `tutorials/LangChain/5.Agent/README.md`，文末追加 `.../agents` 的官方链接。

**验收**: 包含 `createAgent({...})` 代码块；字数 > 800 中文字符。

- [ ] **Step 7.2: 翻译第 6 篇（模型）**

读取 `/tmp/lc-src/06-models.html`，处理同上。重点保留各 provider（OpenAI、Anthropic、Google）的 import 路径与初始化代码。

写入 `tutorials/LangChain/6.模型/README.md`。

**验收**: 包含至少 2 个不同 provider 的模型初始化示例；字数 > 600 中文字符。

- [ ] **Step 7.3: 翻译第 7 篇（工具）**

读取 `/tmp/lc-src/07-tools.html`，重点保留 `tool(...)` 工厂函数的签名、zod schema 用法、工具调用的执行流程。

写入 `tutorials/LangChain/7.工具/README.md`。

**验收**: 包含 `tool(...)` 自定义工具示例；字数 > 600 中文字符。

- [ ] **Step 7.4: 翻译第 8 篇（消息）**

读取 `/tmp/lc-src/08-messages.html`，保留 `HumanMessage`、`AIMessage`、`SystemMessage`、`ToolMessage` 等类名原样。

写入 `tutorials/LangChain/8.消息/README.md`。

**验收**: 包含 4 种消息类型的代码示例；字数 > 500 中文字符。

- [ ] **Step 7.5: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/LangChain/5.Agent/ tutorials/LangChain/6.模型/ tutorials/LangChain/7.工具/ tutorials/LangChain/8.消息/
git commit -m "docs(tutorials): LangChain Agent 核心篇 4 篇（Agent/模型/工具/消息）"
```

---

## Task 8: 翻译 Cluster C — 中间件篇（4 篇）

**Files:**
- Modify: `tutorials/LangChain/9.中间件概览/README.md` (源: `09-middleware-overview.html`, URL: `.../middleware/overview`)
- Modify: `tutorials/LangChain/10.内置中间件/README.md` (源: `10-middleware-builtin.html`, URL: `.../middleware/built-in`)
- Modify: `tutorials/LangChain/11.自定义中间件/README.md` (源: `11-middleware-custom.html`, URL: `.../middleware/custom`)
- Modify: `tutorials/LangChain/12.结构化输出/README.md` (源: `12-structured-output.html`, URL: `.../structured-output`)

- [ ] **Step 8.1: 翻译第 9 篇（中间件概览）**

读取 `/tmp/lc-src/09-middleware-overview.html`，重点讲清中间件在 agent loop 中的拦截位置（model call 前/后）。

写入 `tutorials/LangChain/9.中间件概览/README.md`。

**验收**: 包含中间件注册示例；字数 > 500 中文字符。

- [ ] **Step 8.2: 翻译第 10 篇（内置中间件）**

读取 `/tmp/lc-src/10-middleware-builtin.html`，列出 LangChain 提供的内置中间件（如 `toolChoice`、`retry`、`runtimeContext` 等），保留每个的代码示例。

写入 `tutorials/LangChain/10.内置中间件/README.md`。

**验收**: 至少覆盖 3 个内置中间件；字数 > 700 中文字符。

- [ ] **Step 8.3: 翻译第 11 篇（自定义中间件）**

读取 `/tmp/lc-src/11-middleware-custom.html`，保留 `wrapModelCall` 或等效签名的自定义中间件示例。

写入 `tutorials/LangChain/11.自定义中间件/README.md`。

**验收**: 包含完整的自定义中间件代码示例；字数 > 500 中文字符。

- [ ] **Step 8.4: 翻译第 12 篇（结构化输出）**

读取 `/tmp/lc-src/12-structured-output.html`，保留 zod schema 与 `outputSchema`/`responseFormat` 的用法。

写入 `tutorials/LangChain/12.结构化输出/README.md`。

**验收**: 包含 zod schema 与结构化输出版 agent 示例；字数 > 500 中文字符。

- [ ] **Step 8.5: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/LangChain/9.中间件概览/ tutorials/LangChain/10.内置中间件/ tutorials/LangChain/11.自定义中间件/ tutorials/LangChain/12.结构化输出/
git commit -m "docs(tutorials): LangChain 中间件篇 4 篇（概览/内置/自定义/结构化输出）"
```

---

## Task 9: 翻译 Cluster D — 流式与记忆篇（5 篇）

**Files:**
- Modify: `tutorials/LangChain/13.流式输出/README.md` (源: `13-streaming.html`, URL: `.../streaming`)
- Modify: `tutorials/LangChain/14.事件流/README.md` (源: `14-event-streaming.html`, URL: `.../event-streaming`)
- Modify: `tutorials/LangChain/15.上下文工程/README.md` (源: `15-context-engineering.html`, URL: `.../context-engineering`)
- Modify: `tutorials/LangChain/16.短期记忆/README.md` (源: `16-short-term-memory.html`, URL: `.../short-term-memory`)
- Modify: `tutorials/LangChain/17.长期记忆/README.md` (源: `17-long-term-memory.html`, URL: `.../long-term-memory`)

- [ ] **Step 9.1: 翻译第 13 篇（流式输出）**

读取 `/tmp/lc-src/13-streaming.html`，保留 `stream()` / `await for await` 异步迭代示例。

写入 `tutorials/LangChain/13.流式输出/README.md`。

**验收**: 包含 `for await` 流式消费示例；字数 > 500 中文字符。

- [ ] **Step 9.2: 翻译第 14 篇（事件流）**

读取 `/tmp/lc-src/14-event-streaming.html`，保留事件类型（`on_message_chunk` 等）的区分。

写入 `tutorials/LangChain/14.事件流/README.md`。

**验收**: 包含事件流订阅代码示例；字数 > 500 中文字符。

- [ ] **Step 9.3: 翻译第 15 篇（上下文工程）**

读取 `/tmp/lc-src/15-context-engineering.html`，处理同上。

写入 `tutorials/LangChain/15.上下文工程/README.md`。

**验收**: 字数 > 600 中文字符。

- [ ] **Step 9.4: 翻译第 16 篇（短期记忆）**

读取 `/tmp/lc-src/16-short-term-memory.html`，保留 thread_id、checkpointer 等概念。

写入 `tutorials/LangChain/16.短期记忆/README.md`。

**验收**: 包含 thread_id 配置示例；字数 > 500 中文字符。

- [ ] **Step 9.5: 翻译第 17 篇（长期记忆）**

读取 `/tmp/lc-src/17-long-term-memory.html`，保留 store API、namespace 概念。

写入 `tutorials/LangChain/17.长期记忆/README.md`。

**验收**: 包含 store 读写示例；字数 > 500 中文字符。

- [ ] **Step 9.6: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/LangChain/13.流式输出/ tutorials/LangChain/14.事件流/ tutorials/LangChain/15.上下文工程/ tutorials/LangChain/16.短期记忆/ tutorials/LangChain/17.长期记忆/
git commit -m "docs(tutorials): LangChain 流式与记忆篇 5 篇"
```

---

## Task 10: 翻译 Cluster E — 高级能力篇（5 篇）

**Files:**
- Modify: `tutorials/LangChain/18.人机协作/README.md` (源: `18-human-in-the-loop.html`, URL: `.../human-in-the-loop`)
- Modify: `tutorials/LangChain/19.护栏/README.md` (源: `19-guardrails.html`, URL: `.../guardrails`)
- Modify: `tutorials/LangChain/20.检索RAG/README.md` (源: `20-retrieval.html`, URL: `.../retrieval`)
- Modify: `tutorials/LangChain/21.MCP集成/README.md` (源: `21-mcp.html`, URL: `.../mcp`)
- Modify: `tutorials/LangChain/22.可观测性/README.md` (源: `22-observability.html`, URL: `.../observability`)

- [ ] **Step 10.1: 翻译第 18 篇（人机协作）**

读取 `/tmp/lc-src/18-human-in-the-loop.html`，保留 interrupt、resume 机制。

写入 `tutorials/LangChain/18.人机协作/README.md`。

**验收**: 包含 interrupt/resume 示例；字数 > 600 中文字符。

- [ ] **Step 10.2: 翻译第 19 篇（护栏）**

读取 `/tmp/lc-src/19-guardrails.html`，保留 guardrail 中间件用法。

写入 `tutorials/LangChain/19.护栏/README.md`。

**验收**: 包含 guardrail 注册示例；字数 > 500 中文字符。

- [ ] **Step 10.3: 翻译第 20 篇（检索 RAG）**

读取 `/tmp/lc-src/20-retrieval.html`，保留 retriever、vector store 概念。

写入 `tutorials/LangChain/20.检索RAG/README.md`。

**验收**: 包含 retriever 工具示例；字数 > 700 中文字符。

- [ ] **Step 10.4: 翻译第 21 篇（MCP 集成）**

读取 `/tmp/lc-src/21-mcp.html`，保留 MultiServerMCPClient 或等效客户端 API。

写入 `tutorials/LangChain/21.MCP集成/README.md`。

**验收**: 包含 MCP 客户端初始化示例；字数 > 500 中文字符。

- [ ] **Step 10.5: 翻译第 22 篇（可观测性）**

读取 `/tmp/lc-src/22-observability.html`，保留 LangSmith tracing 配置（env vars、API key）。

写入 `tutorials/LangChain/22.可观测性/README.md`。

**验收**: 包含 `LANGSMITH_TRACING=true` 等环境变量配置示例；字数 > 500 中文字符。

- [ ] **Step 10.6: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/LangChain/18.人机协作/ tutorials/LangChain/19.护栏/ tutorials/LangChain/20.检索RAG/ tutorials/LangChain/21.MCP集成/ tutorials/LangChain/22.可观测性/
git commit -m "docs(tutorials): LangChain 高级能力篇 5 篇（HITL/护栏/RAG/MCP/可观测性）"
```

---

## Task 11: 翻译 Cluster F — 集成与部署篇（5 篇）

**Files:**
- Modify: `tutorials/LangChain/23.UI集成/README.md` (源: `23-ui.html`, URL: `.../ui`)
- Modify: `tutorials/LangChain/24.前端集成/README.md` (源: `24-frontend.html`, URL: `.../frontend/overview`)
- Modify: `tutorials/LangChain/25.LangGraphStudio/README.md` (源: `25-studio.html`, URL: `.../studio`)
- Modify: `tutorials/LangChain/26.运行时/README.md` (源: `26-runtime.html`, URL: `.../runtime`)
- Modify: `tutorials/LangChain/27.部署/README.md` (源: `27-deploy.html`, URL: `.../deploy`)

- [ ] **Step 11.1: 翻译第 23 篇（UI 集成）**

读取 `/tmp/lc-src/23-ui.html`。

写入 `tutorials/LangChain/23.UI集成/README.md`。

**验收**: 字数 > 400 中文字符。

- [ ] **Step 11.2: 翻译第 24 篇（前端集成）**

读取 `/tmp/lc-src/24-frontend.html`，保留浏览器/Edge runtime 注意事项。

写入 `tutorials/LangChain/24.前端集成/README.md`。

**验收**: 字数 > 500 中文字符。

- [ ] **Step 11.3: 翻译第 25 篇（LangGraph Studio）**

读取 `/tmp/lc-src/25-studio.html`，保留 Studio 桌面应用的下载链接与配置。

写入 `tutorials/LangChain/25.LangGraphStudio/README.md`。

**验收**: 字数 > 400 中文字符。

- [ ] **Step 11.4: 翻译第 26 篇（运行时）**

读取 `/tmp/lc-src/26-runtime.html`，保留 LangGraph Platform/SDK 用法。

写入 `tutorials/LangChain/26.运行时/README.md`。

**验收**: 字数 > 500 中文字符。

- [ ] **Step 11.5: 翻译第 27 篇（部署）**

读取 `/tmp/lc-src/27-deploy.html`，保留部署目标（LangGraph Platform、Cloudflare、Vercel 等）的命令示例。

写入 `tutorials/LangChain/27.部署/README.md`。

**验收**: 包含至少 1 个部署命令示例；字数 > 500 中文字符。

- [ ] **Step 11.6: 提交**

```bash
cd /Users/taowen/project/kit
git add tutorials/LangChain/23.UI集成/ tutorials/LangChain/24.前端集成/ tutorials/LangChain/25.LangGraphStudio/ tutorials/LangChain/26.运行时/ tutorials/LangChain/27.部署/
git commit -m "docs(tutorials): LangChain 集成与部署篇 5 篇（UI/前端/Studio/运行时/部署）"
```

---

## Task 12: 全量验证与最终提交

- [ ] **Step 12.1: 完整构建验证**

Run: `cd /Users/taowen/project/kit && pnpm build:docs 2>&1 | tail -20`
Expected: 构建成功，无错误。

- [ ] **Step 12.2: dev server 全功能验证**

Run: `cd /Users/taowen/project/kit && pnpm dev`

浏览器验证：
1. 顶部导航顺序：`我的分类 / 我的归档 / 我的标签 / 自定义库 / 教程 / 展示柜 / 我的项目`。
2. "教程" → "LangChain" 跳转到 `LangChain 概览`。
3. 左侧 sidebar 列出 27 项，按 order 排序。
4. 抽样点击首篇（1.概览）、中篇（14.事件流）、末篇（27.部署），URL 与内容正确渲染。
5. 抽样检查 3 篇的 frontmatter 是否未泄漏到正文。

通过后 Ctrl+C 终止 dev server。

- [ ] **Step 12.3: 推送（可选）**

如果用户要求推送：

```bash
cd /Users/taowen/project/kit
git log --oneline -15  # 确认提交历史
git push origin main
```

**注意**: 推送前与用户确认（推到 main 是影响共享状态的操作）。

---

## 完成标准

- [ ] 顶部 nav"教程"项位于"自定义库"右侧，展开含"LangChain"子项。
- [ ] "LangChain" sidebar 列出 27 篇，按 order 升序。
- [ ] 每篇 URL 形如 `/tutorials/LangChain/<title>`。
- [ ] 每篇含 frontmatter（title/categories/order/date/tags）。
- [ ] 每篇正文为中文翻译 + 二次创作，末尾标注官方原文链接。
- [ ] 每篇字数达到本计划规定的最小阈值。
- [ ] `pnpm build:docs` 成功。
- [ ] 代码改动提交在 6-8 个 commit 中（Task 1/2/3/4/6/7/8/9/10/11 各一次）。

---

## 翻译与二次创作通用规范（所有 Cluster 任务适用）

1. **保留原貌**:
   - 代码块、API 名、类名、函数名、变量名、npm 包名一律保留英文原样。
   - 命令行（`npm install`、`curl` 等）保留原样。
   - 配置键（`LANGSMITH_TRACING`、`OPENAI_API_KEY` 等）保留原样。

2. **翻译处理**:
   - 段落、标题、列表项、表格单元格翻译为中文。
   - 行内注释（`// xxx`）视情况翻译：简单注释翻译，涉及 API 名的保留。
   - 专有名词（LangChain、LangGraph、LangSmith、OpenAI、Anthropic、MCP）保留英文。

3. **二次创作**:
   - 原文每节末尾可补充 1-2 句自己的理解（用 ">" 引用块或正文段落）。
   - 复杂代码块前可加一段"代码要点"说明。
   - 章节之间可加一句过渡。
   - **不要**大规模扩写或改写原意。

4. **每篇末尾固定追加**:
   ```markdown
   ---

   > 本文基于 [LangChain 官方文档](<原 URL>) 翻译并二次创作。
   ```

5. **frontmatter 不动**（Task 4 已写好，Cluster 任务只改正文）。
