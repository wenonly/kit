import { AutoScrollBox } from "@wenonly/react-components";
import { Card } from "antd";
import React from "react";

const RCAutoScrollBox: React.FunctionComponent = () => {
  return (
    <AutoScrollBox
      style={{ height: 300 }}
      items={Array(10)
        .fill(1)
        .map((item, index) => (
          <Card key={index}>{index}</Card>
        ))}
    ></AutoScrollBox>
  );
};

export default RCAutoScrollBox;
