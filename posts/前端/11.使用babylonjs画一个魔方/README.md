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

## 示例

<canvas id="canvas1" style="height:500px;width:100%;"></canvas>

::: details 点我查看代码
<<< ./cubeBox.ts
:::

## 基础模板

```js
const canvas = document.querySelector("#canvas");
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
// 添加灯光
// 添加一些其它逻辑
engine.runRenderLoop(() => {
  scene.render();
});
window.addEventListener("resize", () => {
  engine.resize();
});
```
