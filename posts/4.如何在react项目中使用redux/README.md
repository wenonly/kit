---
title: 如何在react项目中使用redux
date: 2019-11-13 22:20:22
categories: 前端
tags:
- react
- redux
---

在`react`项目中，组件通信和状态管理是非常麻烦的，特别是在涉及到父子组件传值的时候，就需要父子传值的方法，将会特别麻烦。而`redux`就是`react`生态中一个很好的数据和状态管理工具，本文将介绍在`react`项目中如何使用`redux`。

<!-- more -->

## 初始化react项目

首先需要初始化`react`项目，在安装了`nodejs`环境的情况下，运行下面了命令安装`create-react-app`工具。
```
npm install create-react-app -g
```
之后`npm`会在全局安装`create-react-app`工具，可以直接通过命令生成`react`项目，初始化命令如下。
```
// 进入创建项目的目录
create-react-app reactapp
```
运行命令后初始化了一个叫`reactapp`的项目，项目中`src`目录就是编写代码的目录。将src下面的所有代码删除，并引入如下两个文件。
```
// index.js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```
```
// App.js
import React, { Component } from 'react';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {  }
  }
  render() { 
    return (
      <div>hello</div>
    );
  }
}
 
export default App;
```
其中`index.js`是项目的入口文件，而`App.js`是新增的一个组件。

## 新建一个组件

这里新建一个组件，使用span标签显示一个数字，使用button按钮来加数字。
```
import React, { Component } from 'react';

class Page extends Component {
    constructor(props) {
        super(props);
        this.state = {  }
    }
    render() { 
        return (
            <div>
                <span>1</span>
                <button>+</button>
            </div>
        );
    }
}
 
export default Page;
```
现在页面只有样式，没有交互，之后会添加交互。

## 创建redux仓库

首先安装redux
```
yarn add redux
```
然后在项目中创建`store`目录，并在目录中添加`index.js`是文件。
```
import { createStore } from 'redux';
const store = createStore();
export default store;
```
创建仓库后还需要一个用于管理的模块`reducer`,在`store`目录中添加`reducer.js`是文件。
```
const defaultState = {
}
export default (state = defaultState, action) => {
    return state
}
```
然后在`index.js`中引入`reducer.js`是文件。
```
import { createStore } from 'redux'
import reducer from './reducer'
const store = createStore(reducer);
export default store;
```
## 初始页面数据，在reducer中管理默认数据

首先在`reducer`中初始`redux`数据。进入`reducer`，在`defaultState`中加入变量`num`。
```
const defaultState = {
    num: 0
}
export default (state = defaultState, action) => {
    return state
}
```

## 在组件中调用redux的数据

进入`Page`组件，先引入`redux`。
```
import store from '../store/index'
```
或者
```
import store from '../store'
```
然后将`redux`中的`state`复制给组件中的`state`。并显示到span标签中。修改如下。
```
import React, { Component } from 'react';
import store from '../store'

class Page extends Component {
    constructor(props) {
        super(props);
        this.state = store.getState() // 关键
    }
    render() { 
        return (
            <div>
                <span>{this.state.num}</span> // 关键
                <button>+</button>
            </div>
        );
    }
}
 
export default Page;
```
现在`redux`中存的值就能显示到页面了。

## 修改redux中的数据

先为button按钮添加一个点击事件，让其出发`addNum`函数
```
<button onClick={this.addNum.bind(this)}>+</button>
```
在函数中向reducer提交一个"动作"`add_num`
```
addNum() {
    const action = {
        type: 'add_num'
    }
    store.dispatch(action)
}
```
在`reducer`中编写`add_num`的逻辑，代码如下
```
export default (state = defaultState, action) => {
    if (action.type === 'add_num') {
        const newState = Object.assign(state)
        newState.num += 1
        return newState
    }
    return state
}
```
意思是当`type`是`add_num`时，执行+1的操作

## store的自动推送策略

通过上面的代码，每次点击+之后store中的值已经改变，但没有更新在组件上，于是需要在值变动时自动更新组件的state

```
...
constructor(props) {
    super(props);
    this.state = store.getState()
    // 组件不能自动更新，需要订阅状态
    this.storeChange = this.storeChange.bind(this)  //转变this指向
    store.subscribe(this.storeChange) //订阅Redux的状态，每次state发生改变会触发里面的函数
}
...
storeChange() {
    this.setState(store.getState())
}
```

## 统一管理actionType

在写`redux action`时会产生很多的`action Types`，项目小的时候没什么，但当项目很大的时候就不好管理这些`action Types`，比如，在组件中改动了`type`，那么也需要在`reducer`中去找到这个`type`并修改。为了统一管理`action Types`，创建一个单独的文件。
在`store`中创建`actionTypes.js`
```
export const ADD_NUM = 'add_num'
```
然后在`reducer`调用这个文件
```
import { ADD_NUM } from './actionTypes'
...
if (action.type === ADD_NUM) { // 关键
    const newState = Object.assign(state)
    newState.num += 1
    return newState
}
```
在组件中调用`actionTypes.js`
```
import { ADD_NUM } from '../store/actionTypes'
...
addNum() {
    const action = {
        type: ADD_NUM
    }
    store.dispatch(action)
}
```
这样就实现了`action Types`分开管理，可以减少代码冗余，而且在写错了常量名称的时候，浏览器和控制台都会报错。
