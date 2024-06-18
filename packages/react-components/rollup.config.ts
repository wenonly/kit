import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import less from "rollup-plugin-less";
import postcss from "rollup-plugin-postcss";

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
    postcss(),
    less({
      insert: true,
    }),
  ],
  external: ["react", "antd"],
});

export default config;
