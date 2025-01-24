import { Menu } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import styles from './index.module.less';

interface MenuItem {
  label: string;
  key: string;
}

export interface ContextMenuProps {
  x?: number;
  y?: number;
  visible?: boolean;
  menuList?: MenuItem[];
  onVisibleChange?: (visible: boolean) => void;
  onSelect?: (key: string) => void;
}

const ContextMenu: React.FunctionComponent<ContextMenuProps> = (props) => {
  const { x, y, visible, onVisibleChange, onSelect, menuList } = props;
  const [curVisible, setCurVisible] = useState<boolean>(Boolean(visible));

  const changeRef = useRef(onVisibleChange);

  useEffect(() => {
    if (changeRef.current) changeRef.current(curVisible);
  }, [curVisible]);

  useEffect(() => {
    if (typeof visible === 'boolean') setCurVisible(visible);
    if (visible && (!menuList || menuList.length === 0)) {
      setCurVisible(false);
    }
  }, [menuList, visible]);

  useEffect(() => {
    const handler = () => {
      setCurVisible(false);
    };
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
    };
  }, []);

  const handleSelect = ({ key }: { key: string }) => {
    if (onSelect) onSelect(key);
    setCurVisible(false);
  };

  return curVisible ? (
    <div onClick={(e) => e.nativeEvent.stopImmediatePropagation()}>
      <Menu
        className={styles.contextMenuContainer}
        style={{ left: x, top: y }}
        onSelect={handleSelect}
        items={menuList}
      />
    </div>
  ) : (
    <></>
  );
};

export default ContextMenu;
