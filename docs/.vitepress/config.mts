import { readdirSync, statSync } from "fs";
import { extname, join } from "path";
import { compile, match } from "path-to-regexp";
import { defineConfig } from "vitepress";
import type { DefaultTheme } from "vitepress/types/default-theme";

enum DocGroup {
  ReactComponents = "/react-components",
  ReactHooks = "/react-hooks",
  Utils = "/utils",
}

interface RewritesConfigItem {
  from: string;
  to: string;
  group?: DocGroup;
}

const rewrites: RewritesConfigItem[] = [
  {
    from: "(.*)/packages/react-components/src/components/:componentName/doc.md",
    to: "/react-components/:componentName.md",
    group: DocGroup.ReactComponents,
  },
  {
    from: "(.*)/packages/react-hooks/src/:hookName.md",
    to: "/react-hooks/:hookName.md",
    group: DocGroup.ReactHooks,
  },
  {
    from: "(.*)/packages/utils/src/doc.md",
    to: "/utils.md",
    group: DocGroup.Utils,
  },
  {
    from: "(.*)/packages/utils/src/:utilName.md",
    to: "/utils/:utilName.md",
    group: DocGroup.Utils,
  },
];

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Components And Utils",
  description: "A doc web with components, utils and hooks",
  srcDir: "../",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "React组件", link: "/react-components/XgPlayer" },
      { text: "React Hooks", link: "/react-hooks/useRefData" },
      { text: "工具函数", link: "/utils" },
    ],

    sidebar: {
      "/react-components/": [
        {
          text: "Examples",
          items: [
            { text: "Markdown Examples", link: "/markdown-examples" },
            { text: "Runtime API Examples", link: "/api-examples" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
  rewrites: {
    // 主页
    "docs/index.md": "index.md",
    ...Object.fromEntries(rewrites.map((item) => [item.from, item.to])),
  },
});

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

const allMdFilePaths = findMarkdownFiles(join(__dirname, "../../packages"));

function getSideBar(group: DocGroup) {
  const configs = rewrites.filter((item) => item.group === group);
  const sidebarList: DefaultTheme.SidebarItem[] = [];
  allMdFilePaths.forEach((filePath) => {
    for (const config of configs) {
      const fn = match(config.from, { decode: decodeURIComponent });
      const result = fn(filePath);
      if (result) {
        const params = result.params;
        const toPath = compile(config.to);
        const resPath = toPath(params);
        sidebarList.push({
          text: resPath.match(/.*\/(.*?).md/)?.[1] ?? "index",
          link: resPath.replace(/\.md$/, ""),
        });
        break;
      }
    }
  });
  console.log(sidebarList);
  return sidebarList;
}

getSideBar(DocGroup.ReactComponents);
