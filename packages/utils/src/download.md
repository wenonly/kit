# download

## downloadBlob

下载 url 或者 blob 文件

```ts
// 下载xlsx文件
loadJs(`${pathPrefix}xlsx.full.min.js`).then(async () => {
  const headerArr = columns.map((col) => col.title);
  const contentArr = selectedRowDatas.map((row) =>
    columns
      .map((col) => row[col.dataIndex?.toString() || ""] || false)
      .filter(Boolean)
  );
  const sheet = window.XLSX.utils.aoa_to_sheet([headerArr, ...contentArr]);
  const name = menuItem?.titlePath.join("_");
  if (name) {
    const blob = await sheet2blob(sheet, name);
    downloadBlob(blob, `${name}.xlsx`);
  }
});

// 直接下载url地址文件
downloadBlob(url, "test.xlsx");
```
