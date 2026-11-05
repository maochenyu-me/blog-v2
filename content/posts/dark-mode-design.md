---
title: 暗色模式不是把颜色反过来
description: 反转配色是最省事的做法，也是最糟的做法。暗色模式需要重新设计对比度、阴影、饱和度和层级关系。
date: 2025-07-25
category: 设计
tags: [暗色模式, 设计, 可访问性]
---

我见过太多暗色模式是这样的：

```css
/* 这就是全部实现 */
.dark {
  filter: invert(1) hue-rotate(180deg);
}
```

或者稍微认真一点的：

```css
.dark {
  --bg: #000;
  --text: #fff;
}
```

两种都错。

## 为什么不能简单反转

### 一、纯黑配纯白太刺眼

白底黑字的对比度是 21:1，这是物理极限。

在亮环境下这没问题——瞳孔小，进光量少。但在暗环境下，你的瞳孔放大了，屏幕成了唯一光源，21:1 的对比度会让眼睛很快疲劳。

所以暗色模式的标准做法是：

```css
.dark {
  --background: #09090b;  /* 不是 #000 */
  --foreground: #fafafa;  /* 不是 #fff */
}
```

对比度降到约 19:1。差别不大，但长时间阅读舒服很多。

### 二、纯黑背景会让阴影失效

亮色模式下阴影是黑色半透明：

```css
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
```

暗色模式下把同一个阴影放在 `#09090b` 上——你什么都看不见。黑色叠黑色。

这就是为什么**暗色模式通常完全禁用阴影**，改用边框或者亮度差来区分层级：

```css
.dark * {
  box-shadow: none;
}

/* 用亮一点的面表达"浮起来" */
.dark {
  --surface: #18181b;      /* 页面底 #09090b，卡片 #18181b */
  --surface-hover: #27272a;
}
```

### 三、强调色必须重新调

同一个颜色在亮底和暗底上的感知完全不同。

我的强调色：

| 模式 | 值 | 对比度 | 说明 |
| --- | --- | --- | --- |
| 亮色 | `#a94f33` | 5.45 on `#fff` | 深陶土，压得住白底 |
| 暗色 | `#cc785c` | 6.07 on `#09090b` | 提亮 + 降饱和，不刺眼 |

如果暗色模式还用 `#a94f33`，它在深色底上会显得**脏**——像褪色的油漆。因为深色底会让低亮度颜色失去光泽。

反过来，如果亮色模式用 `#cc785c`，在白色上对比度只有 3.1:1，达不到 WCAG AA 的 4.5:1。

**所以强调色必须有两套值，这不是可选项。**

## 完整的变量对照

```css
:root {
  --background: #ffffff;
  --foreground: #18181b;
  --muted: #fafafa;
  --muted-foreground: #71717a;
  --border: #e4e4e7;
  --accent: #a94f33;
}

.dark {
  --background: #09090b;
  --foreground: #fafafa;
  --muted: #18181b;
  --muted-foreground: #a1a1aa;
  --border: #27272a;
  --accent: #cc785c;
}
```

注意 `--muted-foreground` 的变化：

- 亮色：`#71717a`，比正文浅，但仍能读
- 暗色：`#a1a1aa`，比正文暗，但仍能读

方向是反的，但**目的相同：比正文低一级，但保持可读**。

如果暗色模式直接用亮色模式的 `#71717a`，它在 `#09090b` 上的对比度只有 4.3:1——刚好在 AA 线下面。

## 三态切换而不是两态

只用两态（亮/暗）有个问题：用户系统里设了「跟随时间自动切换」，但网站不认。

所以我的实现是三态：

```ts
type ThemeMode = 'light' | 'dark' | 'system'
```

`system` 模式下监听 `prefers-color-scheme`：

```ts
const mq = matchMedia('(prefers-color-scheme: dark)')

mq.addEventListener('change', () => {
  if (mode.value === 'system') {
    applyTheme(mq.matches)
  }
})
```

这样用户在系统里切了主题，网站立刻跟上，不需要手动点。

## 防止闪烁（FOUC）

最烦人的 bug：页面先渲染成亮色，200ms 后闪成暗色。

原因是 CSS 变量在 JS 执行后才生效。解法是在 `<head>` 里插一段**同步执行**的脚本：

```html
<script>
  (function () {
    try {
      var m = localStorage.getItem('theme-mode')
      var d = m === 'dark' || ((!m || m === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', d)
    } catch (e) {}
  })()
</script>
```

关键点：

- 必须是**内联**的（外部脚本要等网络）
- 必须**同步**（`defer`/`async` 都会晚）
- 必须在 `<head>` 里（`<body>` 末尾太晚）
- 必须包 `try/catch`（隐私模式下 `localStorage` 会抛异常）

## 一句话

> 暗色模式是第二套设计，不是第一套的滤镜。

它需要独立的对比度核算、独立的阴影策略、独立的强调色。省掉这些步骤，出来的东西就是"能看但难受"。
