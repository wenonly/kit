import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const config = defineConfig({
  input: "src/index.ts",
  output: {
    dir: "lib",
    format: "es",
  },
  plugins: [
    typescript({
      // 使用 TypeScript 插件
      tsconfig: "tsconfig.json", // 指定 tsconfig.json 文件
    }),
    commonjs({
      include: /node_modules/,
    }),
    resolve(),
  ],
  external: ["react", "ahooks"],
});

export default config;
