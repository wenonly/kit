import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

const config = defineConfig({
  input: "src/index.ts",
  output: {
    format: "es",
    file: "lib/index.js",
  },
  plugins: [
    commonjs({
      include: /node_modules/,
    }),
    typescript({
      // 使用 TypeScript 插件
      tsconfig: "tsconfig.json", // 指定 tsconfig.json 文件
      declaration: true,
      declarationDir: "lib",
      include: ["src/**/*"],
    }),
    resolve(),
  ],
  external: ["react"],
});

export default config;
