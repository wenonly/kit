import { join } from "path";
import { defineConfig } from "vitepress";
import { blogNav, blogRewrites, blogSideBar } from "./configs/blog";
import { DocGroup, getSideBar, rewrites } from "./configs/rewrites";
import resolveConfigVitePlugin from "./plugins/resolveConfigVitePlugin";
import { tsParamsPlugin } from "./plugins/tsParamsPlugin";

const reactComponentsSidebars = getSideBar(DocGroup.ReactComponents);
const reactHooksSidebars = getSideBar(DocGroup.ReactHooks);
const utilsSidebars = getSideBar(DocGroup.Utils);
const otherUtilsSidebars = getSideBar(DocGroup.OtherUtils);

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "wenonly的知识库",
  description: "A doc web with components, utils and hooks",
  srcDir: "./",
  outDir: "./docs",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "我的分类", items: blogNav },
      { text: "我的归档", link: '/archive' },
      {
        text: "自定义库",
        items: [
          { text: "React组件", link: reactComponentsSidebars[0]?.link ?? "/" },
          { text: "React Hooks", link: reactHooksSidebars[0]?.link ?? "/" },
          { text: "工具函数", link: utilsSidebars[0]?.link ?? "/" },
        ],
      },
    ],
    sidebar: {
      ...blogSideBar,
      "/react-components": reactComponentsSidebars,
      "/react-hooks": reactHooksSidebars,
      "/utils": [
        {
          text: "工具函数",
          items: utilsSidebars,
          collapsed: false,
        },
        {
          text: "其他工具",
          items: otherUtilsSidebars,
          collapsed: false,
        },
      ],
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/wenonly/kit",
      },
    ],
    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "medium",
      },
    },
    search:
      process.env.NODE_ENV === "production"
        ? {
            provider: "local",
          }
        : undefined,
    outline: {
      label: "页面导航",
      level: "deep",
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    langMenuLabel: "多语言",
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
  },
  rewrites: {
    // 主页
    "pages/index.md": "index.md",
    "pages/archive.md": "archive.md",
    ...Object.fromEntries(rewrites.map((item) => [item.from, item.to])),
    ...blogRewrites,
  },
  vite: {
    plugins: [resolveConfigVitePlugin()],
    resolve: {
      alias: {
        "@": join(__dirname, "../"),
      },
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // 删除 use client 警告
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
          }
          warn(warning);
        },
      },
    },
  },
  markdown: {
    config: (md) => {
      md.use(tsParamsPlugin);
    },
  },
});
