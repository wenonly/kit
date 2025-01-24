import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  WarningFilled,
} from '@ant-design/icons';
import type { ReactShape } from '@antv/x6-react-shape';
import React, { useMemo } from 'react';
import type { NodeDataType } from '..';
import styles from './index.module.less';

export interface NodeProps {
  name: string;
  icon: React.ReactNode;
  node?: ReactShape;
}

// 计算文字长度，汉字为两个
function calculateDisplayLength(str: string) {
  let length = 0;
  for (let i = 0; i < str.length; i++) {
    // 判断字符是否为汉字
    if (str.charCodeAt(i) >= 0x4e00 && str.charCodeAt(i) <= 0x9fa5) {
      length += 2; // 汉字增加2
    } else {
      length += 1; // 英文或其他字符增加1
    }
  }
  return length;
}

const CommonNode: React.FunctionComponent<NodeProps> = ({ name, icon, node }) => {
  const data = node?.getData<NodeDataType>();
  const contextContent = data?.globalContext?.current;

  const width = useMemo(() => {
    const len = calculateDisplayLength(name) * 7;
    return Math.max(Math.min(len, 150), 65);
  }, [name]);

  return (
    <div className={styles.nodeWrap}>
      {icon}
      <span className={styles.nodeText}>
        <span className={styles.nodeTitle} title={name} style={{ width }}>
          {name}
        </span>
        {contextContent?.readonly ? (
          <>
            {data?.status === 'running' && (
              <ReloadOutlined className={`${styles.icon} ${styles.runningIcon}`} />
            )}
            {data?.status === 'success' && (
              <CheckCircleOutlined className={styles.icon} style={{ color: '#52c41a' }} />
            )}
            {data?.status === 'failed' && (
              <CloseCircleOutlined className={styles.icon} style={{ color: '#ff4d4f' }} />
            )}
          </>
        ) : (
          <>
            {data?.needCompleteForm && (
              <WarningFilled className={styles.icon} style={{ color: '#FA8214' }} />
            )}
          </>
        )}
      </span>
    </div>
  );
};

export default CommonNode;
