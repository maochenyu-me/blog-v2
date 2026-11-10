# 09 · 留言板（/message）

## 结论

留言板 = 一个独立的整页留言入口，信息架构复刻 `blog.liushen.fun/comment/`，
视觉皮肤全部内化到本站令牌体系，评论接入已有的 Ecoku。

页面本体纯静态（SSG），评论区是唯一运行时依赖 —— 与文章页同款，
`onMounted` 后动态 `import('ecoku')`，预渲染输出空壳。

## 需求决策（2026-11-10 与克喵确认）

| 决策点 | 结论 |
| --- | --- |
| 路由 | `/message` |
| 导航入口 | 并入「友链」分组：友链 / 朋友圈 / **留言板**（图标 `tabler:message-2`） |
| 视觉取向 | **结构复刻 + 体系内化**：版式与内容节奏照搬参考站，皮肤用本站令牌 |
| 评论作用域 | `pageKey` **固定为 `guestbook`**，不随路由漂移 |

## 与参考站的取舍（关键）

参考站的辨识度来自四个元素，与本站 `01-design-plan.md` 立的铁律正面冲突：

| 参考站做法 | 本站铁律 | 本页处理 |
| --- | --- | --- |
| `blur(70px)` 的 aurora 光晕球 ×3 + 鼠标跟随层 | 无装饰性光效；动效仅路由过渡 | 收敛成 hero 内**一层静态 accent 径向渐变**（无 blur、无动画） |
| 玻璃 hero（`backdrop-filter` + 半透底） | 玻璃仅在顶部胶囊与页脚 | 不用玻璃，hero 用 `var(--muted)` 实底 |
| `border-radius: 1.5rem` + accent 描边 + `box-shadow` | 卡片 0 圆角（列表项）/ 暗色禁用阴影 | `radiusCard`（0.875rem）+ 1px `--border`，**无阴影** |
| 强调色遍布（chips/kicker/引文/描边） | 强调色全站仅 4 处封顶 | 本页限 3 处：kicker、引文卡描边、规范编号与警告线 |

> 取舍理由：需求原话是「基于博客页面布局和明暗模式」，前提就是融进现有体系。
> 保留的是参考站的**信息架构与阅读节奏**（hero 卡 → 引言双栏 → 规范折叠 → 整页评论区），
> 而非它的皮肤。

## 信息架构

```
H1 留言板（hero 卡内）
├─ Hero 卡：标题 + 斜体副题 + chips（来都来了 / 有话直说 / 申请友链→/links）
│          卡内右上角一层极淡 accent 径向微光
├─ 引言区：≥860px 左文右引（GUESTBOOK kicker + h2 + 两段正文 ‖ 引文卡）
│          窄屏堆叠为上下
├─ 留言板规范：details 折叠（虚线边），8 条 name+desc + 斜体警告
└─ Ecoku 评论区：整页宽度，scopeKey = 'guestbook'
```

## 文案归位

按本站「组件禁止硬编码中文」纪律：

- 页面文案（标题/副题/chips/引言/规范摘要/警告）→ `app/data/ui.ts` 的 `message` 段
- 规范 8 条正文（业务数据）→ `app/pages.config.ts` 的 `message.rules`
  —— 与友链页 `applyRules` 同构：属业务数据，归 pages.config，不进 ui.ts

> 文案按喵洛阁自己的语气重写，未照搬参考站原句（参考站文案是写给站长的）。

## 多端适配

| 断点 | 变化 |
| --- | --- |
| < 640px | hero 内边距 `2.5rem 2rem → 1.5rem 1.25rem`；引言区内边距收紧；h2 字号降一档 |
| 640 ~ 859px | 引言区保持单栏堆叠 |
| ≥ 860px | 引言区切双栏 `minmax(0,1fr) 18rem`，引文卡右侧等高档 |
| 全断点 | chips `flex-wrap` 自动换行；评论区宽度交给页面容器（`fullWidth`） |

所有响应式均为纯 CSS 媒体查询，无 JS 断点监听 —— 与全站其余页面一致，
避免 SSG 水合不一致。

