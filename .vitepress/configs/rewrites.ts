import { readFileSync } from "fs";
import grayMatter from "gray-matter";
import { compile, match } from "path-to-regexp";
import { DefaultTheme } from "vitepress";
import { allMdFilePaths } from "./files";

export enum DocGroup {
  ReactComponents = "react-components",
  ReactHooks = "react-hooks",
  Utils = "utils", // packages/utils
  OtherUtils = "other-utils", // 不在packages/utils的一些包
  Demo = "Demo",
}

export interface RewritesConfigItem {
  from: string;
  to: string;
  group?: DocGroup;
  sidebarName?: string;
}

export const rewrites: RewritesConfigItem[] = [
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
  {
    from: "examples{/:folder}*/:demoName/README.md",
    to: "show/:demoName.md",
    group: DocGroup.Demo,
    sidebarName: ":demoName",
  },
];

// 获取sidebar配置
export function getSideBar(group: DocGroup) {
  const configs = rewrites.filter((item) => item.group === group);
  const sidebarList: DefaultTheme.SidebarItem[] = [];
  allMdFilePaths.forEach((filePath) => {
    for (const config of configs) {
      const { data: frontMatter } = grayMatter(readFileSync(filePath));
      const fn = match(`(.*)/${config.from}`, { decode: decodeURIComponent });
      const fromRes = fn(filePath);
      if (fromRes && config.sidebarName) {
        const fromParams = fromRes.params;
        const toPath = compile(config.to);
        const toResPath = toPath(fromParams);
        if (frontMatter.categories) {
          let typeSidebar: DefaultTheme.SidebarItem | undefined =
            sidebarList.find((side) => side.text === frontMatter.categories);
          if (!typeSidebar) {
            typeSidebar = {
              text: frontMatter.categories,
              collapsed: false,
              items: [],
            };
            sidebarList.push(typeSidebar);
          }
          typeSidebar.items?.push({
            text: compile(config.sidebarName)(fromParams),
            link: "/" + toResPath.replace(/\.md$/, ""),
          });
        } else {
          sidebarList.push({
            text: compile(config.sidebarName)(fromParams),
            link: "/" + toResPath.replace(/\.md$/, ""),
          });
        }
        break;
      }
    }
  });
  return sidebarList;
}
