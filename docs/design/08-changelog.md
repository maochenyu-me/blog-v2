# 更新日志页设计与实现记录

> 依据：`BLOG_PROMPT.md`（下称「提示词」）、参考站 `blog.mcxiaochen.top/timeline/`。
> 状态：**已实现并通过全站验收**，本文记录关键决策与实测结果。

---

## 0. 需求回顾

| 议题 | 决定 | 落地文件 |
| --- | --- | --- |
| 数据来源 | 构建期读 git log 自动生成，不手工维护 | `modules/changelog.ts` |
| 视觉语言 | 贴本项目极简体系：竖脊线 + 圆点 + 一行式条目，**不玻璃、不卡片、不阴影** | `app/pages/changelog.vue` 样式 |
| 路由 | `/changelog`，挂在「关于」分组下（导航栏自动继承） | `app/blog.config.ts` nav children |
| 增强 | 类型筛选、分页（不在月份中间断）、合并提交过滤、续页标记 | 同上 + `pages.config.ts` changelog 段 |

---

## 1. 数据层

### 1.1 生成时机

Nuxt 模块 `modules/changelog.ts` 在 `setup()` 阶段跑，产物写到 `app/data/changelog.json`，**不进版本库**（`.gitignore` 已加）。CI 侧由 `deploy.yml` 的 `fetch-depth: 0` 保证完整历史。

### 1.2 产物结构

```json
{
  "generatedAt": "2026-11-09T12:34:56.789Z",
  "total": 35,
  "commits": [
    { "hash": "e578d1a", "date": "2026-11-09", "type": "refactor", "scope": null, "text": "..." }
  ]
}
```

### 1.3 解析规则

| 规则 | 说明 |
| --- | --- |
| Conventional Commits 前缀 | `feat/fix/refactor/perf/style/docs/test/chore/ci/build/revert` → 类型名；其余归 `other` |
| scope | 括号内内容（可为空） |
| merge 过滤 | `Merge branch…` / `Merge pull request…` 一律归 `other`，且配置 `filterMerge: true` 时直接丢弃 |
| 字段分隔 | 用 `U+001F` 单元分隔符避免冲突 |

### 1.4 配置项（`pages.config.ts`）

```ts
changelog: {
  limit: 300,              // git log -n 上限
  filterMerge: true,       // 是否过滤 merge
  pageSize: 20,            // 每页条数
  showTypeFilter: true,    // 顶部 chip 筛选
  typeOrder: ['feat','fix','refactor','perf','style','docs','test','chore','ci'],
  showHash: true,          // 右侧 hash 链接
  showCount: true,         // 页头显示总数
}
```

---

## 2. 视觉与交互

### 2.1 页面结构

```
/changelog
├─ page-head        h1 + 副题（共 N 次提交）
├─ type-filter      类型 chip 行（横向滚动，不换行挤日期区）
├─ tl-anchor        锚点：切类型 / 翻页后滚回此处
│  ├─ tl-month (×N)
│  │  ├─ tl-month-title  年份(等宽) + 月份 + 总数徽标 + 续页标记
│  │  └─ tl-list
│  │     └─ tl-item (×n)
│  │        ├─ tl-dot         竖脊线上的圆点
│  │        └─ tl-row
│  │           ├─ tl-date     YYYY-MM-DD（等宽，右对齐）
│  │           ├─ tl-main     type(scope) text（同行自然流）
│  │           └─ tl-hash     7 位 hash（右上，外链）
│  └─ pager         分页器（5 页码窗 + 上一页/下一页）
```

### 2.2 关键样式决策

| 点 | 做法 | 理由 |
| --- | --- | --- |
| 竖脊线 | `tl-list::before`，只覆盖条目区，不穿过月份标题 | 视觉上把月份分得更清 |
| 圆点 | 11px + 2px border（页面底色），默认 `muted-foreground` | 暗色下依然清晰、不占强调色预算 |
| 行内布局 | `.tl-main` 用 inline 流（非 flex/grid） | `type` 与 `text` 自动连排，不会拆两行 |
| 日期列 | 固定 4.75rem 网格轨道 | 全月份对齐成一列，可扫读 |
| 窄屏 | 日期+hash 同行，正文独占下一行；dot/脊线上移 | 375px 不溢出、不留白 |
| 分页不拆月 | 先按月切块再贪心装页，单月超 `pageSize` 自身再切片 | 页首永远是完整月份标题 |
| 续页标记 | 续页月份标题后加 `续`，计数仍显该月全量 | 读者不会把重复标题当 bug |

### 2.3 明暗模式

- 全部用 CSS 变量（`var(--border)`、`var(--muted-foreground)`、`var(--background)`、`var(--foreground)`），暗色 0 代码改动
- `.dark * { box-shadow: none !important; }` 规则不影响圆点（用 border 模拟镂空）

