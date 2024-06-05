// 下载blob
export const downloadBlob = (url: string | Blob, saveName: string) => {
  if (typeof url === "object" && url instanceof Blob) {
    // eslint-disable-next-line no-param-reassign
    url = URL.createObjectURL(url); // 创建blob地址
  }
  const aLink = document.createElement("a");
  aLink.href = url;
  aLink.download = saveName || "";
  aLink.click();
};

// 延时
export function delayMs(time: number) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => {
        resolve(true);
      }, time);
    } catch (error) {
      reject(error);
    }
  });
}

// 获取对象 反向映射
export const getReverseObject = (
  obj: Record<string | number, string | number>
) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [value, key])
  );
};

// 轮询工具
export function rollCreator<T = any>(
  rollFunc: (...args: T[]) => boolean | Promise<boolean>, // 返回true继续，false暂停轮询
  options: {
    rollTime?: number;
    rollWhenError?: boolean;
    startRollOnlyOnce?: boolean; // 只能执行一次开始轮询
  } = {}
) {
  const realOptions: Required<typeof options> = {
    rollTime: 3000,
    rollWhenError: false,
    startRollOnlyOnce: true,
    ...options,
  };
  function roll(...args: T[]) {
    Promise.resolve(rollFunc(...args))
      .then((isContinue) => {
        if (isContinue) {
          setTimeout(() => roll(...args), realOptions.rollTime);
        }
      })
      .catch(() => {
        if (realOptions.rollWhenError) {
          setTimeout(() => roll(...args), realOptions.rollTime);
        }
      });
  }

  let lock = false;
  return (...args: T[]) => {
    if (lock && realOptions.startRollOnlyOnce) {
      console.error("rollCreator roll startRollOnlyOnce");
      return;
    }
    lock = true;
    return roll(...args);
  };
}

// 旋转平面 x y 轴，xy坐标3d旋转，3d旋转时使用
export function rotatePoint(
  point: number[],
  center: number[],
  rx: number,
  ry: number,
  rz: number
) {
  // 将角度转化为弧度值
  const radX = (rx * Math.PI) / 180;
  const radY = (ry * Math.PI) / 180;
  const radZ = (rz * Math.PI) / 180;

  // 转换点的坐标系
  let x = point[0] - center[0];
  let y = point[1] - center[1];
  let z = 0;

  // 应用x轴旋转
  const cosX = Math.cos(radX);
  const sinX = Math.sin(radX);
  const y1 = y * cosX - z * sinX;
  const z1 = z * cosX + y * sinX;
  y = y1;
  z = z1;

  // 应用y轴旋转
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const x1 = x * cosY + z * sinY;
  z = z * cosY - x * sinY;
  x = x1;

  // 应用z轴旋转
  const cosZ = Math.cos(radZ);
  const sinZ = Math.sin(radZ);
  const x2 = x * cosZ - y * sinZ;
  const y2 = y * cosZ + x * sinZ;

  // 将坐标系还原至原始状态
  const resultX = x2 + center[0];
  const resultY = y2 + center[1];

  // 返回变换后的坐标值
  return [resultX, resultY];
}
