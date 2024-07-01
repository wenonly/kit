# Kit

组件和utils聚合

# build

```shell
pnpm -r run build
```

# publish

```shell
# 生成变更集
pnpm changeset
# 修改版本
pnpm changeset version
# 发布
pnpm changeset publish
```

## 文档语法

本项目文档使用[vitepress](https://vitepress.dev/)，详细语法阅读[文档](https://vitepress.dev/guide/markdown)。

### 新增插件语法

1. 读取typescript文件中的interface，生成文档表格

```md
<!-- 文件路径::params:InterfaceName -->
<<< @/packages/kit/src/utils/index.ts::params:IConfig
```