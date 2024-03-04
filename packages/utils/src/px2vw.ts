// 部分内联样式自适应问题 TODO: 自定义 loader 处理
const VIEWPORT_WIDTH = 1920;
const UNIT_PRECISION = 5;

// 根据屏幕宽度，重新等比例计算固定值
export function vByW(v: number) {
  return (v / VIEWPORT_WIDTH) * window.innerWidth;
}

const px2vw = (px: number) => `${((px / VIEWPORT_WIDTH) * 100).toFixed(UNIT_PRECISION)}vw`;

export default px2vw;
