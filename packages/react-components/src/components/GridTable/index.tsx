import type { PaginationProps, TableProps } from "antd";
import { Empty, Pagination, Spin } from "antd";
import React from "react";
import styles from "./index.module.less";

type DefaultRecordType = Record<string, any>;

interface IProps<RecordType extends Record<string, any>>
  extends Omit<TableProps<RecordType>, "children"> {
  loading?: boolean; // 是否加载中
  dataSource?: RecordType[]; // 数据源
  gridGap?: number; // 网格间距
  gridItemMinWidth?: number; // 网格最小宽度
  pagination?: PaginationProps | false; // 分页
  cardStyle?: React.CSSProperties; // 卡片样式
  style?: React.CSSProperties; // 样式
  rowKey?: string; // 唯一标识
  children?: (r: RecordType) => React.ReactNode; // 子组件
}

const GridTable = <T extends DefaultRecordType = object>(props: IProps<T>) => {
  return (
    <Spin spinning={props.loading ?? false}>
      <div className={styles.gridTableWrap} style={{ ...(props.style || {}) }}>
        <div
          className={styles.scrollContent}
          style={{ height: props.scroll?.y }}
        >
          {props.dataSource && props.dataSource.length ? (
            <div
              className={styles.gridContent}
              style={{
                gridGap: `${props.gridGap}px`,
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  props.gridItemMinWidth || 250
                }px, 1fr))`,
              }}
            >
              {props.dataSource?.map((item, index) => (
                <div
                  className={styles.gridItem}
                  style={{ ...(props.cardStyle || {}) }}
                  key={item[props.rowKey ?? "id"] ?? index}
                >
                  {props.children && props.children(item)}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: "10%" }}
            />
          )}
        </div>
        {props.pagination !== false && (
          <div className={styles.gridTableFooter}>
            <div className={styles.pageWrap}>
              <Pagination {...(props.pagination || {})} />
            </div>
          </div>
        )}
      </div>
    </Spin>
  );
};

export default GridTable;
