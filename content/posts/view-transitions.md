---
title: View Transitions 不是动画库
description: 用它做页面切换、做主题扩散、做列表到详情的共享元素过渡。它真正的价值不是"让页面动起来"，而是让你不必手动管理进入和离开两套状态。
date: 2025-09-18
abbrlink: 7e4167d8
category: 前端
tags: [动画, 浏览器, CSS]
cover: /images/covers/view-transition.png
featured: true
---

第一次看到 `document.startViewTransition` 的时候，我以为它就是个更简单的 GSAP。

用了半年之后我发现，它真正解决的问题根本不是"怎么动画"。

## 它解决的是什么问题

传统的页面转场动画难写，不是因为 CSS 难，而是因为**你要同时管理两个状态**。

从列表页跳到详情页，你得：

1. 给旧页面加一个 "leaving" 类
2. 等动画结束
3. 卸载旧页面
4. 挂载新页面
5. 给新页面加一个 "entering" 类
6. 再等动画结束

六个步骤，任何一步时序错一点就会闪。

View Transitions 把这六步变成了一个 API：

```ts
document.startViewTransition(() => {
  // 只在这里改 DOM，浏览器负责前后的快照和过渡
  renderNewPage()
})
```

浏览器会：对旧状态截图 → 执行你的回调 → 对新状态截图 → 在两帧之间做过渡。

**你只描述"变成什么样"，不描述"怎么变"。**

## 三种实际用法

### 一、页面切换

Nuxt 开了 `experimental.viewTransition` 之后，页面过渡可以完全用 CSS 控制：

```css
::view-transition-old(root) {
  animation: 200ms ease-out both fade-out;
}

::view-transition-new(root) {
  animation: 200ms ease-out both fade-in;
}

@keyframes fade-out {
  to { opacity: 0; }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
```

注意这里没有 JS。转场逻辑全在 CSS 里，JS 只负责换内容。

### 二、主题切换的圆形扩散

这个效果很多人以为是手写 `clip-path` 加 `requestAnimationFrame`，其实可以完全交给 View Transitions：

```ts
async function toggleTheme(x: number, y: number) {
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )

  const transition = document.startViewTransition(() => {
    document.documentElement.classList.toggle('dark')
  })

  await transition.ready

  document.documentElement.animate(
    {
      clipPath: [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${radius}px at ${x}px ${y}px)`,
      ],
    },
    {
      duration: 200,
      easing: 'ease-out',
      pseudoElement: '::view-transition-new(root)',
    },
  )
}
```

关键在 `pseudoElement: '::view-transition-new(root)'`——你不是在动画真实 DOM，是在动画浏览器的过渡快照层。所以这个动画**不会触发重排**。

### 三、列表到详情的共享元素

给元素一个 `view-transition-name`：

```css
.post-card__title { view-transition-name: post-title; }
.post-detail__title { view-transition-name: post-title; }
```

两个页面上同名，浏览器就会把它们当成同一个元素，自动做位置和尺寸的插值。

```css
::view-transition-old(post-title),
::view-transition-new(post-title) {
  animation-duration: 250ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 必须知道的三个限制

**一、同一时间只能有一个 `view-transition-name` 在页面上。**

如果列表里有 10 张卡片都叫 `post-title`，浏览器会直接报错、整个过渡失效。所以列表页通常不给每张卡单独命名，只在用户点击时动态设置。

**二、动画期间页面不可交互。**

过渡快照覆盖在真实 DOM 之上。所以别做超过 300ms 的转场。

**三、必须尊重 `prefers-reduced-motion`。**

```ts
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const supported = 'startViewTransition' in document

if (!supported || reduceMotion) {
  // 直接切，不做动画
  applyChange()
  return
}
```

这不是可选项。前庭功能障碍的用户会因为这种动画头晕。

## 什么时候不该用

- **表单提交后的状态更新** —— 不需要转场，用户只想知道成功了没
- **列表项的 hover 效果** —— 那是微交互，用 `transition` 就够了
- **超过 300ms 的复杂编排** —— 会让人等

View Transitions 的定位是**页面级的状态切换**，不是"万能动画方案"。

## 一句话

> 它把"两套状态之间怎么过渡"这件麻烦事，从你手里拿走了。

这可能不是最酷的动画 API，但它是我用过最省心的那个。
