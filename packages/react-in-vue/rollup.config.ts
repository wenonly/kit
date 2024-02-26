import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";

const config = defineConfig({
  input: "src/index.ts",
  output: [
    {
      name: "ReactInVue",
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
  ],
  external: ["react", "vue", "react-dom"],
});

export default config;
