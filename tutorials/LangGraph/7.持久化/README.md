---
title: 持久化
categories: LangGraph
order: 7
date: 2026-06-25
tags:
  - LangGraph
  - 持久化
---

# 持久化

> LangGraph 的持久化层通过检查点（Checkpointer）为 Agent 提供短期记忆，通过存储（Store）提供长期记忆。

持久化让 LangGraph 应用能够在单次图运行之外保留有用信息。当 Agent 需要继续对话、在中断后恢复、从故障中恢复，或跨交互记住信息时，持久化就变得至关重要。

LangGraph 提供了两套互补的持久化系统：

- **[检查点（Checkpointers）](/tutorials/LangGraph/检查点)**：以检查点的形式持久化一个线程（thread）的图状态。适用于线程范围内的短期记忆，包括对话连续性、人机协作、时间旅行和容错。
- **[存储（Stores）](/tutorials/LangGraph/存储)**：在图状态之外持久化应用自定义数据。适用于跨线程的长期记忆，包括用户偏好、事实和共享知识。

大多数应用可以同时使用两者：用[检查点](/tutorials/LangGraph/检查点)追踪当前线程的状态，用[存储](/tutorials/LangGraph/存储)追踪跨线程的持久化信息。

## 快速开始

在编译图时传入检查点和/或存储即可启用持久化：

```typescript
import { MemorySaver, MemoryStore } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const store = new MemoryStore();

const graph = builder.compile({ checkpointer, store });

const result = await graph.invoke(
  { messages: [{ role: "user", content: "Hi, my name is Bob." }] },
  { configurable: { thread_id: "thread-1" } }
);
```

::: info Agent Server 自动处理持久化
当你使用 [Agent Server](/langsmith/agent-server) 时，无需手动实现或配置检查点或存储。服务端会在后台自动处理持久化基础设施。
:::

## 检查点 vs. 存储

| 维度     | 检查点（Checkpointer）                                        | 存储（Store）                                        |
| -------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| **持久化内容** | 图状态快照                                                    | 应用自定义的键值对数据                               |
| **作用范围**   | 单个线程                                                      | 跨线程                                               |
| **记忆类型**   | 线程范围的短期记忆                                            | 跨线程的长期记忆                                     |
| **适用场景**   | 对话连续性、人机协作、时间旅行、容错                          | 用户偏好、事实、共享知识                             |
| **访问方式**   | 在图配置中传入 `thread_id`                                    | 从节点或应用代码中读写数据项                         |
| **完整指南**   | [Checkpointers](/tutorials/LangGraph/检查点)                  | [Stores](/tutorials/LangGraph/存储)                  |

## 下一步

- [使用检查点](/tutorials/LangGraph/检查点)：持久化和检查线程状态。
- [使用存储](/tutorials/LangGraph/存储)：跨线程持久化持久数据。

---

> 本文基于 [LangGraph 官方文档](https://docs.langchain.com/oss/javascript/langgraph/persistence) 翻译并二次创作。
