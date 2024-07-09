import { compile, match } from "path-to-regexp";
import { DefaultTheme } from "vitepress";
import { allMdFilePaths } from "./allMdFilePaths";

export enum DocGroup {
  ReactComponents = "react-components",
  ReactHooks = "react-hooks",
  Utils = "utils", // packages/utils
  OtherUtils = "other-utils", // 不在packages/utils的一些包
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
];

// 获取sidebar配置
export function getSideBar(group: DocGroup) {
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
