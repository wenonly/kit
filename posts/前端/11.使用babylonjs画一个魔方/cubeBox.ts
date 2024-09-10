import {
  Animation,
  Axis,
  Color4,
  EngineStore,
  Mesh,
  MeshBuilder,
  Nullable,
  Quaternion,
  Scene,
  Tools,
  TransformNode,
  Vector3,
} from "@babylonjs/core";

// 排列
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

export enum CubeFace {
  Front = "F",
  Back = "B",
  Up = "U",
  Down = "D",
  Left = "L",
  Right = "R",
}

const faceGetters = {
  [CubeFace.Front]: (pos: number[]) => pos[2] === -1,
  [CubeFace.Back]: (pos: number[]) => pos[2] === 1,
  [CubeFace.Up]: (pos: number[]) => pos[1] === 1,
  [CubeFace.Down]: (pos: number[]) => pos[1] === -1,
  [CubeFace.Left]: (pos: number[]) => pos[0] === -1,
  [CubeFace.Right]: (pos: number[]) => pos[0] === 1,
};

let id = 0;

export class CubeBox {
  private _cubelets: Mesh[] = [];
  private _cubeletSize;
  private _centerPosition: Vector3;
  private _scene: Nullable<Scene>;
  private _id: number;
  constructor(cubeletSize: number, centerPosition: Vector3, scene?: Scene) {
    this._cubeletSize = cubeletSize;
    this._centerPosition = centerPosition;
    this._scene = scene ?? EngineStore.LastCreatedScene;
    this._id = id++;
    this.createCube();
  }
  // 获取一个面的方块
  private getFaceCublets(faceDirection: CubeFace) {
    return this._cubelets.filter((item) =>
      faceGetters[faceDirection](item.metadata.currentPos)
    );
  }
  public rotate(faceDirection: CubeFace, clockwise = true) {
    const faceCublets = this.getFaceCublets(faceDirection);
    const axis =
      faceDirection === CubeFace.Up || faceDirection === CubeFace.Down
        ? Axis.Y
        : faceDirection === CubeFace.Left || faceDirection === CubeFace.Right
        ? Axis.X
        : Axis.Z;

    const angle = clockwise ? Tools.ToRadians(90) : Tools.ToRadians(-90);
    // 定义一个空节点，用于旋转
    const axisNode = new TransformNode("axis", this._scene);
    faceCublets.forEach((item) => {
      item.parent = axisNode;
    });
    const frameRate = 60;
    // 定义绕世界Y轴旋转的动画
    const rotationAnimation = new Animation(
      "rotationAnimation",
      "rotationQuaternion",
      frameRate,
      Animation.ANIMATIONTYPE_QUATERNION,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    const keys = [
      { frame: 0, value: Quaternion.Identity() },
      { frame: frameRate, value: Quaternion.RotationAxis(axis, angle) },
    ];
    rotationAnimation.setKeys(keys);
    axisNode.animations = [rotationAnimation];

    return new Promise((resolve, reject) => {
      if (!this._scene) {
        reject(new Error("cannot find scene!"));
        return;
      }
      try {
        // 开始动画
        this._scene.beginAnimation(axisNode, 0, frameRate, false, 1, () => {
          faceCublets.forEach((item) => {
            // 解绑和重新计算模块位置
            this.calcCurrentPos(item);
            this.calcRealPosition(item);
            item.parent = null;
            item.rotationQuaternion = Quaternion.RotationAxis(
              axis,
              angle
            ).multiply(item.rotationQuaternion ?? Quaternion.Identity());
          });
          axisNode.dispose();
          resolve(true);
        });
      } catch (error) {
        reject(error);
      }
    });
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
    const cubelets: number[][] = [];
    // 全排列，构成26块位置
    permute([-1, 1, 0], [], cubelets);
    cubelets.pop(); // 不要0 0 0的项
    this._cubelets = [];
    const colors = this.getColors();
    cubelets.forEach((pos) => {
      const cubeletBox = MeshBuilder.CreateBox(
        `cubelet-${this._id}-${pos[0]}-${pos[1]}-${pos[2]}`,
        {
          width: this._cubeletSize,
          height: this._cubeletSize,
          depth: this._cubeletSize,
          faceColors: colors,
        },
        this._scene
      );
      cubeletBox.scaling = new Vector3(0.98, 0.98, 0.98);
      cubeletBox.metadata = {
        originPos: pos.slice(), // 纪录排列位置
        currentPos: pos.slice(),
      };
      this.calcRealPosition(cubeletBox);
      this._cubelets.push(cubeletBox);
    });
  }
  private calcRealPosition(cubelet: Mesh) {
    const currentPos = cubelet.metadata.currentPos.slice();
    const x = currentPos[0] * this._cubeletSize + this._centerPosition.x;
    const y = currentPos[1] * this._cubeletSize + this._centerPosition.y;
    const z = currentPos[2] * this._cubeletSize + this._centerPosition.z;
    cubelet.position = new Vector3(x, y, z);
  }
  private calcCurrentPos(cubelet: Mesh) {
    const newPos = [
      Math.round(
        (cubelet.getAbsolutePosition().x - this._centerPosition.x) /
          this._cubeletSize
      ),
      Math.round(
        (cubelet.getAbsolutePosition().y - this._centerPosition.y) /
          this._cubeletSize
      ),
      Math.round(
        (cubelet.getAbsolutePosition().z - this._centerPosition.z) /
          this._cubeletSize
      ),
    ];
    cubelet.metadata.currentPos = newPos;
  }
}
