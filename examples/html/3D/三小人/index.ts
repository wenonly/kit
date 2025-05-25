import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import modelUrl from "./model.glb?url";

// 创建画布
const canvas = document.querySelector(
  "#canvas1",
) as unknown as HTMLCanvasElement;
canvas.style.width = "100%";
canvas.style.height = "100%";

// 创建引擎
const engine = new Engine(canvas, true);

// 创建场景
const scene = new Scene(engine);

// 创建相机
const camera = new ArcRotateCamera(
  "camera",
  Math.PI / 2,
  Math.PI / 2,
  10,
  new Vector3(-2, 1, 0),
  scene,
);
camera.attachControl(canvas, true);

// 创建光源
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 加载 GLB 模型
SceneLoader.ImportMesh("", "", modelUrl, scene, (meshes) => {
  // 模型加载完成后的回调
  console.log("Model loaded", meshes);
});

// 渲染循环
engine.runRenderLoop(() => {
  scene.render();
});

// 处理窗口大小变化
window.addEventListener("resize", () => {
  engine.resize();
});
