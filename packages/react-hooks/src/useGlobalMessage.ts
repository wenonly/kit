import { useMount, useUnmount } from 'ahooks';
import { useCallback } from 'react';
import useRefData from './useRefData';

export default (type: string, fun: (e: MessageEvent) => void) => {
  const refs = useRefData(() => ({
    type,
    fun,
  }));

  const handleFun = useCallback(
    (e: MessageEvent) => {
      if (e.data.type === refs.current.type) {
        refs.current.fun(e);
      }
    },
    [refs],
  );

  useMount(() => {
    window.addEventListener('message', handleFun);
  });

  useUnmount(() => {
    window.removeEventListener('message', handleFun);
  });
};
