import { defineComponent, h } from "vue";
import { default as VueWrapper } from "./vueWrapper";

const VueResolver = (component: React.ComponentType) => {
  return defineComponent({
    inheritAttrs: false,
    setup(props, ctx) {
      return () =>
        h(
          VueWrapper,
          {
            component: component,
            ...props,
            ...ctx.attrs,
          },
          ctx.slots.default
        );
    },
  });
};

export default VueResolver;
