import { useAsyncTasks } from "@wenonly/react-hooks";
import { useMemoizedFn, useMount, useUpdate } from "ahooks";
import { Button, Progress, Space, Spin } from "antd";
import React from "react";

const RUseAsyncTasks = () => {
  const { tasks, loading, percent, addTask, clearTasks, runNext, runAll } =
    useAsyncTasks();
  const update = useUpdate();

  const add = useMemoizedFn(() => {
    addTask(() => {
      update();
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve("result");
          setTimeout(() => update(), 1);
        }, 1000);
      });
    });
    update();
  });

  useMount(() => {
    for (let i = 0; i < 10; i++) {
      add();
    }
  });

  return (
    <div>
      <ul>
        {tasks.current.map((item) => (
          <li key={item.id}>
            {item.id} {item.status === "running" ? <Spin /> : item.status}{" "}
            {item.result}
          </li>
        ))}
      </ul>
      <Space>
        <Button onClick={add}>addTask</Button>
        <Button loading={loading} onClick={() => runAll()}>
          runAll
        </Button>
        <Button loading={loading} onClick={() => runNext()}>
          runNext
        </Button>
        <Button onClick={() => clearTasks()}>clearTasks</Button>
      </Space>
      <Progress percent={percent} />
    </div>
  );
};

export default RUseAsyncTasks;
