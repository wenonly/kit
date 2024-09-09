import {
  ArcRotateCamera,
  AxesViewer,
  DirectionalLight,
  Engine,
  PointLight,
  Scene,
  Tools,
  Vector3,
} from "@babylonjs/core";
import { CubeBox, CubeFace } from "./cubeBox";

interface CubeBoxSpaceOptions {
  cubeletSize: number; // 每一小块的大小
  centerPositions: [number, number, number]; // xyz
}

const defaultOptions: CubeBoxSpaceOptions = {
  cubeletSize: 1,
  centerPositions: [0, 0, 0],
};

class CubeBoxSpace {
  private _canvas: HTMLCanvasElement | undefined;
  private _engine: Engine | undefined;
  private _scene: Scene | undefined;
  private _options: CubeBoxSpaceOptions;
  private _cube: CubeBox | undefined;
  constructor(options?: CubeBoxSpaceOptions) {
    this._options = {
      ...defaultOptions,
      ...options,
    };
  }
  private createLight() {
    const { centerPositions, cubeletSize } = this._options;
    // 各个面都创建光源
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
  private createCamera() {
    const { centerPositions, cubeletSize } = this._options;
    const camera = new ArcRotateCamera(
      "camera1",
      Tools.ToRadians(-75),
      Tools.ToRadians(75),
      cubeletSize * 10,
      new Vector3(centerPositions[0], centerPositions[1], centerPositions[2]),
      this._scene
    );
    camera.attachControl(this._canvas, true);
    camera.setTarget(Vector3.Zero());
  }
  private createScene(engine: Engine) {
    const scene = new Scene(engine);
    this._scene = scene;
  }
  public mount(canvasDom: HTMLCanvasElement | string) {
    const { centerPositions, cubeletSize } = this._options;
    if (!canvasDom) throw new Error("canvas is required");
    if (typeof canvasDom === "string") {
      const canvas = document.querySelector(canvasDom);
      if (!canvas) throw new Error("canvas is not found");
      this._canvas = canvas as HTMLCanvasElement;
    } else {
      this._canvas = canvasDom;
    }
    this._engine = new Engine(this._canvas, true);
    this.createScene(this._engine);
    this.createCamera();
    this.createLight();
    this._cube = new CubeBox(
      cubeletSize,
      new Vector3(centerPositions[0], centerPositions[1], centerPositions[2]),
      this._scene
    );
    // 添加坐标轴
    // X 轴指向正方向（+X）通常是红色。
    // Y 轴指向正方向（+Y）通常是绿色。
    // Z 轴指向正方向（+Z）通常是蓝色。
    new AxesViewer(this._scene);
    const scene = this._scene!;
    this._engine.runRenderLoop(() => {
      scene.render();
    });
    window.addEventListener("resize", () => {
      this._engine?.resize();
    });
    setTimeout(async () => {
      // await this._cube?.rotate(CubeFace.Up);
      await this._cube?.rotate(CubeFace.Back);
      await this._cube?.rotate(CubeFace.Right);
      await this._cube?.rotate(CubeFace.Front);
    }, 1000);
  }
}

export function renderCube(canvas: string) {
  const cubeBoxSpace = new CubeBoxSpace();
  cubeBoxSpace.mount(canvas);
}
