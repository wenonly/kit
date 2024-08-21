---
title: 瀑布流懒加载
categories: 页面效果
---

<script setup>
import { HtmlViewer } from '@wenonly/html-viewer'
import viewerData from './index.html?viewer';
</script>

<HtmlViewer :previewHtml="viewerData.html" :files="viewerData.files" iframeHeight="calc(100vh - 451px)"/>
