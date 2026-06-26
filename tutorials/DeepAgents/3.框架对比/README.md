---
title: 框架对比
categories: DeepAgents
order: 3
date: 2026-06-25
tags:
  - DeepAgents
  - 框架对比
---

# 框架对比

> 对比 LangChain Deep Agents 与 Claude Agent SDK，帮助你为场景选择合适的工具

本页将讲解 [LangChain Deep Agents](/tutorials/DeepAgents/Deep Agents 概览) 与 [Claude Agent SDK](https://platform.anthropic.com/docs/en/agent-sdk/overview) 之间的异同。两者都是用于构建自定义 Agent 的 harness，但在执行环境、部署方式和供应商绑定等方面做出了不同的取舍。

::: tip 信息
Deep Agents 已被 [OpenSWE](https://github.com/langchain-ai/open-swe) 和 [LangSmith Fleet](https://docs.langchain.com/langsmith/fleet/index) 用于生产环境。
:::

## 概览对比

|                          | **Deep Agents**                                                                                                                                          | **Claude Agent SDK**                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent 运行位置**       | 沙箱内部，或沙箱外部远程执行命令                                                                                                                         | 沙箱内部                                                                                                                              |
| **执行后端**             | 可插拔：[本地、虚拟文件系统、远程沙箱或自定义](/tutorials/DeepAgents/虚拟文件系统后端)                                                                   | Agent 所在沙箱的本地文件系统                                                                                                          |
| **模型供应商**           | 任意（Anthropic、OpenAI、Google 等 100+ 家）                                                                                                             | Claude（Anthropic、Bedrock、Vertex、Azure）                                                                                           |
| **按供应商/模型调优**    | [Harness Profile](/tutorials/DeepAgents/Harness Profile)（Beta）：声明式地打包系统提示词、工具、中间件和子 Agent 调整，按供应商或特定模型注册             | 在代码中于每个模型调用点手动配置                                                                                                      |
| **部署方式**             | LangSmith 中的 [Managed Deep Agents](https://docs.langchain.com/langsmith/managed-deep-agents-overview)，或通过 [`langgraph build`](https://docs.langchain.com/langsmith/cli#build) 自托管[独立镜像](https://docs.langchain.com/langsmith/deploy-standalone-server) | [自托管](https://code.claude.com/docs/en/agent-sdk/hosting)。需自行构建服务器、认证和流式传输层。[Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview) 是独立产品 |
| **多租户**               | [内置](/tutorials/DeepAgents/生产环境部署)：线程隔离、按用户分配沙箱、RBAC                                                                 | 需自行构建                                                                                                                            |
| **许可证**               | MIT                                                                                                                                                      | MIT（Claude Code 本身是专有许可）                                                                                                     |

## 主要差异

### Agent 与执行环境

[Agent 连接沙箱有两种模式](https://www.langchain.com/blog/the-two-patterns-by-which-agents-connect-sandboxes)：将 Agent 运行在沙箱*内部*，或将 Agent 运行在外部并**将沙箱作为工具使用**。

Claude Agent SDK 仅支持第一种模式——Agent 在沙箱内运行，并针对沙箱的本地文件系统执行工具。Anthropic 的托管模型 [Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview) 使用了解耦模式，这也反映了生产级 Agent 架构的发展趋势。

Deep Agents 同时支持两种模式，并允许你选择[后端](/tutorials/DeepAgents/虚拟文件系统后端)来灵活组合。实践中，你可以：

- 将 Agent 运行在沙箱内（与 Claude Agent SDK 相同的模式）。
- 将 Agent 运行在长生命周期的容器中，[将远程沙箱作为工具使用](https://www.langchain.com/blog/the-two-patterns-by-which-agents-connect-sandboxes)，通过网络执行命令。
- 为测试切换为虚拟文件系统，或为自有基础设施切换为自定义后端。

### 多租户

当应用走向生产时，通常需要面向大量终端用户，并且必须为每个用户隔离运行环境。

在 Claude Agent SDK 中，SDK 将 Agent 与其沙箱绑定在一起。要为每个用户提供隔离的执行环境，你必须自行构建 API 封装层——为每个用户启动沙箱、跟踪沙箱归属、使用后销毁。

Deep Agents 直接处理了这个问题：在 Harness 中按用户或按助手配置[沙箱](/tutorials/DeepAgents/生产环境部署)，内置线程隔离、运行历史和 [RBAC](/tutorials/DeepAgents/生产环境部署)。如果你使用 [LangSmith Sandbox](https://docs.langchain.com/langsmith/sandbox-auth-proxy)，还能开箱即用地获得认证代理，终端用户可以在沙箱中调用第三方 API，无需你为每个用户单独配置凭据。

### 生产级 Agent 服务器

要将[自托管的 Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/hosting) 应用暴露给终端用户，你需要自行编写 HTTP/WebSocket 或 SSE 服务器来调用 Agent、流式返回 token 并管理会话线程。这个服务器需要你自己构建、运维和安全防护。

Deep Agents 的部署开箱即用地包含一个 [Agent 服务器](https://docs.langchain.com/langsmith/agent-server)：流式端点、线程管理、运行历史、Webhooks 和[认证](https://docs.langchain.com/langsmith/auth)。

### 托管云或自托管

Claude Agent SDK 的部署是[自托管的](https://code.claude.com/docs/en/agent-sdk/hosting)。SDK 与 [Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview) 是独立产品，基于 SDK 编写的代码无法直接部署到托管服务上。

Deep Agent 支持两种模式且无需修改代码：

- **托管模式**：通过 LangSmith 中的 [Managed Deep Agents](https://docs.langchain.com/langsmith/managed-deep-agents-overview) 创建、运行和管理 Deep Agent。
- **自托管模式**：运行 [`langgraph build`](https://docs.langchain.com/langsmith/cli#build) 生成[独立 Docker 镜像](https://docs.langchain.com/langsmith/deploy-standalone-server)，可部署到任意环境。

::: tip 提示
如果你需要一个跨任意模型供应商的托管 Agent 平台，请使用 [LangSmith Fleet](https://docs.langchain.com/langsmith/fleet/index)。[Claude managed agents](https://platform.claude.com/docs/en/managed-agents/overview) 仅限于 Anthropic 生态系统。
:::

### LLM

Claude Agent SDK 的执行将模型、后端和部署三者捆绑在一起，并在这三者之间进行联合优化。

而 Deep Agents 允许你独立选择模型供应商、执行后端和部署目标。选择这个 harness 意味着你在模型和基础设施的选择上保留了最大的灵活性。

### 生态系统

Claude Agent SDK 专为 Claude 和 Anthropic 产品体系量身打造。Deep Agents 则与更广泛的 LangChain 生态系统集成——包括用于可观测性、评估和部署的 LangSmith，并且支持任意模型供应商。

## 总结

- **选择 Deep Agents**：如果你需要模型和基础设施的灵活性、内置的多租户部署能力，以及无需修改代码即可在托管和自托管之间切换。
- **选择 Claude Agent SDK**：如果你已经深入 Anthropic 生态系统，且愿意自行托管并构建 API、认证和多租户层。

::: tip 注意
**发现了错误？**

本对比初稿撰写于 2026 年 4 月 16 日。如果产品有更新，请[提交 issue](https://github.com/langchain-ai/docs/issues)。
:::

---

> 本文基于 [Deep Agents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/comparison) 翻译并二次创作。
