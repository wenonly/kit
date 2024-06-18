<script setup>
import RUseTreeLoad from '@/examples/RUseTreeLoad.tsx'
</script>

# useTreeLoad

用于树形结构异步加载数据的 Hooks

## 示例

<VueWrapper :component="RUseTreeLoad" />

::: details
<<< @/examples/RUseTreeLoad.tsx
:::

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
