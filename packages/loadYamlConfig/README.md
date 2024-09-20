# load-yaml-config

加载`yaml`为配置文件，并生成对应的`.d.ts`类型声明文件。

## 安装

```shell
npm install load-yaml-config
```

## 使用

在 Node.js 中使用:

```js
import { loadYamlConfig } from "load-yaml-config";
import * as path from "path";

const configPath = path.join(__dirname, "config.yaml");
const config = loadYamlConfig(configPath);
// 生成.d.ts文件后config将会有类型提示
console.log(config);
```
