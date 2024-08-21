---
title: 贪吃蛇小游戏
categories: 小游戏
---

<script setup>
import { HtmlViewer } from '@wenonly/html-viewer'
import viewerData from './index.html?viewer';
</script>

<HtmlViewer :previewHtml="viewerData.html" :files="viewerData.files" iframeHeight="calc(100vh - 451px)"/>
