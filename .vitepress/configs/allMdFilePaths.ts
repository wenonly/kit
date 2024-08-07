import { readdirSync, statSync } from "fs";
import { extname, join } from "path";

// 获取目录下所有的md文件
function findMarkdownFiles(
  dir: string,
  fileList: string[] = [],
  excludes: RegExp[] = []
) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    if (excludes.some((ex) => ex.test(filePath))) {
      return;
    }
    if (statSync(filePath).isDirectory()) {
      findMarkdownFiles(filePath, fileList, excludes);
    } else if (extname(file) === ".md") {
      fileList.push(filePath);
    }
  });

  return fileList;
}

export const allMdFilePaths = findMarkdownFiles(
  join(__dirname, "../../"),
  [],
  [/node_modules/]
);
