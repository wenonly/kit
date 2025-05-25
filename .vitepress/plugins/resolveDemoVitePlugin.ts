import EncHex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";
import * as fs from "fs";
import JsonpData from "jsonp-data";
import * as path from "path";
import { RollupOutput } from "rollup";
import { build, defineConfig, ResolvedConfig, normalizePath } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { Plugin } from "vitepress";

// 打包html，depFiles用于记录依赖文件
async function viteBuildHtml(input: string, depFiles: string[]) {
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
        rollupOptions: {
          input,
          output: {
            dir: path.join(
              __dirname,
              "../cache/viewer",
              sha256(input).toString(EncHex).slice(0, 16)
            ),
            format: "iife",
          },
        },
        assetsInlineLimit: Infinity
      },
    })
  )) as RollupOutput;
  const output = buildResult.output.find((item) => item.type === "asset");
  return output?.source as string | undefined;
}

export default function resolveDemoVitePlugin(): Plugin {
  let viteRootConfig: ResolvedConfig;
  let baseUrl =
    process.env.NODE_ENV === "development" ? "" : "https://wenonly.github.io";
  let depsToSourceMap: Map<string, string>; // 存入反向依赖关系，比如 /demo/index.js -> /demo/index.html
  let pathToJsonpSourceMap: Map<string, string>;
  return {
    name: "vite-plugin-demo",
    configResolved(resolvedConfig) {
      viteRootConfig = resolvedConfig;
      baseUrl = baseUrl + viteRootConfig.base;
    },
    buildStart() {
      depsToSourceMap = new Map();
      pathToJsonpSourceMap = new Map();
    },
    resolveId(source: string) {
      if (source.endsWith("?viewer")) {
        return source;
      }
      return null;
    },
    async load(id: string) {
      if (id.endsWith("html?viewer")) {
        const htmlPath = id.replace(/\?.*$/, "");
        try {
          const depFiles: string[] = [];
          const buildResult = await viteBuildHtml(htmlPath, depFiles);
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
          let curFileName = htmlPath
            .replace(normalizePath(process.cwd()), "")
            .replace(".html", "");
          curFileName = curFileName.startsWith("/")
            ? curFileName.slice(1)
            : curFileName;
          const emitJsonpPath = path.posix.join("viewer/", curFileName + ".jsonp.js");

          const viewerData = {
            // 注释这两个，因为html太大vite会正则校验报错
            html: buildResult ?? "",
            files: viewerFiles,
          };

          const jsonpSource = await JsonpData.getJsonpFromData(viewerData);
          if (process.env.NODE_ENV !== "development") {
            this.emitFile({
              type: "asset",
              fileName: emitJsonpPath,
              source: jsonpSource,
            });
          } else {
            pathToJsonpSourceMap.set(emitJsonpPath, jsonpSource);
          }
          return `export default ${JSON.stringify({
            source: baseUrl + emitJsonpPath,
          })};`;
        } catch (err: any) {
          throw new Error(`Failed: ${err.message}`);
        }
      }
      return null;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let urlWithoutBase = req.url
          ?.replace(viteRootConfig.base, "")
          .replace(/\?.*$/, "");
        urlWithoutBase = urlWithoutBase && decodeURIComponent(urlWithoutBase);
        if (urlWithoutBase && pathToJsonpSourceMap.has(urlWithoutBase)) {
          // 设置正确的 Content-Type 头部
          res.setHeader("Content-Type", "application/javascript");
          // 返回自定义的 JavaScript 内容
          res.end(pathToJsonpSourceMap.get(urlWithoutBase));
        } else {
          next();
        }
      });
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
