# globalEventSource

公共 eventSource 处理逻辑，方便使用，页面显示隐藏自动重连断连。

```ts
const globalEventSource = new GlobalEventSource(
  "/comprehensive-assessment-system/eventSource/global"
);

export default globalEventSource;

// 启动
globalEventSource.start();

// 处理
useEffect(() => {
  globalEventSource.on(key, callbalkRef);
  return () => {
    globalEventSource.removeListener(key, callbalkRef);
  };
}, [callbalkRef, key]);

// 关闭
globalEventSource.close();
```
