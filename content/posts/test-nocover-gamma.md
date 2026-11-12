---
title: 测试文章丙：无封面的普通文章
description: 这是首页改版验收用的测试文章丙，没有封面字段，卡片应回退到默认占位图，不报错。
date: 2026-10-10
abbrlink: 83a4f0ba
category: 随笔
tags: [测试]
aisummary: "测试文章丙为首页改版验收使用的普通文章，frontmatter 中未包含 cover 字段。验证无 cover 时卡片应回退默认占位图，不进入轮播。构建过程中需确保无 schema 校验错误，正文内容仅作为占位用于验收，验收完成后可删除。"
---

这是首页改版验收用的测试文章丙，frontmatter 里没有 cover 字段。

## 验证点

- 无 cover → 卡片回退默认占位图（public/images/covers/default.svg）
- 不进轮播（featuredPosts 过滤条件含 cover）
- 构建无 schema 校验错误

正文内容仅用于占位验收，验收完成后可删除。
