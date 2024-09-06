import {
  ArcRotateCamera,
  AxesViewer,
  Color4,
  DirectionalLight,
  Engine,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  Vector3,
  Tools
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
  private _cubelets: Mesh[] = [];
  constructor(options?: CubeBoxOptions) {
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
      Tools.ToRadians(30),
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
  private getColors() {
    const cubeColors = [
      new Color4(1, 1, 1, 1), // 白色
      new Color4(1, 1, 0, 1), // 黄色
      new Color4(0, 0, 1, 1), // 蓝色
      new Color4(0, 1, 0, 1), // 绿色
      new Color4(1, 0.5, 0, 1), // 橙色
      new Color4(1, 0, 0, 1), // 红色
    ];
    return cubeColors;
  }
  private createCube() {
    const { cubeletSize, centerPositions } = this._options;
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
    this._cubelets = [];
    const colors = this.getColors();
    cubelets.forEach((pos) => {
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
  }
  public mount(canvasDom: HTMLCanvasElement | string) {
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
    this.createCube();
    // 添加坐标轴
    new AxesViewer(this._scene);
    const scene = this._scene!;
    this._engine.runRenderLoop(() => {
      scene.render();
    });
    window.addEventListener("resize", () => {
      this._engine?.resize();
    });
  }
}

export function renderCube(canvas: string) {
  const cubeBoxSpace = new CubeBoxSpace();
  cubeBoxSpace.mount(canvas);
}
