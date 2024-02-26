<script setup>
import { XgPlayer } from '@wenonly/react-components'
</script>

# XgPlayer

XgPlayer 是一个 React 组件，用于在页面上嵌入一个视频播放器。它使用了 xgplayer，一个强大的 HTML5 视频播放器。
<VueWrapper :component="XgPlayer" src="https://lf3-static.bytednsdoc.com/obj/eden-cn/nupenuvpxnuvo/xgplayer_doc/xgplayer-demo-720p.mp4" />
<br />

[[toc]]

## 属性
XgPlayer 组件接受以下属性：

1. src (必需): 视频源的 URL。这是一个字符串。

2. options (可选): 一个对象，包含了 xgplayer 的配置选项。这些选项会被传递给 xgplayer 实例。查看 xgplayer 文档以了解所有可用的选项。

## 使用方法
```jsx
import XgPlayer from './XgPlayer';

function App() {
  return (
    <XgPlayer src="http://your-video-url.mp4" options={{ autoplay: true }} />
  );
}

export default App;
```
在上述代码中，我们导入了 XgPlayer 组件，并在 App 组件中使用它。我们传递了 src 属性，指定了视频的 URL，以及 options 属性，设置了视频自动播放。

## 生命周期
当 XgPlayer 组件被挂载到 DOM 时，它会创建一个新的 xgplayer 实例，并将其挂载到一个 div 元素上。当组件被卸载时，它会销毁 xgplayer 实例，释放所有相关资源。

## XgPlayerModal

XgPlayerModal 是一个 React 弹窗组件，用于在模态窗口中显示 XgPlayer 播放器。
```jsx
import { XgPlayerModal } from './XgPlayerModal';
<XgPlayerModal src="..." open={true} />
```