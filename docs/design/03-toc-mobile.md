# 03 · 移动端文章目录（导航栏按钮 + 抽屉）

状态：**已实施并通过验收**（2026-11-06，验收记录见 §7）。

---

## 1. 需求与现状

### 1.1 需求（用户原话要点）

> 参考站点 https://blog.liushen.fun/posts/6a6de263/ 的移动端效果，在导航栏新加一个目录按钮（仅在文章页出现），点击展开目录菜单，可以切换到文章路径并调整。

### 1.2 现状（<1280px）

- 目录以 `<details>` 折叠块写在**正文顶部**（`app/pages/posts/[slug].vue:115` 的 `<ProseToc :toc="toc" variant="inline" />`）。
- 折叠块只读不跟随：它的 `li` 不带 `is-active`（`app/components/server/ProseToc.vue:209-217`），滚动时没有任何高亮反馈；`activeId` 虽然一直在算，但只有桌面旁栏用得上。
- 折叠块跟着正文一起滚走：一旦滚过开头几百像素，就再也点不到目录了 —— 这正是这次要解决的问题在移动端的翻版。

### 1.3 已确定的 4 个取舍（用户已答复）

| 项 | 决定 |
| --- | --- |
| 正文顶部内联折叠目录 | **移除**，只保留导航栏按钮（正文更紧凑，与参考站一致） |
| 抽屉形态 | **右侧滑入**，贴边矩形 + 1px 左边框（沿用本项目 `MobileDrawer` 的遮罩/锁滚动逻辑） |
| 当前项高亮 | **沿用现有视觉**：左侧 accent 竖线 + 亮色文字，不引入新色块层级 |
| 按钮可见范围 | `<1280px` 显示、`≥1280px` 隐藏（与 `tocBreakpoint = 1280px` 对齐） |
| 1024–1279px 区间 | **也显示目录按钮**。该区间导航栏已切成桌面样式（汉堡隐藏），但旁栏要 ≥1280px 才出现；若沿用「移动端才有按钮」会留下一个完全没有目录的空档 |

---

## 2. 参考站拆解（blog.liushen.fun）

只取形态与交互，不抄它的视觉（它是圆角浮动药丸 + 毛玻璃，与本项目「1px 线 > 色块 > 阴影」冲突）。

- 导航栏按钮：`aria-label="打开目录"`、`aria-controls`、`aria-expanded`，图标 `fa-list-ul`。
- 抽屉：`fixed inset-0` 容器 + 半透明遮罩 + 底部弹出面板（`translateY`），`is-open` class 切换。
- 面板内部：拖动条 → 标题「目录」+ 右上 X → 可滚动的目录树。
- 条目：圆点 + 文字，当前项药丸底 + accent 文字加粗；多级用虚线缩进。

本项目不采用的部分：底部弹出、拖动条、圆点前缀、药丸底、虚线缩进、多级折叠展开（我们的目录最深到 `h3`，`maxDepth = 3`，两级足够平铺）。

---

## 3. 架构

### 3.1 为什么需要共享状态

触发按钮在 `SiteHeader`（属于 layout），目录数据在文章页 —— 两者是**兄弟**关系（header 不是 page 的祖先），props 传不过去，`provide/inject` 也够不着。全站已有同类先例：`useSearch()` 用 `useState('search-open')` 在同一对位置上共享状态。这里照办。

### 3.2 新增 `app/composables/usePostToc.ts`

单一数据源，把「目录数据 + 扁平化 + 当前项 + 抽屉开关」收在一处：

```ts
const links = useState<TocLink[]>('post-toc-links', () => [])
const activeId = useState<string>('post-toc-active', () => '')
const isOpen = useState<boolean>('post-toc-open', () => false)

/** 按 theme.toc.minDepth / maxDepth 扁平化，与桌面旁栏、抽屉共用同一份结果 */
const flat = computed(() => { /* 递归 walk，规则同现有实现 */ })

/** 桌面旁栏与抽屉是否该出现 */
const available = computed(() => pageCfg.showToc && tocCfg.enabled && flat.value.length > 0)

function setLink(list: TocLink[])   // 文章页写入
function clear()                    // 文章页卸载时清空
```

### 3.3 组件的三次复用与职责划分

