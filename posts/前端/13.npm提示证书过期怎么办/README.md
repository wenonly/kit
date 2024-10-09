---
title: npm安装包的时候提示证书过期怎么办？
date: 2024-10-09 10:30
categories: 前端笔记
tags:
  - npm
---

在使用 npm 安装包的时候出现提示证书已过期，提示如下：

```bash
reason: certificate has expired
```

尝试安装包一直失败，尝试以下方法解决了这个问题。

```bash
npm cache clean --force
npm config set strict-ssl false
```
