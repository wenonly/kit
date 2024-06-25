# useEventBus

一个全局的 eventBus，用于跨组件通信。

# 示例

```tsx
// 组件1
const globalEventBus = useEventBus();
globalEventBus.emit("[type]", "[data]");

// 组件2，接收type类型的消息
useEventBus("[type]", (v) => console.log(v));
```
