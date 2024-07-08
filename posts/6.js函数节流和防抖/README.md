---
title: js函数节流和防抖
date: 2020-1-15 12:20:22
categories:
- 前端
tags:
- js
---

# 什么是函数节流？

就是函数在一定时间只能执行一次。

举例：再使用mousemove事件时，函数会不断触发，为了节省计算机资源和网络资源，控制函数调用频率，也就是n秒内，不管调用多少次，只生效一次。

# 什么是函数防抖？

函数被控制在n秒后再执行，如果时间内再次触发函数则重新计时。

举例：在一定时间内点击两次按钮，只有最后一次有效。

<!-- more -->

# 怎么实现函数节流？

使用定时器对函数调用进行限制。

每次调用函数时创建定时器，传入所需函数。每次只有当函数执行完毕后才能重新创建定时器。这样，一定时间内频繁调用函数时，如果定时器正在生效则不会再次调用。

```
function throttle(fn, wait) {
    var time = null
    return function() {
        if (!time) {
            time = setTimeout(function() {
                fn.apply(this, ...arguments);
                time = null
            }, wait)
        }
    }
}
```

调用方法：
```
document.body.onmousemove = throttle(() => {
    console.log('我1秒只执行一次')
}, 1000)
```

# 怎么实现函数防抖？

根据上面的解释，调用n秒后生效，如果这段时间内重复调用，则重新设置定时。

```
function noTremble(fn, wait) {
    var time = null
    return function() {
        if (time) {
            clearTimeout(time)
            time = null
        }
        time = setTimeout(() => {
            fn.apply(this, ...arguments)
        }, wait)
    }
}
```

调用方法：
```
document.body.onmousemove = noTremble(() => {
    console.log('1秒内重复调用，我只执行最后一次')
}, 1000)
```