# Kit

当前文档最初只是用于打包组件库，并展示组件库的文档，后面不断扩展就将博客迁移到了当前文档中。

`Kit`代表成套的工具，我计划将开发过程中好用的工具都放在这里，打包并生成方便查看的文档，能够在文档中直接预览组件的效果。

## 文档语法

本项目文档使用[vitepress](https://vitepress.dev/)，详细语法阅读[文档](https://vitepress.dev/guide/markdown)。
又对`vitepress`进行了一些扩展。

在原有语法的基础上加了一些其它语法。

1. 读取 typescript 文件中的 interface，生成文档表格。这样只需要在编写库的时候定义好类型，在文档中引入文件即可按表格展示库的参数说明。

```md
<!-- 文件路径::params:InterfaceName -->

<<< @/packages/kit/src/utils/index.ts::params:IConfig
```

2. 可以在文档或主题中导入博客数据列表

```js
import blogConfig from "config:blog";
```

3. 可以在文档中导入`html`路径，直接展示效果和源码。

```vue
<script setup>
import { HtmlViewer } from "@wenonly/html-viewer";
import viewerData from "./index.html?viewer";
</script>

<html-viewer :src="viewerData.source" iframeHeight="calc(100vh - 451px)" />
```

## 编译所有 packages 目录中的库

```shell
pnpm -r run build
```

## 发布 packages 目录中编译好的库

```shell
# 生成变更集
pnpm changeset
# 修改版本
pnpm changeset version
# 发布
pnpm changeset publish
```
