// 轮询工具
export function rollCreator<T = any>(
  rollFunc: (...args: T[]) => boolean | Promise<boolean>, // 返回true继续，false暂停轮询
  options: {
    rollTime?: number;
    rollWhenError?: boolean;
    startRollOnlyOnce?: boolean; // 只能执行一次开始轮询
  } = {}
) {
  const realOptions: Required<typeof options> = {
    rollTime: 3000,
    rollWhenError: false,
    startRollOnlyOnce: true,
    ...options,
  };
  function roll(...args: T[]) {
    Promise.resolve(rollFunc(...args))
      .then((isContinue) => {
        if (isContinue) {
          setTimeout(() => roll(...args), realOptions.rollTime);
        }
      })
      .catch(() => {
        if (realOptions.rollWhenError) {
          setTimeout(() => roll(...args), realOptions.rollTime);
        }
      });
  }

  let lock = false;
  return (...args: T[]) => {
    if (lock && realOptions.startRollOnlyOnce) {
      console.error("rollCreator roll startRollOnlyOnce");
      return;
    }
    lock = true;
    return roll(...args);
  };
}
