# storageControl

## storageControlCreator

对 storage 控制逻辑进行封装，对需要控制的 key 进行固化，方便使用。

```ts
// 用于记录登录后跳转的页面
export const LoginSuccessRedirectControl = storageControlCreator(
  "__success_redirect_url__"
);

// 使用封装好的storage工具
import { LoginSuccessRedirectControl } from "...";
const redirectPathName = LoginSuccessRedirectControl.get();
LoginSuccessRedirectControl.set("");
```

第二个参数是 enums，用于调整存入到 storage 中的实际值的映射

例如 enums: { a: "b" }, 当 使用 set 方法存入数据的时候，如果存入 a，那么实际为 b，否则其它值原样存入

```ts
// 记录登录类型，cookie失效后跳转回相应的登录页面
export const LoginTypeControll = storageControlCreator("__login_type__", {
  criminal: "crl", // 可以转化成不那么语意话的值，加大分析难度
  police: "pl",
  manage: "mg",
});
```
