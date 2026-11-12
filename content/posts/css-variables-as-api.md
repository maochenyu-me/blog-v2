---
title: 我把 CSS 变量当成了 API
description: 设计 token 写进配置文件，构建期编译成 CSS 变量，组件只读变量。这套做法让「改一处，全站生效」从口号变成了构建期保证。
date: 2025-04-20
abbrlink: 7d72abe8
category: 前端
tags: [CSS, 设计系统, 构建]
aisummary: "文章探讨了如何通过使用CSS变量和生成CSS文件来确保设计系统的一致性。核心在于让所有样式变量统一来源于配置文件，避免硬编码。动态变量用于颜色等需要随主题变化的属性，而静态变量用于不变化的样式如字号和间距。这种方法提升了换肤效率，确保暗色模式正确应用，并为设计评审提供明确依据。最终目标是让遵循设计系统变得简单，绕过它则更加困难。"
---

设计系统最难的部分不是"定义一套变量"，是**保证没人绕过它**。

你可以写一份完美的 `tokens.css`，但只要有人在某个组件里写了 `style="margin-top: 24px"`，系统就开始腐烂了。

## 我的做法：让 token 只有一个来源

```
app/theme.config.ts   ← 唯一的真相源（TypeScript 对象）
        ↓ 构建期编译
tokens.generated.css  ← 自动生成，不手改
        ↓
组件里的 var(--accent)  ← 只读变量
```

关键在中间那一步：**CSS 不是手写的，是生成的。**

```ts
// modules/design-tokens.ts（简化）
const theme = await import('../app/theme.config.ts')

const css = `
:root {
  --accent: ${theme.accent.light};
  --background: ${theme.neutral.light.background};
  --content-max-width: ${theme.contentMaxWidth};
  --duration-base: ${theme.animation.duration}ms;
}

.dark {
  --accent: ${theme.accent.dark};
  --background: ${theme.neutral.dark.background};
}
`
```

这样如果有人想改强调色，他**只能**去改 `theme.config.ts`——因为 CSS 文件里改的东西下次构建就没了。

## 一个必须解决的坑

Tailwind v4 用 `@theme` 块定义工具类：

```css
@theme {
  --color-accent: #a94f33;
}
```

这会生成 `bg-accent`、`text-accent` 等工具类。

**但如果你把 hex 直接写进去，暗色模式就失效了**——因为 `--color-accent` 被编译进了工具类，`.dark` 里覆盖 `--accent` 不会影响它。

正确做法是让 `@theme` 指向动态变量：

```css
@theme {
  --color-accent: var(--accent);  /* 不是 hex */
}

:root { --accent: #a94f33; }
.dark { --accent: #cc785c; }
```

这样 `bg-accent` 编译出的 CSS 是 `background-color: var(--accent)`，会跟随主题切换。

我第一次写的时候踩了这个坑，暗色模式下所有强调色都不变，排查了半小时。

## 静态 token 和动态 token 要分开

不是所有 token 都需要跟随主题切换。

| 类型 | 例子 | 放哪 |
| --- | --- | --- |
| 动态（明暗不同） | 颜色 | `:root` + `.dark` |
| 静态（明暗相同） | 字号、间距、圆角、动效时长 | 只放 `:root` |

把字号也放进 `.dark` 里是浪费——它不会变，重复声明只会让 CSS 变长。

## 为什么不用 CSS-in-JS

有人会问：为什么不直接在 JS 里算好样式？

三个理由：

**一、SSR 友好。** CSS 变量在 HTML 里就能生效，不需要等 JS 执行。

**二、无运行时开销。** 构建期生成，运行时零成本。

**三、可被浏览器优化。** 变量切换只是重绘，不触发重排。

## 组件里怎么写

```vue
<template>
  <button class="btn">点击</button>
</template>

<style scoped>
.btn {
  background-color: var(--accent);
  border-radius: calc(var(--radius) / 2);
  padding: var(--space-item) var(--space-block);
  transition: opacity var(--duration-base) var(--easing-base);
}
</style>
```

注意这里**没有一个魔法数字**：

- `var(--accent)` 而不是 `#a94f33`
- `calc(var(--radius) / 2)` 而不是 `4px`
- `var(--duration-base)` 而不是 `200ms`

## 怎么验证没绕过

验收标准里有一条：改一个 token，全站视觉同步更新。

我的验证方法是**改一个不可能看错的值**：

```ts
// theme.config.ts
accent: { light: '#ff0000', dark: '#00ff00' }
```

重新构建，全站所有强调色（导航下划线、焦点环、搜索高亮、引用线）都应该变成红绿。

如果有任何一处没变，说明那里是硬编码的。

## 收益

半年下来，这套做法带来的实际好处：

**一、换肤成本 ≈ 0。** 想试新的强调色，改两行，刷新。

**二、暗色模式不可能漏。** 因为颜色全是变量，`.dark` 块里定义一次就够。

**三、设计评审有依据。** 讨论"这个圆角是不是太大"时，看的是 `theme.config.ts` 里的 `radius: '0.5rem'`，不是某个组件里的 `border-radius: 12px`。

## 一句话

> 设计 token 的价值不在于"有一份变量表"，而在于**让绕过它变得比遵守它更麻烦**。

这才是系统。
