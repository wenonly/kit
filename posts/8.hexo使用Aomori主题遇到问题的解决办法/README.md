---
title: hexo使用Aomori主题遇到问题的解决办法
date: 2021-11-21 14:39:23
categories: 其它
tags:
- hexo
- 主题
---

# 问题一：使用`Aomori`主题`cover`和`photos`配置图片路径不正确

在使用`cover`和`photos`字段设置图片后，按理来说路径应该拼接文章根路径，但是却拼接的是整个网站的根路径，明显不正确。

比如：
```yml
# /2021/11/21/hexo使用Aomori主题遇到问题的解决办法/ 文章下配置cover字段
---
title: hexo使用Aomori主题遇到问题的解决办法
date: 2021-11-21 14:39:23
categories: 其它
tags:
- hexo
- 主题
cover: cover.png # 这是文章封面
---
# 图片路径应该渲染成 /2021/11/21/hexo使用Aomori主题遇到问题的解决办法/cover.png
# 图片路径实际渲染成 /cover.png
```

需要给图片路径拼接文章路径`<%- url_for(post.path) %>`，修改主题内以下文件可修复问题：

1. `/themes/hexo-theme-aomori/layout/_partial/post/gallery.ejs`
```ejs
<!-- 修改前 -->
<img src="<%- url_for(photo) %>" itemprop="image">
<!-- 修改后 -->
<img src="<%- url_for(post.path) %><%- url_for(photo) %>" itemprop="image">
```
2. `/themes/hexo-theme-aomori/layout/_partial/article-index.ejs`
```ejs
<!-- 修改前 -->
<img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'%3E%3C/svg%3E"
    data-src="<%- url_for(post.cover || post.photos[0]) %>"
    alt="item.title"
    class="lazy"
/>
<!-- 修改后 -->
<img
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'%3E%3C/svg%3E"
    data-src="<%- url_for(post.path) %><%- url_for(post.cover || post.photos[0]) %>"
    alt="item.title"
    class="lazy"
/>
```

# 问题二：在公共`_config.yml`文件中配置`favicon`无效

1. 将`favicon`配置在主题内`_config.yml`中。
2. 修改`/Users/taowen/project/blog/themes/hexo-theme-aomori/layout/_partial/head.ejs`文件，将`config`改为`theme`。
```ejs
<!-- 修改前 -->
<% if (config.favicon){ %>
<link rel="icon" href="<%- config.favicon %>">
<% } %>
<!-- 修改后 -->
<% if (theme.favicon){ %>
<link rel="icon" href="<%- theme.favicon %>">
<% } %>
```
```