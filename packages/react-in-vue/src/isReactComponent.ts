import React from "react";

export function isReactComponent(component: React.ComponentType) {
  // 检查组件是否是一个类组件
  const isClassComponent =
    typeof component === "function" &&
    !!component.prototype &&
    !!component.prototype.isReactComponent;

  // 检查组件是否是一个函数组件
  const isFunctionComponent =
    typeof component === "function" &&
    String(component).includes("return React.createElement");

  return isClassComponent || isFunctionComponent;
}
