# useMessageRequest

将 postMessage 的请求和响应进行封装，方便使用。

## 使用示例

```ts
const { postAsync: getFormDefine } = useMessageRequest<FormDefineVO>({
  postMessageHandler: () =>
    iframeRef.current?.contentWindow?.postMessage({ type: "form:save" }, "*"),
  isMessageOk: (e) =>
    e.data?.type === "form:saveDefine" &&
    e.source === iframeRef.current?.contentWindow,
  postAsyncThen: (e) => {
    const define = e.data?.payload;
    return define;
  },
});

useEffect(() => {
  const formDefine = await getFormDefine();
}, []);
```
