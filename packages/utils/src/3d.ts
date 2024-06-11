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