| 文件 | 职责 |
| --- | --- |
| `usePostToc.ts` | 状态、扁平化、`available` |
| `ProseToc.vue` | 只保留桌面旁栏（去掉 `variant`、去掉 `details` 分支）；继续做 scroll-spy 与「当前项滚入旁栏视野」，`activeId` 改读写共享状态 |
| `MobileToc.vue`（新增） | 导航栏触发按钮 + 右侧抽屉；点条目跳转、打开时把当前项滚进视野 |

> scroll-spy 逻辑（`measure` / `syncActive` / `revealActive`）本轮**不动**：它是上一轮实测通过、且踩过「`ContentRenderer` 异步渲染导致 `getElementById` 落空」这个大坑后稳定的版本。抽屉只消费 `activeId`，不重复实现一套。

### 3.4 触发按钮的「仅在文章页出现」怎么判

不用 `links.length > 0` 直接决定渲染：文章页数据是 `await useAsyncData` 拿到的，而 layout 里的 header 在**父级**先渲染，SSR 时拿不到，会造成「服务端没有、客户端有」的 hydration mismatch。

改为**路由判定 + 客户端二次修正**：

```ts
const isPost = computed(() => /^\/posts\/[^/]+$/.test(route.path))
const mounted = ref(false)
onMounted(() => { mounted.value = true })

// SSR 与首帧客户端渲染一致（都按路由显示）；挂载后若这篇文章真没目录，再隐藏
const show = computed(() => isPost.value && (!mounted.value || links.value.length > 0))
```

---

## 4. 改动清单

### 4.1 `app/composables/usePostToc.ts`（新增）

按 §3.2 实现。`flat` 的 walk 规则从 `ProseToc.vue` 原样搬来（`depth >= minDepth && depth <= maxDepth`，`children` 递归）。

### 4.2 `app/components/server/ProseToc.vue`

- 删除 `variant` prop、`details` 模板段、`mobileOpen`、`.toc-mobile*` / `.toc-list-mobile*` / `.toc-chevron` 样式、以及 1280px 媒体查询里的 `.toc-mobile{display:none}`。
- `flat` / `visible` 改为从 `usePostToc()` 取，`activeId` 改为 `usePostToc().activeId`。
- 模板只剩 `<nav class="toc toc-desktop">` 一段（去掉 `v-if="variant === 'aside'"`）。
- 其它（`measure` / `syncActive` / `revealActive` / 监听器）不动。
- 文件头注释同步改写为「桌面旁栏；移动端见 MobileToc.vue」。

### 4.3 `app/components/common/MobileToc.vue`（新增）

**结构与可访问性**照抄 `MobileDrawer.vue` 的成熟做法（那份实现有用户决策 8 撑腰，且已在线上）：

- `<button ref="triggerEl" class="toc-trigger" :aria-label="打开/关闭目录" :aria-expanded="open" aria-controls="post-toc-drawer">`，图标 `tabler:list`。
- `<Teleport to="body">` + `<Transition name="toc-fade">` 遮罩 + `<Transition name="toc-slide">` 面板。
- `<aside id="post-toc-drawer" role="dialog" aria-modal="true" :aria-label="ui.post.tocDialog">`。
- 打开时 `document.documentElement.style.overflow = 'hidden'`（与 MobileDrawer / SearchDialog 完全一致，避免两处写法不同），关闭时 `removeProperty`。
- Escape 关闭；Tab 焦点循环；关闭后焦点还给触发按钮；`watch(route.fullPath)` 自动关闭。

**面板内容**

```
┌─────────────────────────────┐
│ 目录                        × │  ← head：高度 --header-height，下边框 1px
├─────────────────────────────┤
│ │ 四层配置                   │  ← .toc-list 的 1px 竖线贯穿
│ │ 收益一：改一处，全站同步    │  ← 当前项：accent 竖线 + 前景色
│   收益二：配置即文档          │  ← depth-3 缩进 0.75rem
└─────────────────────────────┘
```

- 面板：`position:fixed; top:0; right:0; bottom:0; width:min(82vw,20rem); background:var(--background); border-inline-start:1px solid var(--border); overflow-y:auto; overscroll-behavior:contain`（与 `.drawer` 同参数）。
- 条目：复用桌面端的 `.toc-list`（`border-inline-start:1px solid var(--border)`）+ `.toc-link`（`border-inline-start-color:var(--accent)` 高亮）。移动端把 `padding-block` 加到 `0.5rem`、`min-height` 到 `2.25rem`，满足触控目标，字号保持 `0.8125rem`（与桌面一致，不新造字号）。
- 触发按钮：`2rem × 2rem`、`border-radius: calc(var(--radius)/2)`、`color: var(--muted-foreground)`，hover 变 `--foreground` —— 与 `SearchTrigger` / `ThemeToggle` 完全同规格，放进 `.header-actions` 时不会突兀。
- `@media (min-width: 1280px) { .toc-trigger { display: none } }`。

