import { load } from "js-yaml";
import * as fs from "fs";
import json2ts from "@wenonly/json2ts";
import * as path from "path";

interface LoadYamlConfigOptions {
  declaration?: boolean;
  declarationDir?: string;
  generateFactory?: (tsContent: string) => void;
}
export function loadYamlConfig(
  filePath: string,
  options?: LoadYamlConfigOptions
) {
  if (!filePath.endsWith(".yaml")) {
    throw new Error("not a yaml file");
  }
  const optionsResult = {
    declaration: true,
    generateFactory: (tsContent: string) => {
      const baseName = path.basename(filePath).replace(".yaml", "");
      const pathDir = optionsResult.declarationDir
        ? optionsResult.declarationDir
        : path.dirname(filePath);
      fs.writeFileSync(path.join(pathDir, `${baseName}.d.ts`), tsContent);
    },
    ...options,
  };
  const config = load(fs.readFileSync(filePath, "utf8"));
  if (optionsResult.declaration) {
    let result = json2ts.convert(JSON.stringify(config));
    result = result.replace(
      "export interface RootObject",
      "interface YamlConfig"
    );
    optionsResult.generateFactory(result);
  }
  return config as YamlConfig;
}
