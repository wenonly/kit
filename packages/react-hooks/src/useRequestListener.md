# useRequestListener

通过 `useRequestListener` 可以在组件内容监听所有请求。

## 使用前提

需要在`axios`上配置`interceptor`。

## umi 中用例

先配置请求拦截器

```ts
import {
  responseHooksInterceptor,
  requestHooksInterceptor,
} from "@wenonly/react-hooks";

export const request: RequestConfig = {
  baseURL: "/base",
  requestInterceptors: [requestHooksInterceptor],
  responseInterceptors: [responseHooksInterceptor],
};
```

在组件中监听请求

```ts
useRequestListener({
  onRes: (response) => {
    // 拦截下载的接口
    if (
      response.config.url?.includes("/v1.0/download") &&
      response.config.method?.toLowerCase() === "post"
    ) {
      setAllowPoll(true);
      refresh();
      needDownloadIds.current.add(response.data.downloadId);
    }
  },
});
```
