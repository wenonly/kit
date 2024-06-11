# rollHelper

## rollCreator

轮询工具函数，很多场景需要循环间隔请求数据，比如轮询检查登录状态，轮询检查订单状态等。这个函数保证上一个 promise 完成后再执行下一个 promise，始终保持执行的任务只有一条。

```ts
const options = {
  rollTime: POLL_CONTROL?.POLL_INTERVAL_TIME,
  rollErrorMaxTimes: POLL_CONTROL?.MAX_ERROR_ROLL_TIMES,
  rollWhenError: true,
};
// 轮询检查登录状态
const stopCheckLogin = rollCreator(async () => {
  const result = await this.eventSourceService.checkIsLoginMessage(req);
  sub.next(result);
  return { isContinue: true, status: result.data.status };
}, options)();
// 停止轮训
stopCheckLogin();
```
