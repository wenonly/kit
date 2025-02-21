export type HookType<T = any> = () => T;
export type HookRefCallbackType = (val: any) => void;

export default class ModelDispatcher {
  callbacks: WeakMap<HookType, Set<HookRefCallbackType>> = new WeakMap();

  data: WeakMap<HookType, any> = new WeakMap();

  update = (hookRef: HookType) => {
    (this.callbacks.get(hookRef) || []).forEach((callback: HookRefCallbackType) => {
      try {
        const data = this.data.get(hookRef);
        callback(data);
      } catch (e) {
        callback(undefined);
      }
    });
  };
}
