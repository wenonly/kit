# treeHelper

树结构数据处理

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

## transformTree

对树结构进行转换

```tsx
<Menu
  items={transformTree(allowMenus, (item) => ({
    label: item.title,
    key: item.key || "",
  }))}
/>
```

## filterTree

对树结构进行过滤

```ts
const filterRoutes = filterTree(
  cloneDeep(currentRouteConfig?.routes || []),
  (n) => !!n.path && !n.redirect && !!access.has(n.accessKey),
  "routes"
);
```

## forEachTree

遍历树结构

```ts
const keys: string[] = [];
forEachTree(settingRoutes, (n) => {
  if (n.children?.length) {
    keys.push(n.key);
  }
});
```