**点条目的跳转顺序**（关键细节）：面板打开时页面被锁滚，直接让默认锚点行为生效会在 `overflow:hidden` 状态下错过滚动。

```ts
function go(event: MouseEvent, id: string) {
  event.preventDefault()      // 自己控制时序
  close()                     // 先关：解锁 overflow、焦点归还
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    history.pushState(null, '', `#${id}`)
    el.scrollIntoView({ block: 'start' })   // 尊重标题的 scroll-margin-top
  })
}
```

`scroll-margin-top` 已经是 `calc(var(--header-height) + var(--toc-sticky-offset))`（上一轮改的），所以落点与桌面端一致：标题距顶 80px。

**打开时把当前项滚进视野**：抽屉里条目数最多 9 条，一屏基本放得下；但如果目录变长（将来放到 `h4`），仍要能看见当前项。打开后 `nextTick` 里对 `activeId` 对应的 `.toc-item` 执行一次 `scrollIntoView({ block:'center' })`，只动抽屉内部。

### 4.4 `app/components/common/SiteHeader.vue`

`.header-actions` 内加一个 `<MobileToc />`，位置在 `SearchTrigger` 之后、`ThemeToggle` 之前（目录属「读」类，主题属「设置」类，分开）：

```html
<div class="header-actions">
  <SearchTrigger />
  <MobileToc />
  <ThemeToggle />
  <MobileDrawer />
</div>
```

### 4.5 `app/pages/posts/[slug].vue`

- 删掉第 115 行 `<ProseToc :toc="toc" variant="inline" />` 及其上方注释。
- 第 128-131 行的旁栏改为 `<ProseToc />`（数据源改为共享状态）。
- 删掉 `@media (min-width:1280px)` 里的 `.post-article :deep(.toc-mobile) { display: none }`。
- 新增数据写入与清理：

```ts
const postToc = usePostToc()
watchEffect(() => postToc.setLink(toc.value))
onBeforeUnmount(() => postToc.clear())
```

### 4.6 `app/theme.config.ts` + `modules/design-tokens.ts`

`toc.mobileCollapsible` 随内联折叠目录一起失效，**删除该键**（`app/theme.config.ts:96`）。已经没有任何组件读它，留着就是死配置。`tocBreakpoint` / `tocWidth` / `tocGap` / `stickyOffset` 保留。

`design-tokens.ts` 不生成 `mobileCollapsible` 对应的 token，本次无需改动。

### 4.7 `app/data/ui.ts`

新增三条（文案集中管理，禁止组件里写中文）：

```ts
post: {
  tocOpen: '打开目录',
  tocClose: '关闭目录',
  tocDialog: '文章目录',
}
```

### 4.8 文档

- 本文件。
- `docs/design/02-toc-sticky.md:114` 的配置摘录里含 `mobileCollapsible: true`，同步删除，避免两份文档互相矛盾。
- `BLOG_PROMPT.md:121` 是项目最初的提示词原文，**不改**（它是历史输入，不是现状描述）。

---

## 5. 不做

- 不做底部弹出、拖动条、圆点前缀、药丸底 —— 与设计语言冲突（决策 8）。
- 不做多级折叠展开（`maxDepth = 3`，两级平铺已够，折叠反而多一次点击）。
- 不引入新的字号/间距/圆角 token。
- 不改桌面端任何行为（除 `ProseToc` 的数据来源从 props 换成共享状态，视觉与交互零变化）。

---

## 6. 验收

用 bsk 注入工具，iPhone 14 视口（390×844）：

| # | 项 | 通过标准 |
| --- | --- | --- |
| 1 | 按钮出现范围 | 文章页 `<1280px` 可见；`/`、`/archive`、`/about` 不可见；`≥1280px` 文章页不可见 |
| 2 | 打开/关闭 | 点按钮抽屉右侧滑入；X、遮罩、Esc 都能关；关闭后焦点回到按钮 |
| 3 | 锁滚 | 抽屉打开时页面不可滚动；关闭后恢复（`html` 无残留 `overflow:hidden`） |
| 4 | 高亮 | 抽屉内当前章节有 accent 竖线 + 前景色文字，与桌面旁栏一致 |
| 5 | 跳转 | 点第 N 项 → 抽屉关闭、页面滚到该标题、标题距视口顶 80px、hash 更新 |
| 6 | 内联目录已移除 | 正文顶部不再有「目录」折叠块（移动端与桌面端都没有） |
| 7 | 桌面回归 | `≥1280px` 旁栏吸顶、高亮跟随、内部滚动全部照旧 |
| 8 | 构建 | `pnpm build` exit 0（`pnpm typecheck` 在本仓库不可用：根目录无 `tsconfig.json`） |
| 9 | 明暗两套 | 抽屉在 `.dark` 下背景/边框/高亮颜色正确 |

---

## 7. 验收记录（2026-11-06 实测）

设备/环境：bsk 注入工具驱动的 Agent Window，逐档视口用 emulation 切换；页面 `http://localhost:3000/posts/zero-hardcode`（8 个 h2）、`/posts/slow-writing`（9 项含 depth-3）。

