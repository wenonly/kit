# useTreeLoad

用于树形结构异步加载数据的 Hooks

## 参数

```tsx
interface UseTreeLoadOptions<T extends object> {
  manualInit?: boolean; // 手动init page1
  getRequest: (
    parentNode?: DefaultOptionType
  ) => TreeLoadNodeProps<UseTreeLoadRequestResult>["request"]; // 没有parentNode代表第一层
  transformer: (node: DefaultOptionType) => T; // 树已经构建好了之后，对每个节点进行转换
  loadMoreNodeRender?: (
    status: "loading" | "complete" | "waitLoad",
    defaultDom: JSX.Element
  ) => JSX.Element; // 加载更多 节点渲染
}
```

## 示例

```tsx
const { treeData, loading, refresh } = useTreeLoad({
  getRequest: (parent) => {
    // 如果存在父节点，则应用子节点加载逻辑
    if (parent) {
      return ({ page, size }) => {
        return Promise.resolve({
          list: [
            {
              label: "子" + page,
              value: "child" + page,
            },
          ],
          isComplete: false,
        });
      };
    }
    return ({ page, size }) => {
      return Promise.resolve({
        list: [
          {
            label: "父1",
            value: "parent1",
          },
        ],
        isComplete: true,
      });
    };
  },
  transformer: (node) => node,
});

<Tree treeData={treeData} />;
```
