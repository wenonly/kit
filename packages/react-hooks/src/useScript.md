# useScript

用于加载外部 js 的 hook

## 示例

```tsx
// 加载amis中的monaco编辑器
useScript(`${pathPrefix}amis/sdk.js`, {
  js: {
    async: true,
  },
  onReady: () => {
    // 搜索public/amis/sdk.js文件中/*!examples/loadMonacoEditor.ts*/,下方就是monaco编辑器的id
    window.amis.require(["b14f4a4"], (monaco: typeof MonacoEditor) => {
      monacoModuleRef.current = monaco;
      initEditor();
    });
  },
});
```
