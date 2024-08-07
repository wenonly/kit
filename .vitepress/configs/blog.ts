import dayjs from "dayjs";
import { readFileSync } from "fs";
import grayMatter from "gray-matter";
import { compile, match } from "path-to-regexp";
import { DefaultTheme } from "vitepress";
import { allMdFilePaths } from "./allMdFilePaths";
import { RewritesConfigItem } from "./rewrites";

interface BlogRewritesConfigItem extends RewritesConfigItem {
  postName: string;
  title: string;
  date: string;
  year: number;
  categories: string;
  tags?: string[];
}

const config: RewritesConfigItem = {
  from: "posts{/:folder}*/:postName/README.md",
  to: "posts/:categories/:year/:title.md",
  sidebarName: ":title",
};

export function generateBlogConfig() {
  const rewrites: BlogRewritesConfigItem[] = [];
  allMdFilePaths.forEach((filePath) => {
    const fn = match(`(.*)/${config.from}`, { decode: decodeURIComponent });
    const fromRes = fn(filePath);
    if (fromRes && config.sidebarName) {
      const { data: frontMatter } = grayMatter(readFileSync(filePath));
      const requiredKeys = ["title", "date", "categories"];
      if (!frontMatter) {
        throw new Error(`${filePath}缺少frontMatter`);
      }
      for (const key of requiredKeys) {
        if (!frontMatter[key]) {
          throw new Error(`${filePath}缺少必要字段${key}`);
        }
      }
      const fromParams = fromRes.params as { postName: string };
      const toPath = compile(config.to);
      const mergedParams = {
        ...fromParams,
        ...frontMatter,
        year: dayjs(frontMatter.date).year(),
      };
      const toResPath = toPath(mergedParams);
      rewrites.push({
        from: compile(config.from)(mergedParams),
        to: toResPath,
        sidebarName: compile(config.sidebarName)(mergedParams),
        postName: fromParams.postName,
        title: frontMatter.title,
        categories: frontMatter.categories,
        date: frontMatter.date,
        year: mergedParams.year,
        tags: frontMatter.tags,
      });
    }
  });
  return rewrites;
}

/**
 * 按照时间和分类进行分组
 * {
 *   "react-hooks": { "YYYY-MM": [] }
 * }
 */
function getSideBarGroupByCategoriesAndMonth(
  blogsConfig: BlogRewritesConfigItem[]
) {
  const sidebarMap: Record<
    string,
    Record<string, DefaultTheme.SidebarItem[]>
  > = {};
  blogsConfig
    .sort((pre, nex) => dayjs(nex.date).valueOf() - dayjs(pre.date).valueOf())
    .forEach((item) => {
      const { categories, year, sidebarName } = item;
      if (!sidebarMap[categories]) sidebarMap[categories] = {};
      if (!sidebarMap[categories][year]) sidebarMap[categories][year] = [];
      sidebarMap[categories][year].push({
        text: sidebarName,
        link: "/" + item.to.replace(/\.md$/, ""),
      });
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

export const blogConfig = generateBlogConfig();
const groupMap = getSideBarGroupByCategoriesAndMonth(blogConfig);
export const blogRewrites = Object.fromEntries(
  blogConfig.map((item) => [item.from, item.to])
);
export const blogSideBar = getBlogSidebar(groupMap);
export const blogNav = getBlogNav(groupMap);
