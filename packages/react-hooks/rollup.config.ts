import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";

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
  onwarn(warning, warn) {
    // 移除 use client 警告
    if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
      return;
    }
    warn(warning);
  },
});

export default config;
