---
title: 静态博客的搜索为什么不用后端
description: 300KB 的索引、一次懒加载、纯前端查询。对一个几百篇文章的博客来说，这个方案比任何搜索引擎都合适。
date: 2025-09-05
abbrlink: ff906e7f
category: 工程
tags: [搜索, 架构, SSG]
---

每次有人问我"静态博客怎么做搜索"，标准答案通常是这四种：

1. Algolia（要付费、要联网、要等索引同步）
2. MeiliSearch（要跑一个服务）
3. Pagefind（好，但更偏向几千页以上的站）
4. 搜索引擎的 `site:` 语法（等于没有）

我用的是第五种：**构建时生成一个 JSON 索引，前端按需加载**。

## 索引长什么样

```json
[
  {
    "id": "typography-over-color",
    "title": "排版比配色更决定气质",
    "description": "把同样一套颜色交给两个人排，出来的东西可以完全不同。",
    "tags": ["排版", "设计", "CSS"],
    "category": "设计",
    "text": "做前端这些年我逐渐发现一个规律换一套配色页面会变好看改一遍排版页面会变成另一个东西…",
    "path": "/posts/typography-over-color",
    "date": "2025-10-28T00:00:00.000Z"
  }
]
```

就这些字段，一个都不多。

## 为什么这么小

假设你有 100 篇文章，每篇 3000 字。

- 原始 markdown：100 × 3000 × 3 bytes ≈ 900 KB
- HTML 渲染后：大约 2.5 MB（标签很占地方）
- **剥离 HTML 后的纯文本**：约 850 KB
- gzip 之后：**约 180 KB**

关键动作是**剥 HTML**。这一步能砍掉 60% 以上。

```ts
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')   // 代码块也剥掉
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
```

那行 `<pre>` 的处理是有争议的。代码块里全是 `useState`、`div`、`const` 这种标识符，进索引只会制造噪音——用户搜「前端」不该命中一个满是 `div` 的代码块。

## 什么时候加载

**用户第一次打开搜索框的时候。**

不是页面加载时，不是空闲时，是真正按下 `Ctrl+K` 的那一刻。

```ts
let indexPromise: Promise<MiniSearch> | null = null

function ensureIndex() {
  if (!indexPromise) {
    indexPromise = fetch('/api/search-index.json')
      .then((r) => r.json())
      .then((docs) => {
        const ms = new MiniSearch({ /* ... */ })
        ms.addAll(docs)
        return ms
      })
  }
  return indexPromise
}
```

用一个 Promise 做缓存的好处是：连续按三次 `Ctrl+K` 也只会发一次请求。

## 加载要多久

本地测：180KB 的 JSON，`fetch` + `JSON.parse` + `addAll` 建索引，**大约 60~90ms**。

用户感知不到。但如果索引超过 500KB，这个数字会变成 300ms+，就该考虑分片或者换 Pagefind 了。

所以我的判断线是：**索引 gzip 后 300KB 以内用方案五，超过就用 Pagefind。**

对一个个人博客（几十到几百篇）来说，永远到不了这条线。

## 不用后端的三个好处

**一、离线可用。** Service Worker 缓存了索引之后，断网也能搜。

**二、零延迟。** 没有网络往返，搜索是同步的（建完索引之后）。

**三、部署即生效。** 写文章 → `git push` → 构建 → 索引和文章一起上线。不需要"等 Algolia 爬"。

## 唯一的问题

索引是构建时生成的，所以：

**草稿不会被搜到。** 这是对的。

**但新文章要重新构建才能搜到。** 对静态博客来说这本来就是事实——文章本身也要重新构建才存在。

所以这个"缺点"根本不存在。

## 结语

技术选型的本质是匹配规模。

Algolia 对一万篇文章的电商站是对的；MeiliSearch 对需要实时索引的社区是对的；**一个 JSON 文件对个人博客是对的**。

用大炮打蚊子不叫稳健，叫没算清楚。
