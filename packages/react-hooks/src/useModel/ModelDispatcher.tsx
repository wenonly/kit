export type HookType<T = any> = () => T;
export type HookRefCallbackType = (val: any) => void;

export default class ModelDispatcher {
  callbacks: Map<string, Set<HookRefCallbackType>> = new Map();

  data: Map<string, any> = new Map();

  update = (hookName: string) => {
    (this.callbacks.get(hookName) || []).forEach((callback: HookRefCallbackType) => {
      try {
        const data = this.data.get(hookName);
        callback(data);
      } catch (e) {
        callback(undefined);
      }
    });
  };
}
