# 14 · 站点统计（/analytics）

## 定位

一个「公开只读」的站点数据看板，放在顶栏「关于 → 更新日志」之后。
数据来自 Umami 的**公开分享接口**，不接触站点私钥，不记录任何可识别个人身份的信息。

参考站：`https://0dm.cn/analytics/`（Firefly 主题的 analytics 页）。
本站在其信息架构基础上按喵洛阁的设计语言重做：不用彩色分类标签、不用玻璃卡片堆叠，
配色收敛到单一 `--accent` 与 `--muted` 层级。

## 数据链路

```
/api/share/<shareId>            → { websiteId, token }（缓存 24h）
/api/websites/<wid>/stats       → 区间 visitors / pageviews / visits
/api/websites/<wid>/pageviews   → 时间序列（unit=day | hour，timesone=Asia/Shanghai）
/api/websites/<wid>/metrics     → type=url|referrer|country|device|browser
```

请求头固定：`x-umami-share-token` + `x-umami-share-context: 1`。
实例 CORS 全开（`access-control-allow-origin: *`），浏览器直连即可，无需同源代理。

**实测坑位（2026-11-27）**：

| 项 | 结论 |
| --- | --- |
| `type=path` | 400 Bad request，正确键是 `type=url` |
| `unit=hour` | 只在约 **2 天**内返回小时粒度，更早区间静默退化成按天（x 全是 `00:00:00`） |
| `type=region/city` | 返回 `x: null` + `country` 字段，没有省市名（实例未装 GeoIP 城市库） |
| 无事件 | `metrics?type=event` 返回空数组，友链点击等事件名在当前站点未上报 |

所以活跃热力图取 `activityDays: 2`，并在降级时把「最活跃时间 / 星期 / 夜间占比」全部置 `—`，
不拿按天聚合出来的假分布冒充小时分布。

## 配置

全部在 `app/pages.config.ts` 的 `pages.analytics`：

| 键 | 作用 |
| --- | --- |
| `shareApiBase` | Umami 实例根地址（不带尾斜杠） |
| `shareId` | 公开分享 ID |
| `siteUrl` | 被统计站点地址，用于拼分享页链接 |
| `defaultRange` / `ranges` | 趋势图默认与可选天数（7 / 30 / 90） |
| `cacheMinutes` | 客户端 localStorage 缓存时长（公开接口有速率限制） |
| `rankLimit` | 榜单条数 |
| `activityDays` | 活跃热力图取数天数，**别超过 2** |

## 页面结构

三栏 + 底部两通栏。容器放宽到 **1240px**（`--wide-max-width` 只有 1000，中栏会被挤到 450）。

```
页头（kicker + 标题 + 免责说明 + 状态 + 数据源链接 + 同步时间）
概览四卡：累计访客 / 累计浏览 / 今日访客 / 今日浏览

┌ 左栏 260 ─┬─ 中栏 自适应 ─┬─ 右栏 260 ─┐
│ 本周期数据 │ 访问脉冲       │ 设备与浏览器 │
│ 访客地域   │ 大家在看什么   │ 流量来源     │
└──────────┴──────────────┴────────────┘

通栏（整行）
  ├ 推送节奏：最近推送 / 近 30 天 / 平均节奏 / 连续活跃 + 53 周热力图
  └ 访客活跃时间：7×24 热力图 + 四项摘要
页脚
```

**断点策略**：≤1000px 直接退成单栏，并把中栏 `order: -1` 提到最前
（先看趋势图，再看明细）。不走「三栏 → 两栏」——实测两栏时短列底部会留 370px
空白（`col-tablet` 截图），比单栏更难看。

## 实现要点

- **纯客户端取数**：`onMounted` 触发，预渲染产物只有骨架，SSG 零请求、无水合偏差。
- **区间口径**：「本周期数据」走单独的 `stats(startAt, endAt)`，不能用全站累计值顶替
  （初版踩过，7 天视图显示的是全站 34/14）。
- **流量来源补直接访问**：Umami 的 `referrer` 不含 direct，用 `区间 visitors - referrer 合计`
  反推一行；为负则不加。
- **趋势图补零**：接口返回的是稀疏点（只有有数据的日期），按 `range` 生成连续日轴再填 0，
  否则 7 天视图会画成 5 个点。
- **推送热力图**：读构建期 `app/data/changelog.json`（`modules/changelog.ts` 从 git log 生成），
  不额外发请求；格子按 53 周 × 7 天排列，`future` 表示未来的空白格。

## 红线遵守

- 中文全部进 `app/data/ui.ts` 的 `ui.analytics`（含国家名、设备名、星期、月份、小时后缀），
  `scripts/audit-hardcode.mjs` 0 处硬编码。
- 单色系：所有数据色都是 `--accent` 与 `var(--muted)` 的 `color-mix`，不引第二主色。
- 无阴影、无渐变玻璃卡（除页头/页脚沿用全站 `glass-panel`）。

## 验收记录（2026-11-27 实测）

```
pnpm typecheck            ✅ 0 error
pnpm build                ✅ 1m 04s，dist/analytics/index.html 生成
node scripts/verify.mjs   ✅ 90 个页面状态，0 溢出，明暗各 15/15
```

真实数据核对（Umami 当期）：

| 项 | 页面值 | 接口值 |
| --- | --- | --- |
| 累计访客 / 浏览 | 14 / 34 | 14 / 34 |
| 今日访客 / 浏览 | 3 / 6 | 3 / 6 |
| 活跃天数 / 单日峰值 | 5 / 12 | 从日轴推得 |
| 热门页面 TOP1 | `/` 19 | `/` 19 |
| 地域 TOP1 | 中国 7 | CN 7 |
| 设备占比 | 笔记本 57% / 手机 29% / 桌面 14% | laptop 8 / mobile 4 / desktop 2 |

交互核对：7/30/90 切换与刷新按钮均正常改写图表与文案；图表悬停出提示；
顶栏「关于」下拉出现「站点统计」；移动端抽屉同项存在；面包屑为「~ / 站点统计」。
## 改版记录（同日晚）

- **去掉「最近评论」**：Ecoku 只有按 pageKey 的列表接口，没有全站最新评论，
  拿留言板作用域凑数据意义不大；克喵决定移除，配置里的 `commentLimit` 一并删掉。
- **三栏布局**：左栏（本周期数据 + 地域）/ 中栏（访问脉冲 + 热门页面）/ 右栏（设备 + 来源），
  推送节奏与活跃时间改为通栏。容器 1240px，实测列宽 `260 / 644 / 260`。
- **断点简化**：≤1000px 直接单栏（中栏提前），不做两栏中间态。
- 复验：`typecheck` 0 error、`audit-hardcode` 0 处、`verify.mjs` 90 页 0 溢出；
  960 / 760 / 390 三档实测 `bodyScrollWidth == 视口宽`，无横向溢出。

## 收尾修正

- **来源自引用归并**：Umami 的 referrer 会出现本站域名（跨协议/去 www 的自跳），
  原样显示 `kemiaosw.top` 对读者没意义，现按 `pageCfg.siteUrl` 的主机名比对，统一显示「站内跳转」。
- **验收脚本放行宽版**：`scripts/verify.mjs` 的内容宽度上限按路由区分，原先只有首页与相册走 1420，
  analytics 三栏需要 1240 容器（260 / 644 / 260），已把 `analytics` 加入宽版白名单并注明理由。
- **`analytics` 已进入 `verify.mjs` 页面清单**（此前只覆盖 15 个页面），现在 16 页 × 6 组合全检。
