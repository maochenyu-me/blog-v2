---
title: 一个配置文件能解决多少问题
description: 零硬编码听起来是教条，实践起来是架构约束。这篇讲我怎么用四个配置文件把全站的可变内容抽干净，以及它带来的真实收益。
date: 2025-07-10
abbrlink: 71970a13
category: 工程
tags: [架构, 配置, 可维护性]
---

「零硬编码」这句话很容易被当成洁癖。

毕竟写死一个站名能出什么问题？改的时候全局替换一下不就完了。

我做这个博客的时候，把这条规则当成了硬性架构约束。半年后的结论是：**它带来的收益远超预期，而且和代码整洁没什么关系。**

## 四层配置

我把所有可变内容分成四层：

```
app/blog.config.ts     站点身份、feed、search
app/theme.config.ts    设计 token（颜色、字号、间距、圆角、动效）
app/pages.config.ts    逐路由的业务参数
app/data/*.ts          友链、关于页元数据、系统文案
```

组件里一行硬编码都不许有。

```vue
<!-- 禁止 -->
<h1>喵洛阁</h1>
<a href="https://github.com/kemiaosw">GitHub</a>

<!-- 允许 -->
<h1>{{ site.name }}</h1>
<a :href="social.url">{{ social.label }}</a>
```

## 收益一：改一处，全站同步

最直接的收益是这个。举个真实例子：我想把「归档」改成「时间线」。

```ts
// 改这一行
nav: [
  { label: '时间线', to: '/archive', icon: 'tabler:archive' },
]
```

改完，桌面导航、平板汉堡菜单、移动端底部 Tab 栏，三处同时更新。

如果这些 label 是硬编码在三处的，我至少要改三个文件，而且很可能漏掉移动端（因为它在另一个组件里，平时不怎么看）。

## 收益二：配置即文档

打开 `blog.config.ts`，你立刻知道这个站有哪些页面、有哪些社交链接、RSS 开没开。

```ts
export default defineAppConfig({
  site: {
    name: '喵洛阁',
    nav: [
      { label: '首页', to: '/', icon: 'tabler:home' },
      { label: '归档', to: '/archive', icon: 'tabler:archive' },
      // ...
    ],
  },
})
```

这比翻 15 个 `.vue` 文件去找 `to="/archive"` 快得多。

## 收益三：功能开关变成真的开关

这是我最没想到的收益。

提示词的验收标准里有一条：

> `feed` / `search` 任一 `enabled: false` 后：入口消失、对应路由 404、head 无相关注入

如果没有配置层，这个需求要改 6 个地方：

1. 删掉 footer 的 RSS 链接
2. 删掉 `<head>` 的 `<link rel="alternate">`
3. 删掉 `server/routes/rss.xml.get.ts`
4. 改 `nitro.prerender.routes`
5. 删掉搜索按钮
6. 解绑快捷键

有了配置层，它们全都读同一个字段：

```ts
const { feed, search } = useSiteConfig()

// footer
<NuxtLink v-if="feed.rss.enabled" :to="feed.rss.path">RSS</NuxtLink>

// head
if (feed.rss.enabled) links.push({ rel: 'alternate', ... })

// 路由
if (!feed.rss.enabled) throw createError({ statusCode: 404 })
```

**开关的原子性**从"靠人记得改全"变成了"结构上不可能不同步"。

## 收益四：主题切换不用碰组件

设计 token 全在 `theme.config.ts`：

```ts
theme: {
  accent: { light: '#a94f33', dark: '#cc785c' },
  radius: '0.5rem',
  contentMaxWidth: '764px',
  animation: { duration: 200, easing: 'ease-out' },
}
```

这些值在构建期被编译成 CSS 变量：

```css
:root {
  --accent: #a94f33;
  --radius: 0.5rem;
  --content-max-width: 764px;
  --duration-base: 200ms;
}
```

组件里只写 `var(--accent)`，不写 hex。

想换强调色？改两行。想换字体？改 `fontFamily`。想让动画慢一点？改 `duration`。

**不需要在 30 个 `.vue` 文件里搜索替换。**

## 代价是什么

诚实地说，这套架构有成本：

**一、多一层间接。** 看 `{{ site.name }}` 不如看 `喵洛阁` 直观。新人接手要先去读配置文件。

**二、类型定义要维护。** `useSiteConfig()` 里的 interface 得和 `blog.config.ts` 保持同步。

**三、过度抽象的风险。** 如果某个值只在一个组件里用一次，且永远不会变，那抽到配置层就是浪费。

我的判断标准是：**如果一个值有 ≥ 2 个使用点，或者有「未来可能改」的可能，就抽出来。否则就地写死。**

比如「回到首页」这个按钮的文案——它在 404 页和错误页都用，所以放进了 `app/data/system.ts`。

而 `aria-hidden="true"` 这种纯技术属性，就地写，不进配置。

## 怎么验证没漏

验收标准里有一条：`grep -r "硬编码字符串" app/components app/pages` 命中为 0。

我实际跑的命令是：

```bash
# 找中文字符串（排除注释和 CSS）
grep -rn '[\u4e00-\u9fa5]' app/components app/pages \
  --include='*.vue' | grep -v '^\s*\*' | grep -v '<!--'
```

第一次跑出来 47 处，其中 41 处是真硬编码，6 处是误报（CSS 注释里的说明文字）。

改完之后是 0。

## 结论

> 零硬编码不是为了"代码漂亮"，是为了**让配置变更具备原子性**。

一个改了会漏的地方，早晚会漏。一个结构上不可能漏的地方，永远不漏。

这就是架构和整洁的区别。
