# useUpdate

用于强制更新组件的 hook

## 示例

```tsx
import { useUpdate } from '@wenonly/react-hooks';

const Demo = () => {
  const { updateKey, update } = useUpdate();
  return (
    <div>
      <CustomComp key={updateKey}>
      <button onClick={update}>update</button>
    </div>
  );
}
```
