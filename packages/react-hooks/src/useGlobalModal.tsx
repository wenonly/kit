import { useMemoizedFn, useMount, usePrevious, useUnmount } from "ahooks";
import type { ModalProps } from "antd";
import EventEmitter from "eventemitter3";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidV4 } from "uuid";
import useRefData from "./useRefData";

class GlobalModalDom extends EventEmitter {
  private children: Record<string, React.FunctionComponentElement<ModalProps>> =
    {};
  private group: Record<string, Set<string>> = {};

  private addToGroup(group: string, key: string) {
    if (!this.group[group]) this.group[group] = new Set();
    this.group[group].add(key);
  }

  private deleteFromGroup(group: string, key: string) {
    if (this.group[group]) {
      this.group[group].delete(key);
      if (this.group[group].size === 0) {
        delete this.group[group];
      }
    }
  }

  set(
    key: string,
    modal: React.FunctionComponentElement<ModalProps>,
    group: string = "root",
  ) {
    this.children[key] = modal;
    this.addToGroup(group, key);
    this.update(group);
  }

  delete(key: string, group: string = "root") {
    delete this.children[key];
    this.deleteFromGroup(group, key);
    this.update(group);
  }

  list(group: string = "root") {
    return Object.entries(this.children)
      .filter((item) => this.group[group]?.has(item[0]))
      .map((item) => ({
        key: item[0],
        modal: item[1],
      }));
  }

  private update(group: string = "root") {
    this.emit("updateComponent-" + group);
  }

  dispose(group: string = "root") {
    this.children = Object.fromEntries(
      Object.entries(this.children).filter(
        (item) => !this.group[group]?.has(item[0]),
      ),
    );
    delete this.group[group];
  }
}

const globalModalDom = new GlobalModalDom();
const GlobalModalContext = React.createContext({ group: "root" });

// 类似 react.context scope，设置modal根目录
export const GlobalModalScope: React.FunctionComponent<{
  children?: React.ReactNode;
  root?: boolean;
}> = (props) => {
  const [group] = useState(() => (props.root ? "root" : uuidV4()));
  const [modalList, setModalList] = useState<
    ReturnType<typeof globalModalDom.list>
  >(() => globalModalDom.list(group));

  useMount(() => {
    globalModalDom.on("updateComponent-" + group, () => {
      setModalList(globalModalDom.list(group));
    });
  });

  useUnmount(() => {
    globalModalDom.dispose(group);
  });

  return (
    <GlobalModalContext.Provider value={{ group }}>
      {props.children}
      {modalList.map((item) => (
        <React.Fragment key={item.key}>{item.modal}</React.Fragment>
      ))}
    </GlobalModalContext.Provider>
  );
};

// 需注意的是下面这种方式上层的context无法获取
// 所以一般情况请在外层设置GlobalModalScope，modal的虚拟dom将在GlobalModalScope的位置
// if (!document.querySelector('#modal-root')) {
//   const modalRoot = document.createElement('div');
//   modalRoot.id = 'modal-root';
//   const body = document.querySelector('body');
//   body?.appendChild(modalRoot);
//   ReactDOM.create(modalRoot).render(<GlobalModalScope root />);
// }

type ModalContext =
  | React.Context<any> // 直接读取当前所处组件的context
  | {
      context: React.Context<any>;
      value: any; // 自定义context的值，覆盖更上层的值
    };

interface UseGlobalModalOptions {
  updateDeps?: any[]; // 依赖数组，一般情况不需要使用，当依赖数据变化自动刷新modal
  contexts?: ModalContext[]; // 注意contexts必须是静态的，不能动态改变, 直接读取当前所处组件的context
}

// 深度配置context，最上层的modal的context参数会向下传递
const DepOptionsContext = React.createContext<
  Pick<UseGlobalModalOptions, "contexts">
>({});

