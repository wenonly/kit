import { default as glob } from "fast-glob";
import { join } from "path";

const { globSync } = glob;

// 获取所有md文件，用于vitepress解析
export const allMdFilePaths = globSync(["**.md"], {
  cwd: join(__dirname, "../../"),
  absolute: true,
  ignore: ["**/node_modules/**", "**/dist/**"],
});
