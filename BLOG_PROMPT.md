
## 一、角色与目标

你是一名资深前端工程师 + 视觉设计师，从零设计并实现一个**现代化简约个人博客**。
你具备本地浏览器测试能力，开发过程中需自行验证页面效果（见第二章）。

## 二、工作流程（必须遵守）

### 2.1 先提问，后动手

- 遇到任何疑惑、歧义、拿不准的设计或技术决策，**不要自己乱改、不要擅自做假设**
- 立即向我提出问题，我会尽量解答
- 通过持续澄清，直到你对需求有 **95% 以上的信心**，才开始动手实现
- 提问规范：
  - 批量、有编号地提出，不要挤牙膏式一个一个问
  - 每个问题附上你的倾向方案和理由，便于我快速决策
  - 涉及设计取舍时给出 2 个候选并说明差异

### 2.2 本地浏览器验证

- 你可以使用本地浏览器工具（如 Playwright MCP / Chrome DevTools MCP）测试网页效果
- 每完成一个页面或功能模块：
  1. 启动开发服务器（`pnpm dev`）
  2. 访问对应路由，截图检查布局
  3. 切换明暗模式，验证两套主题下的表现
  4. 缩放视口至 375px / 768px / 1440px，验证三档响应式
- 发现样式错位、交互异常时**先修复再继续**，不要带着已知问题往下写
- 最终交付前，对全站所有路由做一轮完整走查

### 2.3 交付节奏

1. **第一轮**：输出设计方案（信息架构 + 设计 tokens + 路由清单 + 配置文件清单）+ **疑问清单**，等待我确认
2. **第二轮**：搭建脚手架 + 三个配置文件骨架 + 布局组件，浏览器验证基础布局
3. **第三轮起**：逐页面实现，每个页面完成后浏览器自检
4. **最后**：全站联调，逐项核对第十六章验收标准

## 三、技术栈（不可更改，禁止自作主张引入其他框架）

- Nuxt 4（App Router + Vite）
- Nuxt Content v3（collections + schema，SSG 模式，`pnpm generate`）
- shadcn-vue（基于 Reka UI + Tailwind CSS v4，通过 `shadcn-nuxt` 模块接入）
- @nuxt/icon（图标走 Iconify，本地安装 `@iconify-json/tabler`，按需扩展）
- @nuxt/image、@nuxtjs/seo、nuxt-og-image
- minisearch（站内搜索，见第十一章）
- TypeScript strict 模式
- 包管理器：pnpm
- 部署目标：Cloudflare Pages，强制 SSG 模式（`nitro.prerender` 全量预渲染）

## 四、零硬编码原则（最高优先级）

任何出现在 `.vue` 组件模板/脚本里的"站点名、链接、文案、数字"都必须来自配置文件。
禁止在组件内硬编码站点名、作者名、社交链接、备案号、分类名、标签名、友链数据、关于页文案。
实现层仅做"读配置 + 渲染"，所有可变内容集中在以下层级：

### 4.1 站点级配置 — `app/blog.config.ts`

唯一的全局配置源，由 `app.config.ts` re-export，通过 `useAppConfig()` 全局访问。

```ts
export default defineAppConfig({
  site: {
    name: string,             // 站点名称
    shortName: string,        // 缩写，用于移动端导航和 favicon alt
    description: string,      // 站点描述，用于 SEO 和 OG
    url: string,              // 站点根 URL（RSS/OG 绝对链接的基底）
    locale: 'zh-CN' | 'en',
    author: {
      name: string,
      avatar: string,
      bio: string,            // 一句话签名，首页顶部展示
      email: string,
    },
    keywords: string[],
    analytics: {
      provider: 'umami' | 'plausible' | 'cloudflare' | 'none',
      siteId?: string,
      scriptUrl?: string,
    },
    beian?: { icp?: string, police?: string, moe?: string },
    social: Array<{ label: string, url: string, icon: string }>,
    nav: Array<{ label: string, to: string, icon?: string }>,
    footer: {
      copyright: string,
      startYear: number,
      extraLinks: Array<{ label: string, to: string }>,
    },
  },
  feed: {
    // RSS/Atom 订阅配置（见第十章）
    fullText: boolean,        // false 只输出摘要，true 输出渲染后全文
    limit: number,            // feed 内最多收录文章数，默认 20
    rss: { enabled: boolean, path: string },   // 默认 /rss.xml
    atom: { enabled: boolean, path: string },  // 默认 /atom.xml
  },
  search: {
    // 站内搜索配置（见第十一章）
    enabled: boolean,         // 总开关，false 时无搜索入口、不生成索引
    shortcut: string,         // 全局快捷键，默认 'mod+k'
    debounceMs: number,       // 输入防抖，默认 200
    maxResults: number,       // 最多返回结果数，默认 20
    history: boolean,         // 是否记录搜索历史（localStorage）
    includeDrafts: boolean,   // 是否索引 draft 文章（仅开发环境生效）
    boost: { title: number, description: number, tags: number, category: number, text: number },
    highlight: { enabled: boolean, snippetLength: number },
  },
})
```

