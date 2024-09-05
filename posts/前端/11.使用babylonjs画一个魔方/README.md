---
title: 使用babylonjs画一个魔方
date: 2024-09-05 09:43
categories: 前端笔记
tags:
  - babylonjs
  - 3d
---

<script setup>
import { onMounted } from "vue";
import { renderCube } from './cubeBox.ts'

onMounted(() => {
    renderCube("#canvas1")
})
</script>

## 初始 babylon 代码

<canvas id="canvas1" height="500" width="500"></canvas>

::: details 点我查看代码
<<< ./cubeBox.ts
:::
