import dayjs from "dayjs";
import { DefaultTheme } from "vitepress";
import { DocGroup, rewrites, RewritesConfigItem } from "./rewrites";

/**
 * 按照时间和分类进行分组
 * {
 *   "react-hooks": { "YYYY-MM": [] }
 * }
 */
function getSideBarGroupByCategoriesAndMonth(
  blogsConfig: RewritesConfigItem[]
) {
  const sidebarMap: Record<
    string,
    Record<string, DefaultTheme.SidebarItem[]>
  > = {};
  blogsConfig
    .sort(
      (pre, nex) =>
        dayjs(nex.meta?.date).valueOf() - dayjs(pre.meta?.date).valueOf()
    )
    .forEach((item) => {
      if (item.meta) {
        const { sidebarName, meta } = item;
        const { categories, year } = meta;
        if (!sidebarMap[categories]) sidebarMap[categories] = {};
        if (!sidebarMap[categories][year]) sidebarMap[categories][year] = [];
        sidebarMap[categories][year].push({
          text: sidebarName,
          link: "/" + item.to.replace(/\.md$/, ""),
        });
      }
    });
  return sidebarMap;
}

function getBlogSidebar(
  groupMap: Record<string, Record<string, DefaultTheme.SidebarItem[]>>
): DefaultTheme.Sidebar {
  const sidebar: DefaultTheme.Sidebar = {};
  Object.entries(groupMap).forEach(([categories, yearMap]) => {
    const categoriesSidebar: DefaultTheme.SidebarItem[] = [];
    Object.entries(yearMap)
      .sort((pre, nex) => Number(nex[0]) - Number(pre[0]))
      .forEach(([year, sidebarItems]) => {
        categoriesSidebar.push({
          text: `${year}年（${sidebarItems.length}篇）`,
          items: sidebarItems,
        });
      });
    sidebar[`/posts/${categories}`] = categoriesSidebar;
  });
  return sidebar;
}

function getBlogNav(
  groupMap: Record<string, Record<string, DefaultTheme.SidebarItem[]>>
) {
  const nav: DefaultTheme.NavItemWithLink[] = [];
  Object.entries(groupMap).forEach(([categories, yearMap]) => {
    nav.push({
      text: categories,
      link:
        Object.entries(yearMap).sort(
          (pre, nex) => Number(nex[0]) - Number(pre[0])
        )[0][1][0].link || "/",
      activeMatch: `^/posts/${categories}/`,
    });
  });
  return nav;
}

export const blogRewrites: RewritesConfigItem[] = rewrites
  .filter((item) => item.group === DocGroup.Blog)
const groupMap = getSideBarGroupByCategoriesAndMonth(blogRewrites);
export const blogSideBar = getBlogSidebar(groupMap);
export const blogNav = getBlogNav(groupMap);