### 4.2 主题级配置 — `app/theme.config.ts`

集中管理设计 tokens，禁止在组件里写魔法值（颜色 hex、字号、间距、圆角、动画时长）。

```ts
export default defineAppConfig({
  theme: {
    accent: { light: '#0f766e', dark: '#5eead4' },  // 唯一强调色
    radius: '0.5rem',          // 全局圆角
    contentMaxWidth: '764px',  // 正文最大宽度
    fontFamily: { sans: 'Inter, LXGW WenKai, ...', mono: 'JetBrains Mono, ...' },
    animation: { duration: 200, easing: 'ease-out' },
    toc: { enabled: true, position: 'right', mobileCollapsible: true },
    reading: { wordsPerMinute: 300, showReadingTime: true },
    darkMode: { defaultMode: 'system', enableCircularReveal: true },
  },
})
```

该文件同时驱动 Tailwind v4 的 `@theme` 块（通过 `:root` CSS 变量注入），保证改一处全站生效。

### 4.3 页面级配置 — `app/pages.config.ts`

每个路由独立配置，避免业务参数散落在页面组件里。

```ts
export default defineAppConfig({
  pages: {
    home: {
      pinnedCount: 2,
      latestCount: 10,
      showExcerpt: false,
      cta: { label: '查看全部', to: '/archive' },
    },
    archive: { groupBy: 'year' | 'month', showCount: true, order: 'desc' },
    categories: { layout: 'list' | 'grid' },
    tags: { cloudMinSize: 'sm', cloudMaxSize: 'xl' },
    links: {
      columns: { mobile: 2, tablet: 3, desktop: 4 },
      showAvatar: true,
      applyRules: string[],   // 申请友链规则文案，Dialog 展示
    },
    about: {
      blocks: ['intro', 'now', 'skills', 'timeline', 'contact'],
      timeline: Array<{ year: number, title: string, detail?: string }>,
    },
    post: {
      showToc: true,
      showPrevNext: true,
      showRelated: true,
      relatedCount: 3,
      showCopyButton: true,
      showImageViewer: true,
    },
  },
})
```

`definePageMeta` 只放 transition / layout / keepalive 这类路由行为，业务参数全部从 `pages.config.ts` 读取。

### 4.4 内容级配置

- 文章数据全部来自 `content/` 目录 + frontmatter
- 友链数据放 `app/data/links.ts`（结构化数组，不放 markdown）
- 关于页正文放 `content/about.md`，元数据（技能清单、时间线）放 `app/data/about.ts`
- 404 页、错误页文案放 `app/data/system.ts`

### 4.5 禁止清单（违反即返工）

- ❌ 组件内硬编码站点名/作者名/链接/中文文案字符串
- ❌ 颜色写成 `#52525b` 而不是从 theme token 读取
- ❌ 混用任意 `style="margin-top:24px"` 内联样式
- ❌ 动画时长直接写 `transition: 250ms`（必须从 theme token 读取）
- ❌ 引入 Pinia / Vuex / Axios 等额外依赖

## 五、设计语言（必须严格遵守）

### 5.1 整体基调

现代极简 / 编辑风极简。参考站：anthonyfu.com、leerob.io、paco.me、2x.nz、rauno.me等等。
关键词：brutalist minimal、editorial minimal、mono-weight typography。

