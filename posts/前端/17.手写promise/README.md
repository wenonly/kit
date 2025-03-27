---
title: 手写Promise
date: 2025-03-27 15:16
categories: 前端笔记
tags:
  - promise
  - 手写
  - js
  - 面试题
---

现阶段正在复习前端面试题，手写promise是其中比较经典的一道题目。这里记录一下手写promise的过程。

## 第一阶段：基本骨架（同步版）

需要关注的点：

1. promise的三种状态：pending、fulfilled、rejected
2. promise的状态只能从pending到fulfilled或rejected，不能逆向
3. promise需要有value和reason属性来保存成功和失败的值

```js
class MyPromise {
  constructor(executor) {
    this.status = "pending";
    this.value = undefined;
    this.reason = undefined;

    const resolve = (value) => {
      if (this.status === "pending") {
        this.value = value;
        this.status = "fulfilled";
      }
    };

    const reject = (reason) => {
      if (this.status === "pending") {
        this.reason = reason;
        this.status = "rejected";
      }
    };

    executor(resolve, reject);
  }

  then(onFulfilled, onRejected) {
    if (this.status === "fulfilled") {
      onFulfilled(this.value);
    }
    if (this.status === "rejected") {
      onRejected(this.reason);
    }
  }

  catch(onRejected) {
    if (this.status === "rejected") {
      onRejected(this.reason);
    }
  }
}

// 测试用例
const p = new MyPromise((resolve) => {
  resolve("success!");
});
p.then((res) => console.log(res)); // 输出 success
```

关键记忆点：

- Promise 有且仅有三个状态
- resolve/reject 只能改变状态一次
- executor 立即执行，错误会被捕获

第一阶段主要是保存状态和值，然后通过`then`方法和`catch`方法来获取值。这个过程是同步进行的，所以promise中直接resolve了结果，没有任何异步操作。如果存在异步操作，那么`then`方法和`catch`方法执行的时候promise的结果还没有生成，所以接下来要解决异步问题。

## 第二阶段：异步版

上面已经实现了一个同步版本的promise，在执行then的时候传入的回调函数会立即执行，这显然就是关键点，想要实现异步，那么`then`和`catch`方法中传入的回调函数就不能立即执行，而是等到promise的状态改变之后再执行。为了实现这个效果，可以先把传入的回调函数保存起来，在需要的时候再执行。

```js
class MyPromise {
  constructor(executor) {
    this.status = "pending";
    this.value = undefined;
    this.reason = undefined;

    // 加入回调函数存储的位置
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status === "pending") {
        this.value = value;
        this.status = "fulfilled";
        // 使用setTimeout来模拟异步，这样在同步调用resolve的时候，会先执行then方法记录回调队列，然后再执行回调队列
        setTimeout(() => {
          // 执行回调函数
          this.onFulfilledCallbacks.forEach((fn) => fn());
        }, 0);
      }
    };

    const reject = (reason) => {
      if (this.status === "pending") {
        this.reason = reason;
        this.status = "rejected";
        setTimeout(() => {
          // 执行回调函数
          this.onRejectedCallbacks.forEach((fn) => fn());
        }, 0);
      }
    };

    executor(resolve, reject);
  }

  then(onFulfilled, onRejected) {
    if (this.status === "pending") {
      // 不再直接执行，而是保存到回调函数数组中
      this.onFulfilledCallbacks.push(() => {
        onFulfilled(this.value);
      });
      this.onRejectedCallbacks.push(() => {
        onRejected(this.reason);
      });
    }
  }

  catch(onRejected) {
    if (this.status === "pending") {
      // 不再直接执行，而是保存到回调函数数组中
      this.onRejectedCallbacks.push(() => {
        onRejected(this.reason);
      });
    }
  }
}

// 测试用例
const p = new MyPromise((resolve) => {
  setTimeout(() => {
    resolve("success!");
  }, 1000);
});
p.then((res) => console.log(res)); // 输出 success
```

记忆重点：

- 存储回调队列来实现异步

在上面的代码中，promise已经能够正常的支持异步了，但是也有一个需要注意的点，回调队列在resolve或者reject执行后不能马上同步执行，因为这时候then和catch方法还没有执行，没有记录回调队列，所以这里使用setTimeout来模拟异步，延后执行回调队列。

上面的promise已经基本能够使用了，但是还没有考虑到链式调用的情况。

## 第三阶段：链式调用

为了实现链式调用，需要在then方法中返回一个新的promise，这样就可以链式调用了。只需要记得返回新的promise就行了。

```js
class MyPromise {
  constructor(executor) {
    this.status = "pending";
    this.value = undefined;
    this.reason = undefined;

    // 加入回调函数存储的位置
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status === "pending") {
        this.value = value;
        this.status = "fulfilled";
        // 使用setTimeout来模拟异步，这样在同步调用resolve的时候，会先执行then方法记录回调队列，然后再执行回调队列
        setTimeout(() => {
          // 执行回调函数
          this.onFulfilledCallbacks.forEach((fn) => fn());
        }, 0);
      }
    };

    const reject = (reason) => {
      if (this.status === "pending") {
        this.reason = reason;
        this.status = "rejected";
        setTimeout(() => {
          // 执行回调函数
          this.onRejectedCallbacks.forEach((fn) => fn());
        });
      }
    };

    executor(resolve, reject);
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = (fn, val) => {
        try {
          const x = fn(val);
          resolve(x); // 关键点：将返回值传递给下一个then
        } catch (err) {
          reject(err);
        }
      };

      // 如果当前状态已经是结束了，直接执行回调函数
      if (this.state === "fulfilled") {
        handle(onFulfilled, this.value);
      } else if (this.state === "rejected") {
        handle(onRejected, this.reason);
      } else {
        // 这里是之前的核心，将回调函数存储起来，在resolve或者reject的时候执行
        this.onFulfilledCallbacks.push(() => handle(onFulfilled, this.value));
        this.onRejectedCallbacks.push(() => handle(onRejected, this.reason));
      }
    });
  }

  catch(onRejected) {
    if (this.status === "pending") {
      // 不再直接执行，而是保存到回调函数数组中
      this.onRejectedCallbacks.push(() => {
        onRejected(this.reason);
      });
    }
  }
}

// 测试用例
const p = new MyPromise((resolve) => {
  setTimeout(() => {
    resolve("success!");
  }, 1000);
});
p.then((res) => {
  console.log(res);
  return "success2!";
}).then((res) => console.log(res));
```

记忆重点：

- 链式调用靠直接返回新的promise实现

## 总结

现在实现了一个基本的promise，还是有很多待完成的部分，比如 对于返回值的处理、需要添加一些静态方法等等。但是作为一篇帮助我记忆的文章，我觉得越简单越好。

记忆重点：

- Promise 有且仅有三个状态
- resolve/reject 只能改变状态一次
- executor 立即执行，错误会被捕获
- 存储回调队列来实现异步
- 链式调用靠直接返回新的promise实现