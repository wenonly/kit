import dayjs from "dayjs";
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
  Blog = "blog",
}

export interface RewritesConfigItem {
  from: string;
  to: string;
  group?: DocGroup;
  sidebarName?: string;
  meta?: Record<string, any>;
}

const rewritesConfig: RewritesConfigItem[] = [
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
    to: "show/:categories/:title.md",
    group: DocGroup.Demo,
    sidebarName: ":title",
  },
  {
    from: "posts{/:folder}*/:postName/README.md",
    to: "posts/:categories/:year/:title.md",
    sidebarName: ":title",
    group: DocGroup.Blog,
  },
];

// 根据配置生成完全的rewrites，会解析markdown中的frontMatter
function generateFullRewrites() {
  const rewrites: RewritesConfigItem[] = [];
  rewritesConfig.forEach((config) => {
    allMdFilePaths.forEach((filePath) => {
      const fn = match(`(.*)/${config.from}`, { decode: decodeURIComponent });
      const fromRes = fn(filePath);
      if (fromRes && config.sidebarName) {
        const { data: frontMatter } = grayMatter(readFileSync(filePath));
        const fromParams = fromRes.params as { postName: string };
        const toPath = compile(config.to);
        const mergedParams = {
          ...fromParams,
          ...frontMatter,
          ...(frontMatter.date
            ? {
                year: dayjs(frontMatter.date).year(), // blog分类需要
              }
            : {}),
        };
        const toResPath = toPath(mergedParams);
        rewrites.push({
          from: compile(config.from)(mergedParams),
          to: toResPath,
          sidebarName: compile(config.sidebarName)(mergedParams),
          group: config.group,
          meta: mergedParams,
        });
      }
    });
  });
  return rewrites;
}

// 获取sidebar配置
export function getSideBar(group: DocGroup) {
  const configs = rewrites.filter((item) => item.group === group);
  const sidebarList: DefaultTheme.SidebarItem[] = [];
  for (const config of configs) {
    // 如果配置了categories，就会分类，没有的话flat
    if (config.meta?.categories) {
      let typeSidebar: DefaultTheme.SidebarItem | undefined = sidebarList.find(
        (side) => side.text === config.meta?.categories
      );
      if (!typeSidebar) {
        typeSidebar = {
          text: config.meta.categories,
          collapsed: false,
          items: [],
        };
        sidebarList.push(typeSidebar);
      }
      typeSidebar.items?.push({
        text: config.sidebarName,
        link: "/" + config.to.replace(/\.md$/, ""),
      });
    } else {
      sidebarList.push({
        text: config.sidebarName,
        link: "/" + config.to.replace(/\.md$/, ""),
      });
    }
  }
  return sidebarList;
}

export const rewrites = generateFullRewrites();
