<script setup>
import { SlickText } from '@wenonly/react-components'
</script>

# SlickText

用于滚动展示文本，可以展示多行文本，动画切换。

## 示例

<VueWrapper :component="SlickText" :style="{height: 28}" :texts="['社会主义核心价值观基本内容：富强、民主、文明、和谐，自由、平等、公正、法治，爱国、敬业、诚信、友善；', '爱岗敬业，诚实守信，办事公道，服务群众，奉献社会；']" />

```jsx
<SlickText
  style={{ height: 28 }}
  texts={[
    "社会主义核心价值观基本内容：富强、民主、文明、和谐，自由、平等、公正、法治，爱国、敬业、诚信、友善；",
    "爱岗敬业，诚实守信，办事公道，服务群众，奉献社会；",
  ]}
/>
```

## 参数

<<< index.tsx::params:SlickTextProps
