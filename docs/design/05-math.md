# 05 · 数学公式（KaTeX）

状态：**已实施并通过验收**（2026-11-07，验收记录见 §6）

## 1. 需求与参考

在 Markdown 正文里写数学公式：行内 `$...$`、块级 `$$...$$`，以及 `math` 围栏。

参考 `L33Z22L11/blog-v3` 的实现方式（同样是 Nuxt 4 + @nuxt/content v3）：

```ts
content.build.markdown = {
  remarkPlugins: { 'remark-math': {} },
  rehypePlugins: { 'rehype-katex': { options: { errorColor: ... } } },
}
```

**关键差别**：blog-v3 的 KaTeX CSS 走 CDN（`s4.zstatic.net`），本项目自托管 —— 全站零外链是既定原则，
而且公式的视觉**完全**依赖 KaTeX 自带的 20 个字体文件，字体在 CDN 上没到就只剩符号、字母全丢
（实测复现过）。

## 2. 方案

构建期渲染，产物里直接是 HTML + MathML，**零运行时 JS**。
`remark-math` 解析出 math 节点，`rehype-katex` 把它编译成 KaTeX 的 HTML。

产物结构（实测，不是文档抄的）：

| 位置 | 结构 |
| --- | --- |
| 行内 | `<p>…<span class="katex"><span class="katex-mathml">…</span><span class="katex-html" aria-hidden="true">…</span></span></p>` |
| 块级 | `span.katex-display` **直接挂在 prose 下**，不在 `<p>` 里，也不进 `<pre>` |

