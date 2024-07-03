import { useMount, useUnmount } from 'ahooks';
import { useCallback, useRef, useState } from 'react';
import useRefData from './useRefData';

interface UseMessageRequestOptions<T> {
  timeoutTime?: number; // 超时时间，超时报错
  isMessageOk?: (e: MessageEvent) => boolean; // 接收 postMessage 的 检查函数，true 为通过
  postMessageHandler: (...args: any) => void; // postMessage 使用的 方法
  beforePostMessage?: () => void;
  postAsyncThen: (e: MessageEvent) => T; // promise.then的回调函数，执行完了才会loading结束
}

// 用于向子页面发起postMessage请求，且接受响应
export default <T = MessageEvent>(options: UseMessageRequestOptions<T>) => {
  const optionsRef = useRefData(() => options);
  const [loading, setLoading] = useState(false);
  const onfulfilledRef = useRef<(value: MessageEvent) => void>(() => {});
  const onrejectedRef = useRef<(reason?: any) => void>(() => {});
  const timeRef = useRef<NodeJS.Timeout>();
  const isPosted = useRef(false); // 调用postAsync才会接收相应的message

  const postAsync = useCallback(
    (...args: any): Promise<T> => {
      optionsRef.current.beforePostMessage?.();
      setLoading(true);
      optionsRef.current.postMessageHandler(...args);
      isPosted.current = true;
      return new Promise<MessageEvent>((resolve, reject) => {
        onfulfilledRef.current = resolve;
        onrejectedRef.current = reject;

        if (optionsRef.current.timeoutTime) {
          timeRef.current = setTimeout(() => {
            onrejectedRef.current(); // 超时错误
            isPosted.current = false; // 报错重置
          }, optionsRef.current.timeoutTime);
        }
      })
        .then((e) => {
          return optionsRef.current.postAsyncThen(e);
        })
        .then((e) => {
          setLoading(false);
          return e;
        });
    },
    [optionsRef],
  );

  const handleFun = useCallback(
    (e: MessageEvent) => {
      if (isPosted.current && optionsRef.current.isMessageOk?.(e)) {
        clearTimeout(timeRef.current);
        onfulfilledRef.current(e);
      }
    },
    [optionsRef],
  );

  useMount(() => {
    window.addEventListener('message', handleFun);
  });

  useUnmount(() => {
    clearTimeout(timeRef.current);
    window.removeEventListener('message', handleFun);
  });

  return {
    loading,
    postAsync,
  };
};
