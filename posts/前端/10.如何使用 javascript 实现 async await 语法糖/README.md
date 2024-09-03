---
title: 如何使用 javascript 实现 async await 语法糖
categories: 前端笔记
date: 2024-09-03 09:39
tags:
- generator
- async
---

## 使用 javascript 如何实现 async await

async/await 是 ES2017（ES8）引入的 JavaScript 语法糖，用于简化异步操作的书写。它使得异步代码看起来像同步代码，提高了代码的可读性。
之前遇到面试官问 `如何使用 javascript 实现 async await?`，所以考虑了下如何实现。

## 使用 generator 实现

实现一个 async 函数，传入一个 generator，返回一个promise，递归调用 generator next。
```js
function async(gen) {
  const g = gen();
  return new Promise((resolve, reject) => {
    function setup(promi) {
      promi
        .then((value) => {
          const v = g.next(value);
          if (v.done) resolve(v.value);
          else setup(Promise.resolve(v.value));
        })
        .catch(reject);
    }
    const v = g.next();
    setup(Promise.resolve(v.value));
  });
}
```

## 使用 async 函数

```js
function call(num, wait = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(num);
    }, wait);
  });
}

function* gen() {
  let num = yield call(1, 1000);
  console.log(num);
  num = yield call(2, 2000);
  console.log(num);
  num = yield call(3, 3000);
  console.log(num);
  return num;
}


async(gen).then(console.log);
```