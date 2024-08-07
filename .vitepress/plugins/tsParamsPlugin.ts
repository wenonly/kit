import fs from "fs-extra";
import path from "path";
import { InterfaceDeclaration, Project } from "ts-morph";
import { MarkdownRenderer } from "vitepress";

function escapeHtml(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/&(?![\w#]+;)/g, "&amp;");
}

interface TsParamsItem {
  key: string;
  type: string;
  description?: string;
}

function interfaceToJson(inter?: InterfaceDeclaration) {
  const tableData: TsParamsItem[] = [];
  inter?.forEachChild((node) => {
    if (node.getKindName() === "PropertySignature") {
      const prop = node as import("ts-morph").PropertySignature;
      const name = prop.getName();
      let type = prop.getType()?.getText() ?? "";
      while (/import\(.*\)./.test(type)) {
        type = type.replace(/import\(.*\)./, "");
      }
      const commentsRange = prop.getTrailingCommentRanges();
      if (commentsRange) {
        const comments = commentsRange.map((range) => range.getText());
        tableData.push({
          key: name,
          type,
          description: comments.join("\n"),
        });
      } else {
        tableData.push({
          key: name,
          type,
        });
      }
    }
  });
  return tableData;
}

function paramsToTableHtml(data: TsParamsItem[]) {
  const hasDescription = data.some((item) => item.description);
  return `<table tabindex="0">
      <thead>
        <tr>
          <th>key</th>
          <th>类型</th>
          ${hasDescription ? `<th>描述</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${data
          .map((item) => {
            return `<tr>
            <td>${escapeHtml(item.key)}</td>
            <td>${escapeHtml(item.type)}</td>
          ${
            hasDescription
              ? `<td>${escapeHtml(
                  item.description?.replace(/\/\/ ?/, "") ?? ""
                )}</td>`
              : ""
          }
          </tr>`;
          })
          .join("\n")}
      </tbody>
    </table>`;
}

/**
 * 获取ts代码片段中的参数
 * 写法：<<< @/path/to/file.ts::params:UseTreeLoadOptions
 * 其中 UseTreeLoadOptions 是需要展示为参数的interface
 */
export const tsParamsPlugin = (md: MarkdownRenderer, srcDir: string) => {
  const fence = md.renderer.rules.fence!;

  md.renderer.rules.fence = (...args) => {
    const [tokens, idx, , { includes }] = args;
    const token = tokens[idx];
    // @ts-ignore
    const [sourceSrc, regionName] = token.src ?? [];

    if (!sourceSrc || !sourceSrc.includes("::params:")) return fence(...args);
    const [_, src, paramsName] = sourceSrc.match(/^(.+)::params:(\S+)/);

    if (includes) {
      includes.push(src);
    }

    const isAFile = fs.statSync(src).isFile();
    if (!fs.existsSync(src) || !isAFile) {
      token.content = isAFile
        ? `Code snippet path not found: ${src}`
        : `Invalid code snippet option`;
      token.info = "";
      return fence(...args);
    }

    const project = new Project({
      tsConfigFilePath: path.join(__dirname, "../..", "tsconfig.json"),
    });
    const sourceFile = project.getSourceFile(src);
    const interfaces = sourceFile?.getInterfaces();
    const foundInterface = interfaces?.find(
      (intf) => intf.getName() === paramsName
    );
    const tableData = interfaceToJson(foundInterface);
    return paramsToTableHtml(tableData);
  };
};
