# 07 · 友链朋友圈（/fcircle）

## 结论

友链朋友圈 = 聚合展示朋友们最近半年博客更新的静态页面。
数据由 GitHub Actions 每天北京时间 06:00 爬取友链 RSS，构建期内联进页面，
不引入任何运行时依赖，与纯 SSG 架构完全一致。

```
friend-links.json (rss 字段)
   │  每天 06:00 (cron "0 22 * * *" UTC)
   ▼
.github/workflows/fcircle-crawl.yml
   └─ scripts/crawl-fcircle.mjs
        ├─ 跳过 lost / 无 rss 的友链
        ├─ 抓取并解析 atom / rss2 / json feed
        ├─ 过滤最近 180 天，单源失败不阻塞
        ├─ 覆盖写 app/data/fcircle.json
        └─ 内容无变化则不提交
   ▼  有变更：bot 提交 master → gh workflow run deploy.yml 显式触发重建
   ▼  （GITHUB_TOKEN 的 push 不会自动触发其他 workflow，必须显式 dispatch）
deploy.yml 正常构建 → CF Pages
```

## 需求决策（2026-11-08 与克喵确认）

| 决策点 | 结论 |
| --- | --- |
| 数据落地 | 提交仓库 + 触发重建（构建期内联，SEO 友好，无客户端加载态） |
| 卡片内容 | 封面图 + 标题 + 摘要截断 + 作者 + 头像 + 时间 |
| 分页 | 页码分页（上一页 / 页码 / 下一页） |
| 筛选 | 按作者筛选（友链 chip，单选含「全部」） |
| 本站文章 | 不混入朋友圈时间流 |
| 时间窗口 | 滚动 180 天，每天爬取时重新计算 |
| 导航 | 友链改为分组：友链页 /links + 朋友圈 /fcircle（图标 tabler:rss） |

## 封面兜底链

RSS 封面来源优先级：atom `<link rel="enclosure">`（type 为 image 或图片扩展名）→
rss2 `<enclosure>` → `media:content/media:thumbnail` → **实体解码后**的正文首图 →
无封面渲染装饰带（头像径向水印 + 图标，不做拉伸填充）；img 加载失败换全站
默认 `/images/covers/default.svg`。最坏情况也不开天窗。

**防盗链（实测踩坑）**：清羽的图床 p.liiiu.cn 对白名单外 Referer 返回 302 到
「严禁外站引用图片」占位图，**空 Referer 放行**。浏览器默认跨域图片带
`Origin` Referer 必中招 → 页面所有图片（封面 + 头像）一律
`referrerpolicy="no-referrer"`。若未来某友链图床反而要求 Referer（极少见），
属于该源图片注定无法外引，走占位图兜底。

## 数据契约

`app/data/fcircle.json`：

```jsonc
{
  "generatedAt": "2026-11-08T22:00:00.000Z",
  "articles": [
    {
      "id": "sha1(url)",            // 稳定 key，分页/筛选不丢焦点
      "title": "文章标题",
      "url": "https://…",
      "author": "纸鹿摸鱼处",        // 友链名称，非文章作者字段
      "avatar": "https://…",        // 友链头像
      "home": "https://…",          // 友链主页，点作者名跳转
      "published": "2026-11-01T12:00:00.000Z",
      "summary": "摘要文本（纯文本，≤120 字）",
      "cover": "https://…"          // 可能为 null → 前端兜底
    }
  ]
}
```

构建时按 `published` 降序写入；页面拿到即有序，客户端不再排序。

## 页面结构

沿用 links.vue 的页面骨架（page-head / container / CSS 变量 / CommentSlot）：

```
页头：朋友圈 (h1) + 副题「{n} 位朋友 · {m} 篇近期文章」
工具栏：搜索框（标题/摘要/作者，输入即筛）＋ 作者筛选 chips（全部 + 各友链头像）
卡片流：1/2/3 列响应式封面卡（cover 16:9 → 作者行 → 标题 → 摘要 clamp 2）
分页：页码分页，筛选/搜索变化时回到第 1 页
空态：搜索无结果提示
```

视觉语言完全复用现有令牌（--fs-* / --muted-foreground / --border / --radius / mono 标签），
不新增任何硬编码颜色与字体，通过 audit-hardcode.mjs 门禁。

## 关键决策

**为什么爬虫脚本零依赖**
手写 ~120 行的 RSS/Atom 提取器（item/entry 块切分 + CDATA 剥离）足够覆盖友链场景的
title/link/date/summary/enclosure/media 五类字段。引入 fast-xml-parser 要动 pnpm-lock，
而解析容错靠「单源失败跳过」兜底，不值得为此加依赖。

**为什么爬完是「有变更才提交」**
RSS 没更新时 generatedAt 也会变，直接提交会造成每天一次空 commit + 空部署。
脚本先写临时文件与旧数据做内容 diff（忽略 generatedAt），无变化直接退出 0。

**为什么页码分页不用路由 query**
数据量级 ≤ 几百条，客户端内存分页即可；不用 /fcircle?page=2 这类路由参数，
避免每个分页状态都生成静态页或引入客户端路由抖动。

**失联友链**：`lost: true` 或缺 `rss` 字段的直接跳过，不爬。

## 验收记录（2026-11-08 实测）

**爬虫**：`node scripts/crawl-fcircle.mjs` 本机实跑 3/3 源成功。
清羽飞扬 5 篇入窗；纸鹿 0 篇（其 feed 同时含 `published`/`updated`，按发布时间过滤，
最近一篇发布于 189 天前，恰好出窗，属正确结果）；CWorld 0 篇（最新一篇 2026-02-25，出窗）。

**静态产物**：`dist/fcircle/index.html` 生成；`audit-hardcode.mjs` PASS（0 硬编码中文）。

**全站视觉验收**（`verify.mjs` × http://127.0.0.1:4173）：
66 个页面状态（11 路由 × 3 视口 × 明暗），错误 0，横向溢出 0，暗色 11/11 生效。

**交互实测**（puppeteer，pageSize 临时改 2 制造 3 页分页）：
初始卡片数/状态行/分页器渲染、翻页后卡片数与当前页高亮、搜索过滤 + 页码重置、
作者 chip 筛选、无结果空态文案、0 控制台错误 —— 12/12 PASS。
测毕 pageSize 恢复 9。

**视觉修正记录**：初版无封面时把友链头像拉大成 16:9 封面，实测五卡同图重复突兀，
改为「无封面装饰带」：头像径向水印（opacity 0.12）+ newspaper 图标，明暗下均协调。

**爬虫解析修正（2026-11-08 晚，克喵发现清羽文章明明有封面）**：
① Atom 用 `<link rel="enclosure" type="image/webp" href="…">` 表达封面，
原实现只认 rss2 的 `<enclosure url>` 标签 → 补 atom enclosure 识别；
② `<content type="html">` 的正文是实体转义串（`&lt;img src=&quot;…&quot;`），
原实现在转义串里找 `<img` 永远落空 → 抠首图前先 decodeEntities。
修正后清羽 5/5 篇全部抠到真实封面。

**防盗链修正（同晚）**：封面虽抓到，页面上全被 p.liiiu.cn 换成防盗链占位图。
curl 实测其策略：空 Referer 200 真图 / 白名单域 200 / 外域 302 占位图。
页面图片统一加 `referrerpolicy="no-referrer"` 后五张真实封面全部正常显示。
