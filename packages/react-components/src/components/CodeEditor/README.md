# CodeEditor

代码编辑器

::: warning
目前引用的特定版本`amis`中的`monaco edit`，直接`import`当前组件将无法正常使用。
:::

<script setup>
import { CodeEditor } from '@wenonly/react-components'
import { useData } from 'vitepress'
import { onMounted } from 'vue'

const { site } = useData();

const codeAsString = `
import { useData } from 'vitepress'
import { onMounted } from 'vue'

const { site } = useData();

onMounted(() => {
    console.log(site)
})
`;
</script>

## 示例

<VueWrapper :component="CodeEditor" :height="300" :sdkUrl="`${site.base}/lib/amis/sdk.js`" language="javascript" :value="codeAsString"></VueWrapper>
<br />

# 参数

<<< index.tsx::params:IProps
