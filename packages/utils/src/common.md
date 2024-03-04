# common

一些方便的工具函数。

## downloadBlob

下载 Blob 对象为文件的函数。

```ts
const blob = await sheet2blob(sheet, name);
downloadBlob(blob, `${name}.xlsx`);
```

## findFromTree

从树结构中找到对应的对象

```ts
if (checkAuditUsed && allowKey) {
  const node = findFromTree(tree, (item) => item.value === allowKey);
  if (node) {
    node.disabled = false;
  }
}
```

## delayMs

延迟毫秒

```ts
await delayMs(500);
```

## transformTreeNode

对树结构进行转换

```tsx
<Menu
  items={transformTreeNode(allowMenus, (item) => ({
    label: item.title,
    key: item.key || "",
  }))}
/>
```

## getReverseObject

获取对象的反向映射

```ts
const obj = { a: "b" };
console.log(getReverseObject(obj)); // { b: "a" }
```

## rollCreator

轮询工具函数

```ts
const options = {
  rollTime: POLL_CONTROL?.POLL_INTERVAL_TIME,
  rollErrorMaxTimes: POLL_CONTROL?.MAX_ERROR_ROLL_TIMES,
  rollWhenError: true,
};
// 轮询检查登录状态
const stopCheckLogin = rollCreator(async () => {
  const result = await this.eventSourceService.checkIsLoginMessage(req);
  sub.next(result);
  return { isContinue: true, status: result.data.status };
}, options)();
// 停止轮训
stopCheckLogin();
```

## rotatePoint

旋转平面 x y 轴，xy 坐标 3d 旋转，3d 旋转时使用

```ts
const mapRotate = {
  rx: 35,
  ry: 15,
  rz: -15,
};
const mapCenterXY = [103.001033, 30.659462];
const projection = {
  project: (point: number[]) =>
    rotatePoint(
      [
        (point[0] / 180) * Math.PI,
        -Math.log(Math.tan((Math.PI / 2 + (point[1] / 180) * Math.PI) / 2)),
      ],
      mapCenterXY,
      mapRotate.rx,
      mapRotate.ry,
      mapRotate.rz
    ),
  unproject: (point: number[]) => {
    const reversePoint = rotatePoint(
      point,
      mapCenterXY,
      -mapRotate.rx,
      -mapRotate.ry,
      -mapRotate.rz
    );
    return [
      (reversePoint[0] * 180) / Math.PI,
      ((2 * 180) / Math.PI) * Math.atan(Math.exp(reversePoint[1])) - 90,
    ];
  },
};
```
