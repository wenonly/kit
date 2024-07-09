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
  month: number;
  year: number;
  categories: string;
  tags?: string[];
}

const config: RewritesConfigItem = {
  from: "posts/:postName/README.md",
  to: "posts/:categories/:year-:month/:title.md",
  sidebarName: ":title",
};

export function generateBlogsRewritesData() {
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
        month: dayjs(frontMatter.date).month(),
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
        month: mergedParams.month,
        year: mergedParams.year,
        tags: frontMatter.tags,
      });
    }
  });
  return rewrites;
}

export const blogsConfig = generateBlogsRewritesData();

export function getBlogsSidebar(): DefaultTheme.SidebarItem[] {
  const sidebar: DefaultTheme.SidebarItem[] = [];
  blogsConfig.forEach((item) => {
    const { from, to, sidebarName } = item;
    sidebar.push({ text: sidebarName, link: to.replace(/\.md$/, "") });
  });
  return sidebar;
}
