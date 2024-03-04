# requestHelper

## createReqeustWithLock

发起请求，同时发起多个相同请求时只会发起一次真实请求

```ts
const requestGetSteps = useMemoizedFn(
  createReqeustWithLock(async (folderCode: string, type: NodeEnum) => {
    const list = await getProcessList(folderCode);
    const processList: DefaultOptionType[] = [];
    for (const item of list) {
      const stepList = await getFlowStepsByProcess(item);
      const stepListWithType = stepList.filter(
        (step) => step.stepInfo?.type === type
      );
      if (stepListWithType?.length) {
        processList.push({
          label: (
            <>
              <BranchesOutlined style={{ marginRight: 5 }} />{" "}
              {item.processShowName}
            </>
          ),
          value: item.id,
          children: stepListWithType,
        });
      }
    }
    return processList;
  })
);
```
