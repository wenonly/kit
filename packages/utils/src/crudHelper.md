# crudHelper

方便构造 crud 数据，用于开发的时候 mock 数据。

```ts
const crud = new CrudHelper("students");

const list = crud.list({ page: 1, size: 10 });

const student = crud.add({ name: "小明", age: 18 });
crud.update({ id: student.id, name: "小明", age: 18 });
crud.delete(student.id);
```
