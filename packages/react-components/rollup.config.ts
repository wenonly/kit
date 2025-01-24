import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import url from "@rollup/plugin-url";
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
      declaration: true,
      declarationDir: "lib",
      include: ["src/**/*"],
    }),
    commonjs({
      include: /node_modules/,
    }),
    resolve(),
    styles({
      autoModules: true,
    }),
    url(),
  ],
  external: [
    "react",
    "antd",
    "@ant-design/icons",
    "lottie-web",
    "@antv/x6",
    "@antv/x6-plugin-dnd",
    "@antv/x6-plugin-minimap",
    "@antv/x6-plugin-scroller",
    "@antv/x6-plugin-selection",
    "@antv/x6-react-shape",
  ],
});

export default config;
