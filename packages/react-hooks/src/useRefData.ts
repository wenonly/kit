import { useRef } from 'react';

/**
 * 将数据转为ref，这样不会强制依赖
 */
export default <T>(callback: () => T) => {
  const data = callback();
  const ref = useRef(data);
  ref.current = data;
  return ref;
};
