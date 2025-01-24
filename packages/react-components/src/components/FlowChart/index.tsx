/* eslint-disable no-restricted-syntax */
import {
  CompressOutlined,
  MinusCircleOutlined,
  OneToOneOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Graph, Shape } from "@antv/x6";
import { Dnd } from "@antv/x6-plugin-dnd";
import { MiniMap } from "@antv/x6-plugin-minimap";
import { Scroller } from "@antv/x6-plugin-scroller";
import { Selection } from "@antv/x6-plugin-selection";
import "@antv/x6-react-shape";
import type { Options } from "@antv/x6/lib/graph/options";
import type { Cell, Model, Node } from "@antv/x6/lib/model";
import { useRefData, useResize } from "@wenonly/react-hooks";
import { useMount, useUnmount } from "ahooks";
import { Tooltip, message } from "antd";
import React, {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type { ContextMenuProps } from "./ContextMenu";
import ContextMenu from "./ContextMenu";
import type { FlowDefine, FlowStep } from "./FlowDefine";
import FormDrawer from "./FormDrawer";
import { FormDrawerMap } from "./FormDrawer/FormDrawerMap";
import { ImgBranch, ImgEnd, ImgMerge, ImgStart } from "./img";
import styles from "./index.module.less";
import nodeCreators, { registerNodes } from "./nodes";
import { NodeEnum } from "./nodes/nodeEnum";
import { validateEdge } from "./nodes/ports";

interface DefualtNodeType {
  name: string;
  key: NodeEnum;
  icon: React.ReactNode;
  disable?: boolean;
  optionsGetter?: () => Node.Metadata;
}

export interface FlowChartContextType {
  readonly?: boolean;
}

export type NodeStatus = "notStart" | "running" | "success" | "failed";

export interface NodeDataType {
  formData?: any;
  globalContext?: React.MutableRefObject<FlowChartContextType>;
  status?: NodeStatus;
  needCompleteForm?: boolean;
}

export interface FlowChartRefType {
  getGraphJSON: () =>
    | {
        cells: Cell.Properties[];
      }
    | undefined; // 外部ref获取define
  setGraphJSON: (
    data: {
      cells: Cell.Properties[];
    },
    options?: Model.FromJSONOptions | undefined
  ) => void; // 外部ref设置define
  getStepJSON: (
    cellTransform?: (cell: Cell.Metadata) => FlowStep | undefined
  ) => FlowStep[] | undefined; // 获取节点定义，提供给后端参数
  getFormatJSON: (
    cellTransform?: (cell: Cell.Metadata) => FlowStep | undefined
  ) => FlowDefine; // 获取存入后端的定义
  setFormatJSON: (
    flowDefine: FlowDefine,
    cellTransform?: (cell: Cell.Metadata) => Cell.Metadata
  ) => void; // 后端数据解析为流程图定义
  dragInsertNode: (metadata: Node.Metadata, nativeEvent: DragEvent) => void; // 拖拽新增
  validateFlow: () => boolean; // 校验
  clearGraph: () => void; // clear
  cleanSelect: () => void; // 清空选中
  graphRef: React.MutableRefObject<Graph | undefined>; // graphRef
}

interface FlowChartProps {
  readonly?: boolean; // 只允许查看
  actionsRightContent?: React.ReactNode; // 操作栏右侧位置
  extraToolbarNodes?: DefualtNodeType[]; // 操作栏节点标签
  contextData?: Record<string, any>; // 传入全局数据，节点中代码可获取
  disableDragInOutside?: boolean; // 关闭从外部拖入的功能
  graphContentChildren?: React.ReactNode; // 容器内slot，一般用于放弹窗
  onLoad?: () => void; // 加载完成回调
  optionsTransformer?: (
    options: Partial<Options.Manual>
  ) => Partial<Options.Manual>; // 可在这个回调中调整options
  getContextMenuItems?: (
    cell: Cell<Cell.Properties>,
    graphRef: React.MutableRefObject<Graph | undefined>
  ) => {
    label: string;
    key: string;
    handler?: () => void;
  }[]; // 右键菜单
}

registerNodes();

const FlowChart = React.forwardRef<
  FlowChartRefType | undefined,
  FlowChartProps
>((props, ref) => {
  const container = useRef<HTMLDivElement>(null);
  const minimapContainer = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph>();
  const dndRef = useRef<Dnd>();
  const [contextMenuState, setContextMenuState] = useState<ContextMenuProps>(
    {}
  );
  const [contextMenuVisible, setContextMenuVisible] = useState<boolean>(false);
  const [selectNode, setSelectNode] = useState<Node<Node.Properties>>();
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const flowWrapRef = useRef<HTMLDivElement>(null);
  const contextData = useRefData(() => ({
    readonly: props.readonly,
    ...(props.contextData || {}),
  }));

  const defaultNodes: DefualtNodeType[] = [
    {
      name: "开始",
      key: NodeEnum.start,
      icon: <img src={ImgStart} />,
      disable: true,
    },
    {
      name: "结束",
      key: NodeEnum.end,
      icon: <img src={ImgEnd} />,
      disable: true,
    },
    {
      name: "分支",
      key: NodeEnum.fork,
      icon: <img src={ImgBranch} />,
    },
    {
      name: "聚合",
      key: NodeEnum.join,
      icon: <img src={ImgMerge} />,
    },
    ...(props.extraToolbarNodes || []),
  ];

  // 拖拽新增
  const dragInsertNode = useCallback(
    (metadata: Node.Metadata, nativeEvent: DragEvent) => {
      if (
        graphRef.current &&
        dndRef.current &&
        !props.readonly &&
        !props.disableDragInOutside
      ) {
        const newNode = graphRef.current.createNode(metadata);
        dndRef.current.start(newNode, nativeEvent);
      }
    },
    [props.disableDragInOutside, props.readonly]
  );

  // 控制连接桩显示/隐藏
  const handlePortsShow = () => {
    const showPorts = (ports: NodeListOf<SVGElement>, show: boolean) => {
      for (let i = 0, len = ports.length; i < len; i += 1) {
        Object.assign(ports[i].style, {
          visibility: show ? "visible" : "hidden",
        });
      }
    };
    graphRef.current?.on("node:mouseenter", () => {
      const ports = container.current?.querySelectorAll(
        ".x6-port-body"
      ) as NodeListOf<SVGElement>;
      showPorts(ports || [], true);
    });
    graphRef.current?.on("node:mouseleave", () => {
      const ports = container.current?.querySelectorAll(
        ".x6-port-body"
      ) as NodeListOf<SVGElement>;
      showPorts(ports || [], false);
    });
  };

  // 控制右键菜单
  const handleContextMenu = () => {
    graphRef.current?.on("cell:contextmenu", (args) => {
      const cellData = args.cell?.getProp();
      // 限制开始和结束右键删除
      if (
        cellData &&
        [NodeEnum.start, NodeEnum.end].includes(cellData.shape as NodeEnum)
      )
        return;

      const menuList = [
        {
          label: args.cell.isEdge() ? "删除连线" : "删除节点",
          key: "deleteNode",
        },
      ];

      const extraContextMenusMap = Object.fromEntries(
        props
          .getContextMenuItems?.(args.cell, graphRef)
          .map((item) => [item.key, item]) ?? []
      );
      const extraContextMenus = Object.values(extraContextMenusMap).map(
        (item) => ({
          label: item.label,
          key: item.key,
        })
      );

      setContextMenuState({
        x: args.e.clientX,
        y: args.e.clientY,
        menuList: menuList.concat(extraContextMenus),
        onSelect: (key) => {
          if (key === "deleteNode") {
            graphRef.current?.removeCell(args.cell);
          }
          extraContextMenusMap[key]?.handler?.();
        },
      });
      setContextMenuVisible(true);
    });
  };

  // 控制选择节点
  const handleSelectNode = () => {
    graphRef.current?.on("node:selected", (args) => {
      const cellProp = args.node?.getProp();
      if (FormDrawerMap[cellProp?.shape as keyof typeof FormDrawerMap]) {
        setSelectNode(args.node);
        setDrawerVisible(true);
      }
    });
  };

  // 初始化节点数据
  const handleEdgeStatus = () => {
    const handler = (node: Node<Node.Properties>) => {
      Promise.resolve().then(() => {
        const edges = graphRef.current?.getIncomingEdges(node);
        const { status } = node.getData<NodeDataType>();
        edges?.forEach((edge) => {
          if (status === "running") {
            edge.attr("line/strokeDasharray", 5);
            edge.attr(
              "line/style/animation",
              "running-line 30s infinite linear"
            );
          } else {
            edge.attr("line/strokeDasharray", "");
            edge.attr("line/style/animation", "");
          }
        });
      });
    };
    const nodes = graphRef.current?.getNodes();
    nodes?.forEach(handler);
    graphRef.current?.on("node:change:data", ({ node }) => handler(node));
  };

  // 关闭drawer
  const handleDrawerClose = () => {
    graphRef.current?.unselect(selectNode?.id || "");
    setSelectNode(undefined);
    setDrawerVisible(false);
  };

  useMount(() => {
    const baseOption: Partial<Options.Manual> = {
      container: container.current as HTMLElement,
      width: flowWrapRef.current?.clientWidth,
      height: flowWrapRef.current?.clientHeight,
      background: {
        color: "#ffffff", // 设置画布背景颜色
      },
      connecting: {
        anchor: "center",
        connectionPoint: "anchor",
        allowBlank: false,
        snap: {
          radius: 20,
        },
        createEdge() {
          return new Shape.Edge({
            id: uuidv4(),
            attrs: {
              line: {
                stroke: "#A2B1C3",
                strokeWidth: 1,
                targetMarker: {
                  name: "block",
                  width: 12,
                  height: 8,
                },
                style: {
                  animation: "running-line 30s infinite linear",
                },
              },
            },
            zIndex: 0,
          });
        },
        validateConnection(args) {
          return validateEdge(this, args);
        },
      },
      highlighting: {
        magnetAdsorbed: {
          name: "stroke",
          args: {
            attrs: {
              fill: "#5F95FF",
              stroke: "#5F95FF",
            },
          },
        },
      },
      grid: {
        size: 10, // 网格大小 10px
        visible: true, // 渲染网格背景
      },
    };
    if (props.readonly) {
      const readOptions = {
        ...baseOption,
        interacting: false,
      };
      graphRef.current = new Graph(
        props.optionsTransformer
          ? props.optionsTransformer(readOptions)
          : readOptions
      );
    } else {
      const editOptions = {
        ...baseOption,
        snapline: {
          enabled: true,
        },
      };
      graphRef.current = new Graph(
        props.optionsTransformer
          ? props.optionsTransformer(editOptions)
          : editOptions
      );
      handlePortsShow();
      handleContextMenu();
    }
    graphRef.current.use(
      new Selection({
        showNodeSelectionBox: true,
        filter: (node) => {
          const prop = node.getProp();
          return !!FormDrawerMap[prop.shape as keyof typeof FormDrawerMap];
        },
      })
    );
    graphRef.current.use(
      new Scroller({
        enabled: true,
        pannable: true,
      })
    );
    graphRef.current.use(
      new MiniMap({
        container: minimapContainer.current as HTMLElement,
        width: 230,
        height: 180,
        graphOptions: {
          async: true,
          createCellView: (cell) => {
            // 在小地图中不渲染边
            if (cell.isEdge()) {
              return null;
            }
            return undefined;
          },
        },
      })
    );
    dndRef.current = new Dnd({
      target: graphRef.current,
      getDragNode: (node) => node.clone({ keepId: true }),
      getDropNode: (node) => node.clone({ keepId: true }),
    });
    const graphArea = graphRef.current.getGraphArea();
    graphRef.current?.on("cell:added", ({ cell }) =>
      cell.updateData({ globalContext: contextData })
    );
    graphRef.current.addNode(
      nodeCreators[NodeEnum.start]("开始", { x: 100, y: graphArea.height / 2 })
    );
    graphRef.current.addNode(
      nodeCreators[NodeEnum.end]("结束", {
        x: graphArea.width - 200,
        y: graphArea.height / 2,
      })
    );
    handleEdgeStatus();
    handleSelectNode();

    props.onLoad?.();
  });

  const handleResize = () => {
    if (flowWrapRef.current?.clientWidth && flowWrapRef.current?.clientHeight) {
      graphRef.current?.resize(
        flowWrapRef.current?.clientWidth,
        flowWrapRef.current?.clientHeight
      );
      // 下面可以使minimap更新
      if (graphRef.current) {
        graphRef.current.zoomTo(graphRef.current.zoom());
      }
    }
  };

  useResize(handleResize);

  useUnmount(() => {
    graphRef.current?.dispose();
  });

  const handleDrag = (
    e: React.DragEvent<HTMLElement>,
    node: DefualtNodeType
  ) => {
    const { nativeEvent } = e;
    if (graphRef.current && dndRef.current) {
      const newNode = graphRef.current.createNode(
        nodeCreators[node.key as keyof typeof nodeCreators](
          node.name,
          node.optionsGetter?.() || {}
        )
      );
      dndRef.current.start(newNode, nativeEvent);
    }
  };

  // 获取格式化数据
  const getStepJSON = useCallback(
    (
      cellTransform?: (cell: Cell.Metadata) => FlowStep | undefined
    ): FlowStep[] | undefined => {
      const graphJSON = graphRef.current?.toJSON();
      return graphJSON?.cells.map((cell) => {
        const transResult = cellTransform?.(cell);
        if (transResult) return transResult;
        if (cell.shape === "edge") {
          return {
            code: cell.id || uuidv4(),
            name: "连线",
            site: "",
            type: "ROUTING",
            params: {
              from: cell.source?.cell,
              rules: [],
              to: cell.target?.cell,
              type: "ROUTING",
            },
          };
        }
        return {
          code: cell.id || uuidv4(),
          name: cell.title,
          site: "",
          type: cell.shape as FlowStep["type"],
          params: {
            ...(cell.data?.formData || {}),
            ...(cell.nodeInfo ? { businessId: cell.nodeInfo.key } : {}),
            type: cell.shape,
          },
        };
      });
    },
    []
  );

  const getFormatJSON = useCallback(
    (
      cellTransform?: (cell: Cell.Metadata) => FlowStep | undefined
    ): FlowDefine => {
      const graphJSON = graphRef.current?.toJSON();
      const stepJSON = getStepJSON(cellTransform);
      return {
        define: graphJSON ? JSON.stringify(graphJSON) : "",
        steps: stepJSON || [],
      };
    },
    [getStepJSON]
  );

  const clearGraph = () => {
    graphRef.current?.removeCells(graphRef.current?.getCells()); // 清空画布
    setContextMenuVisible(false);
    setDrawerVisible(false);
  };

  // 更新context引用
  const updateContextRef = useCallback(() => {
    const cells = graphRef.current?.getCells();
    cells?.forEach((cell) => {
      cell.updateData({ globalContext: contextData });
    });
  }, [contextData]);

  const setFormatJSON = useCallback(
    (
      flowDefine: FlowDefine,
      cellTransform?: (cell: Cell.Metadata) => Cell.Metadata
    ): void => {
      try {
        const define: {
          cells?: Cell.Metadata[];
        } = JSON.parse(flowDefine.define || "{cells:[]}");
        const stepsMap: Record<string, FlowStep> =
          flowDefine?.steps?.reduce((o: any, item) => {
            o[item.code] = item;
            return o;
          }, {}) || {};
        define.cells =
          define.cells?.map((cell: Cell.Metadata) => {
            const realCell = cellTransform?.(cell) || cell;
            // 从steps上获取数据
            realCell.title =
              stepsMap[realCell.id || ""]?.name || realCell.title;
            // 兼容旧数据 x6 1版本
            if (cell.component) {
              realCell.shape = cell.component;
            }
            return realCell;
          }) || [];
        clearGraph();
        graphRef.current?.addNodes(
          define.cells?.filter((cell) => cell.shape !== "edge") || []
        );
        graphRef.current?.addEdges(
          define.cells?.filter((cell) => cell.shape === "edge") || []
        );
        graphRef.current?.zoomToFit();
        handleResize();
        updateContextRef();
      } catch (error) {
        console.error(error);
      }
    },
    [updateContextRef]
  );

  // 最终校验
  const validateFlow = useCallback(() => {
    if (graphRef.current) {
      const nodes = graphRef.current.getNodes();
      const edges = graphRef.current.getEdges();
      for (const node of nodes) {
        const ports = node.getPorts();
        const nodeInfo = node.getProp();
        const nodeData = node.getData();
        const curEdges = edges.filter(
          (ed) =>
            ed.getTargetCellId() === nodeInfo.id ||
            ed.getSourceCellId() === nodeInfo.id
        );
        // 当前节点连线小于ports数量，说明还有未连的地方
        if (curEdges.length < ports.length) {
          message.error("存在节点未连线");
          return false;
        }
        // 如果有配置为填写
        if (nodeData.needCompleteForm) {
          message.error(`节点 ${nodeInfo.title} 未填写表单！`);
          return false;
        }
      }
      return true;
    }
    return false;
  }, []);

  const handleZoom = (key: "narrow" | "enlarge" | "oneToOne" | "fit") => {
    if (graphRef.current) {
      if (key === "enlarge") {
        const zoom = graphRef.current.zoom();
        graphRef.current.zoomTo(zoom < 2 ? zoom + 0.05 : zoom);
      }
      if (key === "narrow") {
        const zoom = graphRef.current.zoom();
        graphRef.current.zoomTo(zoom > 0 ? zoom - 0.05 : zoom);
      }
      if (key === "oneToOne") {
        graphRef.current.zoomTo(1);
      }
      if (key === "fit") {
        graphRef.current.zoomToFit();
      }
    }
  };

  // 重置画布选中
  const cleanSelect = () => {
    setSelectNode(undefined);
    setDrawerVisible(false);
    graphRef.current?.cleanSelection();
  };

  useImperativeHandle(ref, () => ({
    getGraphJSON: () => graphRef.current?.toJSON(),
    setGraphJSON: (
      json: {
        cells: Cell.Properties[];
      },
      options?: Model.FromJSONOptions | undefined
    ) => {
      json.cells.forEach((cell) => {
        // 兼容旧数据 x6 1版本
        if (cell.component) {
          cell.shape = cell.component;
        }
      });
      graphRef.current?.fromJSON(json, options);
      updateContextRef();
    },
    getStepJSON,
    getFormatJSON,
    setFormatJSON,
    dragInsertNode,
    validateFlow,
    clearGraph,
    cleanSelect,
    graphRef,
  }));

  return (
    <div className={styles.flowChartContainer}>
      {!props.readonly && (
        <div className={styles.buttonWrap}>
          <span className={styles.title}>操作栏:</span>
          {defaultNodes.map((node) => (
            <div
              className={styles.buttonNode}
              style={
                node.disable ? { opacity: 0.6, cursor: "not-allowed" } : {}
              }
              key={node.key}
              onDragStart={
                node.disable ? undefined : (e) => handleDrag(e, node)
              }
              draggable
            >
              {node.icon}
              <span>{node.name}</span>
            </div>
          ))}
          {props.actionsRightContent}
        </div>
      )}
      <ContextMenu
        {...contextMenuState}
        visible={contextMenuVisible}
        onVisibleChange={setContextMenuVisible}
      />
      <div ref={flowWrapRef} className={styles.flowGraphWrap}>
        <div ref={container} />
        <div ref={minimapContainer} className={styles.minimap} />
        <div className={styles.zoom}>
          <Tooltip title="放大" placement="left">
            <div
              className={styles.zoomItem}
              onClick={() => handleZoom("enlarge")}
            >
              <PlusCircleOutlined />
            </div>
          </Tooltip>
          <Tooltip title="缩小" placement="left">
            <div
              className={styles.zoomItem}
              onClick={() => handleZoom("narrow")}
            >
              <MinusCircleOutlined />
            </div>
          </Tooltip>
          <Tooltip title="缩放到1:1" placement="left">
            <div
              className={styles.zoomItem}
              onClick={() => handleZoom("oneToOne")}
            >
              <OneToOneOutlined />
            </div>
          </Tooltip>
          <Tooltip title="缩放到适应屏幕" placement="left">
            <div className={styles.zoomItem} onClick={() => handleZoom("fit")}>
              <CompressOutlined />
            </div>
          </Tooltip>
        </div>
        <FormDrawer
          node={selectNode}
          open={drawerVisible}
          onClose={handleDrawerClose}
        />
        {props.graphContentChildren}
      </div>
    </div>
  );
});

export default FlowChart;
