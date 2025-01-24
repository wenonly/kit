# CodeEditor

流程编辑器，支持从外部拖拽。

<script setup>
import RCFlowChart from '@/examples/react/RCFlowChart.tsx'
</script>

## 示例

<VueWrapper :component="RCFlowChart" />
<br />
<br />

# 参数

## FlowChartProps

<<< index.tsx::params:FlowChartProps

### optionsTransformer

在组件外部设置chart options，当前示例中展示在连线上设置样式。

```ts
<FlowChart
  optionsTransformer={(options) => {
    options.onEdgeLabelRendered = (args) => {
      const { selectors, edge } = args;
      const content = selectors.foContent as HTMLDivElement;
      if (content) {
        ReactDOM.createRoot(content).render(
          <EdgeLabel
            edge={edge}
            readonly={props.mode === "preview"}
            onClick={() => {
              setEdgeDrawerVisible(true);
              setEdgeDrawerNode(edge);
            }}
          />
        );
      }
    };
    if (options.connecting) {
      options.connecting.createEdge = ({ sourceCell }) => {
        const propData = sourceCell.getProp();
        return new Shape.Edge({
          id: shortid.generate(),
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
          labels: propData.shape === NodeEnum.fork ? [defaultEdgeLabel] : [],
        });
      };
    }
    return options;
  }}
/>
```

## FlowChartRefType

<<< index.tsx::params:FlowChartRefType
