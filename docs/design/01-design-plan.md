# 第一轮交付：设计方案 + 疑问清单

> 依据：`BLOG_PROMPT.md`（下称「提示词」）。本文件只做设计决策，不含实现。
> 状态：**已收到第一轮答复，本文档已按答复定稿**。待你确认后进入第二轮（脚手架 + 三配置文件 + 布局）。
>
> ## 第一轮答复回执（2026-11-05）
>
> | 议题 | 你的决定 | 落地 |
> | --- | --- | --- |
> | Q1 强调色 | 可配置，默认取 2x.nz 的强调色 | 已从 2x.nz 线上 token 提取：light `#a94f33` / dark `#cc785c`，见 §1.1 |
> | Q5 站点身份 | 站名「喵洛阁」、作者「克喵:)」、域名 `www.kemiaosw.top` | 见 §0.1，其余字段留占位 |
> | Q3 feed 全文 | `fullText: true` | 构建期渲染正文 HTML |
> | Q2 搜索索引 | 剥离代码块 | 见 §4 |
> | Q12 git | 现在 `git init` + 分阶段 commit | 已执行 |
> | Q4/Q6–Q11 | 未反对，按我的倾向执行 | 见各节「已定」标注 |

---

## 0. 技术栈事实核对（已联网核实，2026-11-05）

| 包 | 最新版 | 备注 |
| --- | --- | --- |
| nuxt | 4.6.4 | Node 24.21 / pnpm 12.8.1 本机就绪 |
| @nuxt/content | 3.16.2 | 需 `better-sqlite3` / `sqlite3` 之一作为 peer |
| shadcn-vue / shadcn-nuxt | 2.9.0 | 官方文档确认 Tailwind v4 路线 |
| tailwindcss | 4.3.4 | 走 `@tailwindcss/vite` 插件 |
| @nuxtjs/seo | 6.0.1 | 内含 sitemap / robots / schema-org / link-checker / og-image |
| nuxt-og-image | 7.0.7 | 渲染器为可选 peer（satori / resvg / takumi / browser） |
| @nuxt/image | 2.2.1 | |
| @nuxt/icon + @iconify-json/tabler | 2.6.2 / 1.2.43 | |
| minisearch | 7.2.0 | |

字体包（**已确认可用**，避免 CDN 依赖）：

- `@fontsource-variable/inter` 5.3.0（英文，variable）
- `lxgw-wenkai-webfont` 1.7.0（中文，595 个分片 woff2 + unicode-range CSS）
- `@fontsource/jetbrains-mono` 5.3.0

> 提示词 §14 写 `shadcn.componentDir: './components/ui'`，但 Nuxt 4 的组件根是 `app/components`，
> 实际应为 `./app/components/ui`。属提示词笔误，实现按 Nuxt 4 正确路径。

---

## 0.1 站点身份（已由你提供）

| 字段 | 值 | 状态 |
| --- | --- | --- |
| `site.name` | 喵洛阁 | 已提供 |
| `site.shortName` | 喵洛阁 | 已提供（移动端导航 / favicon alt） |
| `site.url` | `https://www.kemiaosw.top` | 已提供 |
| `site.author.name` | 克喵:) | 已提供 |
| `site.locale` | `zh-CN` | 按提示词默认 |
| `site.description` | *待你补* | 占位：一句话站点描述，用于 SEO / OG |
| `site.author.avatar` | *待你补* | 占位 `/images/avatar.png`（第二轮程序化生成占位图） |
| `site.author.bio` | *待你补* | 占位：一句话签名，首页顶部 |
| `site.author.email` | *待你补* | 占位 `hi@kemiaosw.top` |
| `site.social` | *待你补* | 占位：GitHub / X / Email / RSS |
| `site.beian` | *待你补* | 占位留空（无则不渲染） |

> 以上 6 个占位项**不影响任何实现**，它们全部只在 `blog.config.ts` 一处；你随时补值，改一处全站生效——
> 这正好逐条验证验收标准「改一个 blog.config.ts 字段，全站对应位置更新，无遗漏」。

---

## 1. 视觉设计计划（第一遍：tokens）

### 1.1 色彩

