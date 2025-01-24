import type { Edge, Node } from "@antv/x6/lib/model";
import type { DrawerProps, FormInstance, FormProps } from "antd";
import { Button, Drawer, Form, Space, message } from "antd";
import React, { useEffect, useMemo, useRef } from "react";
import { FormDrawerMap } from "./FormDrawerMap";
import styles from "./index.module.less";

export interface NodeFormRef {
  beforeSave?: () => boolean;
}

export interface NodeFormProps extends FormProps {
  node?: Node | Edge;
  readonly?: boolean;
}

type FormPropsType = NodeFormProps & {
  ref: React.RefObject<NodeFormRef>;
  form: FormInstance<any>;
};

interface FormDrawerProps extends DrawerProps {
  node?: Node | Edge;
  formRender?: (props: FormPropsType) => React.ReactNode;
}

// 想节点的meta字段加数据
const FormDrawer: React.FunctionComponent<FormDrawerProps> = ({
  node,
  formRender,
  ...restProps
}) => {
  const formNodeRef = useRef<NodeFormRef>(null);
  const [form] = Form.useForm();
  const metaData = useMemo(() => node?.getProp(), [node]);
  const readonly = useMemo(() => {
    const nodeData = node?.getData();
    return !!nodeData?.globalContext?.current?.readonly;
  }, [node]);

  useEffect(() => {
    if (restProps.open) {
      const nodeData = node?.getData();
      if (nodeData?.formData) {
        form.setFieldsValue(nodeData.formData);
      }
    } else {
      form.resetFields();
    }
  }, [restProps.open, node, form]);

  const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
    form
      .validateFields()
      .then((values) => {
        if (formNodeRef.current?.beforeSave?.() === false) return;
        node?.updateData({ formData: { ...values }, needCompleteForm: false });
        restProps.onClose?.(e);
      })
      .catch(() => {
        message.error("请填写完整配置信息");
        node?.updateData({ needCompleteForm: true });
      });
  };

  const formProps: FormPropsType = {
    ref: formNodeRef,
    form,
    node,
    readonly,
    labelAlign: "right",
    labelCol: {
      xs: 24,
      md: 6,
    },
  };

  return (
    <Drawer
      title={
        <span
          className={styles.formDrawerTitle}
          title={metaData?.title || "节点编辑"}
        >
          {metaData?.title || "节点编辑"}
        </span>
      }
      width={400}
      {...restProps}
      getContainer={false}
      closable={readonly}
      maskClosable={readonly}
      rootStyle={{ position: "absolute", mask: "rgba(0, 0, 0, 0.3)" }}
      className={styles.formContainer}
      extra={
        !readonly && (
          <Space>
            <Button type="primary" size="small" onClick={handleSave}>
              保存
            </Button>
            <Button
              type="default"
              size="small"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                restProps?.onClose?.(e)
              }
            >
              取消
            </Button>
          </Space>
        )
      }
    >
      {formRender ? (
        formRender(formProps)
      ) : node &&
        FormDrawerMap[node.getProp().shape as keyof typeof FormDrawerMap] ? (
        React.createElement(
          FormDrawerMap[node.getProp().shape as keyof typeof FormDrawerMap],
          formProps
        )
      ) : (
        <Form form={form} />
      )}
    </Drawer>
  );
};

export default FormDrawer;
