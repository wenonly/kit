declare module "config:blog" {
  const value: typeof import("./configs/blog").blogConfig;
  export default value;
}

declare namespace ThemeType {
  interface ArticleData {
    title: string;
    author: string;
    path: string;
    date: string;
    categories: string[];
    tags?: string[];
  }
}
