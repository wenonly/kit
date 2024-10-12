---
title: 使用Docker同步GitHub内容到NAS
categories: 折腾纪录
date: 2024-10-12 16:46
tags:
  - nas
  - docker
---

最近购置了一台`nas`，就想折腾点什么，于是就考虑将`github`的源码内容定时同步到我的`nas`中，防止以后意外被`github`屏蔽（比如使用了盗版`copilot`后又登录了自己的`copilot`，有可能账号被禁用）。
搜索了很多方案没有找到合适的，于是就自己实现了一个。

项目开源到[wenonly/github-sync](https://github.com/wenonly/github-sync)，感兴趣的可以看看。

## 准备工作

1. 一台安装了 Docker 的 NAS 设备
2. GitHub 账号和需要同步的仓库
3. GitHub 个人访问令牌(Personal Access Token)

## 使用步骤

### 1. 创建 GitHub 个人访问令牌

1. 登录 GitHub 账号
2. 点击右上角的头像,选择"Settings"
3. 在左侧菜单中选择"Developer settings"
4. 点击"Personal access tokens",然后选择"Tokens (classic)"
5. 点击"Generate new token"
6. 给令牌一个描述性的名称,并选择适当的权限(至少需要 repo 权限)
7. 生成令牌并保存,稍后我们会用到

### 2. 在 NAS 上设置 Docker 容器

1. 登录到 NAS 的管理界面
2. 打开 Docker 应用
3. 搜索并下载"wenonly/github-sync"镜像
4. 创建一个新的容器,使用以下命令:

   ```bash
   docker run -d --name github-sync \
     -e GITHUB_TOKEN=你的GitHub令牌 \
     -e GITHUB_USER=你的GitHub用户名 \
     -v /path/to/local/data:/app/data \
     github-sync
   ```

   请将`你的GitHub令牌`、`你的GitHub用户名`和`/path/to/local/data`替换为实际的值。

::: warning
如果是可视化配置界面，就需要理解一下这条命令了。
以下是 docker 命令的详细解释：

- `docker run -d`: 在后台运行容器
- `--name github-sync`: 为容器指定名称
- `-e GITHUB_TOKEN=你的GitHub令牌`: 环境变量设置 GitHub 访问令牌
- `-e GITHUB_USER=你的GitHub用户名`: 环境变量设置 GitHub 用户名
- `-v /path/to/local/data:/app/data`: 将 NAS 上的本地目录挂载到容器内的/app/data 目录
- `github-sync`: 使用的 Docker 镜像名称
  :::

5. 启动容器

## 环境变量配置

| 环境变量       | 描述                | 默认值        |
| -------------- | ------------------- | ------------- |
| GITHUB_TOKEN   | GitHub 个人访问令牌 | 无            |
| GITHUB_USER    | GitHub 用户名       | 无            |
| RUN_TIME       | 每日同步时间        | 01:00:00      |
| TZ             | 时区                | Asia/Shanghai |
| SMTP_SERVER    | SMTP 服务器地址     | smtp.qq.com   |
| SMTP_PORT      | SMTP 服务器端口     | 587           |
| SMTP_USERNAME  | SMTP 用户名         | 无            |
| SMTP_PASSWORD  | SMTP 密码           | 无            |
| EMAIL_SENDER   | 发件人邮箱地址      | 无            |
| EMAIL_RECEIVER | 收件人邮箱地址      | 无            |

邮件服务可以不配置，不发送邮件。邮件将在`github token`过期的时候发送。

## 功能描述

这个 Docker 容器提供了以下主要功能:

1. 自动同步 GitHub 仓库:
   - 定期从指定的 GitHub 用户账号同步所有仓库到 NAS 本地
   - 支持克隆新仓库和更新现有仓库
   - 同步所有分支的最新更改

2. 定时执行:
   - 可通过环境变量设置每日同步时间
   - 默认在每天凌晨 1 点执行同步

3. GitHub Token 有效性检查:
   - 在每次同步前检查 GitHub Token 是否有效
   - 如果 Token 过期,会取消同步操作

4. 邮件通知:
   - 当 GitHub Token 过期时,可发送邮件提醒
   - 需配置相关的 SMTP 邮件服务环境变量

5. 灵活配置:
   - 通过环境变量可自定义多项设置,如同步时间、时区等
   - 支持挂载本地目录到容器,方便数据持久化

6. 错误处理和日志:
   - 对可能出现的错误进行适当处理
   - 提供同步过程的日志输出

这个容器设计用于在 NAS 环境中长期运行,可以自动保持 GitHub 仓库的本地备份始终保持最新状态,非常适合需要频繁访问或备份 GitHub 内容的用户。

## 注意事项

- 确保为个人访问令牌设置了正确的权限（至少需要 repo 权限）
- 需要设置 GITHUB_TOKEN 和 GITHUB_USER 环境变量
- 需要挂载一个本地目录到容器中的 /app/data 目录
- 定期检查同步日志，确保一切正常运行
- 可以通过设置 RUN_TIME 环境变量来调整同步时间

通过这种方式，可以轻松地在 NAS 上保持 GitHub 仓库的最新副本，方便本地访问和备份。如果需要更多自定义配置，可以参考环境变量配置表进行调整。
