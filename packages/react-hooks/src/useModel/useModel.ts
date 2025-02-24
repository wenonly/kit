import isEqual from "fast-deep-equal";
import { useContext, useEffect, useRef, useState } from "react";
import { ModelContext } from "./ModelContext";
import { HookType } from "./ModelDispatcher";

export function useModel<T = any>(hook: HookType<T>): T {
  if (!hook.name) {
    throw new Error("models目录中的hooks必须提供函数名称");
  }
  const { dispatcher } = useContext(ModelContext);
  const [state, setState] = useState(
    () => dispatcher.data.get(hook.name) ?? {}
  );
  const stateRef = useRef<any>(state);
  stateRef.current = state;

  const isMount = useRef(false);
  useEffect(() => {
    isMount.current = true;
    return () => {
      isMount.current = false;
    };
  }, []);

  useEffect(() => {
    const handler = (data: any) => {
      if (!isMount.current) {
        // 如果 handler 执行过程中，组件被卸载了，则强制更新全局 data
        // TODO: 需要加个 example 测试
        setTimeout(() => {
          dispatcher.data.set(hook.name, data);
          dispatcher.update(hook.name);
        });
      } else {
        const currentState = data;
        const previousState = stateRef.current;
        if (!isEqual(currentState, previousState)) {
          // 避免 currentState 拿到的数据是老的，从而导致 isEqual 比对逻辑有问题
          stateRef.current = currentState;
          setState(currentState);
        }
      }
    };

    dispatcher.callbacks.set(
      hook.name,
      dispatcher.callbacks.get(hook.name) || new Set()
    );
    dispatcher.callbacks.get(hook.name)!.add(handler);
    dispatcher.update(hook.name);

    return () => {
      dispatcher.callbacks.get(hook.name)!.delete(handler);
    };
  }, [dispatcher, hook]);

  return state;
}

export default useModel;
