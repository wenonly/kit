import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

const config = defineConfig({
  input: "src/index.ts",
  output: [
    {
      name: "ReactInVue",
      dir: "lib",
      format: "umd",
      globals: {
        vue: "Vue",
        react: "React",
        "react-dom/client": "ReactDOM", // 注意这里使用引号，因为模块名包含斜杠
      },
    },
    {
      format: "es",
      file: "lib/index.mjs",
    },
  ],
  plugins: [
    typescript({
      // 使用 TypeScript 插件
      tsconfig: "tsconfig.json", // 指定 tsconfig.json 文件
      declaration: true,
      declarationDir: "lib",
      include: ["src/**/*"],
    }),
  ],
  external: ["react", "vue", "react-dom/client"],
});

export default config;
