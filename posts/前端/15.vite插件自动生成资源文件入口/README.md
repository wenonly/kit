---
title: Vite 插件自动生成资源文件入口
date: 2025-03-13 13:35
categories: 前端笔记
tags:
  - vite
---

## Vite 插件概述

在前端开发中，管理和引用静态资源文件是一个常见的需求。为了简化这一过程，我实现了一个 Vite 插件，用于自动生成资源文件的入口 TypeScript 文件。该插件会扫描指定目录下的所有资源文件，并生成一个包含所有资源的导出对象。

## 插件实现

以下是插件的核心代码：

```typescript
// packages/renderer/gen-assets-index-plugin.ts
import fs from 'fs';
import path from 'path';
import { type Plugin } from 'vite';

function genIndex(options: { assetsDir: string; outputFilePath: string; exportName: string }) {
  const assetsDir = options.assetsDir;
  const outputFilePath = options.outputFilePath;
  const imports: string[] = [];
  const exports: string[] = [];

  function readFiles(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readFiles(fullPath); // 递归读取子目录
      } else {
        const relativePath = path
          .relative(__dirname, fullPath)
          .replace(/\\/g, '/')
          .replace('src/', '@/'); // 处理路径分隔符
        const fileName = path.basename(file, path.extname(file));
        const folderName = path.basename(path.dirname(fullPath));
        let importName =
          path.dirname(fullPath) === assetsDir ? fileName : `${folderName}__${fileName}`;
        importName = importName.replace(/-/g, '_');

        imports.push(`import ${importName} from '${relativePath}';`);
        exports.push(importName);
      }
    }
  }

  readFiles(assetsDir);

  const tsContent =
    `// 这是自动生成的文件，请勿手动编辑\n\n` +
    imports.join('\n') +
    '\n\n' +
    `export const ${options.exportName} = { ${exports.join(', ')} };\n`;

  fs.writeFileSync(outputFilePath, tsContent);
}

function GenerateAssetsIndexPlugin(): Plugin {
  return {
    name: 'vite-generate-assets-index',
    buildStart() {
      genIndex({
        assetsDir: path.resolve(__dirname, 'src/assets/imgs'),
        outputFilePath: path.resolve(__dirname, 'src/assets/imgs.ts'),
        exportName: 'imagesMap',
      });
    },
    configureServer(server) {
      // Watch for changes in SVG files
      server.watcher.add('assets/imgs/**/*');
      server.watcher.on('change', async (filePath) => {
        if (filePath.includes('assets/imgs/')) {
          genIndex({
            assetsDir: path.resolve(__dirname, 'src/assets/imgs'),
            outputFilePath: path.resolve(__dirname, 'src/assets/imgs.ts'),
            exportName: 'imagesMap',
          });
        }
      });
    },
  };
}

export { GenerateAssetsIndexPlugin };
```

## 使用方法

1. 将插件添加到 Vite 配置中。
2. 在构建开始时，插件会自动生成资源文件的入口文件。
3. 监视资源文件的变化，自动更新入口文件。

## 总结

这个 Vite 插件极大地简化了资源文件的管理，使得在项目中引用静态资源变得更加方便。希望这个插件能对你的前端开发工作有所帮助！

