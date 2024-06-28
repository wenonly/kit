import { readdirSync, statSync } from "fs";
import { extname, join } from "path";
import { compile, match } from "path-to-regexp";
import { DefaultTheme, defineConfig } from "vitepress";
import { tsParamsPlugin } from "./plugins/tsParamsPlugin";

enum DocGroup {
  ReactComponents = "react-components",
  ReactHooks = "react-hooks",
  Utils = "utils", // packages/utils
  OtherUtils = "other-utils", // 不在packages/utils的一些包
}

interface RewritesConfigItem {
  from: string;
  to: string;
  group?: DocGroup;
  sidebarName?: string;
}

const rewrites: RewritesConfigItem[] = [
  {
    from: "packages/react-components/src/components/:componentName/README.md",
    to: "react-components/:componentName.md",
    group: DocGroup.ReactComponents,
    sidebarName: ":componentName",
  },
  {
    from: "packages/react-hooks/src/:hookName.md",
    to: "react-hooks/:hookName.md",
    group: DocGroup.ReactHooks,
    sidebarName: ":hookName",
  },
  {
    from: "packages/react-hooks/src/:hookName/README.md",
    to: "react-hooks/:hookName.md",
    group: DocGroup.ReactHooks,
    sidebarName: ":hookName",
  },
  {
    from: "packages/utils/src/:utilName.md",
    to: "utils/:utilName.md",
    group: DocGroup.Utils,
    sidebarName: ":utilName",
  },
  {
    from: "packages/jsonp-data/README.md",
    to: "utils/jsonp-data.md",
    group: DocGroup.OtherUtils,
    sidebarName: "jsonp-data",
  },
  {
    from: "packages/json2ts/README.md",
    to: "utils/json2ts.md",
    group: DocGroup.OtherUtils,
    sidebarName: "json2ts",
  },
];

const allMdFilePaths = findMarkdownFiles(join(__dirname, "../packages"));

const reactComponentsSidebars = getSideBar(DocGroup.ReactComponents);
const reactHooksSidebars = getSideBar(DocGroup.ReactHooks);
const utilsSidebars = getSideBar(DocGroup.Utils);
const otherUtilsSidebars = getSideBar(DocGroup.OtherUtils);

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Tool Kit",
  description: "A doc web with components, utils and hooks",
  srcDir: "./",
  outDir: "./docs",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "React组件", link: reactComponentsSidebars[0]?.link ?? "/" },
      { text: "React Hooks", link: reactHooksSidebars[0]?.link ?? "/" },
      { text: "工具函数", link: utilsSidebars[0]?.link ?? "/" },
    ],

    sidebar: {
      "/react-components": reactComponentsSidebars,
      "/react-hooks": reactHooksSidebars,
      "/utils": [
        {
          text: "工具函数",
          items: utilsSidebars,
        },
        {
          text: "其他工具",
          items: otherUtilsSidebars,
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/wenonly/components-and-utils",
      },
    ],
  },
  rewrites: {
    // 主页
    "docs/index.md": "index.md",
    ...Object.fromEntries(rewrites.map((item) => [item.from, item.to])),
  },
  vite: {
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

// 获取目录下所有的md文件
function findMarkdownFiles(dir, fileList: string[] = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);

    if (statSync(filePath).isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (extname(file) === ".md") {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 获取sidebar配置
function getSideBar(group: DocGroup) {
  const configs = rewrites.filter((item) => item.group === group);
  const sidebarList: DefaultTheme.SidebarItem[] = [];
  allMdFilePaths.forEach((filePath) => {
    for (const config of configs) {
      const fn = match(`(.*)/${config.from}`, { decode: decodeURIComponent });
      const fromRes = fn(filePath);
      if (fromRes && config.sidebarName) {
        const fromParams = fromRes.params;
        const toPath = compile(config.to);
        const toResPath = toPath(fromParams);
        sidebarList.push({
          text: compile(config.sidebarName)(fromParams),
          link: toResPath.replace(/\.md$/, ""),
        });
        break;
      }
    }
  });
  return sidebarList;
}
