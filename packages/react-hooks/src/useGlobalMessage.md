# useGlobalMessage

全局监听 message 事件，封装为 hook 方便使用

## 示例

```ts
// 监听子iframe关闭事件
useGlobalMessage("close", (e) => {
  if (e.source === iframeRef.current?.contentWindow) {
    props.onClose?.();
  }
});
```
