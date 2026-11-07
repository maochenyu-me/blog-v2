# 04 · 移动端代码块布局

状态：**已实施并通过验收**（2026-11-06，验收记录见 §5）

## 1. 问题

手机（390px 视口）上代码块是「一条横穿屏幕的长条」：

- 旧规则用 `margin-inline: calc(var(--space-gutter) * -1)` 把 `pre` 撑到屏幕左右边缘（实测 `w=390, left=0`），同时 `border-inline: none` 去掉左右边线。结果代码块从屏幕一边顶到另一边，没有边界、没有留白，与正文的关系断裂。
- 顶部浮动的语言标签 + 复制按钮（`.code-bar`，高 37px，`padding-top: 0.5rem`）与首行代码重叠：实测 `barOverlapsFirstLine = true`，`.dark {` 这类首行被压住。
- 移动端代码字号与桌面一致（14px），长行需要大量横向滚动；实测 8 个代码块的横向溢出依次 138/29/138/158/197/54/0/88 px。

## 2. 决策

用户选定：**收进正文栏 + 加头部条**。

| 项 | 决定 | 理由 |
| --- | --- | --- |
| 宽度 | 取消负 margin，代码块留在正文栏内 | 满屏换来的是横穿屏幕的长条；窄屏本来也吃不满，24px 沟槽换呼吸感更划算 |
| 边框 | 恢复四边 `1px solid var(--border)`，圆角仍为 0 | 与「1px 线 > 色块 > 阴影」的设计原则一致；0 圆角是本项目既定语言 |
| 头部带 | `pre` 顶部留 `2.25rem`，语言标签与复制按钮落在这条空白带里 | 不再压首行代码，也让「这是代码块」有一个稳定的头部 |
| 字号 | 移动端 13px（`0.8125rem`），桌面仍 14px | 一屏多容纳约 1 个字符的余量，缓解横向滚动 |
| 横向滚动 | 保留 `overflow-x: auto` + `overscroll-behavior-x: contain` | 代码不该软换行；`contain` 防止滑到边界后把滚动传给页面 |

## 3. 改动

### 3.1 `app/components/server/ProseBody.vue`

- `.prose :deep(pre)`：`padding: 1rem` → `padding: 2.25rem 1rem 1rem`，新增 `overscroll-behavior-x: contain`。其余（`margin-block` / `background-color: var(--muted)` / `border: 1px solid var(--border)` / `border-radius: 0` / `overflow-x: auto` / `font-size: var(--fs-code)` / `line-height: var(--lh-code)` / `tab-size: 2`）不变。
- `@media (max-width: 767px)` 内的 `pre`：删掉 `margin-inline: calc(var(--space-gutter) * -1)` 与 `border-inline: none`，改为 `padding: 2.25rem 0.75rem 0.75rem; font-size: 0.8125rem; overscroll-behavior-x: contain`。

### 3.2 `app/components/common/CodeCopyButton.vue`

浮标改用「左缘 + 宽度」定位，才能和代码块严格对齐（原先只有 `right`，代码块不再贴屏幕右边后无法正确摆放）：

- `Target`：`right: number` → `left: number; width: number`。
- `collect()`：`left = rect.left + scrollX`、`width = rect.width`（原 `right = rect.right + scrollX`）。
- 模板 `:style`：`top` / `left` / `width` 三个值。
- `.code-bar`：去掉 `justify-content`，加 `height: 2.25rem`、`padding-inline: 1rem`、`box-sizing: border-box`、`pointer-events: none`（按钮自身 `pointer-events: auto`）。
- `.code-lang`：`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`。
- `.code-copy`：`flex: none; margin-inline-start: auto`（没有语言标签时把按钮推到右侧）。
- 新增 `@media (max-width: 767px) { .code-bar { padding-inline: 0.75rem } }`，与移动端 `pre` 的内边距对齐。
- `collect()` 的语言识别改为 `[...pre.classList, ...(code?.classList ?? [])].find(c => c.startsWith('language-'))` —— **Shiki 把 `language-xxx` 挂在 `<pre>` 上**，只在 `<code>` 上找会全部落空。

## 4. 不做

- 不引入软换行 / `white-space: pre-wrap`：会破坏代码的缩进语义。
- 不加「横向可滚动」的提示渐变或文字：靠 `overflow-x: auto` 与手指惯性即可，加提示等于再加一层噪音。
- 不改桌面端任何尺寸（仅 `.code-bar` 的定位方式从 `right` 换成 `left + width`，视觉位置不变）。
- 不做代码块折叠 / 展开：超出本次需求范围。

## 5. 验收记录（iPhone 14 视口 390×844）

| 项 | 实测 |
| --- | --- |
| 收进正文栏 | 8 个 `pre` 全部 `preW=342, preLeft=24`（左右各 24px 沟槽） |
| 边框 | `border=0.666667px solid`（1px），`border-radius: 0` |
| 头部带不压字 | `barBottom=362 ≤ codeTop=363`，`overlaps=false`；滚到中部复测 3 块同样不重叠 |
| 字号 | `font-size: 13px`，`padding: 36px 12px 12px` |
| 头部条对齐 | `barLeft=24 / barRight=366` 与 `pre` 完全一致；`barPad=12px` |
| 语言标签 | dark-mode-design 9 块全部有标签（css×6、ts×2、html×1），无截断，`btnRight=350` 右对齐 |
| 明暗两套 | 暗色 `preBg=rgb(24,24,27)` / `border=rgb(39,39,42)`；亮色 `preBg=rgb(250,250,250)` / `border=rgb(228,228,231)` |
| 桌面回归（1600×900） | `preW=716, preLeft=318, pad="36px 16px 16px"`, `barLeft=318, barW=716, barH=36`, `overlaps=false` |
| 构建 | `pnpm build` exit 0，`✨ Build complete in 38.5s`，`[fix-contrast] 扫描 108 个 HTML，修正 24 个文件、共 48 处暗色 token` |

### 实施中踩到的坑

1. **Shiki 的 `language-xxx` 在 `<pre>` 上，不在 `<code>` 上。** 只看 `code.classList` 会让所有语言标签消失，且不会报错——只能靠实测发现 `.code-lang` 全部为空。
2. **头部条与代码左缘对齐依赖两处内边距一致。** 桌面 `pre` 是 `1rem`、移动端是 `0.75rem`，头部条若固定 `1rem`，移动端标签会比代码多缩进 4px；需在媒体查询里同步收窄。
3. **浮标定位必须与代码块同宽同左缘。** 原实现只存 `right`，代码块不贴屏幕右边时（本次改动后）就无法正确摆放，必须改成 `left + width`。
