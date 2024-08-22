---
title: iPhone SE 发布会轮播图
categories: 页面效果
---

<script setup>
import { HtmlViewer } from '@wenonly/html-viewer'
import viewerData from './index.html?viewer';
</script>

<html-viewer :previewHtml="viewerData.html" :files="viewerData.files" iframeHeight="calc(100vh - 451px)"/>

:::details 复制代码

需要在网页中引入`html-viewer`的库。

1. 引入 `html-viewer`

```html
<script src="https://npm.elemecdn.com/@wenonly/html-viewer/lib/html-viewer.umd.js"></script>
```

2. 使用 `html-viewer`

```html-vue
<html-viewer src="{{viewerData.source}}" />
```

:::