### 2.4 交互细节

| 交互 | 实现 |
| --- | --- |
| 类型筛选 | 点 chip 切 `activeType`，`page=1`，滚回列表锚点 |
| 分页 | 页码窗 ≤ 5 个，跟随当前页滑动；跳页后 `scrollToList()` |
| 筛选后页码越界 | `watch(totalPages, n => page.value = Math.min(page.value, n))` |

---

## 3. 导航与 SEO

- 桌面端：导航栏「关于」分组 → 下拉菜单 →「更新日志」
- 移动端：右侧抽屉「关于」展开 →「更新日志」
- `site.repoUrl`（`blog.config.ts`）提供 commit 链接前缀；留空时 hash 退化为纯文本
- 页面 meta：`<title>更新日志</title>`，无独立 SEO 需求

---

## 4. 验收记录（2026-11-09 实测）

### 4.1 硬编码审计
```
PASS: 0 处硬编码中文字符串
```

### 4.2 全站视觉验收（`verify.mjs` × http://127.0.0.1:4173）
| 视口/模式 | 页面状态 | 横向溢出 | 内容宽度 | 小触控目标 | 控制台错误 |
| --- | --- | --- | --- | --- | --- |
| mobile light | 200 | 否 | 375 | 8 | 0 |
| mobile dark | 200 | 否 | 375 | 8 | 0 |
| tablet light | 200 | 否 | 764 | 28 | 0 |
| tablet dark | 200 | 否 | 764 | 28 | 0 |
| desktop light | 200 | 否 | 764 | 30 | 0 |
| desktop dark | 200 | 否 | 764 | 30 | 0 |

**全站 72 个页面状态（12 路由 × 3 视口 × 明暗），错误 0。**

### 4.3 交互实测（puppeteer）
| 场景 | 结果 |
| --- | --- |
| 初始页渲染：月份标题、竖脊线、圆点、条目行内排布 | PASS |
| 暗色模式：圆点清晰可见（muted-foreground），脊线正常 | PASS |
| 类型筛选：点 `修复` chip → 仅显 8 条 fix、页码重置为 1、活动 chip 高亮 | PASS |
| 分页：第 2 页标题带 `续`、条目数 15、状态行 `第 2 / 2 页 · 共 35 条` | PASS |
| 移动端抽屉导航：展开「关于」→ 点「更新日志」→ 跳转并高亮当前项 | PASS |
| hash 外链：target="_blank" + rel="noopener noreferrer" | PASS |
| 0 控制台错误 | PASS |

### 4.4 视觉修正记录
| 版本 | 问题 | 修正 |
| --- | --- | --- |
| v1 | `type` 与 `text` 被 flex 拆成两行，行高 69→121px | `.tl-main` 改 inline 流，`tl-row` grid 列宽 4.75rem |
| v1 | 圆点太淡、几乎看不见（背景色 border） | 改 `muted-foreground`，暗色下同等清晰 |
| v1 | 月份标题缺「年」字（`2026 11 月`） | `ui.changelog.monthUnit: '年'` 拼接 |
| v1 | 窄屏筛选 chip 折 3 行挤下日期区 | `.type-filter` 改横向滚动 + `white-space: nowrap` |
| v1 | 移动端 hash 链接仅 18px 高，不满 24px 触控下限 | `.tl-hash { display: inline-flex; min-height: 24px }` |

---

## 5. 后续可迭代项（未在本轮范围）

- 年份折叠手风琴（长历史时首页默认只展开最近 3 个月）
- 搜索框（按 commit subject 模糊匹配）
- RSS / Atom 单独提供「更新日志」订阅源
- `showHash: false` 时的空列布局优化（网格轨道自动收缩）

---

## 6. 相关文件清单

| 文件 | 角色 |
| --- | --- |
| `modules/changelog.ts` | 构建期 git log → JSON 模块 |
| `app/data/changelog.json` | 产物（.gitignore 忽略） |
| `app/pages.config.ts` | `changelog` 配置段 |
| `app/composables/usePageConfig.ts` | `ChangelogPageConfig` 类型 |
| `app/data/ui.ts` | `ui.changelog.*` 文案块 |
| `app/blog.config.ts` | `site.repoUrl` + nav children |
| `app/composables/useBlogConfig.ts` | `SiteConfig.repoUrl` 类型 |
| `app/pages/changelog.vue` | 页面组件（含全部样式） |
| `.github/workflows/deploy.yml` | `fetch-depth: 0` |
| `scripts/verify.mjs` | `ROUTES` 加 `changelog` |
| `.gitignore` | 忽略 `app/data/changelog.json` |

---

**实现时间**：2026-11-09  
**验收结果**：PASS（全站 0 错误、0 溢出、暗色全生效）  
**性能**：静态 JSON + SSG，客户端零请求；首屏 HTML 约 15KB gzip