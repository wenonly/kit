---
title: 如何使用docker安装jenkins
categories: 杂谈日记
date: 2021-11-27 16:39:53
tags:
- docker
- 前端
---

`jenkins`是开源软件项目，基于`Java`开发的持续集成工具，用于监控持续重复的工作，旨在提供一个开放易用的软件平台，使软件的持续集成变成可能。

`Docker`是一个开源的应用容器引擎，`Docker`可以让开发者打包他们的应用以及依赖包到一个轻量级、可移植的容器中，然后发布到任何流行的Linux 机器上，也可以实现虚拟化。

因为需要实现前端工程化，所以需要使用到`jenkins`工具，方便每次开发后能自动实现打包，上传等功能。

接下来记录的是在`docker`中安装`jenkins`的过程。

<!-- more -->

# docker中安装jenkins

1. docker下载jenkins
```
docker pull jenkins/jenkins:lts
```
2. 在本地创建jenkins的工作目录
```
mkdir ~/data/jenkins_home
```
3. 启动jenkins服务
```
docker run -d --name jenkins -p 7101:8080 -v ~/data/jenkins_home:/var/jenkins_home jenkins/jenkins:lts
```
这样就能在`docker`中启动`jenkins`服务，本地`7101`端口映射到了容器内`8080`端口，本地目录`~/data/jenkins_home`映射到了容器中`/var/jenkins_home`目录。

然后查看容器是否启动成功，成功后就能进入下一步，配置jenkins。

# 配置jenkins

1. 配置update-center
本地打开`~/data/jenkins_home/`目录找到`hudson.model.UpdateCenter.xml`文件
```xml
<?xml version='1.1' encoding='UTF-8'?>
<sites>
  <site>
    <id>default</id>
    <url>https://updates.jenkins.io/update-center.json</url>
  </site>
</sites>
```
将地址修改为`https://mirrors.cloud.tencent.com/jenkins/updates/current/update-center.json`
```xml
<?xml version='1.1' encoding='UTF-8'?>
<sites>
  <site>
    <id>default</id>
    <url>https://mirrors.cloud.tencent.com/jenkins/updates/current/update-center.json</url>
  </site>
</sites>
```
保存并重启，浏览器打开`http://localhost:7101`，可能不会马上看到页面，`jenkins`启动需要一定的时间。

3. 密码

初次进入页面需要输入密码，在`~/data/jenkins/secrets/initialAdminPassword`里面
```
cat ~/data/jenkins/secrets/initialAdminPassword
```
将密码输入后继续

4. 插件

直接安装推荐的插件，毕竟也不熟悉。继续之后会开始下载插件，因为已经更新了下载源，所以速度很快，如果没有更新源的话速度会很慢，甚至会下载失败。

