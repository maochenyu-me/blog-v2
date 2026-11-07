# 02 · 文章目录吸顶修复方案

> 状态：**已实施并通过验收**（2026-11-06，见 §6）　|　影响范围：文章页目录（桌面 ≥1280px）
> 前置文档：[01-design-plan.md](./01-design-plan.md) §1.3 布局、§1.5 设计原则、Q11 目录位置

---

## 1. 问题

文章页右侧 200px 目录**声明了 `position: sticky` 却不生效**，一滚动就跟着正文一起离开视口，
读者无法在长文阅读中随时跳章节。

### 1.1 实测复现

环境：`http://localhost:3000/posts/zero-hardcode`，视口 1332×753（浏览器窗口 1600×900）。

| 页面 scrollY | `.post-aside` top | `.toc-desktop` top |
| --- | --- | --- |
| 0 | 121 | 121 |
| 400 | **−279** | **−279** |
| 900 | −779 | −779 |
| 1600 | −1479 | −1479 |
| 2400 | −2279 | −2279 |
| 3200 | −3079 | −3079 |

滚动 400px 时目录已完全滚出视口（top = −279），且两元素**始终同步位移**。

### 1.2 根因

`app/components/server/ProseToc.vue` 把 sticky 挂在 `<nav class="toc-desktop">` 上（234-247 行）：

```css
@media (min-width: 1280px) {
  .toc-desktop {
    display: block;
    position: sticky;   /* ← 挂错层级 */
    top: 5rem;
    max-height: calc(100dvh - 8rem);
    overflow-y: auto;
  }
}
```

sticky 的**包含块是最近的块级祖先**，即 `app/pages/posts/[slug].vue` 里的
`<aside class="post-aside">`（129 行）。而 `.post-shell` 是 grid 且 `align-items: start`，
aside 作为 grid item 只按内容收缩到 232.75px 高。

> sticky 的可滑动区间 = 包含块高度 − 元素高度 = 232.75 − 232.75 = **0**

区间为 0，sticky 退化为 static，所以它跟着父元素一起滚走。

### 1.3 为什么参考站（2x.nz）有效

参考站的 sticky **挂在 grid item 的 `<aside>` 本身上**：

```html
<aside aria-label="文章目录" class="hidden lg:sticky lg:top-[calc(...)] lg:block">
```

grid item 的包含块是**整个 grid area（整行高度）**，而整行高度由正文列撑开（几千 px），
可滑动区间充足。实测其 aside 在 scrollY=500/1500/3000 时 top 恒为 53（= header 52.5px + 0.5px），
滚到文章末尾时随 grid area 结束而上移 —— 这正是我们要的行为。

---

## 2. 已验证的修法

在真实页面上注入下面这段 CSS 后实测（同一视口，视口高 680）：

| scrollY | `.post-aside` top | `.toc-desktop` top |
| --- | --- | --- |
| 0 | 121 | 121 |
| 400 | **80** | 80 |
| 1200 | **80** | 80 |
| 2400 | **80** | 80 |
| 3200 | **80** | 80 |
| 4200 | **80** | 80 |

```css
@media (min-width: 1280px) {
  .post-aside {
    position: sticky;
    top: calc(3.5rem + 1.5rem);            /* header 高 + 呼吸间距 = 80px */
    align-self: start;
    max-height: calc(100dvh - 3.5rem - 3rem);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .toc-desktop {                            /* 退回普通块 */
    position: static;
    max-height: none;
    overflow: visible;
  }
}
```

同时验证了「目录本身超长时内部独立滚动」：人为把目录塞到 847px 高、容器限高 200px，
`nav.scrollTop = 80` 生效（`scrollTop` 读数 80），页面 scrollY 保持 1600 不变，
`overscroll-behavior: contain` 可防止滚到底后带动页面。

---

## 3. 改动清单

### 3.1 `app/theme.config.ts` — 新增两个 token

```ts
/** 顶部导航高度。文章页目录吸顶偏移与锚点避让都从它推导，禁止各处再写 3.5rem */
headerHeight: '3.5rem',

toc: {
  enabled: true,
  position: 'right' as const,
  minDepth: 2,
  maxDepth: 3,
  /** 吸顶时目录与顶部导航之间保留的间距 */
  stickyOffset: '1.5rem',
},
```

> 注：`mobileCollapsible` 已在 [03-toc-mobile.md](03-toc-mobile.md) 中删除（移动端改为导航栏按钮 + 抽屉，不再需要内联折叠开关）。

理由：目前 `3.5rem` 硬编码在 `SiteHeader.vue:36`、`MobileDrawer.vue:212` 两处，
而目录吸顶偏移与锚点 `scroll-margin-top` 都必须和它一致。三处各写一遍就是三个真相源。

