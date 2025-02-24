import { useMemo } from "react";
import { ModelContext } from "./ModelContext";
import ModelDispatcher, { HookType } from "./ModelDispatcher";
import ModelExecutor from "./ModelExecutor";

const dispatcher = new ModelDispatcher();

function ModelProvider(props: {
  models?: HookType[];
  children: React.ReactNode;
}) {
  // 校验
  useMemo(() => {
    // 这一步校验是否重复
    const nameToCount: Record<string, number> = {};
    props.models?.forEach((hook) => {
      if (!hook.name) throw new Error("models目录中的hooks必须提供函数名称");
      if (!nameToCount[hook.name]) nameToCount[hook.name] = 1;
      else {
        throw new Error("models目录中存在同名hooks");
      }
    });
  }, [props.models]);
  return (
    <ModelContext.Provider value={{ dispatcher }}>
      {props.models?.map((hook, index) => {
        return (
          <ModelExecutor
            key={hook.name + "_" + index}
            hook={hook}
            onUpdate={(val) => {
              dispatcher.data.set(hook.name, val);
              dispatcher.update(hook.name);
            }}
          />
        );
      })}
      {props.children}
    </ModelContext.Provider>
  );
}

export default ModelProvider;
