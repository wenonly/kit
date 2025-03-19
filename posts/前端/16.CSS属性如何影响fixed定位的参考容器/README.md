---
title: CSS属性如何影响fixed定位的参考容器
date: 2025-03-19 10:00
categories: 前端笔记
tags:
  - containing block
  - 包含块
  - css
---

<script setup>
    import { ref } from 'vue'
    import classNames from 'classnames'
    const hasFilter = ref(true)
</script>

## 遇到的问题

开发过程中，使用`react-contexify`插件实现右键菜单，但是右键菜单始终不生效，右键菜单始终不显示。

后来我发现是因为`fixed`定位的问题，`react-contexify`右键窗口是定位相对于窗口设计的，但是右键菜单所在容器包含一个`backdrop-filter`属性，导致右键菜单是相对这个容器定位的。

效果如下：

<div :class="classNames('border-1 border-solid border-gray-200 p-3 h-30', hasFilter? 'backdrop-blur-xs': '')">
容器 <span class="text-xs text-gray-500">{{hasFilter? 'backdrop-filter: blur(var(--blur-xs))':''}}</span>
<div class="border-1 border-solid bg-blue-500 text-white border-gray-200 z-999 p-3 h-15 cursor-pointer fixed left-10 top-10 flex items-center" @click="hasFilter = !hasFilter">内容(点击切换)</div>
</div>

从上面这个例子可以看出，`backdrop-filter`确实影响了`fixed`定位的参考容器。

## 原因

这个现象与 CSS 中的 `containing block`（包含块）概念有关。一般情况下，`position: fixed` 元素的包含块是视口（viewport）。但是，当元素的祖先元素具有以下 CSS 属性之一时，该祖先元素会成为 fixed 定位元素的包含块：

1. `transform` 属性值不为 `none`
2. `perspective` 属性值不为 `none`
3. `filter` 属性值不为 `none`（包括 `backdrop-filter`）
4. `contain` 属性值为 `paint`
5. `will-change` 属性值为上述任意属性

在我们的例子中，容器使用了 `backdrop-filter` 属性，这导致该容器成为了其内部 fixed 定位元素的包含块，使得 fixed 元素不再相对于视口定位，而是相对于这个容器定位。

这就解释了为什么 `react-contexify` 的右键菜单位置会出现偏差，因为它默认是相对于视口进行定位计算的，但实际上由于容器的 `backdrop-filter` 属性，改变了其定位的参考系。

## 解决思路

针对这个问题，有以下几种解决方案：

1. **移除影响定位的属性**
   如果可能的话，最简单的方法是移除容器上的 `backdrop-filter` 属性。可以考虑将这个效果应用到其他不包含 fixed 定位元素的容器上。

2. **调整菜单容器的位置**
   将右键菜单组件移动到不受 `backdrop-filter` 影响的容器中，比如直接放在 body 下：
   ```jsx
   // React 示例
   ReactDOM.createPortal(
     <Menu />,
     document.body
   )
   ```

3. **手动计算位置** 如果必须在当前容器中使用 backdrop-filter ，可以通过 JavaScript 手动计算菜单的正确位置

4. **使用替代方案**

   - 使用额外的半透明背景层来模拟模糊效果
   - 考虑使用其他不依赖 fixed 定位的右键菜单组件
   - 使用绝对定位（absolute）配合合适的定位容器

## 关于包含块（Containing Block）

包含块是 CSS 布局中的一个重要概念，它决定了元素的定位和尺寸计算的参考对象。不同的定位方式会有不同的包含块确定规则：

1. **静态定位（static）和相对定位（relative）**
   - 包含块由最近的块级祖先元素的内容框（content box）形成

2. **绝对定位（absolute）**
   - 包含块由最近的非 static 定位的祖先元素的内边距框（padding box）形成

<div :class="classNames('relative border-1 border-solid border-gray-200 p-7 h-30')">
<div class="border-1 border-solid bg-blue-500 text-white border-gray-200 z-999 p-3 h-15 cursor-pointer absolute left-0 top-0 flex items-center">absolute 内容</div>
<div class="absolute top-0 left-35">padding</div>
<div class="h-full w-full bg-amber-600 flex items-center justify-center text-white">content</div>
</div>

3. **固定定位（fixed）**
   - 默认情况下，包含块是视口（viewport）
   - 但如果祖先元素具有特定 CSS 属性，则该祖先元素会成为包含块：
     - transform 不为 none
     - perspective 不为 none
     - filter 不为 none（包括 backdrop-filter）
     - contain 为 paint
     - will-change 设置为上述属性

这种包含块的特性在开发中需要特别注意：
- 使用第三方组件时，要注意是否有影响包含块的 CSS 属性
- 在需要固定定位的场景下，应当避免在其祖先元素上使用会改变包含块的属性
- 如果必须使用这些属性，可以考虑使用 Portal 等技术将固定定位元素渲染到独立的容器中

理解包含块的概念对于实现准确的布局和避免定位问题至关重要。

