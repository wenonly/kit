// lockMap : {scope: [resolve]}
const lockMap: Record<
  string,
  {
    resolve: (...args: any) => void;
    reject: (...args: any) => void;
  }[]
> = {};
// 发起请求，同时发起多个时只会发起一次真实请求
export const createReqeustWithLock = <P extends any[], R>(
  req: (...args: P) => Promise<R>,
  scope?: string
) => {
  return function (...args: P): Promise<R> {
    const scp = (scope ?? req.toString()) + args.toString();
    return new Promise((resolve, reject) => {
      if (!lockMap[scp]) {
        lockMap[scp] = [];
        req(...args)
          .then((res) => {
            lockMap[scp].forEach((item) => {
              item.resolve(res);
            });
          })
          .catch((err) => {
            lockMap[scp].forEach((item) => {
              item.reject(err);
            });
          })
          .finally(() => {
            delete lockMap[scp];
          });
      }
      lockMap[scp].push({
        resolve,
        reject,
      });
    });
  };
};
