import { build, defineConfig, Plugin, ResolvedConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { RollupOutput } from "rollup";
import * as path from "path";
import * as fs from "fs";

let viteRootConfig: ResolvedConfig;

export default function resolveDemoVitePlugin(): Plugin {
  return {
    name: "vite-plugin-demo",
    configResolved(resolvedConfig) {
      viteRootConfig = resolvedConfig;
    },
    resolveId(source: string) {
      if (source.endsWith("?viewer")) {
        return source;
      }
      return null;
    },
    async load(id: string) {
      if (id.endsWith("html?viewer")) {
        const htmlPath = id.replace("?viewer", "");
        try {
          const depFiles: string[] = [];
          const buildResult = (await build(
            defineConfig({
              plugins: [
                viteSingleFile(),
                {
                  name: "vite-plugin-resolve-files",
                  load(id) {
                    // 纪录有哪些文件
                    if (!id.includes("node_modules")) {
                      depFiles.push(id);
                    }
                  },
                },
              ],
              build: {
                rollupOptions: {
                  input: htmlPath,
                },
              },
            })
          )) as RollupOutput;
          const output = buildResult.output.find(
            (item) => item.type === "asset"
          );
          // console.log(output)
          // process.exit()
          const viewerFiles = depFiles.map((item) => ({
            fileName: path.basename(item),
            content: fs.readFileSync(item, "utf-8"),
            type: path.extname(item).slice(1),
          }));
          const viewerData = {
            html: output?.source ?? "",
            files: viewerFiles,
          };
          return `export default ${JSON.stringify(viewerData)};`;
        } catch (err: any) {
          throw new Error(`Failed: ${err.message}`);
        }
      }
      return null;
    },
  };
}