**严禁**：AI 渐变背景（紫粉/蓝紫/彩虹）、glassmorphism、emoji 装饰、彩色 tag、卡片堆砌、
营销文案、霓虹色、backdrop-blur 滥用、bounce/spring 动画、hero 大图 + 大标语套路。

### 5.2 配色规则

- 基底：shadcn-vue 的 `zinc` 灰阶（真灰阶，无色相偏移），明暗两套变量齐全
- 强调色：**仅一个低饱和度色**（从 theme.config.ts 读取）
- 边框：以 `1px` 实线为主，分隔用 `border` 而非背景色块
- 阴影：几乎不用，仅弹层允许 `shadow-sm`；暗色模式禁用所有阴影

### 5.3 字体规则

- 英文 Inter，中文 LXGW WenKai（霞鹜文楷），等宽 JetBrains Mono
- 标题与正文**同字号、分权重**（700 / 400），不靠大小堆层级
- 行距：正文 `1.75`，标题 `1.3`；段落间距 > 行距

### 5.4 几何与动效

- 圆角：全局 `8px`（`rounded-lg`）以下，禁止 `rounded-2xl` 以上
- 动效：单段过渡 ≤ 200ms，统一 `ease-out`，禁止 spring/bounce
- 内容最大宽度 `764px` 居中（从 theme token 读取）

## 六、布局与响应式

- **桌面端（≥1024px）**：顶部固定导航（站名 + nav 配置项 + 搜索按钮 + 主题切换），正文区居中。一级项与 `site.nav` 的顶层项一一对应；有 `children` 的分组渲染为**按钮 + 点击展开的下拉菜单**（父项本身不跳转），菜单为 1px 实线边框、4px 圆角、无阴影、不透明背景，子项当前路由加粗高亮。菜单在点击外部、按 Escape、路由变化时关闭，Escape 后焦点归还触发器；触发器带 `aria-expanded` / `aria-controls`，命中任一子项路由时父项显示激活下划线。**不使用鼠标悬停展开**，以保证触屏笔记本与键盘用户可用
- **平板与移动端（<1024px）**：右上角汉堡按钮 → 从右侧滑出**贴边抽屉**（`width: min(82vw, 20rem)`，1px 左边框，无圆角无阴影），抽屉内为**两级导航列表**：有子项的父项就地展开/收起（父项本身不跳转），子项以 1px 竖脊线缩进；命中当前路由的分组在打开时默认展开。抽屉带遮罩、锁背景滚动、Escape 关闭、Tab 焦点环留在面板内、路由变化自动关闭
- **不再使用底部 Tab 栏**（原 §6 的 <768px 底部固定 Tab 栏已由右侧抽屉取代）
- 主题切换按钮在所有断点可见

## 七、页面清单与逻辑（全部走 pages.config.ts 配置）

### 7.1 首页 `/`

- 顶部：作者 bio 一句话签名（来自 site.author.bio）
- 置顶文章（`pinned: true`，最多 `pinnedCount` 篇）
- 最新 `latestCount` 篇文章（**纯文字列表**：日期 + 标题 + 标签，无卡片堆叠）
- 底部：CTA 按钮 → `/archive`

### 7.2 文章详情 `/posts/[slug]`

- 头部：标题 / 日期 / updated / 标签 / 阅读时长
- 正文右侧 sticky 目录（h2/h3），移动端折叠到顶部
- 上一篇 / 下一篇（同分类优先，否则按时间相邻）
- 相关文章（同分类或共享标签，最多 `relatedCount` 篇）
- 代码块：复制按钮、语言标签
- 图片：lazy + 点击放大
- 预留 `<CommentSlot />` 占位（暂不接入评论）

### 7.3 归档 `/archive`

- 按 `groupBy` 分组（默认 year），组标题大字号 + 当组文章数
- 列表仅显示：日期（YYYY-MM-DD）+ 标题，无摘要无封面

### 7.4 分类 `/categories` + `/categories/[slug]`

- 第一页列出所有分类及文章数（从 Content collections 实时查询，禁止硬编码）
- 点入显示该分类下所有文章，复用文章列表组件

### 7.5 标签 `/tags` + `/tags/[slug]`

- 第一页是标签云，字号随文章数梯度变化，**不使用颜色区分**
- 点入显示该标签下所有文章

### 7.6 友链 `/links`

