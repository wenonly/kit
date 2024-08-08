import{_ as s,a,o as n,W as p}from"./chunks/framework.CJwJD4JI.js";const e="/kit/assets/1.Cox9QYQM.png",b=JSON.parse('{"title":"使用create-react-app打造多页面应用","description":"","frontmatter":{"title":"使用create-react-app打造多页面应用","date":"2019-12-14T12:20:22.000Z","categories":"前端笔记","tags":["react"]},"headers":[],"relativePath":"posts/前端笔记/2019/使用create-react-app打造多页面应用.md","filePath":"posts/前端/4.使用create-react-app打造多页面应用/README.md","lastUpdated":1722912510000}'),l={name:"posts/前端笔记/2019/使用create-react-app打造多页面应用.md"},t=p(`<p>通过create-react-app创建的工程默认都是单页面的，而有时开发项目不得不使用多页面方式开发，本文将介绍如何将create-react-app创建的模板项目修改为多页面的开发方式。</p><h2 id="使用工具版本" tabindex="-1">使用工具版本 <a class="header-anchor" href="#使用工具版本" aria-label="Permalink to &quot;使用工具版本&quot;">​</a></h2><p>nodejs --&gt; v8.16.1 npm --&gt; 6.11.3 yarn --&gt; 1.19.1 create-react-app --&gt; 3.3.0</p><h2 id="初始化项目" tabindex="-1">初始化项目 <a class="header-anchor" href="#初始化项目" aria-label="Permalink to &quot;初始化项目&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>create-react-app react-multi-page</span></span></code></pre></div><ul><li>删除src目录下多余文件 App.css App.js <s>App.test.js</s> index.css index.js <s>logo.svg</s><s>serviceWorker.js</s><s>setupTests.js</s></li><li>修改index.js文件</li></ul><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import React from &#39;react&#39;;</span></span>
<span class="line"><span>import ReactDOM from &#39;react-dom&#39;;</span></span>
<span class="line"><span>import &#39;./index.css&#39;;</span></span>
<span class="line"><span>import App from &#39;./App&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ReactDOM.render(&lt;App /&gt;, document.getElementById(&#39;root&#39;));</span></span></code></pre></div><ul><li>修改app.js文件</li></ul><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>import React from &#39;react&#39;;</span></span>
<span class="line"><span>import &#39;./App.css&#39;;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>function App() {</span></span>
<span class="line"><span>  return (</span></span>
<span class="line"><span>    &lt;div className=&quot;App&quot;&gt;</span></span>
<span class="line"><span>      page1</span></span>
<span class="line"><span>    &lt;/div&gt;</span></span>
<span class="line"><span>  );</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>export default App;</span></span></code></pre></div><ul><li>构建多页面项目结构 —— 在src目录下创建page1、page2目录 —— 将src之前保留的文件分别复制到page1、page2目录里面 —— 目录结构如下： <img src="`+e+`" alt="目录结构"></li></ul><h2 id="弹出webpack配置" tabindex="-1">弹出webpack配置 <a class="header-anchor" href="#弹出webpack配置" aria-label="Permalink to &quot;弹出webpack配置&quot;">​</a></h2><p>先git提交代码，不然没法弹出webpack配置</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>git add .</span></span>
<span class="line"><span>git commit -m &quot;项目初始化&quot;</span></span>
<span class="line"><span>yarn eject</span></span></code></pre></div><p>当出现<code>Are you sure you want to eject? This action is permanent?</code>时输入<code>y</code>。</p><h2 id="读取src下有的目录名称" tabindex="-1">读取src下有的目录名称 <a class="header-anchor" href="#读取src下有的目录名称" aria-label="Permalink to &quot;读取src下有的目录名称&quot;">​</a></h2><p>进入<code>config/paths.js</code>中配置<code>appIndexJs</code>路径，默认是路径字符串，现在获取几个页面的字符串列表，将会配置在入口地址。 在<code>module.exports</code>之前添加如下代码</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>const glob = require(&#39;glob&#39;);</span></span>
<span class="line"><span>// 获取指定路径下的入口文件</span></span>
<span class="line"><span>function getEntries(globPath) {</span></span>
<span class="line"><span>  const files = glob.sync(globPath),</span></span>
<span class="line"><span>    entries = {};</span></span>
<span class="line"><span>  files.forEach(function(filepath) {</span></span>
<span class="line"><span>      const split = filepath.split(&#39;/&#39;);</span></span>
<span class="line"><span>      const name = split[split.length - 2];</span></span>
<span class="line"><span>      entries[name] = &#39;./&#39; + filepath;</span></span>
<span class="line"><span>  });</span></span>
<span class="line"><span>  return entries;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>const entries = getEntries(&#39;src/**/index.js&#39;);</span></span>
<span class="line"><span></span></span>
<span class="line"><span>function getIndexJs() {</span></span>
<span class="line"><span>  const indexJsList = [];</span></span>
<span class="line"><span>  Object.keys(entries).forEach((name) =&gt; {</span></span>
<span class="line"><span>    const indexjs = resolveModule(resolveApp, \`src/\${name}/index\`)</span></span>
<span class="line"><span>    indexJsList.push({</span></span>
<span class="line"><span>      name,</span></span>
<span class="line"><span>      path: indexjs</span></span>
<span class="line"><span>    });</span></span>
<span class="line"><span>  })</span></span>
<span class="line"><span>  return indexJsList;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span>const indexJsList = getIndexJs()</span></span></code></pre></div><p>然后更改<code>module.exports</code>内容</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>module.exports = {</span></span>
<span class="line"><span>  dotenv: resolveApp(&#39;.env&#39;),</span></span>
<span class="line"><span>  appPath: resolveApp(&#39;.&#39;),</span></span>
<span class="line"><span>  appBuild: resolveApp(&#39;build&#39;),</span></span>
<span class="line"><span>  appPublic: resolveApp(&#39;public&#39;),</span></span>
<span class="line"><span>  appHtml: resolveApp(&#39;public/index.html&#39;),</span></span>
<span class="line"><span>  appIndexJs: indexJsList, // +++++++++++++</span></span>
<span class="line"><span>  appPackageJson: resolveApp(&#39;package.json&#39;),</span></span>
<span class="line"><span>  appSrc: resolveApp(&#39;src&#39;),</span></span>
<span class="line"><span>  appTsConfig: resolveApp(&#39;tsconfig.json&#39;),</span></span>
<span class="line"><span>  appJsConfig: resolveApp(&#39;jsconfig.json&#39;),</span></span>
<span class="line"><span>  yarnLockFile: resolveApp(&#39;yarn.lock&#39;),</span></span>
<span class="line"><span>  testsSetup: resolveModule(resolveApp, &#39;src/setupTests&#39;),</span></span>
<span class="line"><span>  proxySetup: resolveApp(&#39;src/setupProxy.js&#39;),</span></span>
<span class="line"><span>  appNodeModules: resolveApp(&#39;node_modules&#39;),</span></span>
<span class="line"><span>  publicUrl: getPublicUrl(resolveApp(&#39;package.json&#39;)),</span></span>
<span class="line"><span>  servedPath: getServedPath(resolveApp(&#39;package.json&#39;)),</span></span>
<span class="line"><span>  entries // +++++++++++++</span></span>
<span class="line"><span>};</span></span></code></pre></div><p>上面有<code>+</code>号的部分为更改的内容。</p><h2 id="配置webpack入口entry" tabindex="-1">配置webpack入口entry <a class="header-anchor" href="#配置webpack入口entry" aria-label="Permalink to &quot;配置webpack入口entry&quot;">​</a></h2><p>在<code>return</code>配置之前加入如下代码。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// 配置入口</span></span>
<span class="line"><span>  const entry = {}</span></span>
<span class="line"><span>  paths.appIndexJs.forEach(e =&gt; {</span></span>
<span class="line"><span>    entry[e.name] = [</span></span>
<span class="line"><span>      isEnvDevelopment &amp;&amp;</span></span>
<span class="line"><span>        require.resolve(&#39;react-dev-utils/webpackHotDevClient&#39;),</span></span>
<span class="line"><span>      e.path</span></span>
<span class="line"><span>    ].filter(Boolean)</span></span>
<span class="line"><span>  });</span></span></code></pre></div><p>然后更改<code>return</code>中<code>entry</code>的值为<code>entry</code>。</p><h2 id="更改出口文件的配置ouput" tabindex="-1">更改出口文件的配置ouput <a class="header-anchor" href="#更改出口文件的配置ouput" aria-label="Permalink to &quot;更改出口文件的配置ouput&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// 没更改之前的</span></span>
<span class="line"><span>// filename: isEnvProduction</span></span>
<span class="line"><span>// ? &#39;static/js/[name].[contenthash:8].js&#39;</span></span>
<span class="line"><span>// : isEnvDevelopment &amp;&amp; &#39;static/js/bundle.js&#39;,</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>// chunkFilename: isEnvProduction</span></span>
<span class="line"><span>// ? &#39;static/js/[name].[contenthash:8].chunk.js&#39;</span></span>
<span class="line"><span>// : isEnvDevelopment &amp;&amp; &#39;static/js/[name].chunk.js&#39;,</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 更改后的</span></span>
<span class="line"><span>filename: isEnvProduction</span></span>
<span class="line"><span>? &#39;static/js/[name]/[name].[contenthash:8].js&#39;</span></span>
<span class="line"><span>: isEnvDevelopment &amp;&amp; &#39;static/js/[name]/[name].bundle.js&#39;,</span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>chunkFilename: isEnvProduction</span></span>
<span class="line"><span>? &#39;static/js/[name]/[name].[contenthash:8].chunk.js&#39;</span></span>
<span class="line"><span>: isEnvDevelopment &amp;&amp; &#39;static/js/[name]/[name].chunk.js&#39;,</span></span></code></pre></div><h2 id="更改htmlwebpackplugin配置" tabindex="-1">更改HtmlWebpackPlugin配置 <a class="header-anchor" href="#更改htmlwebpackplugin配置" aria-label="Permalink to &quot;更改HtmlWebpackPlugin配置&quot;">​</a></h2><p>HtmlWebpackPlugin 这个plugin曝光率很高，他主要有两个作用</p><ul><li>为html文件中引入的外部资源如script、link动态添加每次compile后的hash，防止引用缓存的外部文件问题</li><li>可以生成创建html入口文件，比如单页面可以生成一个html文件入口，配置N个html-webpack-plugin可以生成N个页面入口</li></ul><p>现在删除之前的配置，然后加入一下的<code>Plugin</code>配置。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>...Object.keys(paths.entries).map((name) =&gt; {</span></span>
<span class="line"><span>    return new HtmlWebpackPlugin(</span></span>
<span class="line"><span>      Object.assign(</span></span>
<span class="line"><span>        {},</span></span>
<span class="line"><span>        {</span></span>
<span class="line"><span>          inject: true,</span></span>
<span class="line"><span>          chunks: [name],</span></span>
<span class="line"><span>          template: paths.appHtml,</span></span>
<span class="line"><span>          filename: name + &#39;.html&#39;,</span></span>
<span class="line"><span>        },</span></span>
<span class="line"><span>        isEnvProduction</span></span>
<span class="line"><span>          ? {</span></span>
<span class="line"><span>              minify: {</span></span>
<span class="line"><span>                removeComments: true,</span></span>
<span class="line"><span>                collapseWhitespace: true,</span></span>
<span class="line"><span>                removeRedundantAttributes: true,</span></span>
<span class="line"><span>                useShortDoctype: true,</span></span>
<span class="line"><span>                removeEmptyAttributes: true,</span></span>
<span class="line"><span>                removeStyleLinkTypeAttributes: true,</span></span>
<span class="line"><span>                keepClosingSlash: true,</span></span>
<span class="line"><span>                minifyJS: true,</span></span>
<span class="line"><span>                minifyCSS: true,</span></span>
<span class="line"><span>                minifyURLs: true,</span></span>
<span class="line"><span>              },</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>          : undefined</span></span>
<span class="line"><span>      )</span></span>
<span class="line"><span>    )</span></span>
<span class="line"><span>}),</span></span></code></pre></div><p>上面的代码是循环<code>entries</code>设置<code>HtmlWebpackPlugin</code>。</p><h2 id="注释manifestplugin部分代码" tabindex="-1">注释ManifestPlugin部分代码 <a class="header-anchor" href="#注释manifestplugin部分代码" aria-label="Permalink to &quot;注释ManifestPlugin部分代码&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// new ManifestPlugin({</span></span>
<span class="line"><span>//   fileName: &#39;asset-manifest.json&#39;,</span></span>
<span class="line"><span>//   publicPath: publicPath,</span></span>
<span class="line"><span>//   generate: (seed, files, entrypoints) =&gt; {</span></span>
<span class="line"><span>//     const manifestFiles = files.reduce((manifest, file) =&gt; {</span></span>
<span class="line"><span>//       manifest[file.name] = file.path;</span></span>
<span class="line"><span>//       return manifest;</span></span>
<span class="line"><span>//     }, seed);</span></span>
<span class="line"><span>//     const entrypointFiles = entrypoints.main.filter(</span></span>
<span class="line"><span>//       fileName =&gt; !fileName.endsWith(&#39;.map&#39;)</span></span>
<span class="line"><span>//     );</span></span>
<span class="line"><span></span></span>
<span class="line"><span>//     return {</span></span>
<span class="line"><span>//       files: manifestFiles,</span></span>
<span class="line"><span>//       entrypoints: entrypointFiles,</span></span>
<span class="line"><span>//     };</span></span>
<span class="line"><span>//   },</span></span>
<span class="line"><span>// }),</span></span></code></pre></div><p>这是为了生成<code>manifest.json</code>文件的配置，这里不需要。</p><h2 id="更改校验文件是否存在的代码" tabindex="-1">更改校验文件是否存在的代码 <a class="header-anchor" href="#更改校验文件是否存在的代码" aria-label="Permalink to &quot;更改校验文件是否存在的代码&quot;">​</a></h2><p>修改<code>scripts/build.js</code>和<code>scripts/start.js</code>文件的校验代码</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>// 原来的代码</span></span>
<span class="line"><span>// if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {</span></span>
<span class="line"><span>//   process.exit(1);</span></span>
<span class="line"><span>// }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 修改后的代码</span></span>
<span class="line"><span>if (!checkRequiredFiles([paths.appHtml, ...paths.appIndexJs.map(e =&gt; e.path)])) {</span></span>
<span class="line"><span>  process.exit(1);</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>当然这串代码也可以注释掉，运行时不需要校验。</p><h2 id="删除public下多余文件" tabindex="-1">删除public下多余文件 <a class="header-anchor" href="#删除public下多余文件" aria-label="Permalink to &quot;删除public下多余文件&quot;">​</a></h2><p>现在项目已经能够正常运行，但是public下还有多余的代码可以删除。 其中只需要留下<code>index.html</code>作为模板文件，并进行修改。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>&lt;!DOCTYPE html&gt;</span></span>
<span class="line"><span>&lt;html lang=&quot;en&quot;&gt;</span></span>
<span class="line"><span>  &lt;head&gt;</span></span>
<span class="line"><span>    &lt;meta charset=&quot;utf-8&quot; /&gt;</span></span>
<span class="line"><span>    &lt;meta name=&quot;viewport&quot; content=&quot;width=device-width, initial-scale=1&quot; /&gt;</span></span>
<span class="line"><span>    &lt;meta name=&quot;theme-color&quot; content=&quot;#000000&quot; /&gt;</span></span>
<span class="line"><span>    &lt;meta</span></span>
<span class="line"><span>      name=&quot;description&quot;</span></span>
<span class="line"><span>      content=&quot;Web site created using create-react-app&quot;</span></span>
<span class="line"><span>    /&gt;</span></span>
<span class="line"><span>    &lt;title&gt;React App&lt;/title&gt;</span></span>
<span class="line"><span>  &lt;/head&gt;</span></span>
<span class="line"><span>  &lt;body&gt;</span></span>
<span class="line"><span>    &lt;noscript&gt;You need to enable JavaScript to run this app.&lt;/noscript&gt;</span></span>
<span class="line"><span>    &lt;div id=&quot;root&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span>  &lt;/body&gt;</span></span>
<span class="line"><span>&lt;/html&gt;</span></span></code></pre></div><h2 id="总结" tabindex="-1">总结 <a class="header-anchor" href="#总结" aria-label="Permalink to &quot;总结&quot;">​</a></h2><ol><li>添加页面的方法 如果需要添加页面，只需要复制page1和page2的目录结构，放在src目录下，注意不能同名。</li><li>访问路径</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>http://localhost:3000/page1.html</span></span>
<span class="line"><span>http://localhost:3000/page2.html</span></span></code></pre></div><ol start="3"><li>项目地址 当前配置我已经添加到了github，如果有相关配置没有配置好，可以直接下载使用 <a href="https://github.com/iwowen/react-multi-template" target="_blank" rel="noreferrer">https://github.com/iwowen/react-multi-template</a></li></ol>`,46),i=[t];function c(o,r,d,u,h,m){return n(),a("div",null,i)}const v=s(l,[["render",c]]);export{b as __pageData,v as default};
