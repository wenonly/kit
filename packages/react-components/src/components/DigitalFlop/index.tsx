import { usePrevious } from 'ahooks';
import React, { useEffect, useState } from 'react';

// 判断是否为小数，且小数后多少位
function getDecimalPlaces(value: number) {
  if (Number.isInteger(value)) {
    // 如果是整数，则没有小数部分
    return 0;
  } else {
    // 将数字转换为字符串
    const strValue = value.toString();
    // 查找小数点的位置
    const dotIndex = strValue.indexOf('.');
    // 没有小数点，则认为小数位数为0
    if (dotIndex === -1) {
      return 0;
    } else {
      // 计算小数位数并返回
      return strValue.length - dotIndex - 1;
    }
  }
}

const ChangeStepNum = 20;

interface DigitalFlopProps {
  num: number; // 需要显示的数字，整数
  duration?: number; // 数字变化到num所需的时间
}

// 数字翻牌器
const DigitalFlop: React.FunctionComponent<DigitalFlopProps> = (props) => {
  const preview = usePrevious(props.num);
  const [value, setValue] = useState((preview ?? 0).toString());

  useEffect(() => {
    const time = (props.duration ?? 1000) / ChangeStepNum;
    const place = getDecimalPlaces(props.num);
    const changeNum = props.num * Math.pow(10, place) - (preview ?? 0);
    let count = 1;
    const timer = setInterval(() => {
      const newNum = Math.floor((changeNum / ChangeStepNum) * count++) + (preview ?? 0);
      setValue((newNum / Math.pow(10, place)).toFixed(place));
      if (count > ChangeStepNum) {
        clearInterval(timer);
      }
    }, time);
    return () => {
      clearInterval(timer);
    };
  }, [preview, props.duration, props.num]);

  return <>{value}</>;
};

export default DigitalFlop;