### 3.2 `modules/design-tokens.ts` — 生成对应 CSS 变量

在 `:root` 块追加：

```css
--header-height: 3.5rem;
--toc-sticky-offset: 1.5rem;
```

### 3.3 `app/components/server/ProseToc.vue` — 挪走 sticky + 重写高亮

**样式**：`.toc-desktop` 的 `@media (min-width: 1280px)` 块改为

```css
.toc-desktop {
  display: block;
  width: 100%;          /* 宽度由 grid 列（--toc-width）决定 */
}
```

`position / top / max-height / overflow-y` 全部移交 `[slug].vue` 的 `.post-aside`。

**高亮**：现有 IntersectionObserver 版本实测**完全失效** —— 滚到 scrollY=2400 时
`activeIndex = -1`（8 个条目一个都没被标记 `is-active`）。原因：
`rootMargin: '-80px 0px -70% 0px'` 只在标题「进入/离开」的瞬间回调，
回调里又只认 `isIntersecting` 的条目，两个标题之间必然出现空集，空集时不更新也不清空，
一旦所有标题都离开观察带就再也不会恢复。

改为按滚动位置判定（纯计算，9 个以内标题开销可忽略）：

```ts
/** 阅读线 = 标题的 scroll-margin-top（与吸顶偏移同一个 token），
 *  避免 JS 侧再复制一份 80px */
const readingLine = () => {
  const first = headings[0]
  return first ? parseFloat(getComputedStyle(first).scrollMarginTop) || 0 : 0
}

const syncActive = () => {
  let current = ''
  for (const h of headings) {
    if (h.getBoundingClientRect().top <= line) current = h.id
    else break
  }
  // 滚到底时正文可能撑不满一屏，强制高亮最后一节
  const atBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
  activeId.value = atBottom ? headings[headings.length - 1].id : current
}
```

用 `passive` scroll 监听，另监听 `resize` 与 `hashchange`，`onMounted` 立即跑一次
（直接带 `#锚点` 打开页面时也正确）。

> 实施时去掉了 rAF 节流：浏览器在标签页不可见时会把 rAF 降到 ~0fps，高亮会长期停在旧值；
> 标题在 9 个量级，纯 `getBoundingClientRect` 循环的开销远小于一次布局读写，直接同步计算即可。

> **踩到的真坑**：`onMounted` 时 `<ContentRenderer>`（异步组件）还没渲染出正文，
> `document.getElementById` 全部返回 `null`，`headings` 被永久固定成空数组，高亮从此不动。
> 修法是在 `syncActive()` 开头加一句重测守卫：
>
> ```ts
> if (headings.length !== flat.value.length) measure()
> ```
>
> 这类「一次性抓 DOM 锚点并永久信任」的写法在 Nuxt Content 场景一律不安全。

### 3.4 `app/pages/posts/[slug].vue` — 承接 sticky

`@media (min-width: 1280px)` 的 `.post-aside` 改为

