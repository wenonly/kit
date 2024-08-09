import { useTreeLoad } from "@wenonly/react-hooks";
import { delayMs } from "@wenonly/utils";
import { Tree } from "antd";
import React from "react";

const RUseTreeLoad = () => {
  const { treeData, loading, refresh, loadData, loadedKeys } = useTreeLoad({
    getRequest: (parent) => {
      // 如果存在父节点，则应用子节点加载逻辑
      if (parent) {
        return async ({ page, size }) => {
          await delayMs(1000);
          return Promise.resolve({
            list: [
              {
                label: "子" + page,
                value: "child" + page,
              },
              {
                label: "子" + page + "_1",
                value: "child" + page + "_1",
              },
            ],
            isComplete: false,
          });
        };
      }
      return ({ page, size }) => {
        return Promise.resolve({
          list: [
            {
              label: "父1",
              value: "parent1",
            },
            {
              label: "父2",
              value: "parent2",
            },
          ],
          isComplete: true,
        });
      };
    },
    transformer: (node) => {
      return { title: node.label, key: node.value! };
    },
  });

  return (
    <Tree treeData={treeData} loadedKeys={loadedKeys} loadData={loadData} />
  );
};

export default RUseTreeLoad;
