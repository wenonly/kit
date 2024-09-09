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

1. 添加摄像机

配置一个 `ArcRotateCamera` ，然后将视线固定到中心点，然后加上交互，就能围绕中心点拖动交互查看了。

```js
  private createCamera() {
    const { centerPositions, cubeletSize } = this._options;
    const camera = new ArcRotateCamera(
      "camera1",
      Tools.ToRadians(30),
      Tools.ToRadians(75),
      cubeletSize * 10,
      new Vector3(centerPositions[0], centerPositions[1], centerPositions[2]),
      this._scene
    );
    camera.attachControl(this._canvas, true);
    camera.setTarget(Vector3.Zero());
  }
```

2. 添加灯光

如果一个场景中没有灯光，则无法查看到效果。
在正方体的相对的两个角设置点光源，另外多设置一个直射光源加强光照。

```js
private createLight() {
    const { centerPositions, cubeletSize } = this._options;
    const lights = [
      [1, 1, 1],
      [-1, -1, -1],
    ];
    const lightDistance = cubeletSize * 1.5 + 2;
    lights.reverse().forEach((lt, index) => {
      const light = new PointLight(
        `light-${index}`,
        new Vector3(
          centerPositions[0] + lt[0] * lightDistance,
          centerPositions[1] + lt[1] * lightDistance,
          centerPositions[2] + lt[2] * lightDistance
        ),
        this._scene
      );
      light.intensity = 1;
      const dlight = new DirectionalLight(
        "d-light",
        new Vector3(lt[0], lt[1], lt[2]),
        this._scene
      );
      dlight.intensity = 0.5;
    });
  }
```

## 创建模型

魔方其实就是一个包含 26 个正方体的集合，所以只需要按照一定方法创建 26 个正方体就行。
画了立方体后也需要确定每一个立方体的具体位置。
先确定一个中心，添加配置`centerPositions: [0, 0, 0]`，表示魔方的中心就是 xyz 轴的中心。
让后使用`-1,1,0`排列表示每个魔方相对中心点的位置，这个位置需要乘以魔方每个小块的大小`cubeletSize`。

1. 计算绘制位置

魔方需要绘制 26 个小方块，这些方块的配置位置可以使用`1,-1,0`排列表示。

```js
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
```

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

```js
// 设置六个面的颜色，每个小方块六个面都会上色，这样比较简单
const colors = [
  new Color4(1, 1, 1, 1), // 白色
  new Color4(1, 1, 0, 1), // 黄色
  new Color4(0, 0, 1, 1), // 蓝色
  new Color4(0, 1, 0, 1), // 绿色
  new Color4(1, 0.5, 0, 1), // 橙色
  new Color4(1, 0, 0, 1), // 红色
];
```

绘制方块，每个方块的各个面分别都设置有颜色。

```js
cubelets.forEach((pos) => {
  // pos 就是使用1,-1,0组合的数组，例如[1,0,0]表示沿x轴正方向的方块
  const cubeletBox = MeshBuilder.CreateBox(
    `cubelet-${pos[0]}-${pos[1]}-${pos[2]}`,
    {
      width: cubeletSize,
      height: cubeletSize,
      depth: cubeletSize,
      faceColors: colors,
    },
    this._scene
  );
  const x = centerPositions[0] - pos[0] * cubeletSize;
  const y = centerPositions[1] - pos[1] * cubeletSize;
  const z = centerPositions[2] - pos[2] * cubeletSize;
  cubeletBox.position = new Vector3(x, y, z);
  cubeletBox.scaling = new Vector3(0.98, 0.98, 0.98);
  cubeletBox.metadata = {
    pos,
  };
  this._cubelets.push(cubeletBox);
});
```
