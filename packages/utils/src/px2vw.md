# px2vw

## px2vw

将 px 单位转化为 vw 单位，用于自适应屏幕宽度。

```ts
const circleStyle: React.CSSProperties = {
  width: px2vw(radius ?? 90),
  height: px2vw(radius ?? 90),
  border: `1px solid ${themeColor}`,
  boxShadow: `0 0 5px 1px ${themeColor}`,
};
```

## vByW

根据屏幕宽度，重新等比例计算固定值。