基底遵循提示词 §5.2：shadcn **zinc 真灰阶**，无色相偏移。强调色**仅一个**，低饱和度。

| 角色 | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--background` | `#ffffff` | `#09090b` | 页面底 |
| `--foreground` | `#18181b` | `#fafafa` | 正文 |
| `--muted-foreground` | `#71717a` | `#a1a1aa` | 日期、次要信息 |
| `--border` | `#e4e4e7` | `#27272a` | 全部 1px 分隔线 |
| `--subtle` | `#fafafa` | `#18181b` | **仅**代码块底 / hover 底，不做卡片色块 |
| `--accent` | `#a94f33` | `#cc785c` | 唯一强调色（2x.nz 实际 token） |

**强调色来源（已抓取 2x.nz 线上 CSS 实测，非估算）**

从 `https://2x.nz/assets/index-BRnDRU6n.css` 提取的真实变量：

```
light: --color-primary:#a94f33  --color-ring:#a94f33  --color-primary-foreground:#fff
dark : --color-primary:#cc785c  --color-ring:#cc785c  --color-primary-foreground:#141413
```

WCAG 对比度实测（本机计算，非声称）：

| 组合 | 对比度 | 判定 |
| --- | --- | --- |
| `#a94f33` on `#ffffff` | 5.45 | AA 正文通过 |
| `#a94f33` on `#fafafa` | 5.22 | AA 正文通过 |
| `#cc785c` on `#09090b` | 6.07 | AA 正文通过 |
| `#cc785c` on `#18181b` | 5.41 | AA 正文通过 |

→ 该色可直接用于正文级文字（链接、强调），无需额外调深调浅。

强调色**可配置**：`theme.config.ts` 的 `accent.light` / `accent.dark` 两个字段即全部入口，
换色只改这两行，全站（焦点环、导航下划线、搜索 `<mark>`、引用线、按钮）同步。

强调色只出现在 4 处，超出即视为违规：① 当前导航项的下划线 ② 键盘焦点环 ③ 搜索命中 `<mark>` 底色
④ 引用块左侧 2px 竖线。链接不使用强调色，靠下划线表达。

> ⚠ **一个必须让你知道的设计张力（我的判断，可推翻）**
>
> 提示词 §5.2 硬性规定基底为「shadcn zinc 真灰阶、无色相偏移」。但 terracotta 这个色**是为暖中性基底设计的**：
> 2x.nz 自己的基底不是 zinc，而是 `#f7f6f2` / `#1f1e1b` —— 带极轻微暖偏移的近灰（`oklch(... .005 106.6)`，
> chroma 仅 0.005）。陶土色压在纯 zinc 上会略「跳」一点点。
>
> - **我的决定：基底仍按提示词用 zinc**（提示词的硬约束优先，且 chroma 0.005 的差异肉眼几乎不可辨）。
> - **风险**：等你看到实机效果若觉得偏冷、和陶土色打架，改成暖中性只需动 `theme.config.ts` 里 4 个中性色值，
>   不动任何组件。这一项我留给你实机判断，第二轮截图时重点看。

### 1.2 字体与字阶（本设计的**签名**）

提示词 §5.3 的「标题与正文同字号、分权重」是整个页面的记忆点，全程只靠**字重 + 空间 + 细线**建立层级，
不靠字号堆叠。等宽字**只**用于真实数据：日期、字数、阅读时长、代码、`kbd`。正文不做全大写标签、
不做 `01 / 02 / 03` 序号（归档按年份分组是真实序列，允许年份数字）。

| 层级 | 字号 | 行高 | 字重 | 字体 |
| --- | --- | --- | --- | --- |
| 页面标题 h1（文章/归档/关于） | `1.75rem` (28px) | 1.25 | 700 | Inter / 文楷 |
| 正文段落 | `1.0625rem` (17px) | 1.75 | 400 | 文楷 / Inter |
| 正文内 h2 | `1.0625rem`（**同正文**） | 1.4 | 700 | 同上 |
| 正文内 h3 | `1.0625rem`（**同正文**） | 1.4 | 600 | 同上 |
| 列表标题（首页/归档/分类） | `1.0625rem` | 1.5 | 400 → hover 700 | 同上 |
| 元信息（日期/时长/计数） | `0.8125rem` (13px) | 1.5 | 400 | JetBrains Mono |
| 代码 | `0.875rem` (14px) | 1.7 | 400 | JetBrains Mono |

