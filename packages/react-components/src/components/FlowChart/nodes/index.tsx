import { register } from "@antv/x6-react-shape";
import type { Node } from "@antv/x6/lib/model";
import type { PortManager } from "@antv/x6/lib/model/port";
import type { Attr } from "@antv/x6/lib/registry/attr";
import type { JSXElementConstructor, ReactElement } from "react";
import React from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ImgAlgorithm,
  ImgBranch,
  ImgEnd,
  ImgExamine,
  ImgLabel,
  ImgMeasureTable,
  ImgMerge,
  ImgQuestion,
  ImgReport,
  ImgStart,
  ImgThreePart,
} from "../img";
import type { NodeProps } from "./CommonNode";
import CommonNode from "./CommonNode";
import { NodeEnum } from "./nodeEnum";
import { PortsEnum } from "./ports";

interface NodeCreatorFun {
  (
    title?: string,
    options?: Node.Metadata,
    props?: Partial<NodeProps>
  ): Node.Metadata;
}

const portAttrs: Attr.CellAttrs = {
  circle: {
    r: 4,
    magnet: true,
    stroke: "#5F95FF",
    strokeWidth: 1,
    fill: "#fff",
    style: {
      visibility: "hidden",
    },
  },
};

const groups: Record<string, PortManager.GroupMetadata> = {
  in: {
    position: "left",
    attrs: portAttrs,
  },
  out: {
    position: "right",
    attrs: portAttrs,
  },
};

function nodeRender(icon: React.ReactNode) {
  return function render({
    node,
  }: {
    node: Node;
  }): ReactElement<any, string | JSXElementConstructor<any>> {
    const data = node.getProp();
    return (
      <CommonNode name={data.title} icon={icon} node={node} {...data.props} />
    );
  };
}

function registerReactComponent(
  shape: NodeEnum,
  component: ReturnType<typeof nodeRender>
) {
  register({
    shape,
    component,
  });
}

// 全局注册
export const registerNodes = () => {
  // 注册返回 React 组件的函数
  registerReactComponent(NodeEnum.start, nodeRender(<img src={ImgStart} />));
  registerReactComponent(NodeEnum.end, nodeRender(<img src={ImgEnd} />));
  registerReactComponent(NodeEnum.fork, nodeRender(<img src={ImgBranch} />));
  registerReactComponent(NodeEnum.join, nodeRender(<img src={ImgMerge} />));
  registerReactComponent(
    NodeEnum.scale,
    nodeRender(<img src={ImgMeasureTable} />)
  );
  registerReactComponent(
    NodeEnum.questionnaire,
    nodeRender(<img src={ImgQuestion} />)
  );
  registerReactComponent(
    NodeEnum.arithmetic,
    nodeRender(<img src={ImgAlgorithm} />)
  );
  registerReactComponent(NodeEnum.report, nodeRender(<img src={ImgReport} />));
  registerReactComponent(
    NodeEnum.third,
    nodeRender(<img src={ImgThreePart} />)
  );
  registerReactComponent(NodeEnum.label, nodeRender(<img src={ImgLabel} />));
  registerReactComponent(
    NodeEnum.examine,
    nodeRender(<img src={ImgExamine} />)
  );
};

// 开始
const renderStartNode: NodeCreatorFun = (title = "开始", options = {}) => {
  return {
    id: uuidv4(),
    width: 60,
    height: 60,
    ...options,
    ports: {
      groups,
      items: [
        {
          id: PortsEnum.singleOut,
          group: "out",
        },
      ],
    },
    shape: NodeEnum.start,
    title,
  };
};

// 结束
const renderEndNode: NodeCreatorFun = (title = "结束", options = {}) => {
  return {
    id: uuidv4(),
    width: 60,
    height: 60,
    ...options,
    ports: {
      groups,
      items: [
        {
          id: PortsEnum.singleIn,
          group: "in",
        },
      ],
    },
    shape: NodeEnum.end,
    title,
  };
};

// 分支
const renderBranchNode: NodeCreatorFun = (title = "分支节点", options = {}) => {
  return {
    id: uuidv4(),
    width: 60,
    height: 60,
    ...options,
    ports: {
      groups,
      items: [
        {
          id: PortsEnum.singleIn,
          group: "in",
        },
        {
          id: PortsEnum.multiOut,
          group: "out",
        },
      ],
    },
    shape: NodeEnum.fork,
    title,
  };
};

// 聚合
const renderMergeNode: NodeCreatorFun = (title = "聚合节点", options = {}) => {
  return {
    id: uuidv4(),
    width: 60,
    height: 60,
    ...options,
    ports: {
      groups,
      items: [
        {
          id: PortsEnum.multiIn,
          group: "in",
        },
        {
          id: PortsEnum.singleOut,
          group: "out",
        },
      ],
    },
    shape: NodeEnum.join,
    title,
  };
};

// 普通节点
const renderNormalNode = (
  nodeType: NodeEnum,
  needCompleteForm?: boolean
): NodeCreatorFun => {
  return (title = "聚合节点", options = {}, props = {}) => {
    return {
      id: uuidv4(),
      width: 60,
      height: 60,
      ...options,
      ports: {
        groups,
        items: [
          {
            id: PortsEnum.singleIn,
            group: "in",
          },
          {
            id: PortsEnum.singleOut,
            group: "out",
          },
        ],
      },
      data: {
        needCompleteForm,
      },
      shape: nodeType,
      title,
      props,
    };
  };
};

const nodeCreators: Omit<Record<NodeEnum, NodeCreatorFun>, NodeEnum.routing> = {
  [NodeEnum.start]: renderStartNode,
  [NodeEnum.end]: renderEndNode,
  [NodeEnum.fork]: renderBranchNode,
  [NodeEnum.join]: renderMergeNode,
  [NodeEnum.scale]: renderNormalNode(NodeEnum.scale, true), // true代表需要填写表单
  [NodeEnum.questionnaire]: renderNormalNode(NodeEnum.questionnaire, true),
  [NodeEnum.arithmetic]: renderNormalNode(NodeEnum.arithmetic),
  [NodeEnum.report]: renderNormalNode(NodeEnum.report, true),
  [NodeEnum.third]: renderNormalNode(NodeEnum.third),
  [NodeEnum.label]: renderNormalNode(NodeEnum.label),
  [NodeEnum.examine]: renderNormalNode(NodeEnum.examine, true),
};

export default nodeCreators;