| # | 项 | 实测数据 | 结果 |
| --- | --- | --- | --- |
| 1 | 按钮出现范围 | 390×844：`.header-actions` = `[search-trigger, toc-trigger, theme-toggle, drawer-trigger]`，`.toc-trigger` display=flex、32×32、aria-label「打开目录」；1100×800：`.toc-trigger` 可见而 `.post-aside` display=none、`.drawer-trigger` 隐藏（证实 1024–1279px 空档有按钮）；1600×900：`.toc-trigger` display=none、`.toc-desktop` 唯一 1 个；`/archive` 无 `.toc-trigger` | 通过 |
| 2 | 打开/关闭 | 抽屉 `.toc-drawer` 宽 320、高 844、x=70（右侧贴边）；`.toc-drawer-head` 高 56、`.toc-drawer-close` 32×32、`.toc-drawer-body` 高 788 | 通过 |
| 3 | 锁滚 | 打开时 `document.documentElement.style.overflow` = `hidden`；关闭后恢复为 `(none)` | 通过 |
| 4 | 高亮 | 滚到 scrollY=1488 后打开抽屉：`activeIndex=2`「收益二：配置即文档」，当前项 `color: rgb(250,250,250)`、`borderInlineStartColor: rgb(204,120,92)`（暗色 accent），首项 `rgb(161,161,170)` | 通过 |
| 5 | 跳转 | 点第 7 项「怎么验证没漏」→ 抽屉关闭、`hash="#怎么验证没漏"`、目标 h2 `getBoundingClientRect().top` = **80**、scrollY=4524 | 通过 |
| 6 | 内联目录已移除 | 页面内 `.toc-mobile` 数量 = 0（移动端与桌面端均无） | 通过 |
| 7 | 桌面回归 | 1600×900：`.post-aside` position=sticky、overflow=auto、`.toc-desktop` position=static 且宽 200；滚动 0/600/1500/2500/3500 时 aside top = 121/80/80/80/80，高亮 idx = 0/0/2/3/5（0 与 600 同项因第一节很长） | 通过 |
| 8 | 构建 | `pnpm build` → `Build complete in 39.8s`、exit 0、`[fix-contrast] 扫描 108 个 HTML，修正 24 个文件、共 48 处暗色 token` | 通过 |
| 9 | 明暗两套 | 暗色下抽屉与高亮读数如上（rgb(250,250,250) / rgb(204,120,92)）；亮色环境下按钮与条目颜色继承 `--muted-foreground` / `--accent`，与桌面旁栏同源 | 通过 |

### 实施过程中踩到的坑

1. **`document.hidden = true` 的测试干扰**：Agent Window 在后台时不产生渲染帧 —— `window.scrollTo()` 不派发 `scroll` 事件、`scrollIntoView({behavior:'smooth'})` 永不推进。绕法：验证高亮时用 `dispatchEvent(new Event('scroll'))` 手动触发，或用真实 click/wheel 输入；验证跳转时把 `scroll-behavior` 置为 `auto`。
2. **同一帧读不到渲染结果**：在 `scrollTo` 之后立刻读 `.is-active` 会读到旧值，需要放到 `setTimeout(…, 120~150)` 里再读，且必须串行链（并行 `Promise.all` 会让所有采样都读到最后一个位置）。
3. **`bsk_*` 的 observationId 一次性**：每次动作前都要重新 `bsk_session sync`，并把新的 `observationId` 与旧 `contextId` 一起传；报 "requires an unused strict observation" 是常态而非错误。