## 评论接入

复用 `app/components/common/EcokuComments.vue`，本次为该组件加了三个能力
（文章页调用零改动，行为不变）：

- `source`：`post`（默认，读 `pages.post.comments`）| `message`（读 `pages.message.comments`）
- `scopeKey`：提供后 `pageKey` 固定，**不挂路由监听** —— 留言板不随 URL 漂移
- `fullWidth`：去掉 `max-width: 764px` 约束，撑满父容器

主题映射沿用原 `:deep` 规则，`--ecoku-*` → 本站 token，`.dark` 级联即时生效。

附带改动：`MobileToc.vue` 的「直达评论」选择器由 `.post-comments`
改为 `#comments`（类名在本次重构中变化，id 是更稳的锚点，且留言板复用同一 id）。

## 变更文件

| 文件 | 改动 |
| --- | --- |
| `app/pages/message.vue` | 新建页面 |
| `app/data/ui.ts` | 加 `pages.message` 与 `message` 文案段 |
| `app/pages.config.ts` | 加 `message` 段（rules / rulesOpen / comments） |
| `app/composables/usePageConfig.ts` | 加 `MessagePageConfig` 接口并挂进 `PagesConfig` |
| `app/blog.config.ts` | 友链分组 children 加留言板 |
| `app/components/common/EcokuComments.vue` | 泛化：source / scopeKey / fullWidth |
| `app/components/common/MobileToc.vue` | 直达评论选择器 → `#comments` |
| `scripts/verify.mjs` | ROUTES 加 `/message` |

## 验收记录（2026-11-10 实测）

### 全站验收 `pnpm verify`（`pnpm preview:dist` @ 4173）

```
PASS: 0 处硬编码中文字符串          # audit-hardcode 门禁
采集 90 个页面状态，错误 0 个

mobile/light   15 页  溢出 0      mobile/dark   15 页  暗色 15/15  溢出 0
tablet/light   15 页  溢出 0      tablet/dark   15 页  暗色 15/15  溢出 0
desktop/light  15 页  溢出 0      desktop/dark  15 页  暗色 15/15  溢出 0

明色 bg/fg: rgb(255,255,255) / rgb(24,24,27)
暗色 bg/fg: rgb(9,9,11) / rgb(250,250,250)
============================================================
PASS: 全部检查通过
```

（路由 15 条 = 原 14 条 + 新增 `/message`）

### 宽度对齐实测（puppeteer 量 getBoundingClientRect）

| 视口 | 容器 | hero / intro / rules / 评论区 |
| --- | --- | --- |
| 1440 | 220→1220 (1000) | 全部 244→1196 (**952，四块一致**) |
| 768 | 0→768 | 全部 24→744 (720) |
| 390 | 0→390 | 全部 24→366 (342) |
| 360 | 0→360 | 全部 24→336 (312) |

三档移动/平板视口 `scrollWidth === clientWidth`，**零横向溢出**。

### 过程中修掉的一个真 bug

首次构建后实量发现评论区比上方卡片窄：`.ecoku-comments` 是
`left=360 w=720`，而卡片是 `left=244 w=952`。
根因：Ecoku 自带 `.ecoku-comments{width:100%;max-width:720px}`（**普通类，
不是 `:where()`**，优先级 0,1,0）。虽 `:where()` 的 token 能覆盖，
但这条 `max-width` 是普通声明，需更高优先级。
修法：在 `--full` 模式下加 `.ecoku-comments-section--full :deep(.ecoku-comments){max-width:none}`
（编译后 0,2,0 > 0,1,0），宽度交回页面容器。修后四块边缘完全对齐。

### 四视角实拍

桌面/移动 × 明暗，四张全页截图核对：hero 右上角淡暖光正常收敛（暗色下自动变淡、
无需单独覆盖），chips 自动换行，引言区 860px 断点单/双栏切换正确，
规范折叠块默认收起，Ecoku 空壳正常挂载并渲染出表单与人机验证。

