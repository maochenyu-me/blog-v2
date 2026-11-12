---
title: 中文分词为什么把搜索做坏了
description: MiniSearch 默认按空格切词，对中文来说等于完全失效。这篇讲 CJK 该怎么切，以及 bigram 加单字兜底为什么比单纯整词匹配更靠谱。
date: 2025-09-30
abbrlink: 26fa10db
category: 工程
tags: [搜索, MiniSearch, 中文]
aisummary: "中文分词对搜索效果影响显著，英文分词方式不适用于中文。使用单字切分召回率高但精度差，整词切分质量好但依赖词典且体积大，bigram 则在无需词典的情况下提升匹配能力，但无法处理单字查询。最终采用 bigram 加单字兜底方案，在保证基本召回的同时控制索引体积，同时通过字段权重优化结果排序。"
---

给博客加搜索时，我踩了一个坑：英文关键词搜得挺准，中文关键词一个都搜不到。

原因很简单——**MiniSearch 默认的 tokenizer 按空格和标点切词**。

对英文来说这没问题：

```ts
tokenize('hello wonderful world')
// ['hello', 'wonderful', 'world']
```

对中文来说这就是灾难：

```ts
tokenize('中文分词为什么把搜索做坏了')
// ['中文分词为什么把搜索做坏了']   ← 一整段算一个词
```

整段算一个词意味着：用户搜「分词」，匹配不上；搜「搜索」，也匹配不上。只有把整句原样打进去才可能命中。

## 三种切法

### 方案一：单字切分

```ts
tokenize('中文分词')
// ['中', '文', '分', '词']
```

召回率最高，因为任何两个字以上的词都包含单字。

但精度是灾难级的：搜「的」会命中所有文章；搜「一」几乎命中全站。搜索结果里全是噪音。

### 方案二：整词切分（需要词典）

用结巴之类的分词库，或者自己做词典最长匹配：

```ts
tokenize('中文分词为什么把搜索做坏了')
// ['中文', '分词', '为什么', '把', '搜索', '做', '坏', '了']
```

质量最好，但代价是：

- 要打包一份词典（几百 KB 到几 MB）
- 新词、专有名词、缩写经常分错
- 前端体积受不了

对一个 3KB 的搜索来说，这个方案太贵了。

### 方案三：bigram（我的选择）

每两个相邻字符算一个 token：

```ts
tokenize('中文分词')
// ['中文', '文分', '分词']
```

关键特性：**任何长度 ≥ 2 的词，都必然包含它自己的完整 bigram。**

- 「分词」→ 出现在 `['中文', '文分', '分词']` 里 ✓
- 「搜索」→ 出现在「把搜索做」的 bigram 里 ✓

所以用户输入一个词，就能匹配到包含它的句子，不需要词典。

### 为什么不直接用方案三

纯 bigram 有个缺口：**单字查询召回为 0**。

用户搜「猫」，没有 bigram 能匹配上「喵洛阁的猫」。

所以我的实现是 bigram 为主 + 单字兜底：

```ts
function tokenizeCJK(text: string): string[] {
  const tokens: string[] = []
  // 按非字母数字汉字切段
  const segments = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

  for (const seg of segments) {
    const isCJK = /[\u4e00-\u9fa5]/.test(seg)

    if (!isCJK) {
      // 英文/数字：整词，转小写
      tokens.push(seg.toLowerCase())
      continue
    }

    const chars = [...seg]
    // bigram
    for (let i = 0; i < chars.length - 1; i++) {
      tokens.push(chars[i] + chars[i + 1])
    }
    // 单字兜底：短查询用
    for (const ch of chars) {
      tokens.push(ch)
    }
  }

  return tokens
}
```

单字会让索引变大一些、噪音多一点，但换来的是**单字查询不会零结果**。

## 权重比切词更重要

切对了之后还有个问题：搜「前端」，一篇标题叫《前端工程化》的和一篇正文里提到一次「前端」的，应该谁排前面？

MiniSearch 支持字段权重：

```ts
const miniSearch = new MiniSearch({
  fields: ['title', 'description', 'tags', 'category', 'text'],
  storeFields: ['title', 'path', 'date'],
  searchOptions: {
    boost: { title: 8, description: 4, tags: 3, category: 2, text: 1 },
    prefix: true,
    fuzzy: 0.2,
  },
  tokenize: tokenizeCJK,
})
```

标题权重 8 倍于正文。这样标题命中永远排在正文命中前面——这也正是验收标准要求的「标题命中权重最高」。

## 实测

改之前：

```
搜「前端」→ 0 结果
搜「分词」→ 0 结果
```

改之后：

```
搜「前端」→ 3 结果，第一条《我删掉了站点的 90% 功能》
搜「分词」→ 1 结果，第一条《中文分词为什么把搜索做坏了》
搜「猫」  → 1 结果，《关于这个博客》（正文提到「猫」）
搜「排版」→ 1 结果，《排版比配色更决定气质》
```

## 一句话总结

中文搜索的难点不在算法，在**分词策略和你的用户输入习惯是否匹配**。

bigram 不是最优解，但对一个没有后端、索引要压到 300KB 以内的静态博客来说，它是性价比最高的那个解。
