import {
  ArcRotateCamera,
  AxesViewer,
  Engine,
  MeshBuilder,
  PointLight,
  Scene,
  Vector3,
} from "@babylonjs/core";

interface CubeBoxOptions {
  cubeletSize: number; // 每一小块的大小
  centerPositions: [number, number, number]; // xyz
}

const defaultOptions: CubeBoxOptions = {
  cubeletSize: 1,
  centerPositions: [0, 0, 0],
};

class CubeBoxSpace {
  private _canvas: HTMLCanvasElement | undefined;
  private _engine: Engine | undefined;
  private _scene: Scene | undefined;
  private _options: CubeBoxOptions;
  constructor(options?: CubeBoxOptions) {
    this._options = {
      ...defaultOptions,
      ...options,
    };
  }
  createScene(engine: Engine) {
    const { centerPositions, cubeletSize } = this._options;
    const scene = new Scene(engine);
    this._scene = scene;
    const camera = new ArcRotateCamera(
      "camera1",
      0,
      0,
      cubeletSize + 5,
      new Vector3(
        centerPositions[0] + cubeletSize + 5,
        centerPositions[1] + cubeletSize + 5,
        centerPositions[2] + cubeletSize + 5
      ),
      this._scene
    );
    camera.attachControl(this._canvas, true);
    camera.setTarget(Vector3.Zero());

    // 各个面都创建光源
    const lights = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [0, -1, 0],
      [-1, 0, 0],
    ];
    const lightDistance = cubeletSize * 1.5 + 5;
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
      light.intensity = 0.7;

      const box = MeshBuilder.CreateBox(`light-${index}-box`, {
        width: 0.1,
        height: 0.1,
        depth: 0.1,
      });
      box.position = new Vector3(
        centerPositions[0] + lt[0] * (lightDistance - 3),
        centerPositions[1] + lt[1] * (lightDistance - 3),
        centerPositions[2] + lt[2] * (lightDistance - 3)
      );
    });
    // 添加坐标轴
    new AxesViewer(this._scene);
  }
  createCube() {
    const { cubeletSize, centerPositions } = this._options;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          const cubelet = MeshBuilder.CreateBox(
            `cubelet-${i}-${j}-${k}`,
            {
              width: cubeletSize,
              height: cubeletSize,
              depth: cubeletSize,
            },
            this._scene
          );
          const x = centerPositions[0] - (i - 1) * cubeletSize;
          const y = centerPositions[1] - (j - 1) * cubeletSize;
          const z = centerPositions[2] - (k - 1) * cubeletSize;
          cubelet.position = new Vector3(x, y, z);
          cubelet.scaling = new Vector3(0.98, 0.98, 0.98);
        }
      }
    }
  }
  mount(canvasDom: HTMLCanvasElement | string) {
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

    this.createCube();

    const scene = this._scene!;
    this._engine.runRenderLoop(() => {
      scene.render();
    });
  }
}

export function renderCube(canvas: string) {
  const cubeBoxSpace = new CubeBoxSpace();
  cubeBoxSpace.mount(canvas);
}