---

## 8. 无目录文章的直达评论兜底（2026-11-10）

### 问题

只有 H1、没有 H2/H3 的文章会解析不出目录，`usePostToc().available` 为 false，
于是**桌面旁栏与顶栏按钮一起消失** —— 这两处的「直达评论」入口随之不见，
读者无法从文章顶部跳到评论区。

### 根因

`available = showToc && enabled && flat.length > 0` 把「该不该有目录」和
「实际有没有标题」揉成了一个开关。取值 false 时两个组件都整体不渲染。
但「无标题」只该决定**目录列表**要不要画，不该决定**评论区入口**要不要给。

### 解法

在 `usePostToc` 里把两种语义拆开：

```ts
tocEnabled  = showToc && enabled              // 配置层：该不该有目录
available   = tocEnabled && flat.length > 0   // 实际：真的有标题可列
```

两个所在位置的组件各自做兜底（断点互补，同一时刻只有一个生效，不会重复出现）：

| 位置 | 归属 | 有目录 | 无标题文章 |
| --- | --- | --- | --- |
| 桌面 ≥1280 右侧沟槽 | `ProseToc` | 目录列表 | **「直达评论」药丸按钮**占原槽位 |
| 移动/平板 <1280 顶栏 | `MobileToc` | list 图标 → 开抽屉 | 图标换成 **message-dots**，点击直接滚到评论区 |

顶栏是「原位替换」而非新增按钮 —— 不占额外横向空间，也不会出现「目录+评论」两个图标并存。

### 关键实现点

- `jumpOnly = !available && tocEnabled && comments.enabled`，两个组件用同一个判据。
- **SSR 无水合失配**：`toc` 数据来自构建期 `post.body.toc.links`，`flat` 在 SSR 就有值，
  所以 `jumpOnly` 在服务端即可判定 —— 实测零标题文章的 `dist/posts/*/index.html`
  里 `aside` 直接输出 `<div class="toc toc-desktop toc-jump-only">`（另需注意：顶栏
  `MobileToc` 因 `mounted=false` 不参与 SSR，其按钮始终是客户端挂载）。
- 文案集中在 `ui.post.jumpComments`（正文页新增一处），合规过 `audit-hardcode`。

### 验收记录（2026-11-10 实测）

用一篇临时零标题文章（`content/posts/zz-tmp-noheading.md`，验证后已删除）实测：

| # | 项 | 实测数据 | 结果 |
| --- | --- | --- | --- |
| 1 | 桌面兜底 | 1440×900：`.post-aside` display=block、left=1002 w=200 h=45，内含 `.toc-jump-standalone`（文案「直达评论」）；`.toc-list` 数量 0；`.toc-trigger` display=none | 通过 |
| 2 | 移动兜底 | 390×844：`.post-aside` display=none；`.toc-trigger` display=flex、32×32、位于顶栏 `.header-actions` 中（left=247）；图标为 `tabler:message-dots` | 通过 |
| 3 | SSR 直出 | 零标题文章 HTML 的 `<aside>` 内直接是 `toc-jump-only`（服务端判定，无闪烁） | 通过 |
| 4 | 有目录文章回归 | `no-loading-feel`（8 个 h2）`<aside>` 内仍是完整 `.toc-list`，`.toc-jump-standalone` 在真实 DOM 中 0 处 | 通过 |
| 5 | 全站验收 | `pnpm verify` @4173：90 个页面状态（15 路由 × 3 视口 × 明暗）、**0 错误 0 溢出**；`audit-hardcode` PASS 0 处 | 通过 |
| 6 | 构建 | `pnpm build` exit 0、165 个 HTML、83 页路由 | 通过 |

### 变更文件

| 文件 | 改动 |
| --- | --- |
| `app/composables/usePostToc.ts` | 拆出 `tocEnabled`，`available` 基于它 + `flat.length` |
| `app/components/server/ProseToc.vue` | 无目录时渲染 `toc-jump-standalone` 药丸按钮 |
| `app/components/common/MobileToc.vue` | 无目录时按钮换图标 + 点击直达评论（`onTrigger` 分流） |
| `app/data/ui.ts` | `post.jumpComments` |
