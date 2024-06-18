import { useGetState, useRequest } from "ahooks";
import { cloneDeep } from "lodash-es";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import useRefData from "../useRefData";
import type { TreeLoadNodeProps, TreeLoadNodeState } from "./TreeLoadNode";
import TreeLoadNode from "./TreeLoadNode";

interface DefaultOptionType {
  label: React.ReactNode;
  value?: string | number | null;
  children?: Omit<DefaultOptionType, "children">[];
  disabled?: boolean;
  [name: string]: any;
}

// PaginationResult<any>
export interface UseTreeLoadRequestResult {
  isComplete?: boolean;
  list: DefaultOptionType[];
  disableLoadMore?: boolean; // 不需要加载更多按钮
}

interface UseTreeLoadOptions<T extends object> {
  manualInit?: boolean; // 手动init page1
  getRequest: (
    parentNode?: DefaultOptionType
  ) => TreeLoadNodeProps<UseTreeLoadRequestResult>["request"]; // 没有parentNode代表第一层
  transformer: (node: DefaultOptionType) => T; // 树已经构建好了之后，对每个节点进行转换
  loadMoreNodeRender?: (
    status: "loading" | "complete" | "waitLoad",
    defaultDom: JSX.Element
  ) => JSX.Element;
}

/**
 * 默认返回对是 DefaultOptionType 格式，适用TreeSelect
 * 如果需要在 Tree 中使用，需要通过 options.transformer 转化为 DataNode
 * */
export default <T extends object = DefaultOptionType>(
  options: UseTreeLoadOptions<T>
) => {
  const optionsRef = useRefData(() => options);
  const [treeData, setTreeData, getTreeData] = useGetState<DefaultOptionType[]>(
    []
  );
  const [treeLoadNodeList, setTreeLoadNodeList, getTreeLoadNodeList] =
    useGetState<DefaultOptionType[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<string[]>([]);

  const getNodeById = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      const curTreeData = getTreeData();
      const curTreeLoadNodeData = getTreeLoadNodeList();
      return curTreeData
        .concat(curTreeLoadNodeData)
        .find((item) => item.id === id);
    },
    [getTreeData, getTreeLoadNodeList]
  );

  // 根据接口返回数据创建普通节点
  const createNormalNode = (resItem: DefaultOptionType, pId: string = "0") => {
    resItem.id = resItem.id ?? resItem.value ?? uuidv4();
    resItem.pId = resItem.pId ?? pId;
    return resItem;
  };

  // 创建加载load节点，默认从第二页加载
  const createLoadNode = useCallback(
    (pId: string = "0", defaultState: Partial<TreeLoadNodeState> = {}) => {
      const parentNode = getNodeById(pId);
      const id = uuidv4();
      const state: TreeLoadNodeState = {
        page: 2,
        size: 10,
        isComplete: false,
        ...defaultState,
      };
      return {
        pId,
        id,
        label: (
          <TreeLoadNode<UseTreeLoadRequestResult>
            state={state}
            request={optionsRef.current.getRequest(parentNode)}
            onRes={(res) => {
              const curTreeData = getTreeData();
              const curTreeLoadNodeData = getTreeLoadNodeList();
              Object.assign(state, {
                ...state,
                page: state.page + 1,
                isComplete: res.isComplete,
              });
              res.list?.forEach((item) => {
                const node = createNormalNode(item, pId);
                curTreeData.push(node);
              });
              setTreeData([...curTreeData]);
              setTreeLoadNodeList([...curTreeLoadNodeData]);
            }}
            loadMoreNodeRender={optionsRef.current.loadMoreNodeRender}
          />
        ),
        value: id,
        isLeaf: true,
        selectable: false,
        checkable: false,
        disabled: true,
        _isLoadNode: true,
      };
    },
    [
      getNodeById,
      getTreeData,
      getTreeLoadNodeList,
      optionsRef,
      setTreeData,
      setTreeLoadNodeList,
    ]
  );

  const loadFirstpage = useCallback(
    (parentNode?: DefaultOptionType) => {
      const request = optionsRef.current.getRequest(parentNode);
      return request({
        page: 1,
        size: 10,
      }).then((res) => {
        const curTreeData = getTreeData();
        const curTreeLoadNodeData = getTreeLoadNodeList();
        res.list?.forEach((item) => {
          const node = createNormalNode(item, parentNode?.id);
          curTreeData.push(node);
        });
        if (!res.disableLoadMore) {
          curTreeLoadNodeData.push(
            createLoadNode(parentNode?.id, {
              isComplete: res.isComplete,
            })
          );
        }
        setTreeData([...curTreeData]);
        setTreeLoadNodeList([...curTreeLoadNodeData]);
      });
    },
    [
      createLoadNode,
      getTreeData,
      getTreeLoadNodeList,
      optionsRef,
      setTreeData,
      setTreeLoadNodeList,
    ]
  );

  const init = useCallback(() => {
    setTreeData([]);
    setTreeLoadNodeList([]);
    setLoadedKeys([]);
    return loadFirstpage();
  }, [loadFirstpage, setTreeData, setTreeLoadNodeList]);

  const loadData = useCallback(
    async (node: any) => {
      if (loadedKeys.includes(node.key)) return;
      const treeNode = treeData.find((item) => node.id === item.id);
      if (treeNode) {
        await loadFirstpage(treeNode);
        loadedKeys.push(node.key);
        setLoadedKeys([...loadedKeys]);
      }
    },
    [loadFirstpage, loadedKeys, treeData]
  );

  const { loading } = useRequest(() => init(), {
    manual: optionsRef.current.manualInit,
  });

  const treeFlatData = useMemo((): T[] => {
    const flatData = treeData.concat(treeLoadNodeList);
    return flatData.map((item) => optionsRef.current.transformer(item));
  }, [optionsRef, treeData, treeLoadNodeList]);

  const treeTreeData = useMemo(() => {
    const flatData = cloneDeep(treeData.concat(treeLoadNodeList)).map(
      (item) => ({
        ...item,
        ...optionsRef.current.transformer(item),
      })
    );
    const treeIdMap = Object.fromEntries(
      flatData.map((item) => [item.id, item])
    );
    const rootTreeData: ReturnType<typeof optionsRef.current.transformer>[] =
      [];
    flatData.forEach((node) => {
      if (node.pId === "0") {
        rootTreeData.push(node);
      } else {
        const parent = treeIdMap[node.pId];
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      }
    });
    return rootTreeData;
  }, [optionsRef, treeData, treeLoadNodeList]);

  return {
    treeData: treeTreeData,
    treeFlatData,
    loadedKeys,
    loading,
    setLoadedKeys,
    init,
    refresh: init,
    loadData,
  };
};
