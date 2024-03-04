// 方便 mock 数据

import { v4 as uuidv4 } from "uuid";
import { omit } from "lodash-es";
import { delayMs } from "./common";

interface SearchParams extends Record<string, string | number | undefined> {
  page?: number;
  size?: number;
}

export class CrudHelper<T extends Record<string, any> = Record<string, any>> {
  storageKey: string;
  timeoutTime: number = 500;
  constructor(key: string) {
    this.storageKey = "crud-mock-" + key;
  }

  private log(type: string, value?: unknown) {
    console.log(`vvv-----${this.storageKey}:${type}----vvv`);
    console.log(value);
  }

  list(params: SearchParams) {
    const curPage = params.page ?? 1;
    const pageSize = params.size ?? 10;
    const searchParams = omit(params, ["page", "size"]);
    const searchKeys = Object.keys(searchParams).filter(
      (k) => searchParams[k] !== undefined
    );
    const dataString = localStorage.getItem(this.storageKey);
    let data: T[] = JSON.parse(dataString || "[]");
    if (searchKeys.length) {
      data = data.filter((item) =>
        searchKeys.every((key) => {
          const dataValue = String(item[key]);
          const paramsValue = String(params[key]);
          console.log(key, dataValue, paramsValue);
          return dataValue.includes(paramsValue);
        })
      );
    }
    return delayMs(this.timeoutTime).then(() => {
      const result = {
        resultList: data.slice((curPage - 1) * pageSize, curPage * pageSize),
        page: curPage,
        pageSize: pageSize,
        size: data.length,
      };
      this.log("list", result);
      return result;
    });
  }

  add(params: T) {
    const dataString = localStorage.getItem(this.storageKey);
    const data: T[] = JSON.parse(dataString || "[]");

    const item = {
      id: uuidv4(),
      ...params,
    };

    data.unshift(item);

    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.log("add", item);
    return delayMs(this.timeoutTime).then(() => item);
  }

  update(params: T) {
    const dataString = localStorage.getItem(this.storageKey);
    const data: T[] = JSON.parse(dataString || "[]");
    const updateNode = data.find((item) => item.id === params.id);
    if (updateNode) {
      Object.assign(updateNode, params);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.log("update", updateNode);
    return delayMs(this.timeoutTime).then(() => updateNode);
  }

  delete(id: string) {
    const dataString = localStorage.getItem(this.storageKey);
    const data: T[] = JSON.parse(dataString || "[]");

    const index = data.findIndex((item) => item.id === id);
    if (index !== -1) {
      data.splice(index, 1);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.log("delete", id);
    return delayMs(this.timeoutTime).then(() => true);
  }
}
