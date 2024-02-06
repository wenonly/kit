import { defineConfig } from "rollup";
import less from "rollup-plugin-less";
import typescript from "rollup-plugin-typescript2";

const config = defineConfig({
  input: "src/index.ts",
  output: [
    {
      name: "WenReactComponents",
      dir: "lib/umd",
      format: "umd",
    },
    {
      dir: "lib/es",
      format: "es",
    },
  ],
  plugins: [
    typescript({
      // 使用 TypeScript 插件
      tsconfig: "tsconfig.json", // 指定 tsconfig.json 文件
    }),
    less({
      insert: true,
    }),
  ],
});

export default config;
