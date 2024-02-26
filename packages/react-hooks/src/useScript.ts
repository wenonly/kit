import { loadJs } from "@wenonly/utils";
import { useMount } from "ahooks";
import { useState } from "react";
import useRefData from "./useRefData";

interface UseScriptOptions {
  js?: Partial<HTMLScriptElement>;
  onReady?: () => void | Promise<void>;
  onError?: () => void;
}

// 只会加载一次，不会删除
export default (path: string, options: UseScriptOptions) => {
  const [loading, setLoading] = useState(false);
  const optionsRef = useRefData(() => options);

  useMount(() => {
    setLoading(true);

    loadJs(path, optionsRef.current.js)
      .then(async () => {
        await optionsRef.current.onReady?.();
        setLoading(false);
      })
      .catch(async () => {
        optionsRef.current.onError?.();
        setLoading(false);
      });
  });

  return { loading };
};
