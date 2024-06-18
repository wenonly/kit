import { useRequest } from "ahooks";
import { useMemo } from "react";
import loadMoreNodeRender from "./loadMoreNodeRender";

export interface TreeLoadNodeState {
  page: number;
  size: number;
  isComplete: boolean;
}

export interface TreeLoadNodeProps<T = any> {
  state: TreeLoadNodeState; // 用于缓存数据,不会mount消失
  request: (params: { page: number; size: number }) => Promise<T>;
  onRes?: (res: T) => void;
  loadMoreNodeRender?: (
    status: "loading" | "complete" | "waitLoad",
    defaultDom: JSX.Element
  ) => JSX.Element;
}

const TreeLoadNode = <T,>(props: TreeLoadNodeProps<T>) => {
  const { runAsync, loading } = useRequest(
    () =>
      props
        .request({
          page: props.state.page,
          size: props.state.size,
        })
        .then((res) => {
          props.onRes?.(res);
        }),
    {
      manual: true,
    }
  );

  const status = useMemo(() => {
    return loading
      ? "loading"
      : props.state.isComplete
      ? "complete"
      : "waitLoad";
  }, [loading, props.state.isComplete]);

  return (
    <div
      onClick={() => {
        if (status === "waitLoad") {
          runAsync();
        }
      }}
    >
      {props.loadMoreNodeRender
        ? props.loadMoreNodeRender(status, loadMoreNodeRender(status))
        : loadMoreNodeRender(status)}
    </div>
  );
};

export default TreeLoadNode;