正文 17px × 764px 容器 ≈ 每行 44 个汉字，落在舒适阅读区间内。中文行高 1.75、段落间距
`1.2em`（> 行距），符合提示词 §5.3。

### 1.3 布局

- 全站单列居中，`--content-max-width: 764px`，左对齐（不居中、不两端对齐）。
- 内容区两侧留白随视口增大；**唯一的不对称**在文章页：≥1280px 时目录以 200px 旁栏挂在 764px
  右侧沟槽外，正文仍在原位不偏移。

```
桌面 ≥1280（文章页）
┌──────────────────────────────────────────────────────────┐
│  wordmark                        nav   ⌘K   ◐            │ ← 1px 底边线
├──────────────────────────────────────────────────────────┤
│                    ┌──────────── 764 ───────────┐  ┌TOC┐ │
│                    │ h1 权重驱动标题            │  │ h2 │ │
│                    │ 日期 │ 时长   #tag #tag      │  │ h3 │ │
│                    │ ─────────────────────────  │  │    │ │
│                    │ 正文 …                     │  │    │ │
│                    └────────────────────────────┘  └────┘ │
└──────────────────────────────────────────────────────────┘
表格/图片允许越界到 1000px，正文段落不越界。

桌面 ≥1024（列表页）
┌──────────────────────────────────────────────────────────┐
│  wordmark                        nav   ⌘K   ◐            │
├──────────────────────────────────────────────────────────┤
│              ┌──────────── 764 ───────────┐              │
│              │ 一句话签名                 │              │
│              │ ─────────────────────────  │              │
│              │ 2026-11-02      文章标题          │      │ ← 行式，无卡片
│              │ 2026-10-28      文章标题          │      │
│              └────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘

移动端 <768
┌───────────────────────┐
│ wordmark        ◐     │
├───────────────────────┤
│ 一句话签名             │
│ ───────────────────   │
│ 11-02  文章标题        │
│ 10-28  文章标题        │
│                       │
├───────────────────────┤
│ 首页 归档 分类 标签 ⌕  │ ← 底部固定 Tab，1px 顶边线
└───────────────────────┘
```

### 1.4 几何与动效

- 圆角：`--radius: 8px`，只给 `input / dialog / 按钮` 用；**列表项、代码块、图片、卡片一律 0 圆角**
  （用 1px 线表达边界，符合 brutalist minimal）。杜绝「所有东西同一个圆角」的 SaaS 卡套。
- 阴影：无。仅 Dialog 允许 `shadow-sm`，暗色模式全局 `box-shadow: none`。
- 动效：唯一动效是路由切换的 `opacity 0→1` + `translateY(4px)→0`，`200ms ease-out`。
  无逐节 fade-in、无卡片 hover 上浮。主题切换走 viewTransition 圆形扩散（`clip-path`）。

### 1.5 设计原则（判断「该不该加」时用）

1. **字重承载层级，字号尽量不动。**
2. **1px 线 > 色块 > 阴影。** 能用线分隔就不加底色。
3. **一个强调色，四处封顶。** 想再加一处就先删一处。
4. **等宽只为数据。** 装饰性 mono 标签一律不加。
5. **克制的唯一高潮**：文章页那条从标题下方延伸的 1px 通栏细线 + 右侧目录旁栏。

### 1.6 对提示词的反向自检（是否落进 AI 默认套路）

| 常见默认套路 | 本项目处理 |
| --- | --- |
| 奶油底 + 陶土色强调 + 高对比衬线 | ❌ 纯 zinc 灰阶 + 松墨绿，无奶油底 |
| 全大写 eyebrow 标签 / `A · B · C` 元信息 / `→` 箭头 | ❌ 一律不用；元信息用「mono 日期 + 1px 竖线 + mono 时长」 |
| 所有区块同一圆角 + 同一柔阴影的卡片套 | ❌ 无卡片，全部行式列表 + 分隔线 |
| 每节 fade-and-slide 入场 | ❌ 仅路由切换一次过渡 |
| `01 / 02 / 03` 序号 | ❌ 仅归档的年份（真实序列）出现数字 |