// 使用hooks的方式控制modal，不再需要向代码中添加modal的dom结构
const useGlobalModal = <T extends ModalProps = ModalProps>(
  ModalComponent:
    | React.FunctionComponent<T>
    | React.FunctionComponentElement<T>,
  props: T,
  options?: UseGlobalModalOptions,
) => {
  const depOptionsContextValue = useContext(DepOptionsContext);
  const [visible, setVisible] = useState<boolean>(false);
  const [modalKey] = useState(() => uuidV4());
  const { group } = useContext(GlobalModalContext);
  const assignPropsRef = useRef<Partial<Omit<T, "visible">>>({});
  const refData = useRefData(() => ({
    props,
    modalKey,
    group,
    visible,
    ModalComponent,
  }));

  const contexts = [
    ...(depOptionsContextValue.contexts ?? []),
    ...(options?.contexts ?? []),
  ];

  // contexts必须是静态的，不能动态改变
  const previous = usePrevious(contexts);
  if (previous) {
    if (previous.length !== contexts.length) {
      throw new Error("contexts must be static");
    }
    for (let i = 0; i < contexts.length; i++) {
      // 只对比context，context变动会导致报错
      const prevContextInstance = previous[i];
      const curContextInstance = contexts[i];
      const prevContext =
        "context" in prevContextInstance
          ? prevContextInstance.context
          : prevContextInstance;
      const curContext =
        "context" in curContextInstance
          ? curContextInstance.context
          : curContextInstance;
      if (prevContext !== curContext) {
        throw new Error("contexts must be static");
      }
    }
  }

  // 存储的更上层的context信息
  const contextValues: unknown[] = [];
  for (let i = 0; i < contexts.length; i++) {
    const curContextInstance = contexts[i];
    const curContext =
      "context" in curContextInstance
        ? curContextInstance.context
        : curContextInstance;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    contextValues.push(useContext(curContext));
  }

  // 递归创建给modal包裹context容器
  const wrapper = useMemoizedFn((modal: JSX.Element) => {
    // 递归
    let i = 0;
    const recursive = (innerModal: JSX.Element) => {
      if (i < contexts.length) {
        const curContextInstance = contexts[i];
        const ContextInstance =
          "context" in curContextInstance
            ? curContextInstance.context
            : curContextInstance;
        const contextValue =
          "context" in curContextInstance ? curContextInstance.value : {};
        return (
          <ContextInstance.Provider
            value={{ ...(contextValues[i++] ?? {}), ...(contextValue ?? {}) }}
          >
            {recursive(innerModal)}
          </ContextInstance.Provider>
        );
      } else {
        return innerModal;
      }
    };
    return (
      <DepOptionsContext.Provider
        value={{
          contexts: contexts.slice(),
        }}
      >
        {recursive(modal)}
      </DepOptionsContext.Provider>
    );
  });

  const createModalComponent = useMemoizedFn((createProps: T) => {
    if (refData.current.ModalComponent instanceof Function) {
      const Component = refData.current.ModalComponent;
      return wrapper(<Component {...createProps} />);
    } else {
      return wrapper(
        React.cloneElement(refData.current.ModalComponent, createProps),
      );
    }
  });

  const close = useCallback(() => {
    setVisible(false);
    const prop = {
      ...refData.current.props,
      ...assignPropsRef.current,
      open: false,
    };
    prop.onCancel?.({} as any);
    globalModalDom.set(
      refData.current.modalKey,
      createModalComponent(prop),
      refData.current.group,
    );
    assignPropsRef.current = {};
  }, [createModalComponent, refData]);

  const open = useCallback(
    (assignProps: Partial<Omit<T, "visible">> = {}) => {
      setVisible(true);
      assignPropsRef.current = assignProps;
      globalModalDom.set(
        refData.current.modalKey,
        createModalComponent({
          ...refData.current.props,
          ...assignPropsRef.current,
          open: true,
          onCancel: () => close(),
        }),
        refData.current.group,
      );
    },
    [close, createModalComponent, refData],
  );

  // updateDeps 更新依赖
  useEffect(() => {
    globalModalDom.set(
      modalKey,
      createModalComponent({
        ...refData.current.props,
        ...assignPropsRef.current,
        open: refData.current.visible,
        onCancel: () => close(),
      }),
      refData.current.group,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    close,
    createModalComponent,
    modalKey,
    refData,
    ...(options?.updateDeps ?? []),
  ]);

  const dispose = useMemoizedFn(() => {
    globalModalDom.delete(modalKey, refData.current.group);
  });
  useUnmount(() => dispose());

  return {
    visible,
    open,
    close,
    dispose,
  };
};

export default useGlobalModal;
