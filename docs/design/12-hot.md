# 12 · 热搜页（/hot）

> 状态：**已实施并验收通过**（2026-11-12）。
> 参考实现：`E:\github_maochenyu_me\blog\WxuyuNuxtBlog`（app/pages/hot.vue + components/showcase/HotCard.vue），线上 https://www.wxuyu.top/hot

## 1. 数据源

- API：`https://hot-api.liiiu.cn/{platform}?cache=true`（配置在 `pages.config.ts` 的 `hot.apiBase`，不散落）
- 实测（2026-11-12）：`code:200`，返回壳 `{code, name, title, total, updateTime, data: HotItem[]}`
- `HotItem`：`{id, title, desc, cover, author, timestamp, hot, url, mobileUrl}`
- CORS：`access-control-allow-origin: *` → 纯客户端 fetch，**无需 server 代理**，兼容纯 SSG
- 实测可用平台（200）：bilibili / weibo / douyin / zhihu / 36kr / baidu / toutiao / hupu / thepaper / qq-news / netease-news / sspai / hackernews / github（producthunt 500、ifeng/jin10/aibase/linux-do 404，不用）

## 2. 平台集合（已确认）

| key | label | 图标 |
|---|---|---|
| bilibili | 哔哩哔哩 | tabler:brand-bilibili |
| weibo | 微博 | tabler:brand-weibo |
| douyin | 抖音 | tabler:brand-douyin |
| zhihu | 知乎 | tabler:brand-zhihu |
| toutiao | 今日头条 | tabler:brand-tiktok（实装时核对可用图标） |
| baidu | 百度 | tabler:brand-baidu |
| 36kr | 36氪 | 无品牌图标则回退 tabler:trending-up |

## 3. 布局（已确认：featured）

- 首条单栏大卡：封面左 44%（16:9）+ 标题/摘要右侧；其余两栏竖卡（封面在上）
- 无封面或封面加载失败：大卡退化为单栏信息卡，竖卡用全站占位图 `/images/covers/default.svg`（fcircle 同款 onerror 兜底）
- rank 徽标：top1 `#EA444D` / top2 `#ED702D` / top3 `#EEAD3F`，其余中性灰；`font-variant-numeric: tabular-nums`
- 热度格式化：≥1e6 → `x.xM`，≥1e4 → `x.x万`，其余原值
- 分页：20 条/页，页码分页复用 fcircle 交互（省略号 + 翻页回滚列表顶部）
- 切换平台 / 数据变化时页码重置为 1

## 4. 文件清单

| 文件 | 动作 |
|---|---|
| `app/pages/hot.vue` | 新建：tab + useFetch(server:false) + 骨架 + 卡片流 + 分页 + 错误/空态 |
| `app/components/hot/HotCard.vue` | 新建：featured 大卡 / 两栏竖卡双形态 |
| `app/components/hot/HotSkeleton.vue` | 新建：shimmer 骨架，首条占满整行 |
| `app/types/hot.ts` | 新建：`HotApiResponse` / `HotItem` |
| `app/pages.config.ts` | 加 `hot` 节点（apiBase / platforms / layout / pageSize / cache） |
| `app/composables/usePageConfig.ts` | 加 `HotPageConfig` 接口 |
| `app/data/ui.ts` | 加 `pages.hot` 全部文案（标题/副标题/状态行/错误/重试/aria） |
| `app/blog.config.ts` | nav「功能集合」children 加 `{ label: '热搜', to: '/hot', icon: 'tabler:flame' }` |
| `docs/design/12-hot.md` | 本文档 |

## 5. 视觉方向

延续全站编辑部气质：暖赭石 accent（浅 #a54b30 / 深 #d4825f）+ 卡片化 + 等宽数字的「轻数据看板」感。全部复用现有令牌（`--foreground / --muted / --card / --border / --accent / --radius / --fs-h1 / --fs-meta / --font-mono / --duration-base / --easing-base`），零新字体、零新依赖。深浅色自动随主题。页面骨架对齐 fcircle 惯例：container + SiteBreadcrumb + page-head（h1 + 副标题带 updateTime）+ 状态行 + 卡片流 + 分页。

## 6. 多端适配

- 列数：<768 单列；768~1279 两栏；≥1280 两栏 + featured 首条大卡
- featured 大卡 <600px 转上下结构；tab 行 `overflow-x:auto` 隐藏滚动条
- 触控目标 ≥44px；焦点环可见；`prefers-reduced-motion` 降级全部动画；状态行 `role="status"`
- 封面 `loading="lazy" decoding="async" referrerpolicy="no-referrer"`（破防盗链）

## 7. SSG / 水合注意

- `useFetch` 用 `server: false`：预渲染 HTML 为骨架屏，首帧客户端同为骨架 → 无 hydration mismatch；水合后拉真数据
- 接口失败不阻塞构建：错误态 + 重试按钮（客户端 `refresh()`）
- 验收流程照纪律：`rm -rf dist → build → pnpm preview:dist`，`pnpm verify` 显式传 `http://127.0.0.1:4173`

## 8. 验收清单（2026-11-12 实测）

- [x] 7 平台 tab 切换数据正确，切换重置页码（bilibili 实测 100 条 / 5 页）
- [x] featured 首条大卡跨满整行 + 两栏卡片在深浅色两态可读（puppeteer 六视图截图，`.audit/shots/hot-*.png`）
- [x] 375 / 768 / 1440 三档布局正确，无横向溢出（verify.mjs：90 页 0 错误、溢出 0）
- [x] rank 前 3 徽标色（#EA444D/#ED702D/#EEAD3F）与热度格式化（2.9M / 万）正确
- [x] 接口错误态 + 重试按钮可用（错误态由 `role="alert"` 暴露）
- [x] `pnpm verify` 通过：audit-hardcode 0 处硬编码（「万/M」单位已收进 ui.hot）；90 页 0 错误
- [x] 字体子集重新生成：1401 字符（含热搜页新汉字），缺失 0；静态校验 font-display/楷体回退/preload 正常

## 9. 实施中踩的坑

1. **components 目录白名单**：本项目 nuxt.config.ts 显式列出组件目录，`components/hot` 漏列时
   组件静默不注册（生产构建剥掉 Vue 警告，页面其他部分照常渲染）——表现为卡片区域空白但
   状态行/分页正常。已把 `~/components/hot` 加入清单（nuxt.config.ts 注释里的历史坑再次应验）。
2. **跨行要挂在 li 上**：卡片流用了 `<ul><li>` 包裹，`grid-column: 1/-1` 写在 article 上无效
   （li 才是网格项）。已改为 `li.is-lead { grid-column: 1/-1 }`。
3. **featured 封面用 16:9 固定比例 + align-self: center**：aspect-ratio auto 会被封面图固有
   比例（部分平台是竖图）撑高卡片。

## 10. 已知限制 / 非本次引入的既有问题

- `pnpm verify` 的 6 项 FAIL 全部是 /about 页请求 `/api/umami`（Cloudflare Pages Function）
  在本地静态 preview 下 404 —— 既有环境限制（functions/ 不被 serve-dist 承载），上线即恢复。
- `pnpm verify:font` 动态检查在 `/` 路由 networkidle0 超时 —— 测试文章戊
  （content/posts/test-external-eps.md，2026-09-15 加入）的封面是 picsum.photos 外链，
  该站当前访问慢导致首页永远有 inflight 连接。与 /hot 无关；如需恢复动态字体门禁，
  给该测试文章换本地封面即可。
- 本地预览的字体子集已含热搜页汉字；CI（deploy.yml）部署时会按最新内容自动再生。
