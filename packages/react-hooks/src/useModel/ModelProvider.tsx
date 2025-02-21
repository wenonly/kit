import { ModelContext } from "./ModelContext";
import ModelDispatcher, { HookType } from "./ModelDispatcher";
import ModelExecutor from "./ModelExecutor";

const dispatcher = new ModelDispatcher();

function ModelProvider(props: {
  models?: HookType[];
  children: React.ReactNode;
}) {
  return (
    <ModelContext.Provider value={{ dispatcher }}>
      {props.models?.map((hook, index) => {
        return (
          <ModelExecutor
            key={index}
            hook={hook}
            onUpdate={(val) => {
              dispatcher.data.set(hook, val);
              dispatcher.update(hook);
            }}
          />
        );
      })}
      {props.children}
    </ModelContext.Provider>
  );
}

export default ModelProvider;
