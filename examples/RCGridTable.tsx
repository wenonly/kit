import { GridTable } from "@wenonly/react-components";
import { Card } from "antd";
import { useMemo, useState } from "react";

const data = Array(100)
  .fill(1)
  .map((_, index) => ({
    id: index,
    name: `姓名${index}`,
    age: index,
  }));

const RCGridTable = () => {
  const [pageSize, setPageSize] = useState(6);
  const [page, setPage] = useState(1);

  const dataSource = useMemo(() => {
    return data.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  }, [page]);

  return (
    <GridTable
      rowKey="id"
      gridGap={20}
      dataSource={dataSource}
      pagination={{
        pageSize: pageSize,
        current: page,
        total: data.length,
        onChange(page, pageSize) {
          setPage(page);
          setPageSize(pageSize);
        },
      }}
    >
      {(r) => (
        <Card title={r.name}>
          <div>姓名：{r.name}</div>
          <div>年龄：{r.age}</div>
        </Card>
      )}
    </GridTable>
  );
};

export default RCGridTable;
