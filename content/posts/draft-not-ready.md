---
title: 草稿：还没想好标题的一篇
description: 这是一篇 draft，不应该出现在生产构建里，也不该进 RSS、不该进搜索索引、不该出现在任何列表。
date: 2025-11-01
abbrlink: f44f42ce
category: 随笔
tags: [草稿]
draft: true
---

如果这篇文章在生产环境可见，说明 draft 过滤逻辑有问题。

## 检查清单

- [ ] 首页列表里没有它
- [ ] 归档页没有它
- [ ] 分类页没有它
- [ ] 标签页没有它
- [ ] `/rss.xml` 里没有它
- [ ] `/atom.xml` 里没有它
- [ ] `/api/search-index.json` 里没有它
- [ ] 直接访问 `/posts/draft-not-ready` 应该 404

## 正文

Lorem ipsum 之类的东西就不写了。这里只是用来验证过滤。

真正要检查的是：构建产物里有没有这个 slug 对应的 HTML 文件。

```bash
# 构建后检查
find .output/public/posts -name '*draft*'
# 应该没有任何输出
```
