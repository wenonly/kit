// 从树中找到对应的对象
export function findFromTree<T extends Record<string, any> = {}>(
  data: T[],
  is: (node: T) => boolean,
  childrenKey: string = "children"
): T | undefined {
  for (const item of data) {
    if (is(item)) {
      return item;
    }
    if ((item as any)[childrenKey] instanceof Array) {
      const findChildItem = findFromTree(item[childrenKey], is);
      if (findChildItem) {
        return findChildItem;
      }
    }
  }
  return undefined;
}

// 转换树结构
export function transformTree<T extends Record<string, any>, R>(
  treeData: T[],
  transform: (n: T) => R,
  sourceChildrenKey: string = "children",
  targetChildrenKey: string = "children"
): (R & Record<string, any>)[] {
  return treeData.map((node) => {
    const newNode = {
      ...transform(node),
      ...(node[sourceChildrenKey]
        ? {
            [targetChildrenKey]: transformTree(
              node[sourceChildrenKey],
              transform,
              sourceChildrenKey,
              targetChildrenKey
            ),
          }
        : {}),
    };
    return newNode;
  });
}

// 过滤树结构
export function filterTree<T extends Record<string, any>>(
  treeData: T[],
  isOk: (n: T) => boolean,
  childrenKey: string = "children"
): T[] {
  return treeData.filter((node) => {
    if (node[childrenKey]) {
      const children = filterTree(node[childrenKey], isOk, childrenKey);
      Object.assign(node, { [childrenKey]: children });
      if (children.length) {
        return isOk(node);
      }
      return children.length ? isOk(node) : false;
    } else {
      return isOk(node);
    }
  });
}

// 遍历树结构
export function forEachTree<T extends Record<string, any>>(
  treeData: T[],
  forEach: (n: T) => void,
  childrenKey: string = "children"
): void {
  treeData.forEach((node) => {
    forEach(node);
    if (node[childrenKey]) {
      forEachTree(node[childrenKey], forEach, childrenKey);
    }
  });
}
