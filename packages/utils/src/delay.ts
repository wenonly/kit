// 延时
export function delayMs(time: number) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => {
        resolve(true);
      }, time);
    } catch (error) {
      reject(error);
    }
  });
}