- 数据源：`app/data/links.ts`，字段：`{ name, avatar, description, url, owner }`
- 网格布局，列数由配置读取，遵循全站边框和圆角规则
- 顶部"申请友链"按钮，弹出 Dialog 展示 `applyRules`

### 7.7 关于 `/about`

- 按 `pages.about.blocks` 顺序渲染区块，可开关
- 区块：intro / now / skills（纯文字列表，**禁止进度条**）/ timeline / contact
- 不使用头像卡片、不使用技能雷达图

### 7.8 其他

- `/404`：极简 404 + 返回首页链接
- `/rss.xml`、`/atom.xml`：见第十章
- 搜索为全局弹窗（无独立路由页），入口见第十一章

## 八、文章 frontmatter schema

```ts
// content.config.ts
import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        updated: z.date().optional(),
        tags: z.array(z.string()).default([]),
        category: z.string(),
        cover: z.string().optional(),
        draft: z.boolean().default(false),
        pinned: z.boolean().default(false),
      }),
    }),
    about: defineCollection({ type: 'page', source: 'about.md' }),
  },
})
```

- 排序规则：`pinned DESC, date DESC`
- `draft: true` 在生产构建时跳过，本地 `?draft=1` 可预览

## 九、交互与"无加载"

- `experimental.viewTransition: true`：列表→详情封面图共享元素过渡
- `app.pageTransition: { mode: 'out-in' }`（时长从 theme token 读取）
- 所有数据 SSR/SSG 阶段注入，禁止客户端二次请求造成骨架屏闪烁
- **删除 NuxtLoadingIndicator**，依赖 viewTransition 自然过渡
- `<NuxtLink>` 默认 prefetch，外链/友链显式 `no-prefetch`
- 文章列表 `definePageMeta({ keepalive: true })`，返回时恢复滚动位置
- 图片用 `<NuxtImg>`，自动 blurhash 占位

## 十、RSS / Atom 订阅（必须实现）

### 10.1 端点与格式

| 端点 | 格式 | 实现 |
| --- | --- | --- |
| `/rss.xml` | RSS 2.0 | `server/routes/rss.xml.get.ts` |
| `/atom.xml` | Atom 1.0 | `server/routes/atom.xml.get.ts` |

- 是否启用、路径均可通过 `blog.config.ts` 的 `feed` 字段配置；`enabled: false` 时路由不注册、head 不注入
- 两个 feed 均从 Nuxt Content v3 的 `posts` collection 查询生成，**禁止手写数据**
- 收录规则：过滤 `draft: true`，按 `date DESC` 取前 `feed.limit` 篇

### 10.2 条目内容规范

- `<title>` / `<link>` / `<pubDate>`（RSS）或 `<updated>`（Atom）必填
- `<description>`：`feed.fullText: false` 时输出 frontmatter 的 `description`；`true` 时输出**渲染后的 HTML 全文**（用 Nuxt Content 的渲染结果，禁止输出原始 markdown 源码）
- 全文 HTML 中的相对链接（图片、内链）需转换为基于 `site.url` 的绝对链接
- 所有动态文本做 XML 转义（或 CDATA 包裹），确保含 `<`、`&`、代码块的文章不破坏 feed 结构
- feed 顶层标注 `lastBuildDate` / `<updated>`，取最新文章的 date

### 10.3 自动发现与入口

- `app/head`（或 `useHead`）注入：

  ```html
  <link rel="alternate" type="application/rss+xml" title="{site.name}" href="{site.url}/rss.xml">
  <link rel="alternate" type="application/atom+xml" title="{site.name}" href="{site.url}/atom.xml">
  ```

- footer 的 `site.social` 中预置一个可选项 `{ label: 'RSS', url: '/rss.xml', icon: 'tabler:rss' }`，用户配置了才显示

### 10.4 SSG 静态化

- `nitro.prerender.routes` 中显式加入 `/rss.xml` 和 `/atom.xml`，构建时输出为纯静态文件
- Cloudflare Pages 托管下读者请求 feed 不触发任何服务端计算

## 十一、搜索功能（参考 L33Z22L11/blog-v3 的实现）

### 11.1 技术选型

