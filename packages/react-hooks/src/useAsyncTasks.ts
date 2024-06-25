import { delayMs } from "@wenonly/utils";
import { useMemoizedFn } from "ahooks";
import { useRef, useState } from "react";

export interface Task {
  id: number;
  task: () => Promise<any>;
  status: "pending" | "running" | "success" | "error";
  error?: any;
  result?: any;
}

interface UseAsyncTasksOptions {
  delay?: number; // 每个请求间隔时间
}

let idx = 0;
// 连续执行异步任务
export default (options: UseAsyncTasksOptions = {}) => {
  const tasks = useRef<Task[]>([]);
  const index = useRef<number>(-1);
  const [percent, setPercent] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const addTask = useMemoizedFn((task: () => Promise<any>) => {
    tasks.current.push({
      id: idx++,
      task,
      status: "pending",
    });
  });

  const runNext = useMemoizedFn(() => {
    if (index.current < tasks.current.length - 1) {
      index.current += 1;
      const task = tasks.current[index.current];
      task.status = "running";
      return task
        .task()
        .then((result) => {
          task.status = "success";
          task.result = result;
        })
        .catch((error) => {
          task.status = "error";
          task.error = error;
        })
        .finally(() => {
          if (tasks.current.length > 0) {
            setPercent(
              Math.ceil(((index.current + 1) / tasks.current.length) * 100)
            );
          }
        });
    }
  });

  const runAll: () => Promise<Task[]> = useMemoizedFn(() => {
    const next = runNext();
    if (next) {
      setLoading(true);
      return next.then(() => {
        return delayMs(options.delay ?? 500).then(() => {
          return runAll();
        });
      });
    } else {
      setLoading(false);
      return Promise.resolve(tasks.current);
    }
  });

  const clearTasks = useMemoizedFn(() => {
    tasks.current = [];
    index.current = -1;
    setPercent(0);
  });

  return {
    loading,
    percent,
    tasks,
    addTask,
    runNext,
    runAll,
    clearTasks,
  };
};
