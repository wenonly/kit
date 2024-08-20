import * as fs from "fs";
import JsonpData from "jsonp-data";
import * as path from "path";
import { RollupOutput } from "rollup";
import { build, defineConfig, Plugin, ResolvedConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default function resolveDemoVitePlugin(): Plugin {
  let viteRootConfig: ResolvedConfig;
  const baseUrl = "https://wenonly.github.io/kit/";
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
                outDir: path.join(__dirname, "../cache/viewer"),
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
          const viewerFiles = depFiles.map((item) => {
            this.addWatchFile(item);
            return {
              fileName: path.basename(item),
              content: fs.readFileSync(item, "utf-8"),
              type: path.extname(item).slice(1),
            };
          });
          // 生成jsonp文件，适用于外部引用
          let jsonpPath =
            htmlPath.replace(process.cwd(), "").replace(".html", "") +
            ".jsonp.js";
          if (jsonpPath.startsWith("/")) {
            jsonpPath = jsonpPath.slice(1);
          }
          jsonpPath = "viewer/" + jsonpPath;

          const viewerData = {
            html: output?.source ?? "",
            files: viewerFiles,
            source: baseUrl + jsonpPath,
          };

          this.emitFile({
            type: "asset",
            fileName: jsonpPath,
            source: await JsonpData.getJsonpFromData(viewerData),
          });
          return `export default ${JSON.stringify(viewerData)};`;
        } catch (err: any) {
          throw new Error(`Failed: ${err.message}`);
        }
      }
      return null;
    },
  };
}
