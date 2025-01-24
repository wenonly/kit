import { Checkbox, Form, Select, Spin } from "antd";
import React, { useImperativeHandle } from "react";
import type { NodeFormProps, NodeFormRef } from ".";

const checkboxOptions = [
  { label: "WEB端", value: "WEB" },
  { label: "PAD端", value: "PAD" },
];

const NormalNodeForm = React.forwardRef<NodeFormRef, NodeFormProps>(
  ({ node, readonly, ...props }, ref) => {
    useImperativeHandle(ref, () => {
      return {
        beforeSave: () => true,
      };
    });

    return (
      <Spin spinning={false}>
        <h3 style={{ fontWeight: "bold", marginTop: 5 }}>配置信息:</h3>
        <Form {...props}>
          <Form.Item
            label="推送终端"
            name="pushPortEnum"
            rules={[{ required: true, message: "请选择推送终端" }]}
          >
            <Checkbox.Group
              options={[
                { label: "WEB端", value: "WEB" },
                { label: "PAD端", value: "PAD" },
              ]}
              disabled={readonly}
            />
          </Form.Item>
          <Form.Item
            label="推送人员"
            name="pushPortEnum"
            rules={[{ required: true, message: "请选择推送终端" }]}
          >
            <Select
              options={[
                { label: "小明", value: "xiaoming" },
                { label: "小红", value: "xiaohong" },
              ]}
            ></Select>
          </Form.Item>
        </Form>
      </Spin>
    );
  }
);

export default NormalNodeForm;
