import { DefaultTheme } from "vitepress";
import { DocGroup, rewrites, RewritesConfigItem } from "./rewrites";

/**
 * 按教程 categories 分组（如 "LangChain"）。
 * 组内按 frontmatter 的 order 升序；缺省 order 时按 postName（源文件夹名）升序。
 */
function getTutorialSideBarGroupByCategories(
  tutorialConfig: RewritesConfigItem[]
): Record<string, DefaultTheme.SidebarItem[]> {
  const sidebarMap: Record<string, DefaultTheme.SidebarItem[]> = {};
  tutorialConfig
    .slice()
    .sort((pre, nex) => {
      const preOrder = pre.meta?.order ?? pre.from;
      const nexOrder = nex.meta?.order ?? nex.from;
      if (typeof preOrder === "number" && typeof nexOrder === "number") {
        return preOrder - nexOrder;
      }
      return String(preOrder).localeCompare(String(nexOrder));
    })
    .forEach((item) => {
      if (item.meta) {
        const { sidebarName, meta } = item;
        const { categories } = meta;
        if (!categories) return;
        if (!sidebarMap[categories]) sidebarMap[categories] = [];
        sidebarMap[categories].push({
          text: sidebarName,
          link: "/" + item.to.replace(/\.md$/, ""),
        });
      }
    });
  return sidebarMap;
}

function getTutorialSidebar(
  groupMap: Record<string, DefaultTheme.SidebarItem[]>
): DefaultTheme.Sidebar {
  const sidebar: DefaultTheme.Sidebar = {};
  Object.entries(groupMap).forEach(([categories, items]) => {
    sidebar[`/tutorials/${categories}`] = items;
  });
  return sidebar;
}

function getTutorialNav(
  groupMap: Record<string, DefaultTheme.SidebarItem[]>
): DefaultTheme.NavItemWithLink[] {
  const nav: DefaultTheme.NavItemWithLink[] = [];
  Object.entries(groupMap).forEach(([categories, items]) => {
    nav.push({
      text: categories,
      link: items[0]?.link ?? "/",
      activeMatch: `^/tutorials/${categories}/`,
    });
  });
  return nav;
}

export const tutorialRewrites: RewritesConfigItem[] = rewrites.filter(
  (item) => item.group === DocGroup.Tutorial
);
const groupMap = getTutorialSideBarGroupByCategories(tutorialRewrites);
export const tutorialSideBar = getTutorialSidebar(groupMap);
export const tutorialNav = getTutorialNav(groupMap);