```css
.post-aside {
  display: block;
  position: sticky;
  top: calc(var(--header-height) + var(--toc-sticky-offset));
  align-self: start;
  max-height: calc(100dvh - var(--header-height) - var(--toc-sticky-offset) * 2);
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

### 3.5 `app/components/server/ProseBody.vue` — 锚点避让改用 token

`h2`(31 行) 与 `h3`(42 行) 的 `scroll-margin-top: 5rem` 改为

```css
scroll-margin-top: calc(var(--header-height) + var(--toc-sticky-offset));
```

数值与现在的 5rem 完全相同（56 + 24 = 80px），**视觉零变化**，只是去掉一处硬编码。

### 3.6 `SiteHeader.vue` / `MobileDrawer.vue` — 换用 token

`height: 3.5rem` → `height: var(--header-height)`。同样视觉零变化。

### 3.7 `ProseToc.vue` — 当前项自动滚入视野（实施阶段追加）

高亮切换时，若当前项已滚出旁栏的可视范围，把它带回来：

```ts
/** 目录本身超长时，把当前项滚进目录的可见区（只动目录，不动页面） */
function revealActive() {
  const nav = navRef.value
  if (!nav) return
  const index = flat.value.findIndex((h) => h.id === activeId.value)
  const item = nav.querySelectorAll<HTMLElement>('.toc-item')[index]
  if (!item) return

  // 向上找最近的、真正可滚动的祖先（桌面端是 .post-aside）
  let container: HTMLElement | null = nav.parentElement
  while (container) {
    const overflowY = getComputedStyle(container).overflowY
    if (/(auto|scroll)/.test(overflowY) && container.scrollHeight > container.clientHeight + 1) break
    container = container.parentElement
  }
  if (!container) return

  const pad = 8
  const box = container.getBoundingClientRect()
  const rect = item.getBoundingClientRect()
  let delta = 0
  if (rect.top < box.top + pad) delta = rect.top - box.top - pad
  else if (rect.bottom > box.bottom - pad) delta = rect.bottom - box.bottom + pad
  if (!delta) return

  container.scrollTo({
    top: container.scrollTop + delta,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}
```

只在 `activeId` 真的变化时调用（`syncActive` 里 `if (next === activeId.value) return` 提前退出），
避免滚动风暴。用「向上找可滚动祖先」而不是硬编码 `.post-aside`，
是因为 `<1280px` 时旁栏不显示、将来若换布局也不用改这段。

---

## 4. 明确不做（本轮）

| 项 | 原因 |
| --- | --- |
| 高亮样式改药丸底色 | 你选了「保持现有样式」。且 01-design-plan §1.5 原则 2「1px 线 > 色块」、§1.6「无卡片」 |
| 移动端（<1280px）目录改造 | 你要求先把桌面端改完。折叠在正文顶部的形态本轮不动 |
| ~~目录内部滚动时自动把当前项滚入视野~~ | **已改为本轮实现**（见 §3.7）。原计划等长目录出现再做，但窗口高度小于 700px 或将来标题变多时就会溢出，提前做掉更省事 |
| 给目录加背景 / 边框 / 阴影 | 它在自己的 grid 列里，不会与正文重叠，无需遮盖层 |

---

## 5. 验证方式（改完当场跑）

1. **吸顶**：`/posts/zero-hardcode`，视口 1332×753，滚动 0/400/900/1600/2400/3200/4200，
   断言 `.post-aside` 与 `.toc-desktop` 的 `top` 恒为 80，且二者不再同步位移。
2. **末尾行为**：滚到文档底部，断言目录随 grid area 结束而上移（与 2x.nz 一致）。
3. **高亮**：按上表滚动，断言 `is-active` 落在正确的标题上、滚到底时落在「结论」、
   全程不出现「一个都没高亮」。
4. **锚点**：点目录项跳转，断言目标标题顶部距视口顶 80px（不被 header 遮住）。
5. **内部滚动**：临时把 `.toc-desktop` 内容拉长到超过限高，断言目录可独立滚动、页面不跟着动。
6. **回归**：`pnpm build` 通过；`/`、`/archive`、`/tags`、`/categories`、`/links`、`/about`
   与各 tag/category 页均返回 200、无新增控制台错误；明暗两套主题各看一次。

> 说明：`pnpm typecheck` 在本仓库当前状态下不可用 —— 根目录没有 `tsconfig.json`
> （只有 `.nuxt/` 下生成的几个），`npx tsc` 无输入文件时只打印帮助并 exit 1。
> 本轮改用 `pnpm build`（内含类型与打包校验）作为替代验收。

---

## 6. 验收记录（2026-11-06 实测通过）

环境：`http://localhost:3000/posts/zero-hardcode`、`/posts/slow-writing`，视口 1332×753，
header 实测 57px，`--header-height: 3.5rem` + `--toc-sticky-offset: 1.5rem` → sticky top 计算值 **80px**。

| # | 项 | 结果 |
| --- | --- | --- |
| 1 | 吸顶 | scrollY 0/400/900/1600/2400/3200/4200 时 `.post-aside` top 恒 **80**；`position: sticky`、`overflow-y: auto`、`max-height: 649.333px` |
| 2 | 末尾行为 | scrollY 4519（= max）时 top **−101**，随 grid area 结束上移，与 2x.nz 一致 |
| 3 | 高亮跟随 | 滚轮实测：y=1300 → 「收益一」、y=2400 → 「收益三」、底部 → 「结论」；全程无空集 |
| 3b | 高亮样式 | 亮色 当前项 `rgb(24,24,27)` + 左线 `rgb(169,79,51)`，其余 `rgb(113,113,122)`；暗色 当前项 `rgb(250,250,250)` + 左线 `rgb(204,120,92)`，其余 `rgb(161,161,170)` —— 与既有设计一致 |
| 4 | 锚点跳转 | 点击第 4 项后目标 h2 的 `getBoundingClientRect().top === 80`，精确停靠 |
| 5 | 内部滚动 | 人为压到 110px 高制造溢出：y=1300/2400/3500/4100 时内部 scrollTop 0/48/99/125，当前项始终可见，页面滚动位置不变 |
| 6 | 回归 | `pnpm build` exit 0（1m 12s）；10 条真实路由全 200；console 仅剩既有噪音（浏览器扩展注入的 hydration mismatch、扩展埋点 502、unhead twitter:card 弃用） |
