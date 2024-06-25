/**
 * 监听resize，调用callback
 */
import { throttle } from "lodash-es";
import { useCallback, useEffect, useRef } from "react";

function useResize(callback: () => void = () => {}, wait: number = 50) {
  const cb = useRef<() => void>(callback);
  const setResizeCallback = useCallback((func: () => void) => {
    cb.current = func;
  }, []);
  useEffect(() => {
    const handle = () => cb.current?.();
    const throttleFunc = throttle(handle, wait);
    window.addEventListener("resize", throttleFunc);
    return () => {
      window.removeEventListener("resize", throttleFunc);
    };
  }, [wait]);
  return [setResizeCallback];
}

export default useResize;
