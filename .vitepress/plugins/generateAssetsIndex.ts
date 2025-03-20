// packages/renderer/gen-assets-index-plugin.ts
import fs from "fs";
import hash from "hash-sum";
import path from "path";
import prettier from "prettier";
import { type Plugin } from "vite";

let idex = 0;

async function genIndex(options: {
  assetsDir: string;
  outputFilePath: string;
  exportName: string;
}) {
  const assetsDir = options.assetsDir;
  const outputFilePath = options.outputFilePath;
  const imports: string[] = [];
  const exports: string[] = [];

  function readFiles(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readFiles(fullPath); // 递归读取子目录
      } else {
        // 跳过 .md 和 .vue 文件
        const ext = path.extname(file);
        if (ext === ".md" || ext === ".vue" || file.includes(".git")) {
          continue;
        }
        const relativePath = path
          .relative(__dirname, fullPath)
          .replace(/\\/g, "/")
          .replace("../theme/assets", "."); // 处理路径分隔符
        const fileName = path.basename(file, path.extname(file));
        const folderName = path.basename(path.dirname(fullPath));
        let importName =
          path.dirname(fullPath) === assetsDir
            ? fileName
            : `${folderName}__${fileName}`;
        // 使用 hash-sum 生成短哈希值，添加前缀 'i' 确保变量名以字母开头
        importName = "i" + idex++ + hash(importName);

        imports.push(`import ${importName} from '${relativePath}';`);
        exports.push(importName);
      }
    }
  }

  readFiles(assetsDir);

  const tsContent =
    `// 这是自动生成的文件，请勿手动编辑\n\n` +
    imports.join("\n") +
    "\n\n" +
    `export const ${options.exportName} = { ${exports.join(", ")} };\n`;

  const prettierConfig = await prettier.resolveConfig(
    path.resolve(__dirname, ".prettierrc.json"),
  );

  const formattedContent = await prettier.format(tsContent, {
    parser: "typescript",
    ...prettierConfig,
  });

  fs.writeFileSync(outputFilePath, formattedContent);
}

function generateAssetsIndexPlugin(): Plugin {
  return {
    name: "vite-generate-assets-index",
    buildStart() {
      genIndex({
        assetsDir: path.resolve(__dirname, "../theme/assets/works"),
        outputFilePath: path.resolve(__dirname, "../theme/assets/works.ts"),
        exportName: "imagesMap",
      });
    },
    configureServer(server) {
      // Watch for changes in SVG files
      server.watcher.add("theme/assets/works/**/*");
      server.watcher.on("change", async (filePath) => {
        if (filePath.includes("theme/assets/works/")) {
          genIndex({
            assetsDir: path.resolve(__dirname, "../theme/assets/works"),
            outputFilePath: path.resolve(__dirname, "../theme/assets/works.ts"),
            exportName: "imagesMap",
          });
        }
      });
      server.watcher.on("unlink", async (filePath) => {
        if (filePath.includes("theme/assets/works/")) {
          genIndex({
            assetsDir: path.resolve(__dirname, "../theme/assets/works"),
            outputFilePath: path.resolve(__dirname, "../theme/assets/works.ts"),
            exportName: "imagesMap",
          });
        }
      });
      server.watcher.on("add", async (filePath) => {
        if (filePath.includes("theme/assets/works/")) {
          genIndex({
            assetsDir: path.resolve(__dirname, "../theme/assets/works"),
            outputFilePath: path.resolve(__dirname, "../theme/assets/works.ts"),
            exportName: "imagesMap",
          });
        }
      });
    },
  };
}

export { generateAssetsIndexPlugin };