- 使用 **`minisearch`** 作为全文搜索引擎
  - 体积小（~3KB）、纯前端、零依赖、支持前缀搜索 / 模糊匹配 / 字段权重
  - 构建时生成索引 JSON，客户端按需加载，SSG 模式下无任何服务端开销
- ❌ 不使用 Pagefind（适合上万页站点）、Fuse.js（权重排序弱）、Algolia / MeiliSearch（需后端）

### 11.2 索引生成

- 索引通过 `server/routes/api/search-index.json.get.ts` 生成，并在 `nitro.prerender.routes` 中预渲染为静态 JSON
- 索引内容：从 `posts` collection 查询，过滤 `draft: true`（除非 `search.includeDrafts` 且为开发环境）
- 每条记录仅保留必要字段：

```ts
type SearchDoc = {
  id: string            // 文章 slug，作为 MiniSearch 主键
  title: string
  description: string
  tags: string[]
  category: string
  text: string          // 渲染后正文剥离 HTML 标签后的纯文本
  path: string          // /posts/xxx
  date: string          // ISO，用于结果排序
}
```

- 正文文本预处理：去 HTML 标签 / 去代码块（或保留代码块但降低权重，二选一，先向我确认）/ 去多余空白
- 索引文件 gzip 后控制在 300KB 以内

### 11.3 UI 实现

- 使用 shadcn-vue 的 **`Command`**（基于 cmdk）+ **`Dialog`** 组合成搜索弹窗，风格类似 Raycast / Linear
- 触发方式：
  - 顶栏右侧的搜索图标按钮
  - 全局快捷键 `⌘K` / `Ctrl+K`（从 `search.shortcut` 读取）
  - 顶部导航栏右侧的搜索图标按钮（所有断点可见，抽屉内不再重复放置搜索入口）
- 交互细节：
  - 空状态：显示"输入关键词搜索"+ 最近 3 条搜索历史（localStorage，`search.history` 开关）
  - 输入：`debounceMs` 防抖后实时查询
  - 关键词高亮：`<mark>` 包裹命中片段，配色走 theme token
  - 选中结果：`router.push` 跳转并关闭弹窗
  - `↑↓` 切换选中项，`Enter` 跳转，`Esc` 关闭
- 弹窗样式遵循全站规则：`rounded-lg`、`border 1px`、无阴影堆砌、明暗两套变量齐全

### 11.4 中文分词

- MiniSearch 默认按空格切词，对中文不友好
- 必须自定义 `tokenize`：对 CJK 字符按单字切分（或二元语法 bigram），英文单词保持整词
- 这是硬性要求，实现后用中文关键词实际验证

### 11.5 "无加载"适配

- 索引文件**在用户首次触发搜索时才请求**（懒加载），不阻塞首屏
- 加载完成后缓存到 `useState`，会话期间不再二次请求
- 加载期间用 `<Skeleton>` 占位，100ms 内完成，不显示明显 loading

### 11.6 搜索模块禁止清单

- ❌ 在组件里写死搜索路径 / 权重 / 防抖时间（必须从 `blog.config.ts` 读取）
- ❌ 把 markdown 源码塞进索引（必须剥离 HTML、压缩空白）
- ❌ 在服务端做实时搜索（必须纯前端）
- ❌ `search.enabled: false` 时仍生成索引、注册路由、显示入口

## 十二、明暗模式

- 三态切换：light / dark / system，默认 system
- localStorage 持久化用户选择
- `app/head` 注入内联脚本，在 HTML 渲染前读取偏好，**避免 FOUC**
- 主题切换使用 viewTransition 圆形扩散动画
- 颜色变量全部走 shadcn 的 CSS 变量体系（`--background` / `--foreground` / `--primary` / `--border`）

## 十三、站点工程

- `@nuxtjs/seo` 一站式接入（sitemap / robots / schema-org / link-checker）
- `nuxt-og-image` 为每篇文章动态生成 OG 图（1200×630，极简文字版式，遵循站点配色）
- favicon：提供 32 / 180 / 512 三档
- 评论：暂不接入，预留 `<CommentSlot />` 组件位
- 统计：按 `site.analytics` 配置动态加载脚本，`'none'` 时不注入任何脚本
- 备案号：按 `site.beian` 配置渲染到 footer，无则不显示

## 十四、目录结构约定

