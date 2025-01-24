import { CodeEditor, FlowChart } from "@wenonly/react-components";
import type { FlowChartRefType } from "@wenonly/react-components/lib/components/FlowChart";
import { ImgExamine } from "@wenonly/react-components/src/components/FlowChart/img";
import nodeCreators from "@wenonly/react-components/src/components/FlowChart/nodes";
import { NodeEnum } from "@wenonly/react-components/src/components/FlowChart/nodes/nodeEnum";
import { Button, Space } from "antd";
import React, { useRef, useState } from "react";

const RCFlowChart: React.FunctionComponent = () => {
  const flowChartRef = useRef<FlowChartRefType>();
  const [formatJson, setFormatJson] = useState<string>("");

  const handleDrag = (
    e: React.DragEvent<HTMLSpanElement>,
    key: keyof typeof nodeCreators,
    title: string
  ) => {
    const { nativeEvent } = e;
    const nodeInfo: any /** Node.Metadata from @antv/x6/lib/model */ =
      nodeCreators[key](title, {
        nodeInfo: { testData: 12123 },
      });
    flowChartRef.current?.dragInsertNode(nodeInfo, nativeEvent);
  };

  return (
    <div>
      <Space>
        <span>可以拖拽外部节点：</span>
        <Button
          onDragStart={(e) => handleDrag(e, NodeEnum.report, "报告")}
          draggable
        >
          报告
        </Button>
        <Button
          onDragStart={(e) => handleDrag(e, NodeEnum.scale, "量表")}
          draggable
        >
          量表
        </Button>
        <Button
          onDragStart={(e) => handleDrag(e, NodeEnum.questionnaire, "问卷")}
          draggable
        >
          问卷
        </Button>
        <Button
          onDragStart={(e) => handleDrag(e, NodeEnum.arithmetic, "算法")}
          draggable
        >
          算法
        </Button>
      </Space>
      <div style={{ height: 500 }}>
        <FlowChart
          ref={flowChartRef}
          extraToolbarNodes={[
            {
              name: "审批节点",
              key: NodeEnum.examine,
              icon: <img src={ImgExamine} />,
            },
          ]}
        />
      </div>
      <Space style={{ marginTop: 12 }}>
        <Button
          onClick={() => {
            const json = flowChartRef.current?.getFormatJSON();
            if (json) {
              setFormatJson(JSON.stringify(json, null, 2));
            }
          }}
        >
          获取定义
        </Button>
      </Space>
      {formatJson && (
        <CodeEditor
          sdkUrl="/kit/lib/amis/sdk.js"
          value={formatJson}
          height={300}
          style={{ marginTop: 12 }}
        />
      )}
    </div>
  );
};

export default RCFlowChart;
