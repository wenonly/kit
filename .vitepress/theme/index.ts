// https://vitepress.dev/guide/custom-theme
import { VueWrapper } from "@wenonly/react-in-vue";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import MyLayout from "./MyLayout.vue";
import { h } from "vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(MyLayout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    });
  },
  enhanceApp({ app, router, siteData }) {
    app.component("VueWrapper", VueWrapper);
  },
} satisfies Theme;