```
app/
├── app.config.ts              # 仅做 import + re-export
├── blog.config.ts             # 站点配置 + feed + search（唯一全局源）
├── theme.config.ts            # 主题 token
├── pages.config.ts            # 路由级业务配置
├── assets/css/main.css        # Tailwind v4 入口 + @theme 块
├── components/
│   ├── ui/                    # shadcn-vue 生成
│   ├── server/                # .server.vue（正文、目录、归档）
│   └── common/                # Header / Footer / ThemeToggle / PostList
│                              # SearchTrigger / SearchDialog
├── composables/
│   ├── useSiteConfig.ts       # 封装 useAppConfig，类型安全访问
│   └── useSearch.ts           # 封装 MiniSearch 实例、索引加载、查询
├── data/
│   ├── links.ts
│   ├── about.ts
│   └── system.ts
├── layouts/
│   ├── default.vue
│   └── post.vue
└── pages/
    ├── index.vue
    ├── archive.vue
    ├── categories/
    ├── tags/
    ├── links.vue
    ├── about.vue
    ├── posts/[slug].vue
    └── [...404].vue

content/
├── posts/
└── about.md

content.config.ts
nuxt.config.ts                 # 仅模块注册和构建配置，不放业务数据
server/
└── routes/
    ├── rss.xml.get.ts         # RSS 2.0
    ├── atom.xml.get.ts        # Atom 1.0
    └── api/search-index.json.get.ts   # 搜索索引（构建时预渲染）
```

## 十五、明确不做

- ❌ 后台管理（内容通过 markdown 维护）
- ❌ 国际化（除非后续显式开启）
- ❌ 评论、统计默认接入（必须通过配置显式开启）
- ❌ 服务端实时搜索（必须纯前端 MiniSearch）
- ❌ AI 渐变、glassmorphism、emoji 装饰、彩色 tag、卡片阴影堆砌
- ❌ 任何形式的硬编码（站点名、文案、链接、颜色、间距、时长、feed/索引数据）

## 十六、验收标准

### 配置与架构

- [ ] 改一个 `blog.config.ts` 字段，全站对应位置更新，无遗漏
- [ ] 改一个 `theme.config.ts` token，全站视觉同步更新
- [ ] 改一个 `pages.config.ts` 字段，对应页面行为变化
- [ ] `grep -r "硬编码字符串" app/components app/pages` 命中为 0

### 浏览器实测（用本地浏览器逐项走查）

- [ ] 全站所有路由在 375px / 768px / 1440px × 明/暗 四象限组合下截图无错位
- [ ] 明暗切换无闪烁，跟随系统自动切换
- [ ] 任意页面跳转无白屏、无 loading 闪烁
- [ ] `⌘K` / `Ctrl+K` 唤起搜索弹窗，中文关键词（如"前端"）能命中正确文章，标题命中权重最高
- [ ] 移动端/平板右上角汉堡按钮打开右侧抽屉，父项就地展开子项、父项不跳转，点叶子项跳转并自动关闭抽屉；Escape 与遮罩均可关闭，焦点归还触发按钮
- [ ] 桌面端一级项与 `site.nav` 顶层项一致，分组项点击展开下拉菜单（父项不跳转），子项可跳转且当前项加粗；点击外部、Escape、路由变化均关闭，Escape 后焦点归还触发器
- [ ] 全站图标来自本地 bundle，浏览器不向 `api.iconify.design` 发起任何请求

### Feed 与索引

- [ ] `/rss.xml` 与 `/atom.xml` 输出合法 XML，通过 W3C Feed Validation
- [ ] 含代码块、`&`、`<` 特殊字符的文章进入 feed 后解析不报错
- [ ] `feed.fullText: true` 时 reader 内可读渲染后全文，图片正常加载
- [ ] `feed` / `search` 任一 `enabled: false` 后：入口消失、对应路由 404、head 无相关注入
- [ ] 搜索索引 gzip 后 ≤ 300KB，首次加载 ≤ 100ms（本地网络）

### 构建产物

- [ ] Lighthouse 性能 / 可访问性 / 最佳实践 / SEO 全部 ≥ 95
- [ ] `pnpm generate` 产物为纯静态 HTML（含 rss.xml / atom.xml / search-index.json），可直接托管 Cloudflare Pages
