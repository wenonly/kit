import JSCookie from "js-cookie";

interface StorageHandlerType {
  setItem: (name: string, value: string, options: any) => void; // 预留给 cookie配置
  getItem: (name: string) => string | undefined | null;
}

const cookieHandler: StorageHandlerType = {
  setItem: JSCookie.set,
  getItem: JSCookie.get,
};

// storage 控制器生成
export function storageControlCreator<
  T extends Record<string, string> = Record<string, string>
>(
  key: string,
  enums?: T,
  storageType: "cookie" | "localStorage" | "sessionStorage" = "localStorage"
) {
  const storageHandler: StorageHandlerType =
    storageType === "localStorage"
      ? localStorage
      : storageType === "sessionStorage"
      ? sessionStorage
      : cookieHandler;
  // enums反转
  const enumsReverse = enums
    ? Object.fromEntries(Object.entries(enums).map(([k, v]) => [v, k]))
    : undefined;

  const get = (): keyof T | undefined => {
    const value = storageHandler.getItem(key) ?? undefined;
    if (enumsReverse && value) {
      return enumsReverse[value] ?? value;
    }
    return value;
  };

  const set = (value: keyof T) => {
    if (enums?.[value]) {
      return storageHandler.setItem(key, enums[value], { expires: 500 });
    }
    return storageHandler.setItem(key, String(value), { expires: 500 });
  };

  return {
    get,
    set,
  };
}
