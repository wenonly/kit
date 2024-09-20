import { loadYamlConfig } from "load-yaml-config";
import * as path from "path";

const configPath = path.join(__dirname, "config.yaml");
const config = loadYamlConfig(configPath);
console.log(config);