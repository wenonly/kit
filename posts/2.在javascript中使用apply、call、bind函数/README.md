---
title: 在javascript中使用apply、call、bind函数
date: 2019-11-08 23:55:22
categories: 前端
tags:
- js
- 函数
---
每个`javascript`函数都有两个非继承的方法 `apply()`、 `call()`，这两个方法的用途相同，都是在特定的作用域中调用函数，直接一点的说法就是改变函数内部的`this`指针。
<!-- more -->

## this指针介绍
`this`表示当前对象的一个引用。

单独使用`this`时，`this`默认指向全局对象`window`。（当前对象是`window`对象）
```javascript
console.log(this) // 打印window对象
```
当在浏览器中全局运行函数时，它的`this`指针同样默认指向全局对象`window`。（当前对象是`window`对象）
```javascript
function fun() {
    console.log(this) // 打印window对象
}
```
当在对象里的方法使用`this`指针的时候，它指向当前对象。（当前对象是obj对象）
```javascript
var obj = {
    title: 'fun',
    fun: function() {
        console.log(this) // 打印obj对象
    }
}
```

## 使用apply()方法
`apply()`方法接受两个参数，第一个参数是在其中运行函数的作用域，第二个参数是是一个参数数组，用于向函数中传递参数。
```javascript
var num = 10
function myFun1(num1, num2) {
    console.log(this.num + num1 + num2)
}
myFun1(1,2)
```
上面的代码定义了全局变量`num`和全局函数`myFun`，当运行`myFun`函数时，将会打印`10 + 1 + 2`的值，也就是`13`。
```javascript
var num = 10
var myObj = {
    num: 20,
    myFun2: function(num1, num2) {
        console.log(this.num + num1 + num2)
    }
}
myObj.myFun2(1,2)
```
上面这串代码，将变量和方法都定义在一个对象里，这样`this.num`不再是全局的`num`，而是当前对象中的`num`，所以结果打印出来的是`20 + 1 + 2`的值，也就是`23`。
如果我想在运行`myFun1`时能够使用`myObj`中的`num`怎么办？这里就可以使用`apply`函数来改变`this`指向。
```javascript
myFun1.apply(myObj, [1, 2])
```
使用上面这串代码最终将打印`23`，说明已经改变了`myFun1`的`this`指向。其中的`this.num`是`20`。
同样的，也可以在运行`myFun2`的时候使用全局的变量`num`，只需要将`this`指向全局对象`window`就行。
```javascript
myObj.myFun2.apply(window, [1, 2])
```
最终打印的结果是`13`，说明这里的`this.num`是`10`。
上面的代码`apply`函数传参使用参数数组，也就是`[1, 2]`的形式，分别代表第一第二个参数，如果函数不需要传参数，可以不传`apply`的第二个参数。

## 使用call()方法，它与apply()有什么不同？
`call`函数的使用方法基本上和`apply`一样，`只是传递参数的方式不一样`，`apply`通过参数数组的形式传参，而`call`需要把参数一个个都分别传进去。例如将上面的例子改成使用`call`函数，如下：
```javascript
myFun1.call(myObj, 1, 2)
```
## 使用bind()函数绑定this指针
`bind`方法同样用于改变`this`指针，但和`apply`、`call`方法不同。`apply`和`call`在调用函数后会立即执行，不会保存`this`改变后的状态。而`bind`在调用函数后不会立即执行，在改变`this`指针后返回一个新的函数，供以后使用。
```javascript
myFun1.apply(myObj, [1, 2]) // 23
myFun1(1, 2) // 13
```
上面的例子中，在`myFun1`执行`apply`函数后，其本身并没有改变`this`指向，在下次执行时还是会变回原来的`this`。如果想保存`this`改变后的状态，就需要使用`bind`函数。
```javascript
var myFun3 = myFun1.bind(myObj)
myFun3(1, 2) // 23
myFun3(1, 2) // 23
```
