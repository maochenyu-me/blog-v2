# 11 · 文章永久短链接（abbrlink）

> 参考 https://blog.liushen.fun/posts/05e5180f/ 的链接形态与
> https://github.com/ohroy/hexo-abbrlink 的「算完写回 frontmatter 固化」机制。
> 实测验收记录在文末（2026-11-11）。

## 目标

- 文章 URL 从 `/posts/typography-over-color`（暴露文件名、长）改为
  `/posts/90a855a1`（crc32-hex 8 位短 id）
- **一次赋号永不改变**：改标题、改正文、甚至改文件名都不影响 URL
- 旧链接不 404；面包屑、RSS/Atom、搜索、sitemap 全站适配

## 架构决策

@nuxt/content 3 的 `path` 由内置 path-meta transformer 从**文件名 stem** 派生；
全站（feed guid、搜索索引、列表卡片、prevNext、canonical、AI sitemap）全部
**消费文档 `path` 单点派生**——所以只需在 path 的来源上动一刀，其余零改动。

三个组件分工：

```
scripts/abbrlink.mjs          （构建前跑，pnpm build/generate 已前置）
  1. 扫 content/posts/*.md，frontmatter 缺 abbrlink 的：
     crc32-hex(`${title}|${date}`)（碰撞加盐重算），写回 frontmatter（插在 date 行后）
  2. 已有 abbrlink 的永不重算 → 幂等，重复执行零变更
  3. 产出 public/_redirects（CF Pages 301：旧 slug → 新 id，含尾斜杠双变体）
  4. 产出 app/utils/abbrlink-map.generated.ts（站内兜底映射，勿手改）

modules/abbrlink.ts
  content:file:afterParse hook（在 path-meta 之后执行）：
  content.abbrlink 存在且为 8 位 hex → content.path = /posts/<abbrlink>

app/middleware/post-legacy-redirect.global.ts
  全局路由中间件：/posts/<旧文件名 slug> 命中映射表 → 302 跳新路径
  （生产环境的旧链接由 _redirects 301 兜底，这里覆盖 dev / SPA 导航）
```

## 为什么不用「重命名文件」方案

- md 文件名保持可读（找文章、git blame、diff review 都直观）
- frontmatter 一行 `abbrlink: xxxxxxxx` 是唯一的持久化锚点，和 hexo-abbrlink 同构
- 文件名改名**不再影响 URL**（stem 只在首跑前有意义）——文件名从 URL 契约中解耦

## 各消费方适配清单

| 消费方 | 适配 |
| --- | --- |
| RSS/Atom `<link>`/`<guid>`/`<id>` | 自动跟随（透传 path）✓ |
| `/api/search-index.json`（MiniSearch id=path 末段） | 自动跟随，短 id 唯一性更好 ✓ |
| canonical / og:url（[slug].vue:52） | 自动跟随 ✓ |
| 面包屑 `SiteBreadcrumb` 规则表 | 正则 `/^\/posts\/[^/]+\/?$/` 天然兼容短 id，末级显示文章标题 ✓ |
| `MobileToc` 的 isPost 判定 | 同正则，兼容 ✓ |
| 面包屑 cd .. 来路（sessionStorage） | 存任意站内路径，无 slug 假设 ✓ |
| 验收脚本硬编码路径 | verify.mjs / verify-font-flash.mjs / verify-math.mjs 已更新为实际 id |
| AI sitemap（dist/sitemap.md） | 自动跟随 ✓ |

## 已知代价

- **Ecoku 评论 pageKey = 文章 URL**：本次切换一次性丢失旧路径下的评论
  （站点评论少，损失可控）；此后 URL 永久稳定，不会再丢
- 订阅器里旧的 feed guid 会视为新文章重新收录一次（guid 从旧 slug 变新 id）
- 22 篇 md 各多一行 frontmatter（一次性 diff）

## 实测验收（2026-11-11）

- `pnpm build` exit=0（169 HTML）；abbrlink 脚本两连跑幂等（第二次 0 写入）
- 产物：`dist/posts/` 全部为 8 位 hex 目录，0 个旧文件名；`dist/_redirects` 存在
- 路由：`/posts/90a855a1/` 200；`/posts/typography-over-color/` 静态 404
  （生产由 CF 301 接管）；SPA 导航旧 slug 实测自动跳 `/posts/90a855a1` ✓
- RSS `<link>`、搜索索引 path、canonical、AI sitemap 全部为新短 id ✓
- 面包屑实拍：`~ / 归档 / 排版比配色更决定气质`，短 id URL 下末级显示标题 ✓
- `pnpm verify` @4173：90 页状态 0 错误 0 溢出 PASS；audit-hardcode PASS
