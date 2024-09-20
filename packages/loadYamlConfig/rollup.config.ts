import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import copy from "rollup-plugin-copy";

const config = defineConfig({
  input: "src/index.ts",
  output: [
    {
      format: "commonjs",
      file: "lib/index.cjs",
    },
    {
      format: "es",
      file: "lib/index.js",
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
    resolve(),
    commonjs(),
    copy({
      targets: [
        {
          src: "src/types.d.ts",
          dest: "lib",
        },
      ],
    }),
  ],
});

export default config;
