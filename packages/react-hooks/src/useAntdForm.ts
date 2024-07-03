/**
 * 解析form的参数
 */
import { useMount } from "ahooks";
import { Form } from "antd";
import { useState } from "react";

type DefaultValue = Record<string, any>;

export interface UseCustomFormOptions<T, U> {
  initialValues?: Partial<T>;
  beforeSubmit?: (TData: U) => T | void;
  beforeReset?: () => void;
}

export default <
  T extends DefaultValue = DefaultValue,
  U extends DefaultValue = DefaultValue
>(
  options: UseCustomFormOptions<T, U> = {}
) => {
  const [initialValues] = useState(options.initialValues ?? {});
  const [params, setParams] = useState<Partial<T | U>>(initialValues);
  const [form] = Form.useForm();

  useMount(() => {
    form.setFieldsValue(initialValues);
  });

  // form onFinished
  const onFormFinished = (values: U) => {
    const newValues = options.beforeSubmit?.(values) || values;
    setParams(newValues);
  };

  // resetForm
  const resetForm = () => {
    options.beforeReset?.();
    form.resetFields();
    setParams(options.initialValues ?? {});
  };

  const setFormParams = (values: Partial<T>) => {
    form.setFieldsValue({ ...values });
    form.submit();
  };

  return {
    form,
    params,
    resetForm,
    setParams: setFormParams,
    initialValues,
    onFormFinished,
  };
};