块级不进 `<pre>` 这点很重要：`CodeCopyButton` 扫的是 `.prose pre`，
如果公式被包成 `<pre><code class="language-math">`（不装 remark-math、只用 ```math 围栏时是这种形态），
就会被误加语言标签和复制按钮。装了 remark-math 后围栏也走 math 节点，没有这个问题。

KaTeX 默认输出 `htmlAndMathml`：视觉用 HTML，`<annotation encoding="application/x-tex">` 里存原始 LaTeX。

## 3. 四个决策（用户已确认）

| 项 | 决定 | 理由 |
| --- | --- | --- |
| 行内字号 | **与正文齐平 1em** | KaTeX 默认 1.21em 是给纯数学排版留的余量，放进 17px 中文正文里会大出 21%（实测 20.57px），字形比汉字重一截还把行距顶开 |
| 块级形态 | **纯居中留白** | 上下 1.2em 对齐段落间距，不加边框底色。与「1px 线 > 色块 > 阴影」的克制原则一致，也不和代码块争夺同一种视觉重量 |
| 复制公式 | **要** | 悬停块级公式时右上角淡入「复制公式」，复制内容取 `annotation` 里的原始 LaTeX |
| 字体托管 | **自托管进产物** | 20 个 woff2 共 296KB，零外链；弱网下不会出现公式字体缺失 |

## 4. 改动清单

### 4.1 `nuxt.config.ts`

`content.build.markdown` 加 `remarkPlugins` / `rehypePlugins`。

**选项必须嵌在 `options` 里**：`@nuxt/content` 的 `importPlugins` 只读 `{ instance, options }`
两个键，直接摊平写（`{ errorColor: 'x' }`）会被当成空对象丢掉，且不报错。

`errorColor` 给的是 CSS 变量 `var(--accent)` 而不是色值 —— KaTeX 会把它原样写进内联
`style="color:var(--accent)"`，于是明暗两套自适应。固定色值做不到：KaTeX 只有一个
`errorColor`，而两套背景需要的红不一样。

### 4.2 `scripts/katex-assets.mjs`（新增）+ 产物

`pnpm katex` 生成：

- `app/assets/css/katex.generated.css`（21KB）—— 相对 npm 包只做两处改动：
  `@font-face` 只留 woff2（删 woff / ttf，文件数 60 → 20），字体 URL 改成 `/fonts/katex/`
- `public/fonts/katex/*.woff2`（20 个，296KB）

产物提交进仓库，与既有中文子集字体的做法一致：`/fonts/katex/` 的 URL 稳定、不随构建哈希变化。

`font-display` 保留 KaTeX 官方的 `block` —— 字体未到时不显示错误字形，与站点「不闪烁」的目标一致。

### 4.3 `app/assets/css/main.css`

加一行 `@import './katex.generated.css';`。

### 4.4 `app/components/server/ProseBody.vue`

新增「数学公式（KaTeX）」段：

```css
.prose :deep(.katex) { font-size: 1em; }
.prose :deep(.katex-display) {
  margin-block: 1.2em;
  padding-block: 0.25em;
  overflow-x: auto;
  overflow-y: hidden;
}
.prose :deep(.katex-error) { color: var(--accent); }
```

`overflow-x: auto` 是硬需求：不处理时 390px 视口下长公式把文档撑到 547px，整页横向滚动。
`padding-block` 给滚动条和 `\sum` 的上下限留余量，否则会被裁。

### 4.5 `app/components/common/MathCopyButton.vue`（新增）

沿用 `CodeCopyButton` 的 Teleport 浮标方案（往 Vue 管理的 DOM 里 appendChild 会造成 hydration mismatch）。
差异：

- 内容取自 `annotation[encoding="application/x-tex"]`，比从 `katex-html` 的 span 堆里还原可靠
- 默认 `opacity: 0`，监听公式元素的 `mouseenter` 淡入（只挂事件、不改结构）；
  触屏用 `@media (hover: none)` 常驻半透明 —— 没有 hover 的介质上藏按钮等于没有功能

### 4.6 `app/pages/posts/[slug].vue`

`CodeCopyButton` 之后挂 `<MathCopyButton>`，共用同一个 `pageCfg.showCopyButton` 开关。

### 4.7 `server/utils/content-render.ts`

feed 与搜索索引都从 minimark AST 序列化，KaTeX 会输出**三份**文本
（MathML 的结构化字母 + 视觉层 span 文本 + annotation 的原始 LaTeX），不处理就是三连重复。

- `collectText`（纯文本，喂搜索索引）：命中 `.katex` / `.katex-display` 时只取 `annotation` 的 LaTeX，
  其余整棵子树跳过。实测压测文 1751 字里原本全是 `E=mc2E = mc^2E=mc2` 这种碎片
- `renderNode`（HTML，喂 feed）：命中 `.katex-html` 时整块丢弃。它的 style 本来就会被属性白名单剥光，
  剩下的只是裸 span，还会把前面 MathML 的字母再显示一遍

### 4.8 `app/data/ui.ts` + `package.json`

- `math: { copy, copied, copyAria }` 三条文案
- `verify:math` / `katex` 两个脚本入口

## 5. 不做

- 不引入 KaTeX 的运行时 JS（`katex.render`）：构建期已渲染完，客户端不需要它，
  省下 ~280KB 与一次水合风险
- 不做公式编号 / 交叉引用（`\tag` + 引用解析）：本次范围外
- 不引入 mhchem 等扩展包
- 不改 `katex-swap.css`：`swap` 会让公式先以错误字形出现再跳变，与站点刚修好的字体闪烁同类

## 6. 验收记录（2026-11-07 实测）

工具：`scripts/verify-math.mjs`（本项目的公式门禁，四档视口×主题）

| 项 | 实测 |
| --- | --- |
| 行内字号 | 17px == 正文 17px（修复前 20.57px，差 3.57px） |
| 块级居中 | `text-align: center`，`margin-block: 20.4px`（= 1.2em） |
| 横向滚动 | 长公式 `overflow-x: auto`；390px 视口 `docScrollWidth - clientWidth = 0`（修复前溢出 157px） |
| 暗色配色 | 公式颜色 == 正文 `rgb(250,250,250)` |
| 错误公式 | 亮 `rgb(169,79,51)` / 暗 `rgb(204,120,92)`，对比度 5.45 / 6.07（修复前暗色 3.38） |
| 复制 | 7 个块级公式 7 个按钮；复制内容 == `annotation` 里的原始 LaTeX |
| 搜索索引 | 无三连重复，保留 `E = mc^2` 原始 LaTeX |
| feed | math-test 条目里无 `aria-hidden` 视觉层残留 |
| 全站回归 | `verify.mjs` 采集 54 个页面状态，PASS |

## 7. 实施中踩到的坑

1. **插件选项要嵌在 `options` 里。** `'rehype-katex': { errorColor: 'x' }` 会被静默丢弃，
   必须是 `{ options: { errorColor: 'x' } }`。第一次跑门禁时暗色错误公式仍报 3.38 就是这个原因。
2. **`katex-error` 的颜色是内联样式，CSS 压不住。** 只能在插件选项里设 `errorColor`，
   而且要传 CSS 变量才能明暗自适应。
3. **CDN 上截图会误判。** 用 jsdelivr 的 CSS 验证时截图里字母全丢了 —— 不是渲染坏了，
   是 KaTeX 的字体 2.2s 才到、截图抢在前面。自托管后同一台机器没有这个问题。
4. **headless 下剪贴板写入权限被拒**（`NotAllowedError: Write permission denied`）。
   门禁改为拦截 `writeText` 的入参来校验内容 —— 真实浏览器里用户点击带手势，权限会给。
5. **模块文档要防误判**：一开始门禁在整份 feed 里搜 `aria-hidden`，结果被另一篇文章正文里
   讲 `aria-hidden="true"` 这个属性的字面文本触发。要按 `<entry>` 定位到目标文章再查。