---

## 2. 信息架构

```
/                       首页      bio + 置顶 + 最新N篇（行式）
/posts/[slug]           文章详情  目录 + 代码复制 + 图放大 + 上/下一篇 + 相关
/archive                归档      按年分组，日期 + 标题
/categories             分类索引  名称 + 篇数
/categories/[slug]      分类详情  复用行式列表
/tags                   标签云    字号梯度，无色差
/tags/[slug]            标签详情  复用行式列表
/links                  友链      网格 + 申请 Dialog
/about                  关于      区块化（intro/now/skills/timeline/contact）
/404                    兜底      极简 + 回首页
/rss.xml  /atom.xml     Feed      构建期静态化
/api/search-index.json  搜索索引  构建期静态化，前端懒加载
/sitemap.xml /robots.txt /og/**   @nuxtjs/seo 产出
```

导航（`site.nav`）：首页 / 归档 / 分类 / 标签 / 友链 / 关于。
移动端底栏：`site.nav` 前 4 项 + 搜索 = 5 格；主题切换留在顶部。

---

## 3. 配置四层与文件清单

| 文件 | 职责 | 是否被组件直接读取 |
| --- | --- | --- |
| `app/blog.config.ts` | 站点 + feed + search（唯一全局源） | 否，经 `useSiteConfig()` |
| `app/theme.config.ts` | 全部设计 token（颜色/字号/间距/圆角/动效/目录/阅读速度） | 否，经 `useThemeConfig()` 或 CSS 变量 |
| `app/pages.config.ts` | 逐路由业务参数 | 否，经 `usePageConfig(key)` |
| `app/app.config.ts` | 仅 `import` + 合并 `defineAppConfig` | — |
| `app/data/links.ts` / `about.ts` / `system.ts` | 友链 / 关于元数据 / 404 文案 | 否，经 `useData()` |

**token → CSS 的落地方式**（提示词 §4.2 要求 theme.config 同时驱动 Tailwind v4 `@theme`）：
新增本地 Nuxt 模块 `modules/design-tokens.ts`，在构建期读取 `app/theme.config.ts`，生成虚拟样式表
注入 `@theme` 块与 `:root` / `.dark` CSS 变量。这样「改一处 theme.config → 全站生效」是构建期保证，
而不是靠人肉同步两份。

目录结构按提示词 §14 落地，新增：

```
modules/design-tokens.ts        # token → CSS 变量（构建期）
modules/feature-flags.ts        # feed/search enabled=false 时摘除路由与头部注入
app/composables/{useSiteConfig,useThemeConfig,usePageConfig,useSearch,useTheme,useReadingTime}.ts
app/components/server/{ProseBody,ProseToc,ArchiveList,PostMeta}.vue
app/components/common/{SiteHeader,SiteFooter,MobileTabBar,ThemeToggle,PostList,TagList,SearchTrigger,SearchDialog,CommentSlot,ImageLightbox,CodeCopyButton}.vue
```

---

## 4. 关键技术决策（已定，除非你反对）

1. **Feed 全文渲染**：`server/routes/rss.xml.get.ts` 内用 `queryCollection(event,'posts')` 取数据，
   再用 `@nuxt/content` 的 `renderMarkdown()` 把 `body`（minimark AST）渲成 HTML，绝对化相对链接后
   CDATA 包裹，避免 `<`/`&` 破坏 XML。
2. **search-index 生成**：`server/routes/api/search-index.json.get.ts`，构造期渲 HTML → 剥标签 → 压缩空白，
   写入 `nitro.prerender.routes`。
3. **feature flag 的「不注册路由」**：`modules/feature-flags.ts` 在 `nitro:init` 阶段按配置决定是否
   注册 handler + 从 `prerender.routes` 中摘除；`enabled:false` 时访问返回 404。
4. **主题切换**：`document.startViewTransition` + `clip-path: circle()` 扩散，回退到无动画瞬时切换；
   `prefers-reduced-motion` 时禁用。FOUC 用 `app/head` 内联脚本在首帧前设 `class="dark"`。
