import { createElement } from "react";
import ReactDOM from "react-dom/client";
import { defineComponent, h, onMounted, ref } from "vue";

// Vue 组件
export default defineComponent({
  props: ["component"],
  inheritAttrs: false,
  setup(props, ctx) {
    const react = ref(); // 根节点实例
    const { component, ...rest } = props; // 接收的 React 组件

    onMounted(() => {
      // 创建 react 实例
      const reactInstance = ReactDOM.createRoot(react.value);

      // 渲染 react 组件
      reactInstance.render(
        createElement(
          component,
          {
            ...rest,
            ...ctx.attrs,
          },
          null
        )
      );
    });

    // 渲染根节点
    return () => h("div", { ref: react, class: "react-wrapper" });
  },
});
