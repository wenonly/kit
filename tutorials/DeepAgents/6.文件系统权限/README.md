---
title: 文件系统权限
categories: DeepAgents
order: 6
date: 2026-06-25
tags:
  - DeepAgents
  - 权限
---

# 文件系统权限

> 使用声明式权限规则控制 Deep Agents 的文件系统访问

通过声明式权限规则，你可以控制 Agent 可以读取或写入哪些文件和目录。将规则列表传递给 `permissions=`，Agent 的内置文件系统工具就会遵循这些规则。

> 权限功能需要 `deepagents>=1.9.1`。

权限仅适用于内置文件系统工具（`ls`、`read_file`、`glob`、`grep`、`write_file`、`edit_file`）。访问文件系统的自定义工具和 MCP 工具不受此限制。权限也不适用于[沙箱后端](/tutorials/DeepAgents/沙箱)，因为沙箱通过 `execute` 工具支持任意命令执行。

::: tip 提示
当你需要对内置文件系统工具使用**基于路径的允许/拒绝规则**时，使用 `permissions`。当你需要自定义验证逻辑（速率限制、审计日志、内容检查）或需要控制自定义工具时，使用[后端策略钩子](/tutorials/DeepAgents/虚拟文件系统后端)。
:::

## 基本用法

将 `FilesystemPermission` 规则列表传递给 `createDeepAgent`。规则按声明顺序评估。第一个匹配的规则生效。如果没有规则匹配，则操作被允许。

```ts
const agent = createDeepAgent({
  model,
  backend,
  permissions: [
    {
      operations: ["write"],
      paths: ["/**"],
      mode: "deny",
    },
  ],
});
if (!agent) throw new Error("basic: agent not created");
```

## 规则结构

每个 `FilesystemPermission` 有三个字段：

| 字段         | 类型                    | 描述                                                                                                                                |
| ------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `operations` | `("read" \| "write")[]` | 此规则适用的操作。`"read"` 涵盖 `ls`、`read_file`、`glob`、`grep`。`"write"` 涵盖 `write_file`、`edit_file`。                       |
| `paths`      | `string[]`              | 用于匹配文件路径的 glob 模式（例如 `["/workspace/**"]`）。支持 `**` 递归匹配和 `{a,b}` 交替匹配。                                     |
| `mode`       | `"allow" \| "deny"`     | 允许还是拒绝匹配的操作。默认为 `"allow"`。                                                                                          |

规则使用"首匹配优先"评估：第一个其 `operations` 和 `paths` 匹配当前调用的规则决定结果。如果没有规则匹配，则调用被**允许**（宽松默认）。

路径必须是绝对路径（以 `/` 开头），不能包含 `..` 或 `~`。无效路径会在 Agent 构造时抛出异常。

## 示例

### 隔离到工作区目录

仅允许在 `/workspace/` 下进行读写，拒绝其他所有操作：

```ts
const agent = createDeepAgent({
  model,
  backend,
  permissions: [
    {
      operations: ["read", "write"],
      paths: ["/workspace/**"],
      mode: "allow",
    },
    {
      operations: ["read", "write"],
      paths: ["/**"],
      mode: "deny",
    },
  ],
});
if (!agent) throw new Error("isolate-workspace: agent not created");
```

### 保护特定文件

```ts
const agent = createDeepAgent({
  model,
  backend,
  permissions: [
    {
      operations: ["read", "write"],
      paths: ["/workspace/.env", "/workspace/examples/**"],
      mode: "deny",
    },
    {
      operations: ["read", "write"],
      paths: ["/workspace/**"],
      mode: "allow",
    },
    {
      operations: ["read", "write"],
      paths: ["/**"],
      mode: "deny",
    },
  ],
});
if (!agent) throw new Error("protect-files: agent not created");
```

### 只读记忆

允许 Agent 读取记忆文件但阻止其修改。这对于组织范围的策略或只应由应用代码更新的共享知识库非常有用。请参阅[只读 vs 可写记忆](/tutorials/DeepAgents/记忆)了解更多背景。

