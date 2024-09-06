---
title: 钢琴白块2
categories: 小游戏
---

<script setup>
import { HtmlViewer } from '@wenonly/html-viewer'
import viewerData from './index.html?viewer';
</script>

<html-viewer :src="viewerData.source"  iframeHeight="calc(100vh - 451px)"/>

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

