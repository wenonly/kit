import type { Graph } from '@antv/x6';
import type { Options } from '@antv/x6/lib/graph/options';

export enum PortsEnum {
  singleIn = 'singleIn',
  singleOut = 'singleOut',
  multiIn = 'multiIn',
  multiOut = 'multiOut',
}

// 校验连线重复
function validateRepeat(graph: Graph, args: Options.ValidateConnectionArgs): boolean {
  const targetId = args.targetCell?.id;
  const sourceId = args.sourceCell?.id;
  const edges = graph.getEdges().filter((edge) => {
    const curTargetId = edge.getTargetCellId();
    const curSourceId = edge.getSourceCellId();
    return targetId === curTargetId && sourceId === curSourceId;
  });
  return !edges.length;
}

// 校验单入口、单出口
export function validatePort(graph: Graph, args: Options.ValidateConnectionArgs): boolean {
  const edges = graph.getEdges().filter((item) => item.id !== args.edge?.id); // 过滤掉自身
  // 单出口
  if (args.sourcePort === PortsEnum.singleOut) {
    const result = edges.some((edge) => {
      if (edge.getSourceCellId() === args.sourceCell?.id) return true;
      return false;
    });
    if (result) return false;
  }
  // 单入口
  if (args.targetPort === PortsEnum.singleIn) {
    const result = edges.some((edge) => {
      if (edge.getTargetCellId() === args.targetCell?.id) return true;
      return false;
    });
    if (result) return false;
  }
  return true;
}

export function validateEdge(graph: Graph, args: Options.ValidateConnectionArgs): boolean {
  // 必须有起点终点
  if (!args.targetPort || !args.sourcePort || !args.targetCell || !args.sourceCell) return false;
  // 起点节点不能是通过in接口连接
  if ([PortsEnum.multiIn, PortsEnum.singleIn].includes(args.sourcePort as PortsEnum)) return false;
  // 终点节点不能通过out接口连接
  if ([PortsEnum.multiOut, PortsEnum.singleOut].includes(args.targetPort as PortsEnum))
    return false;
  // 无法自身连接自身
  if (args.targetCell === args.sourceCell) return false;
  return validateRepeat(graph, args) && validatePort(graph, args);
}
