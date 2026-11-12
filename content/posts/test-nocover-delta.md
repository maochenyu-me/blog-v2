---
title: 测试文章丁：无封面但标记推荐
description: 这是首页改版验收用的测试文章丁，featured 为 true 但没有封面，轮播应自动跳过它。
date: 2026-09-28
abbrlink: 3583b08f
category: 公告
tags: [测试]
featured: true
aisummary: "测试文章丁为首页改版验收使用，设置 featured 为 true 但未提供 cover。验证 featured 文章在无封面情况下是否会被轮播跳过，同时检查卡片流是否显示占位图。此外，测试 featured 缺省值兼容性，确保老文章未填写 featured 时不报错。正文内容仅作占位验收，验收后可删除。"
---

这是首页改版验收用的测试文章丁，featured 为 true 但没有 cover。

## 验证点

- featured + 无 cover → **被轮播跳过**（featuredPosts 过滤条件要求 cover）
- 卡片流显示占位图
- featured 缺省值兼容：老文章不写 featured 不报错

正文内容仅用于占位验收，验收完成后可删除。
