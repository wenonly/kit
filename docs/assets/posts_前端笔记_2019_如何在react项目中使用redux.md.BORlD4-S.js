import{_ as s,a,o as n,W as e}from"./chunks/framework.CJwJD4JI.js";const m=JSON.parse('{"title":"如何在react项目中使用redux","description":"","frontmatter":{"title":"如何在react项目中使用redux","date":"2019-11-13T22:20:22.000Z","categories":"前端笔记","tags":["react","redux"]},"headers":[],"relativePath":"posts/前端笔记/2019/如何在react项目中使用redux.md","filePath":"posts/前端/3.如何在react项目中使用redux/README.md","lastUpdated":1722912510000}'),p={name:"posts/前端笔记/2019/如何在react项目中使用redux.md"},t=e(`<p>在<code>react</code>项目中，组件通信和状态管理是非常麻烦的，特别是在涉及到父子组件传值的时候，就需要父子传值的方法，将会特别麻烦。而<code>redux</code>就是<code>react</code>生态中一个很好的数据和状态管理工具，本文将介绍在<code>react</code>项目中如何使用<code>redux</code>。</p><h2 id="初始化react项目" tabindex="-1">初始化react项目 <a class="header-anchor" href="#初始化react项目" aria-label="Permalink to &quot;初始化react项目&quot;">​</a></h2><p>首先需要初始化<code>react</code>项目，在安装了<code>nodejs</code>环境的情况下，运行下面了命令安装<code>create-react-app</code>工具。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>npm install create-react-app -g</span></span></code></pre></div><p>之后<code>npm</code>会在全局安装<code>create-react-app</code>工具，可以直接通过命令生成<code>react</code>项目，初始化命令如下。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// 进入创建项目的目录</span></span>
<span class="line"><span>create-react-app reactapp</span></span></code></pre></div><p>运行命令后初始化了一个叫<code>reactapp</code>的项目，项目中<code>src</code>目录就是编写代码的目录。将src下面的所有代码删除，并引入如下两个文件。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// index.js</span></span>
<span class="line"><span>import React from &#39;react&#39;;</span></span>
<span class="line"><span>import ReactDOM from &#39;react-dom&#39;;</span></span>
<span class="line"><span>import App from &#39;./App&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ReactDOM.render(&lt;App /&gt;, document.getElementById(&#39;root&#39;));</span></span></code></pre></div><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// App.js</span></span>
<span class="line"><span>import React, { Component } from &#39;react&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>class App extends Component {</span></span>
<span class="line"><span>  constructor(props) {</span></span>
<span class="line"><span>    super(props);</span></span>
<span class="line"><span>    this.state = {  }</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>  render() { </span></span>
<span class="line"><span>    return (</span></span>
<span class="line"><span>      &lt;div&gt;hello&lt;/div&gt;</span></span>
<span class="line"><span>    );</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span> </span></span>
<span class="line"><span>export default App;</span></span></code></pre></div><p>其中<code>index.js</code>是项目的入口文件，而<code>App.js</code>是新增的一个组件。</p><h2 id="新建一个组件" tabindex="-1">新建一个组件 <a class="header-anchor" href="#新建一个组件" aria-label="Permalink to &quot;新建一个组件&quot;">​</a></h2><p>这里新建一个组件，使用span标签显示一个数字，使用button按钮来加数字。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import React, { Component } from &#39;react&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>class Page extends Component {</span></span>
<span class="line"><span>    constructor(props) {</span></span>
<span class="line"><span>        super(props);</span></span>
<span class="line"><span>        this.state = {  }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    render() { </span></span>
<span class="line"><span>        return (</span></span>
<span class="line"><span>            &lt;div&gt;</span></span>
<span class="line"><span>                &lt;span&gt;1&lt;/span&gt;</span></span>
<span class="line"><span>                &lt;button&gt;+&lt;/button&gt;</span></span>
<span class="line"><span>            &lt;/div&gt;</span></span>
<span class="line"><span>        );</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span> </span></span>
<span class="line"><span>export default Page;</span></span></code></pre></div><p>现在页面只有样式，没有交互，之后会添加交互。</p><h2 id="创建redux仓库" tabindex="-1">创建redux仓库 <a class="header-anchor" href="#创建redux仓库" aria-label="Permalink to &quot;创建redux仓库&quot;">​</a></h2><p>首先安装redux</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>yarn add redux</span></span></code></pre></div><p>然后在项目中创建<code>store</code>目录，并在目录中添加<code>index.js</code>是文件。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import { createStore } from &#39;redux&#39;;</span></span>
<span class="line"><span>const store = createStore();</span></span>
<span class="line"><span>export default store;</span></span></code></pre></div><p>创建仓库后还需要一个用于管理的模块<code>reducer</code>,在<code>store</code>目录中添加<code>reducer.js</code>是文件。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>const defaultState = {</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>export default (state = defaultState, action) =&gt; {</span></span>
<span class="line"><span>    return state</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>然后在<code>index.js</code>中引入<code>reducer.js</code>是文件。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import { createStore } from &#39;redux&#39;</span></span>
<span class="line"><span>import reducer from &#39;./reducer&#39;</span></span>
<span class="line"><span>const store = createStore(reducer);</span></span>
<span class="line"><span>export default store;</span></span></code></pre></div><h2 id="初始页面数据-在reducer中管理默认数据" tabindex="-1">初始页面数据，在reducer中管理默认数据 <a class="header-anchor" href="#初始页面数据-在reducer中管理默认数据" aria-label="Permalink to &quot;初始页面数据，在reducer中管理默认数据&quot;">​</a></h2><p>首先在<code>reducer</code>中初始<code>redux</code>数据。进入<code>reducer</code>，在<code>defaultState</code>中加入变量<code>num</code>。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>const defaultState = {</span></span>
<span class="line"><span>    num: 0</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>export default (state = defaultState, action) =&gt; {</span></span>
<span class="line"><span>    return state</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="在组件中调用redux的数据" tabindex="-1">在组件中调用redux的数据 <a class="header-anchor" href="#在组件中调用redux的数据" aria-label="Permalink to &quot;在组件中调用redux的数据&quot;">​</a></h2><p>进入<code>Page</code>组件，先引入<code>redux</code>。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import store from &#39;../store/index&#39;</span></span></code></pre></div><p>或者</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import store from &#39;../store&#39;</span></span></code></pre></div><p>然后将<code>redux</code>中的<code>state</code>复制给组件中的<code>state</code>。并显示到span标签中。修改如下。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import React, { Component } from &#39;react&#39;;</span></span>
<span class="line"><span>import store from &#39;../store&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>class Page extends Component {</span></span>
<span class="line"><span>    constructor(props) {</span></span>
<span class="line"><span>        super(props);</span></span>
<span class="line"><span>        this.state = store.getState() // 关键</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    render() { </span></span>
<span class="line"><span>        return (</span></span>
<span class="line"><span>            &lt;div&gt;</span></span>
<span class="line"><span>                &lt;span&gt;{this.state.num}&lt;/span&gt; // 关键</span></span>
<span class="line"><span>                &lt;button&gt;+&lt;/button&gt;</span></span>
<span class="line"><span>            &lt;/div&gt;</span></span>
<span class="line"><span>        );</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span> </span></span>
<span class="line"><span>export default Page;</span></span></code></pre></div><p>现在<code>redux</code>中存的值就能显示到页面了。</p><h2 id="修改redux中的数据" tabindex="-1">修改redux中的数据 <a class="header-anchor" href="#修改redux中的数据" aria-label="Permalink to &quot;修改redux中的数据&quot;">​</a></h2><p>先为button按钮添加一个点击事件，让其出发<code>addNum</code>函数</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>&lt;button onClick={this.addNum.bind(this)}&gt;+&lt;/button&gt;</span></span></code></pre></div><p>在函数中向reducer提交一个&quot;动作&quot;<code>add_num</code></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>addNum() {</span></span>
<span class="line"><span>    const action = {</span></span>
<span class="line"><span>        type: &#39;add_num&#39;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    store.dispatch(action)</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>在<code>reducer</code>中编写<code>add_num</code>的逻辑，代码如下</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>export default (state = defaultState, action) =&gt; {</span></span>
<span class="line"><span>    if (action.type === &#39;add_num&#39;) {</span></span>
<span class="line"><span>        const newState = Object.assign(state)</span></span>
<span class="line"><span>        newState.num += 1</span></span>
<span class="line"><span>        return newState</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    return state</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>意思是当<code>type</code>是<code>add_num</code>时，执行+1的操作</p><h2 id="store的自动推送策略" tabindex="-1">store的自动推送策略 <a class="header-anchor" href="#store的自动推送策略" aria-label="Permalink to &quot;store的自动推送策略&quot;">​</a></h2><p>通过上面的代码，每次点击+之后store中的值已经改变，但没有更新在组件上，于是需要在值变动时自动更新组件的state</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>...</span></span>
<span class="line"><span>constructor(props) {</span></span>
<span class="line"><span>    super(props);</span></span>
<span class="line"><span>    this.state = store.getState()</span></span>
<span class="line"><span>    // 组件不能自动更新，需要订阅状态</span></span>
<span class="line"><span>    this.storeChange = this.storeChange.bind(this)  //转变this指向</span></span>
<span class="line"><span>    store.subscribe(this.storeChange) //订阅Redux的状态，每次state发生改变会触发里面的函数</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>storeChange() {</span></span>
<span class="line"><span>    this.setState(store.getState())</span></span>
<span class="line"><span>}</span></span></code></pre></div><h2 id="统一管理actiontype" tabindex="-1">统一管理actionType <a class="header-anchor" href="#统一管理actiontype" aria-label="Permalink to &quot;统一管理actionType&quot;">​</a></h2><p>在写<code>redux action</code>时会产生很多的<code>action Types</code>，项目小的时候没什么，但当项目很大的时候就不好管理这些<code>action Types</code>，比如，在组件中改动了<code>type</code>，那么也需要在<code>reducer</code>中去找到这个<code>type</code>并修改。为了统一管理<code>action Types</code>，创建一个单独的文件。 在<code>store</code>中创建<code>actionTypes.js</code></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>export const ADD_NUM = &#39;add_num&#39;</span></span></code></pre></div><p>然后在<code>reducer</code>调用这个文件</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import { ADD_NUM } from &#39;./actionTypes&#39;</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>if (action.type === ADD_NUM) { // 关键</span></span>
<span class="line"><span>    const newState = Object.assign(state)</span></span>
<span class="line"><span>    newState.num += 1</span></span>
<span class="line"><span>    return newState</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>在组件中调用<code>actionTypes.js</code></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import { ADD_NUM } from &#39;../store/actionTypes&#39;</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>addNum() {</span></span>
<span class="line"><span>    const action = {</span></span>
<span class="line"><span>        type: ADD_NUM</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>    store.dispatch(action)</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>这样就实现了<code>action Types</code>分开管理，可以减少代码冗余，而且在写错了常量名称的时候，浏览器和控制台都会报错。</p>`,53),c=[t];function l(o,i,d,r,u,h){return n(),a("div",null,c)}const b=s(p,[["render",l]]);export{m as __pageData,b as default};
