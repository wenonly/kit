---
title: 使用babylonjs画一个魔方
date: 2024-09-05 09:43
categories: 前端笔记
tags:
  - babylonjs
  - 3d
---

<script setup lang="ts">
import { onMounted } from "vue";
import { renderCube } from './cubeBoxSpace.ts'

onMounted(() => {
    renderCube("#canvas1")
})
</script>

## 示例

<canvas id="canvas1" style="height:500px;width:100%;"></canvas>

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

1. 添加摄像机

配置一个 `ArcRotateCamera` ，然后将视线固定到中心点，然后加上交互，就能围绕中心点拖动交互查看了。

<<< ./cubeBoxSpace.ts#camera

2. 添加灯光

如果一个场景中没有灯光，则无法查看到效果。
在正方体的相对的两个角设置点光源，另外多设置一个直射光源加强光照。

<<< ./cubeBoxSpace.ts#light

## 创建模型

魔方其实就是一个包含 26 个正方体的集合，所以只需要按照一定方法创建 26 个正方体就行。
画了立方体后也需要确定每一个立方体的具体位置。
先确定一个中心，添加配置`centerPositions: [0, 0, 0]`，表示魔方的中心就是 xyz 轴的中心。
让后使用`-1,1,0`排列表示每个魔方相对中心点的位置，这个位置需要乘以魔方每个小块的大小`cubeletSize`。

1. 计算绘制位置

魔方需要绘制 26 个小方块，这些方块的配置位置可以使用`1,-1,0`排列表示。

<<< ./cubeBox.ts#permute
<<< ./cubeBox.ts#permute-use

<script lang="ts">
function getCubeletsPos() {
  const cubelets: number[][] = [];
  function permute(arr: number[], stack: number[], result: number[][]) {
    if (stack.length === arr.length) {
      result.push(stack.slice());
      return;
    }
    for (let i = 0; i < arr.length; i++) {
      stack.push(arr[i]);
      permute(arr, stack, result);
      stack.pop();
    }
  }
  // 全排列，构成26块位置
  permute([-1, 1, 0], [], cubelets);
  cubelets.pop(); // 不要0 0 0的项
  return JSON.stringify(cubelets);
}
</script>

::: details 查看计算结果

```js-vue
{{ getCubeletsPos() }}
```

:::

2. 然后根据计算的相对位置数据，绘制魔方方块。

设置六个面的颜色。

<<< ./cubeBox.ts#color

绘制方块，每个方块的各个面分别都设置有颜色。

<<< ./cubeBox.ts#createCubelets

根据参数计算方块实际位置。

<<< ./cubeBox.ts#calcRealPosition

## 旋转动画

旋转的时候需要同时旋转一个面的所有方块，为了方便计算，创建一个空的节点，将需要旋转的方块全部绑定到这个空的节点上，然后旋转这个节点，就能实现旋转。

<<< ./cubeBox.ts#rotateCustomFace

旋转后因为会将空的节点删除掉，所以旋转后的节点为了保持位置还需重新计算。

<<< ./cubeBox.ts#recalc

## 拖动交互

为了实现拖动旋转的功能，需要全局监听拖动事件，纪录下拖动方块的法线和旋转方向。
在鼠标点击的时候纪录点击的方块坐标和法线等信息，移动的时候纪录下在相同方块移动的最后位置，最后根据坐标和法线计算旋转角度，并旋转。

<<< ./cubeBox.ts#attachDrag

根据法线和移动方向还有点击的方块信息，能计算出最终需要旋转的所有方块。
有法线和移动方向，能很方便的通过叉积计算旋转轴。
然后根据之间纪录的在节点 metadata 中的 currentPos 信息，就能过滤出所有需要旋转的方块。

<<< ./cubeBox.ts#getFaceCubeletsByNormalAndDirect

根据法线和鼠标移动方向也能很好的计算出旋转方向。

<<< ./cubeBox.ts#getRotationQueration

旋转角度使用`Quaternion`四元数是为了更精准的表示旋转方向，能够明确的表示最后的旋转状态。

在旋转魔方的时候也需要关闭摄像机的旋转交互，不然摄像机会跟着旋转。

```ts
this._scene?.activeCamera?.detachControl();
```

旋转完成再次开启摄像机交互。

```ts
this._scene?.activeCamera?.attachControl();
```

## 源码

::: code-group

```ts [index.ts]
import { onMounted } from "vue";
import { renderCube } from "./cubeBoxSpace.ts";

onMounted(() => {
  renderCube("#canvas1");
});
```

<<< ./cubeBoxSpace.ts
<<< ./cubeBox.ts
:::
