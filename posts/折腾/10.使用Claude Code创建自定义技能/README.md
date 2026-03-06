---
title: 使用 Claude Code 创建自定义技能
date: 2026-03-06 22:26
categories: 折腾纪录
tags:
  - Claude Code
  - 技能开发
  - 自动化
---

## 背景

最近发现 Claude Code 支持自定义技能（Skills），可以将常用的工作流程封装成可复用的技能。想着平时写博客的流程比较固定，就尝试创建了一个博客生成技能，整个过程还挺有意思的。

## 什么是 Claude Code Skills

Claude Code 是 Anthropic 官方的 CLI 工具，而 Skills 是其扩展机制。通过编写 `SKILL.md` 文件，可以定义特定的工作流程，让 Claude 在特定场景下自动调用这些技能。

技能文件的基本结构：

```
skill-name/
└── SKILL.md
    ├── YAML frontmatter (name, description)
    └── Markdown 指令
```

## 创建技能的流程

### 1. 使用 skill-creator 技能

Claude Code 内置了一个 `skill-creator` 技能，专门用于创建和管理其他技能。通过它，整个创建过程变得非常简单。

只需要说："帮我创建一个技能，作用是..."

### 2. 定义技能元数据

在 `SKILL.md` 的 frontmatter 中定义：

```yaml
---
name: blog-generator
description: 帮助用户将技术想法或内容生成为博客文章...
---

# 技能内容...
```

`description` 字段很重要，它决定了技能何时被触发。

### 3. 编写工作流程

在 Markdown 部分详细描述技能的工作流程。我的博客生成技能包含：

1. 准备阶段（git pull）
2. 收集用户信息
3. 自动分类
4. 确定文章编号
5. 生成博客文章
6. 用户审阅
7. 提交和推送

## 技能示例：博客生成器

创建的博客生成技能可以：

- **自动分类**：根据内容自动判断应该放在 AI、前端还是折腾分类
- **自动编号**：查找现有文章并分配新编号
- **格式规范**：按照博客的 frontmatter 和内容格式生成
- **Git 集成**：生成前后自动处理 git 操作

## 使用效果

创建完成后，只需要说：

> "写一篇博客" 或 "我有想法要记录"

技能就会自动触发，引导完成整个博客生成流程。

## 技能文件位置

技能文件存放在 `~/.claude/skills/` 目录下：

```bash
~/.claude/skills/
├── blog-generator/
│   └── SKILL.md
└── skill-creator/
    └── SKILL.md
```

## 技能编写的建议

1. **描述要具体**：`description` 字段要清楚说明技能的用途和触发场景
2. **流程要清晰**：使用明确的步骤编号，让 Claude 容易理解
3. **包含示例**：提供使用示例，帮助模型理解预期行为
4. **保持简洁**：避免过长的指令，聚焦在核心工作流程

## 总结

通过 Claude Code 的 Skills 机制，可以很好地封装重复性工作流程。创建博客生成技能的过程本身就是一个很好的实践案例。

如果你也有经常重复的工作流程，不妨试试创建一个自定义技能。
