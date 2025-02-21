# useModel

用于全局状态管理，改写Umi useModel实现。

# 使用方式

1. 获取models目录下的所有hooks

```ts
const modules = import.meta.glob('@/models/*.ts', { eager: true });
// modelHooks 是hooks的引用数组，也可以手动引入，但自动引入比较方便。
const modelHooks = Object.values(modules).map((module: any) => module.default);
```

2. 在应用入口使用`ModelProvider`

```tsx
<ModelProvider models={modelHooks}>
 <App />
</ModelProvider>
```

3. 在`models`目录中定义`hooks`

```ts
const useCount = () => {
    const [count, useCount] = useState()
    return {
        count,
        useCount,
    }
}
```

4. 使用`useModel`获取全局状态

```ts
const { count, setCount } = useModel(useCount)
```