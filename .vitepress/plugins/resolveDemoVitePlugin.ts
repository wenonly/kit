import { createHash } from "crypto";
import * as fs from "fs";
import JsonpData from "jsonp-data";
import * as path from "path";
import { RollupOutput } from "rollup";
import { build, defineConfig, Plugin, ResolvedConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default function resolveDemoVitePlugin(): Plugin {
  let viteRootConfig: ResolvedConfig;
  const baseUrl = "https://wenonly.github.io/kit/";
  let depsToSourceMap: Map<string, string>; // 存入反向依赖关系，比如 /demo/index.js -> /demo/index.html
  return {
    name: "vite-plugin-demo",
    configResolved(resolvedConfig) {
      viteRootConfig = resolvedConfig;
    },
    buildStart() {
      depsToSourceMap = new Map();
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
                    if (!id.includes("node_modules") && !id.includes("\x00")) {
                      depFiles.push(id);
                    }
                  },
                },
              ],
              build: {
                outDir: path.join(
                  __dirname,
                  "../cache/viewer",
                  createHash("sha256")
                    .update(htmlPath)
                    .digest("hex")
                    .substring(0, 8)
                ),
                rollupOptions: {
                  input: htmlPath,
                },
              },
            })
          )) as RollupOutput;
          const output = buildResult.output.find(
            (item) => item.type === "asset"
          );
          const viewerFiles = depFiles.map((item) => {
            this.addWatchFile(item);
            depsToSourceMap.set(item, id);
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

          if (process.env.NODE_ENV !== "development") {
            this.emitFile({
              type: "asset",
              fileName: jsonpPath,
              source: await JsonpData.getJsonpFromData(viewerData),
            });
          }
          return `export default ${JSON.stringify(viewerData)};`;
        } catch (err: any) {
          throw new Error(`Failed: ${err.message}`);
        }
      }
      return null;
    },
    handleHotUpdate({ file, server }) {
      if (depsToSourceMap.has(file)) {
        // 触发更新指定的文件
        const module = server.moduleGraph.getModuleById(
          depsToSourceMap.get(file)!
        );
        if (module) {
          server.moduleGraph.invalidateModule(module);
          server.ws.send({
            type: "full-reload",
            path: "*",
          });
        }
      }
    },
  };
}
