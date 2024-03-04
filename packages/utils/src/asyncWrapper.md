# asyncWrapper

使用 React.lazy 异步加载组件的逻辑封装。

```ts
const Footer = asyncWrapper(() => import("./components/layout/Footer"));

<Footer />;
```
