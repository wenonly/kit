---
title: 使用rollup和typescript搭建自己的函数库
categories: 前端
date: 2020-12-02 15:15:59
tags:
- npm
- rollup
---

##  简介

每当在项目中需要使用一些工具函数时，一般需要去引入一些第三方的工具库，而像lodash这样的工具库又体积很大，影响打包后整个项目的大小。所以封装自己的代码库就很必要了。

本篇文章将介绍如何使用`rollup`工具生成自己的代码库；
为了提高代码可维护性，将使用`typescript`编写代码；
为了保证代码质量，将通过`jest`进行代码测试;
工具库需要可查阅的文档，为了更好的支持`typescript`，使用了`typedoc`生成文档。

<!-- more -->

## 依赖的库

- [rollup](https://www.rollupjs.com/ "rollup")  是一个 JavaScript 模块打包器，可以将小块代码编译成大块复杂的代码，例如 library 或应用程序。
- [typescript](https://www.tslang.cn/ "typescript")  javascript的超集，支持类型定义。
- [typedoc](https://typedoc.org/ "typedoc") 生成库文档
- [jest](https://jestjs.io/ "jest") 用于代码单元测试

## 初始化项目

- 先创建目录并初始化node项目。
```shell
mkdir myTools
cd myTools
npm init -y
```
- 安装`rollup`
```shell
npm install rollup -D
```
- 先创建`modules`目录，然后再在目录中创建入口文件`index.js`
- 之后创建`rollup.config.js`，配置如下：
```javascript
export default {
  input: "modules/index.js",
  output: [
    {
      file: "lib/bundle.cjs.js",
      format: "cjs",
    },
    {
      file: "lib/bundle.esm.js",
      format: "es",
    },
  ],
};
```
配置地址：[https://www.rollupjs.com/guide/big-list-of-options/](https://www.rollupjs.com/guide/big-list-of-options/ "https://www.rollupjs.com/guide/big-list-of-options/")
```
amd – 异步模块定义，用于像RequireJS这样的模块加载器
cjs – CommonJS，适用于 Node 和 Browserify/Webpack
esm – 将软件包保存为 ES 模块文件，在现代浏览器中可以通过 <script type=module> 标签引入
iife – 一个自动执行的功能，适合作为<script>标签。（如果要为应用程序创建一个捆绑包，您可能想要使用它，因为它会使文件大小变小。）
umd – 通用模块定义，以amd，cjs 和 iife 为一体
system - SystemJS 加载器格式
```
- 然后在package.json文件中加入运行命令
```json
{
    ...
    "scripts": {
        "build": "rollup --config"
    },
	...
}
```
- 执行命令`npm run build`将自动打包代码到`lib`目录。

## 添加typescript支持

- 安装支持库
```
npm install typescript rollup-plugin-typescript tslib -D
```
- 修改`rollup.config.js`配置，添加`typescipt`插件
```
import typescript from "rollup-plugin-typescript";
export default {
  input: "modules/index.ts",
  output: [
    {
      file: "lib/bundle.cjs.js",
      format: "cjs",
    },
    {
      file: "lib/bundle.esm.js",
      format: "es",
    },
  ],
  plugins: [
    typescript({
      exclude: "node_modules/**",
      typescript: require("typescript"),
    }),
  ],
};
```
- 将`modules/index.js`入口文件修改为`modules/index.ts`

## jest测试

接下来需要配置项目支持jest测试，保证代码正确性。

- 先安装jest支持
```
npm install --save-dev jest ts-jest @types/jest
```
- 在根目录创建`jest.config.js`文件
```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
};
```
- 在`modules/index.ts`写如下代码，导出版本。
```javascript
export const version: string = "1.0.0";
```
- 创建`test`目录，并添加`index.spec.ts`测试文件，内容如下：
```javascript
import { version } from "../modules/index";
test("当前项目版本为 1.0.0", () => {
  expect(version).toBe("1.0.0");
});
```
- 接下来添加运行命令，在`package.json`中添加：
```javascript
"test": "jest --no-cache"
```
- 然后运行`npm run test`命令进行测试，[jest](https://jestjs.io/ "jest")语法详情见官网。

## 文档生成

- 安装`typedoc`依赖
```
npm install typedoc -D
```
- 创建`typedoc.json`配置文件
```json
{
    "inputFiles": ["./modules"],
    "mode": "modules",
    "out": "docs",
    "exclude": "modules/index.ts"
}
```
- 编写注释
编写注释的方法在这里：[typedoc](https://typedoc.org/guides/doccomments/ "typedoc")

在`modules/index.ts`中编写文档注释
```javascript
/**
 * 当前函数库版本
 */
export const version: string = "1.0.0";
```
- 在`package.json`中添加生成文档的命令
```javascript
"doc": "typedoc --options typedoc.json"
```
- 运行`npm run doc`命令生成文档，文档将生成在`docs`目录，可以通过`gitpage`展示文档。

## 入口编写

项目结构搭建好后，就可以添加自己的工具函数，为了在单个js文件中导出，需要将所有函数通过`index.ts`导出。
这里我在`modules`目录中编写了4个工具函数，分别是`clone`、`cloneDeep`、`debounce`、`throttle`。
我需要在`index.ts`中将所有函数导出，如下：
```javascript
// functoin
export { default as debounce } from "./debounce";
export { default as throttle } from "./throttle";
export { default as clone } from "./clone";
export { default as cloneDeep } from "./cloneDeep";
```
这样就能通过`import { cloneDeep } from "myTools"`引入函数了。

我的函数库在这里[https://github.com/wenonly/tutils](https://github.com/wenonly/tutils "https://github.com/wenonly/tutils")


