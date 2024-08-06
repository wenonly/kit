import { blogConfig } from "../configs/blog";

export default function resolveConfigVitePlugin() {
  return {
    name: "vite-plugin-config-data",
    resolveId(source) {
      if (source.startsWith("config:")) {
        return source;
      }
      return null;
    },
    async load(id) {
      if (id === "config:blog") {
        try {
          return `export default ${JSON.stringify(blogConfig)};`;
        } catch (err) {
          throw new Error(`Failed: ${err.message}`);
        }
      }
      return null;
    },
  };
}
