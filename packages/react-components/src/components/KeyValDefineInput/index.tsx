import { Button, Input, Space } from "antd";
import { isEqual } from "lodash-es";
import React, { useEffect, useState } from "react";
import styles from "./index.module.less";
import { useRefData } from "@wenonly/react-hooks";

function generate() {
  return String(Math.random() * 100000);
}

interface KeyValDefine {
  key?: string;
  value?: string;
  renderKey: string;
}

type DefineMapValue = Record<string, KeyValDefine["value"]>;

interface IProps {
  readonly?: boolean;
  value?: DefineMapValue;
  onChange?: (v: DefineMapValue) => void;
}

// 当前内状态转为对象结构，后端的值
const arrToMapValue = (define: KeyValDefine[]) => {
  const val: DefineMapValue = {};
  define.forEach((item) => {
    if (item.key) {
      val[item.key] = item.value;
    }
  });
  return val;
};

// 转回来
const mapToArrValue = (map: DefineMapValue = {}): KeyValDefine[] => {
  return Object.entries(map).map(([key, value]) => {
    return {
      key,
      value,
      renderKey: generate(),
    };
  });
};

const KeyValDefineInput: React.FunctionComponent<IProps> = (props) => {
  const [define, setDefine] = useState<KeyValDefine[]>([]);
  const defineRef = useRefData(() => define);

  useEffect(() => {
    const nowMap = arrToMapValue(defineRef.current);
    if (!isEqual(nowMap, props.value)) {
      setDefine(mapToArrValue(props.value));
    }
  }, [defineRef, props.value]);

  const onEmitChange = () => {
    props.onChange?.(arrToMapValue(define));
  };

  const addRow = () => {
    define.push({
      key: "",
      value: "",
      renderKey: generate(),
    });
    setDefine([...define]);
    onEmitChange();
  };

  const delRow = (index: number) => {
    define.splice(index, 1);
    setDefine([...define]);
    onEmitChange();
  };

  const onChangeVal = (
    index: number,
    keyPath: "key" | "value",
    value?: string
  ) => {
    define[index][keyPath] = value;
    setDefine([...define]);
    onEmitChange();
  };

  return (
    <div className={styles.keyValWrap}>
      {define.map((item, index) => (
        <div
          className={styles.keyValRow}
          key={item.renderKey}
          style={props.readonly ? { marginBottom: 0 } : undefined}
        >
          {props.readonly ? (
            <>
              <span>{item.key}：</span>
              <span>{item.value}</span>
            </>
          ) : (
            <Space>
              <Input
                placeholder="key"
                value={item.key}
                onChange={(e) => onChangeVal(index, "key", e.target.value)}
              />
              <Input
                placeholder="value"
                value={item.value}
                onChange={(e) => onChangeVal(index, "value", e.target.value)}
              />
              <Button onClick={() => delRow(index)}>删除</Button>
            </Space>
          )}
        </div>
      ))}
      {props.readonly ? (
        define?.length === 0 && <span>无</span>
      ) : (
        <Button onClick={addRow}>添加</Button>
      )}
    </div>
  );
};

export default KeyValDefineInput;
