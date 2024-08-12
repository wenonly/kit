---
title: wsl2中docker启动不了的问题解决方法
categories: 折腾纪录
date: 2023-04-22 22:46
tags:
- wsl
---

在wsl2的ubuntu系统中安装docker后，`sudo service docker start` 一直启动不起来

在网上找到了解决方案
> https://juejin.cn/post/7197594278083919932

# 解决方法

这个错误提示通常是因为系统中使用的是经过修改的 nftables，而 Docker 安装程序使用 iptables 进行 NAT。为了解决这个问题，您可以使用以下命令将系统切换回使用传统的 iptables：
```
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
```

该命令将 `/usr/sbin/iptables-legacy` 和 `/usr/sbin/ip6tables-legacy` 分别设置为 iptables 和 ip6tables 的备选方案。

然后，您可以尝试重新启动 Docker 守护进程（如果尚未运行）：
```
sudo service docker start
```
现在，Docker 应该已经能够正常工作了！