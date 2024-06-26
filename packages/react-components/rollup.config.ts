import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import styles from "rollup-plugin-styles";

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
    styles({
      autoModules: true,
    }),
  ],
  external: ["react", "antd", "@ant-design/icons"],
});

export default config;
