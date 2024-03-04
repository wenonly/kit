# loadResource

用于加载前端资源

## loadJs

手动使用 js 懒加载 js 资源，主要用于比较大的 js 库。

```ts
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
```

## loadCss

手动使用 js 懒加载 css 资源

```ts
// useScript 是通过hooks方式封装的loadJs
const { loading } = useScript(`${pathPrefix}amis/sdk.js`, {
  js: {
    async: true,
  },
  onReady: async () => {
    if (window.amisRequire) {
      await Promise.all([
        loadCss(`${pathPrefix}amis/sdk.css`),
        loadCss(`${pathPrefix}amis/helper.css`),
        loadCss(`${pathPrefix}amis/iconfont.css`),
      ]);
      amisEmbed.current = window.amisRequire < AmisEmbedType > "amis/embed";
    } else {
      message.error("amis 引入失败");
    }
  },
});
```

## prefetchScript 和 preloadScript

预加载 script 资源

```ts
// preload 加载防止闪烁
preloadScript(pointImg, "image");
// prefetch 预先加载可能访问的图片
prefetchScript(pointImgHover, "image");
```

## preloadFont

预加载字体，防止文本闪烁

```ts
preloadFont(PangMenZhengDao);
preloadFont(AlibabaPuHuiTiB);
preloadFont(YouSheBiaoTiHei);
```
