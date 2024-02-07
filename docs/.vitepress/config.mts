import { defineConfig } from "vitepress";
import { join, extname } from "path";
import { readdirSync, statSync } from "fs";
import { pathToRegexp } from "path-to-regexp";

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
    // react组件
    "packages/react-components/src/components/:componentName/doc.md":
      "react-components/:componentName.md",
    // react hooks
    "packages/react-hooks/src/:hookName.md": "react-hooks/:hookName.md",
    // 工具函数
    "packages/utils/src/doc.md": "utils.md",
    "packages/utils/src/:utilName.md": "react-hooks/:utilName.md",
  },
});

function findMarkdownFiles(dir, fileList: string[] = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);

    if (statSync(filePath).isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (extname(file) === '.md') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 获取react-components目录下所有md文件的访问路径
function findReactComponentsMarkdownFiles() {
  const paths = findMarkdownFiles(join(__dirname, "../../packages/react-components/src/components"));
  const sidebarList = paths.map((path) => {
    const regexp = pathToRegexp('(.*)/packages/react-components/src/components/:componentName/doc.md');
    const match = regexp.exec(path);
    return match ? `/react-components/${match[2]}` : "";
  })
  console.log(sidebarList);
}

findReactComponentsMarkdownFiles();