declare module "config:blog" {
  type Rewrite = typeof import("./configs/blog").blogRewrites[0];
  const value: (Rewrite & Rewrite["meta"])[];
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