5. **SSG**：`nitro.preset = 'cloudflare_pages'`、`nitro.prerender.crawlLinks = true`、
   `experimental.viewTransition = true`、`ssr: true`，`pnpm generate` 产出纯静态。
6. **无 Pinia/Axios**；状态只走 `useState` + `useAppConfig`。

---

## 5. 疑问清单（请逐条作答；未答项默认采用「我的倾向」）

### Q1 强调色 ✅ **已定**

你要求「可配置，默认取 2x.nz 的强调色」。已从 2x.nz 线上 CSS 提取真实值并做对比度核算：
**light `#a94f33` / dark `#cc785c`**，对比度 5.45 / 6.07，均过 AA 正文级。写入 `theme.config.ts` 的
`accent.light` / `accent.dark`，换色只改这两行。详见 §1.1。

### Q2 搜索索引是否剥离代码块 ✅ **已定：剥离**

代码里的标识符（`useState`、`div`）会造成大量噪音命中；剥离后索引体积也更小。

### Q3 `feed.fullText` 默认值 ✅ **已定：`true`**

读者在 RSS 阅读器里直接读全文，也是验收项「fullText: true 时 reader 内可读全文」的主场景。

### Q4 每篇文章的 OG 图（中文渲染）✅ **按倾向执行：A**

构建期注入 CJK 字体：把一份 LXGW WenKai TTF 放进本地 `.font-cache/`（**不进产物、不进浏览器**），
仅构建期供 satori 用。首次构建需下载一次。

### Q5 站点身份 ✅ **已定**

见 §0.1。站名「喵洛阁」/ 作者「克喵:)」/ 域名 `www.kemiaosw.top` 已确定；6 个次要字段留占位，
全部只在 `blog.config.ts` 一处。

### Q6 示例文章 ✅ **按倾向执行：A**

10 篇中文前端主题（含 1 篇 `draft: true`、2 篇 `pinned: true`），覆盖验收极端情况：
1 篇含代码块 + `&` + `<`（喂 feed 测试）、2 篇带封面图、1 篇含表格与图片、1 篇长文（测目录与阅读时长）。

### Q7 标题字号 ✅ **按倾向执行：A**

页面级 h1 用 28px，正文内 h2/h3 与正文同字号（17px）。

### Q8 封面图与图片素材 ✅ **按倾向执行：A**

本地程序化生成极简几何图（zigzag / 半调网点，zinc + 陶土两色），存 `public/`。零外链。

### Q9 中文分词策略 ✅ **按倾向执行：A**

bigram 为主 + 单字兜底。

### Q10 移动端底栏 ✅ **按倾向执行：A**

`site.nav` 前 4 项 + 搜索 = 5 格；主题切换留在顶部右角。

### Q11 目录（TOC）位置 ✅ **按倾向执行：A**

≥1280px 正文右侧沟槽外挂 200px sticky 目录；<1280px 折叠到正文顶部。

### Q12 工程初始化 ✅ **已定：A**

已 `git init`，分阶段 commit。

---

## 6. 第二轮将交付什么（确认后立即开始）

1. `pnpm create nuxt` 脚手架 + 依赖安装（含 better-sqlite3、字体包）
2. 四个配置文件 + `modules/design-tokens.ts` + `app/assets/css/main.css`（`@theme` 块）
3. `layouts/default.vue` + `SiteHeader` / `SiteFooter` / `MobileTabBar` / `ThemeToggle`
4. 浏览器实测：1440 / 768 / 375 × 明暗，截图贴给你，然后才进入逐页面实现

---

## 7. 协作方式（Team 规模）

按提示词 §2.3「第三轮起逐页面实现」，我会用 4 人小队并行：

- **Lead（我）**：配置层、设计 token、布局、路由骨架、全站联调与验收
- **content-engineer**：内容层（示例文章、frontmatter、图片素材、`data/` 三个文件、关于页/友链/404）
- **search-feed-engineer**：MiniSearch 索引 + 分词 + 搜索弹窗 + RSS/Atom 路由（独立文件域，互不冲突）
- **qa-verifier**：Playwright 全站走查（三档视口 × 明暗）、Lighthouse、W3C feed 校验、响应式截图

写作用域严格分片，避免并发改同一文件。
