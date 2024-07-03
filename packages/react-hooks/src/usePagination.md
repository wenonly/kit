# usePagination

封装分页信息的 hook。

## 示例

```tsx
const { pagination, current, pageSize, setTotal, setCurrentPage } =
  usePagination();

// 获取表格数据
const { refresh, loading } = useRequest(
  () => {
    return req({
      pageSize: pageSize,
      page: current,
    }).then((res) => {
      setTotal(res.size || 0);
      setDataSource(res.resultList || []);
    });
  },
  {
    refreshDeps: [current, pageSize],
  }
);

<Pagination className={styles.pagination} {...pagination} />;
```
