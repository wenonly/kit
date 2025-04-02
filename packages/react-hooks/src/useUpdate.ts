import { useMemoizedFn } from "ahooks";
import { useState } from "react";

const useUpdate = () => {
  const [updateKey, setUpdateKey] = useState(() => Math.random());

  const update = useMemoizedFn(() => {
    setUpdateKey(Math.random());
  });

  return {
    updateKey,
    update,
  };
};

export default useUpdate;
