import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";

const config = defineConfig({
  input: "src/index.ts",
  output: [
    {
      name: "WenUtils",
      dir: "lib",
      format: "umd",
      globals: {
        react: "React",
      },
    },
    {
      format: "es",
      file: "lib/index.mjs",
    },
  ],
  plugins: [
    commonjs({
      include: /node_modules/,
    }),
    typescript({
      // 使用 TypeScript 插件
      tsconfig: "tsconfig.json", // 指定 tsconfig.json 文件
    }),
    resolve(),
  ],
  external: ["react"],
});

export default config;
