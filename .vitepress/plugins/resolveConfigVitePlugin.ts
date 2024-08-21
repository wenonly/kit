import { blogRewrites } from "../configs/blog";

export default function resolveConfigVitePlugin() {
  return {
    name: "vite-plugin-config-data",
    resolveId(source: string) {
      if (source.startsWith("config:")) {
        return source;
      }
      return null;
    },
    async load(id: string) {
      if (id === "config:blog") {
        try {
          return `export default ${JSON.stringify(
            blogRewrites.map((item) => ({ ...item, ...item.meta }))
          )};`;
        } catch (err: any) {
          throw new Error(`Failed: ${err.message}`);
        }
      }
      return null;
    },
  };
}
