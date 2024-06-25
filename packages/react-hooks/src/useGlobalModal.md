<script setup>
import RUseGlobalModal from '@/examples/RUseGlobalModal.tsx'
</script>

# useGlobalModal

将弹窗功能封装为一个 hook，这样在组件中就可以`直接调用hooks的函数`打开弹窗，而不用在 jsx 中写弹窗组件代码。

# 示例

<br />
<VueWrapper :component="RUseGlobalModal" />

::: details 点我查看代码
<<< @/examples/RUseGlobalModal.tsx{37-45}
:::
