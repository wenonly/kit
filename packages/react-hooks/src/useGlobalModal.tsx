import { useMemoizedFn, useMount, useUnmount } from "ahooks";
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
    group: string = "root"
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
        (item) => !this.group[group]?.has(item[0])
      )
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

// 这上面的配置将一直向下传递，所有modal都会接受上级的这个参数
const DepOptionsContext = React.createContext<{
  key?: string;
  contextWrapper?: (modal: JSX.Element) => JSX.Element;
}>({});

// 使用hooks的方式控制modal，不再需要向代码中添加modal的dom结构
const useGlobalModal = <T extends ModalProps = ModalProps>(
  ModalComponent:
    | React.FunctionComponent<T>
    | React.FunctionComponentElement<T>,
  props: T,
  updateDeps: any[] = [],
  // 可以通过这个render函数传递context
  // 如：(m) => <C.Provider value={{}}>{m}</C.Provider>
  contextWrapper?: (modal: JSX.Element) => JSX.Element
) => {
  const depContext = useContext(DepOptionsContext);
  const propsContextWrapper = (m: JSX.Element) => {
    if (contextWrapper) {
      if (depContext.contextWrapper) {
        return depContext.contextWrapper(contextWrapper(m));
      }
      return contextWrapper(m);
    }
    if (depContext.contextWrapper) {
      return depContext.contextWrapper(m);
    }
    return m;
  };
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

  const wrapper = useMemoizedFn((modal: JSX.Element) => {
    return (
      <DepOptionsContext.Provider
        value={{
          ...depContext,
          contextWrapper: propsContextWrapper,
        }}
      >
        {propsContextWrapper(modal)}
      </DepOptionsContext.Provider>
    );
  });

  const createModalComponent = useMemoizedFn((createProps: T) => {
    if (refData.current.ModalComponent instanceof Function) {
      const Component = refData.current.ModalComponent;
      return wrapper(<Component {...createProps} />);
    } else {
      return wrapper(
        React.cloneElement(refData.current.ModalComponent, createProps)
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
      refData.current.group
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
        refData.current.group
      );
    },
    [close, createModalComponent, refData]
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
      refData.current.group
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close, createModalComponent, modalKey, refData, ...updateDeps]);

  useMount(() => () => {
    globalModalDom.set(
      modalKey,
      createModalComponent({
        ...refData.current.props,
        open: refData.current.visible,
        onCancel: () => close(),
      }),
      refData.current.group
    );
  });

  const dispose = () => {
    globalModalDom.delete(modalKey, refData.current.group);
  };
  useUnmount(() => dispose());

  return {
    visible,
    open,
    close,
  };
};

export default useGlobalModal;
