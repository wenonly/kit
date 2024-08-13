---
title: 如何配置Dockerfile优化打包速度
date: 2024-08-13 11:54
categories: 前端笔记
tags:
  - docker
---

## Docker 简介

Docker 是一个开源的容器化平台，它使得开发人员可以将应用程序及其所有依赖项打包到一个轻量级的容器中。这些容器可以在任何支持 Docker 的系统上运行，保证了应用程序的环境一致性。Docker 通过使用容器技术，实现了快速的应用部署和可移植性，极大地简化了开发、测试和生产环境的配置。

## Dockerfile 命令语法介绍

Dockerfile 是 Docker 容器镜像的构建脚本。它包含了一系列的指令，这些指令用于定义镜像的基础环境和安装配置。常见的 Dockerfile 命令包括：

FROM: 指定基础镜像。
LABEL: 为镜像添加元数据。
USER: 设置镜像中运行命令的用户。
RUN: 执行命令并创建新的镜像层。
COPY: 将文件从宿主机复制到镜像中。
WORKDIR: 设置工作目录。
EXPOSE: 声明容器运行时监听的端口。
ENTRYPOINT: 设置容器启动时执行的命令。
CMD: 提供默认的执行命令或参数。

## pnpm 缓存设置

pnpm 是一个高效的 JavaScript 包管理器，它通过将所有的依赖项存储在一个全局缓存中，从而节省磁盘空间并加速安装速度。在 Dockerfile 中使用 pnpm 时，可以利用 Docker 的缓存机制来优化构建过程。

在 Dockerfile 中，使用了 `pnpm config set store-dir /pnpm/store` 来指定缓存目录。这种方式可以确保所有的包都被缓存到指定的目录，从而在后续的构建中重复利用这些缓存，加快构建速度并减少网络带宽消耗。

## Docker 分层优化原理

Docker 镜像是由多个层组成的，每一层代表了 Dockerfile 中的一个命令。每层都是只读的，并且在构建过程中，如果某一层的内容没有改变，那么 Docker 会重用之前的层，从而避免重新构建，节省时间和资源。

在 Dockerfile 中，使用了多阶段构建的技巧来优化镜像的构建过程。例如：

```dockerfile
FROM base AS deps-install
...
FROM base AS prod-deps-install
...
FROM deps-install AS client-build
...
```

每个阶段定义了一个镜像的层，这些层在构建过程中会被缓存。如果某一阶段的文件没有变化，Docker 就会使用之前的缓存结果，而不需要重新执行该阶段的命令。这种方式可以显著减少构建时间，特别是当项目的依赖项和构建过程比较复杂时。

为了有效利用 Docker 的分层机制，可以按照以下原则进行 Dockerfile 的配置：

1. 分阶段构建：将 Dockerfile 分为多个阶段，每个阶段处理特定的任务，例如依赖安装、构建和打包等。通过将不同的任务分开处理，你可以减少不必要的重新构建。
2. 缓存管理：利用 Docker 的缓存机制，将经常不变的操作（如依赖安装）放在前面。这样，当文件没有变化时，Docker 会重用缓存，避免重复执行这些操作。
3. 优化 COPY 操作：尽量将 COPY 操作分开，避免每次都复制整个代码库。如果 package.json 文件没有变化，可以将安装依赖的步骤分开，这样可以避免不必要的依赖重装。
4. 最小化镜像：只将必要的文件和依赖复制到最终镜像中，删除临时文件和不必要的构建工具。这有助于减少最终镜像的大小，提高启动速度。

## Dockerfile 示例配置

示例 Dockerfile 中的优化配置如下：

```dockerfile
FROM node:16-alpine
USER root
RUN npm install pnpm@8.15.8 -g
RUN pnpm config set store-dir /pnpm/store

WORKDIR /usr/src/app
COPY .npmrc .

# 安装所有依赖
FROM base As deps-install
COPY pnpm-*.yaml .
COPY package.json .
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY fieldDefinePlugin/package.json fieldDefinePlugin/package.json
COPY chartView/package.json chartView/package.json
RUN --mount=type=cache,id=build,target=/pnpm/store pnpm install --no-optional
RUN rm -rf client/package.json server/package.json fieldDefinePlugin/package.json chartView/package.json

# 仅安装server的prod依赖
FROM base As prod-deps-install
COPY pnpm-*.yaml .
RUN pnpm init
COPY server/package.json server/package.json
RUN --mount=type=cache,id=build,target=/pnpm/store pnpm --filter "server" install --prod

# 打包client
FROM deps-install AS client-build
COPY client client
RUN pnpm -r run build

# 打包server
FROM deps-install AS server-build
COPY server server
RUN pnpm -r run build

# 打包fieldDefinePlugin
FROM deps-install AS fieldDefinePlugin-build
COPY fieldDefinePlugin fieldDefinePlugin
RUN pnpm -r run build

# 打包chartView
FROM deps-install AS chartView-build
COPY chartView chartView
RUN pnpm -r run build

# 最终产物生成
FROM prod-deps-install AS pack
COPY package.json package.json
COPY start.sh start.sh
COPY server server
COPY --from=server-build /usr/src/app/server/dist /usr/src/app/server/dist
COPY --from=client-build /usr/src/app/client/dist /usr/src/app/client/dist
COPY --from=fieldDefinePlugin-build /usr/src/app/fieldDefinePlugin/dist /usr/src/app/fieldDefinePlugin/dist
COPY --from=chartView-build /usr/src/app/chartView/dist /usr/src/app/chartView/dist
RUN chmod +x start.sh

EXPOSE 3000
ENTRYPOINT ./start.sh
```

通过这种分阶段构建的方式，可以确保在 package.json 不变的情况下，依赖安装步骤不会重复执行，从而提高构建效率。
