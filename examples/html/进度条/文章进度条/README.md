---
title: 文章进度条
categories: 进度条
---

<script setup>
import { HtmlViewer } from '@wenonly/html-viewer'
import viewerData from './index.html?viewer';
</script>

<HtmlViewer :previewHtml="viewerData.html" :files="viewerData.files" iframeHeight="calc(100vh - 451px)"/>
