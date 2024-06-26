# useRefData

通过 useRef 封装数据对象，防止读取数据闭包问题。

## 示例

```tsx
const isHover = useHover(wrapRef);

const dataRef = useRefData(() => ({
  isHover,
}));

useEffect(() => {
  return () => {
    console.log(dataRef.current.isHover);
  };
}, []);
```
