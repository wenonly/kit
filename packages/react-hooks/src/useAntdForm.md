# useAntdForm

antd form 逻辑的封装，方便使用

# 示例

```tsx
const { form, resetForm, params, onFormFinished } = useAntdForm({
  initialValues: {
    folderCode: query.packageCode,
    codeOrName: query.criminalId,
  },
  beforeSubmit: () => {
    setCurrentPage(1);
  },
  beforeReset: () => {
    setCurrentPage(1);
  },
});

// 获取表格数据
const { refresh, loading } = useRequest(
  () => {
    return req({
      pageSize: pageSize,
      page: current,
      ...params,
    }).then((res) => {
      setTotal(res.size || 0);
      setDataSource(res.resultList || []);
    });
  },
  {
    refreshDeps: [current, pageSize, params],
  }
);

<Form
  form={form}
  layout="inline"
  style={{ display: "block" }}
  initialValues={initialValues}
  onFinish={onFormFinished}
  autoComplete="off"
>
  {/* ...form.item */}
</Form>;

// table
```
