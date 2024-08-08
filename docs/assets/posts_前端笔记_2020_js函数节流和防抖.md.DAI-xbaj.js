import{_ as s,a,o as n,W as p}from"./chunks/framework.CJwJD4JI.js";const g=JSON.parse('{"title":"js函数节流和防抖","description":"","frontmatter":{"title":"js函数节流和防抖","date":"2020-01-15T12:20:22.000Z","categories":"前端笔记","tags":["js"]},"headers":[],"relativePath":"posts/前端笔记/2020/js函数节流和防抖.md","filePath":"posts/前端/5.js函数节流和防抖/README.md","lastUpdated":1722912510000}'),e={name:"posts/前端笔记/2020/js函数节流和防抖.md"},t=p(`<h2 id="什么是函数节流" tabindex="-1">什么是函数节流？ <a class="header-anchor" href="#什么是函数节流" aria-label="Permalink to &quot;什么是函数节流？&quot;">​</a></h2><p>就是函数在一定时间只能执行一次。</p><p>举例：再使用mousemove事件时，函数会不断触发，为了节省计算机资源和网络资源，控制函数调用频率，也就是n秒内，不管调用多少次，只生效一次。</p><h2 id="什么是函数防抖" tabindex="-1">什么是函数防抖？ <a class="header-anchor" href="#什么是函数防抖" aria-label="Permalink to &quot;什么是函数防抖？&quot;">​</a></h2><p>函数被控制在n秒后再执行，如果时间内再次触发函数则重新计时。</p><p>举例：在一定时间内点击两次按钮，只有最后一次有效。</p><h2 id="怎么实现函数节流" tabindex="-1">怎么实现函数节流？ <a class="header-anchor" href="#怎么实现函数节流" aria-label="Permalink to &quot;怎么实现函数节流？&quot;">​</a></h2><p>使用定时器对函数调用进行限制。</p><p>每次调用函数时创建定时器，传入所需函数。每次只有当函数执行完毕后才能重新创建定时器。这样，一定时间内频繁调用函数时，如果定时器正在生效则不会再次调用。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>function throttle(fn, wait) {</span></span>
<span class="line"><span>    var time = null</span></span>
<span class="line"><span>    return function() {</span></span>
<span class="line"><span>        if (!time) {</span></span>
<span class="line"><span>            time = setTimeout(function() {</span></span>
<span class="line"><span>                fn.apply(this, ...arguments);</span></span>
<span class="line"><span>                time = null</span></span>
<span class="line"><span>            }, wait)</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>调用方法：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>document.body.onmousemove = throttle(() =&gt; {</span></span>
<span class="line"><span>    console.log(&#39;我1秒只执行一次&#39;)</span></span>
<span class="line"><span>}, 1000)</span></span></code></pre></div><h2 id="怎么实现函数防抖" tabindex="-1">怎么实现函数防抖？ <a class="header-anchor" href="#怎么实现函数防抖" aria-label="Permalink to &quot;怎么实现函数防抖？&quot;">​</a></h2><p>根据上面的解释，调用n秒后生效，如果这段时间内重复调用，则重新设置定时。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>function noTremble(fn, wait) {</span></span>
<span class="line"><span>    var time = null</span></span>
<span class="line"><span>    return function() {</span></span>
<span class="line"><span>        if (time) {</span></span>
<span class="line"><span>            clearTimeout(time)</span></span>
<span class="line"><span>            time = null</span></span>
<span class="line"><span>        }</span></span>
<span class="line"><span>        time = setTimeout(() =&gt; {</span></span>
<span class="line"><span>            fn.apply(this, ...arguments)</span></span>
<span class="line"><span>        }, wait)</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>调用方法：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span>document.body.onmousemove = noTremble(() =&gt; {</span></span>
<span class="line"><span>    console.log(&#39;1秒内重复调用，我只执行最后一次&#39;)</span></span>
<span class="line"><span>}, 1000)</span></span></code></pre></div>`,17),l=[t];function i(o,c,r,d,h,u){return n(),a("div",null,l)}const b=s(e,[["render",i]]);export{g as __pageData,b as default};
