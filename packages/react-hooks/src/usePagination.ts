import type { TablePaginationConfig } from 'antd';
import { useState } from 'react';

/**
 * 为表格的分页提供的hook
 */
export default (options: TablePaginationConfig = {}) => {
  const [total, setTotal] = useState<number>(options.total || 0);
  const [current, setCurrentPage] = useState<number>(options.current || 1);
  const [pageSize, setPageSize] = useState<number>(options.pageSize || 10);
  const [pageSizeOptions, setPageSizeOptions] = useState<string[] | number[]>(
    options.pageSizeOptions || ['10', '20', '50', '100'],
  );
  const pagination: TablePaginationConfig = {
    showQuickJumper: true,
    showSizeChanger: true,
    showTotal: (t) => `共${t}条`,
    ...options,
    total,
    current,
    pageSize,
    pageSizeOptions,
    onChange: (p, ps) => {
      if (ps && ps !== pageSize) {
        setCurrentPage(1);
        setPageSize(ps);
      } else {
        setCurrentPage(p);
      }
      options.onChange?.(p, ps);
    },
  };

  return {
    pagination,
    total,
    current,
    pageSize,
    setCurrentPage,
    setTotal,
    setPageSize,
    setPageSizeOptions,
  };
};