```ts
const store = new InMemoryStore();
const agent = createDeepAgent({
  model,
  backend: new CompositeBackend(new StateBackend(), {
    "/memories/": new StoreBackend({
      namespace: (rt) => [rt.serverInfo.user.identity],
    }),
    "/policies/": new StoreBackend({
      namespace: (rt) => [rt.context.orgId],
    }),
  }),
  permissions: [
    {
      operations: ["write"],
      paths: ["/memories/**", "/policies/**"],
      mode: "deny",
    },
  ],
  store,
});
if (!agent) throw new Error("read-only-memory: agent not created");
```

### 拒绝所有访问

阻止所有读写操作。这是一个严格的基础，你可以在其上叠加更具体的允许规则：

```ts
const agent = createDeepAgent({
  model,
  backend,
  permissions: [
    {
      operations: ["read", "write"],
      paths: ["/**"],
      mode: "deny",
    },
  ],
});
if (!agent) throw new Error("deny-all: agent not created");
```

### 规则排序

由于"首匹配优先"，规则顺序很重要。将更具体的规则放在更宽泛的规则之前：

```ts
const correctPermissions: FilesystemPermission[] = [
  { operations: ["read", "write"], paths: ["/workspace/.env"], mode: "deny" },
  {
    operations: ["read", "write"],
    paths: ["/workspace/**"],
    mode: "allow",
  },
  { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
];

const incorrectPermissions: FilesystemPermission[] = [
  {
    operations: ["read", "write"],
    paths: ["/workspace/**"],
    mode: "allow",
  },
  {
    operations: ["read", "write"],
    paths: ["/workspace/.env"],
    mode: "deny",
  },
  { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
];
```

## 子 Agent 权限

[子 Agent](/tutorials/DeepAgents/子 Agent) 默认继承父 Agent 的权限。要给子 Agent 不同的权限，在其 spec 中设置 `permissions` 字段。这会**完全替换**父 Agent 的规则。

```ts
const agent = createDeepAgent({
  model,
  backend,
  permissions: [
    {
      operations: ["read", "write"],
      paths: ["/workspace/**"],
      mode: "allow",
    },
    { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
  ],
  subagents: [
    {
      name: "auditor",
      description: "Read-only code reviewer",
      systemPrompt: "Review the code for issues.",
      permissions: [
        { operations: ["write"], paths: ["/**"], mode: "deny" },
        { operations: ["read"], paths: ["/workspace/**"], mode: "allow" },
        { operations: ["read"], paths: ["/**"], mode: "deny" },
      ],
    },
  ],
});
if (!agent) throw new Error("subagent: agent not created");
```

要显式授予子 Agent 不受限制的访问权限，设置 `permissions: []`。空数组会用无限制覆盖父级规则。省略 `permissions` 则继承父级。

## 组合后端

当使用 `CompositeBackend` 且以沙箱为默认后端时，每个权限路径必须在已知的路由前缀下。沙箱支持任意命令执行，因此仅基于路径的限制无法阻止通过 shell 命令进行的文件系统访问。将权限限定在特定路由的[后端](/tutorials/DeepAgents/虚拟文件系统后端)可以避免这种冲突。

```ts
const sandbox = new StateBackend();
const memoriesBackend = new StateBackend();
const composite = new CompositeBackend(sandbox, {
  "/memories/": memoriesBackend,
});
const agent = createDeepAgent({
  model,
  backend: composite,
  permissions: [
    { operations: ["write"], paths: ["/memories/**"], mode: "deny" },
  ],
});
if (!agent) throw new Error("composite-backend: agent not created");
```

包含任何路由之外路径的权限会在构造时抛出异常：

```ts
const sandbox = new StateBackend();
const memoriesBackend = new StateBackend();
const composite = new CompositeBackend(sandbox, {
  "/memories/": memoriesBackend,
});

createDeepAgent({
  model,
  backend: composite,
  permissions: [
    { operations: ["write"], paths: ["/workspace/**"], mode: "deny" },
  ],
});

createDeepAgent({
  model,
  backend: composite,
  permissions: [{ operations: ["read"], paths: ["/**"], mode: "deny" }],
});
```

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/permissions) 翻译并二次创作。
