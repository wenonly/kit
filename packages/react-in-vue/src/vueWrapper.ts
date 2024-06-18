import { createElement } from "react";
import ReactDOM from "react-dom/client";
import { defineComponent, h, onMounted, ref } from "vue";

// Vue 组件
export default defineComponent({
  props: ["component"],
  setup(props, ctx) {
    const react = ref(); // 根节点实例
    const reactInstance = ref(); // react dom root
    const { component, ...rest } = props; // 接收的 React 组件

    onMounted(() => {
      // 创建 react 实例
      reactInstance.value = ReactDOM.createRoot(react.value);

      // 渲染 react 组件
      reactInstance.value.render(
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
    return () => h("div", { ref: react });
  },
});
