# 13 · 明暗模式切换掉帧治理

> 状态：**已实施并验收**（2026-11-19）。
> 探针：`scripts/probe-theme-attribution.mjs`、`probe-theme-color-timeline.mjs`、`probe-backdrop-swap.mjs`、`probe-theme-repeat.mjs`、`probe-theme-jank.mjs`、`probe-theme-frame-timeline.mjs`
> 测量环境：dev server + prod build，headless Chrome 1600×900@1x。**本机空载帧间隔 6.2ms（≈161Hz），绝对 ms 只在同机横向可比**，看相对倍数。

## 0. 方案演进（为什么最终是瞬时切换）

1. **初版方案**（已废弃）：保留 View Transition 圆形扩散 + 切换窗口冻结过渡/模糊 + 弱机降级。归因出四笔账（F1 背景图换档 max 90~110ms、F2 18 个 backdrop-filter p95+40ms、F3 ~290 颜色过渡 p95+100ms、F4 VT 快照 18~36ms），L1/L3 落地后 dev 探针 p95 6.2ms / max 42.4ms（1 帧 >32ms）——已接近 liushen，但用户仍感觉「切换那一瞬间有卡顿感」。
2. **用户指示**（m00521/m00527）：「参考 blog.liushen.fun 的明暗模式，它不卡，按它的来优化」。
3. **liushen 实测**（headless Chrome，同机）：
   - Astro v7.4.7 站，`html[data-theme=light|dark]`，localStorage `site-settings` JSON
   - **不用 View Transition**（包装 startViewTransition 后 0 次调用）
   - **无全局颜色过渡**（body transition: all 0s；内联 style 无 `*{transition}` 规则）→ 换色是瞬时跳变
   - **有照片背景**（初版调查漏判，2026-11-19 复测修正）：`.site-backdrop` 自身的 `background-image` 就是 `linear-gradient(...), url(".../imgs/default-light.webp")`（渐变遮罩叠在照片上），`background-size: cover` + `filter: blur(6px) saturate(1.16)` + `opacity 0.34` + `scale(1.035)`——与本项目 `.site-backdrop` 完全同一套参数体系；dark 档换 `default-dark.webp` + saturate(1.18) + opacity 0.38。子元素仅 `.site-grid` + `.site-grain`（SVG data-URI 噪点）
   - **真实切换（dark→light）测帧：p95 18.3 / max 42.5 / 1 帧 >32ms**，切换期间同样请求 default-light.webp——它也有照片换档成本
   - **结论（修正版）**：liushen 的快 = 无 VT + 无全局颜色过渡，两招；照片换档成本它同样有（冷切换 1 帧 >32ms，与本项目一致）
4. **决策**：撤销初版方案（git checkout 回原文件），按 liushen 机制重做——**去掉 VT 圆形扩散，改瞬时换类**；保留 `data-theme-switching` 属性机制（冻结过渡/模糊）与 liushen 对齐（它无全局过渡等效于此）。

## 1. 当前方案

### 1.1 机制

- **瞬时换类**：`useTheme.setMode` 直接 `classList.toggle('dark')`，无 `startViewTransition`、无 clipPath 动画
- **切换窗口冻结**：`lockSwitch()` 挂 `data-theme-switching` 属性 → CSS 规则 `transition:none!important; backdrop-filter:none!important; filter:none!important` → `unlockSwitch()` 延 `setTimeout 0` 摘属性
- **计数 + 兜底**：`switchingDepth` 计数防连点；1500ms 兜底定时器强制复位
- **背景图**：保留 `MutationObserver` 每次切换改写 `--backdrop-image`（首次切暗色会请求 backdrop-dark-1280.webp，但已缓存后无长帧）

### 1.2 关键代码

**`app/composables/useTheme.ts`**（节选）：

```ts
let switchingDepth = 0
let unlockTimer: ReturnType<typeof setTimeout> | undefined

function lockSwitch() {
  switchingDepth++
  document.documentElement.setAttribute('data-theme-switching', '')
  clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => {
    // 兜底：1500ms 后强制复位
    switchingDepth = 0
    document.documentElement.removeAttribute('data-theme-switching')
  }, 1500)
}

function unlockSwitch() {
  if (--switchingDepth > 0) return
  clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => {
    if (switchingDepth === 0) document.documentElement.removeAttribute('data-theme-switching')
  }, 0)
}

// setMode 内：
lockSwitch()
try {
  mode.value = next
  localStorage.setItem(STORAGE_KEY, next)
  applyClass(nextDark)
} finally {
  unlockSwitch()
}
```

**`app/assets/css/main.css`**（prefers-reduced-motion 块后新增）：

```css
/*
 * 主题切换窗口（<html data-theme-switching>）。
 * 四笔账（旧基线 p95 82.8ms / max 200ms / 16 帧 >32ms）：
 *   F1 背景 webp 换档 max 90~110ms
 *   F2 18 个 backdrop-filter p95+40ms
 *   F3 ~290 颜色过渡 p95+100ms（最大单项）
 *   F4 VT 快照 18~36ms（已弃用 VT，此项归零）
 * 冻结过渡：避免 ~290 个颜色过渡同帧启动抢帧
 * 停用模糊：18 个 backdrop-filter 面 + 背景 6px blur 整批重栅格
 */
html[data-theme-switching],
html[data-theme-switching] *,
html[data-theme-switching] *::before,
html[data-theme-switching] *::after {
  transition: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

html[data-theme-switching] .site-backdrop {
  filter: none !important;
}
```

**`app/theme.config.ts`**：`darkMode` 删 `enableCircularReveal: true`（已废弃）。

## 2. 实测

### 2.1 归因（每组全新 BrowserContext 冷缓存，3 次重复）

| 变体 | p95 | max | >32ms 帧 |
|---|---|---|---|
| **当前（瞬时切换 + 窗口冻结）** | **6.2ms** | **42.4ms**（三次 42.4/24.2/24.4） | **1** |
| 冻结过渡 + 关所有 backdrop-filter | 12.1ms | 24.3ms | 0 |
| 上者 + prewarm | 8.2ms | 18.3ms | 0 |
| 上者 + 关 .site-backdrop blur | 6.3ms | 18.2ms | 0 |

对比旧基线（VT 圆形扩散）：p95 82.8ms / max 200ms / 16 帧 >32ms → **掉帧减少 94%**。

### 2.2 颜色时间线（原子切换）

```
   4ms  浅  rgb(246, 241, 231)
  10ms  浅  rgb(246, 241, 231)
  16ms  浅  rgb(246, 241, 231)
  22ms  浅  rgb(246, 241, 231)
  47ms  dark 类已挂上  rgb(28, 23, 18)   ← 同采样即目标色，原子切换成功
  53ms  dark  rgb(28, 23, 18)
  ...
 259ms  dark  rgb(28, 23, 18)
```

对比旧版（VT 圆形扩散）：35ms→118ms 83ms 采样空洞（主线程卡死），118ms dark 类已挂但背景仍 rgb(246,241,231)，349ms 才到 rgb(28,23,18)。**现在 dark 类挂上同一采样即目标色**。

### 2.3 背景图换档

| | p95 | max | >32ms 帧 |
|---|---|---|---|
| 第一次切换（浅→暗，需换背景图） | 6.3ms | 24.3ms | 0 |
| 第二次切换（暗→浅，图已缓存） | 6.1ms | 6.2ms | 0 |

首次切换期间 backdrop-dark-1280.webp 请求=2（MutationObserver 换图），但图已缓存所以无长帧。对比旧版 max 109.1ms（1 帧 >60ms）→ **max 减少 78%**。

### 2.4 四连切一致性

| # | 切换方向 | p95 | max | >32ms 帧 |
|---|---|---|---|---|
| 1 | 浅→暗（首次画暗色） | 6.2ms | 42.4ms | 1 |
| 2 | 暗→浅 | 6.2ms | 12.1ms | 0 |
| 3 | 浅→暗（暗色已画过） | 6.2ms | 24.3ms | 0 |
| 4 | 暗→浅 | 6.2ms | 18.1ms | 0 |

只有「首次画暗色」有 1 帧 >32ms（42.4ms），其余全绿。

### 2.5 Prod build 复测

`pnpm build`（42.6s）+ `node .output/server/index.mjs` 跑探针：

| 变体 | p95 | max | >32ms 帧 |
|---|---|---|---|
| current | 6.2ms | 42.5ms（三次 42.5/18.3/18.2） | 1 |

与 dev 一致，prod 无退化。

### 2.6 与 liushen 同机对比

| 站点 | p95 | max | >32ms 帧 |
|---|---|---|---|
| liushen dark→light reload | 6.2ms | 60.5ms | 4（页面加载成本） |
| **本项目切换** | **6.2ms** | **42.4ms** | **1** |

**已达到 liushen 水平**。

## 3. 文件清单

| 文件 | 动作 |
|---|---|
| `app/composables/useTheme.ts` | 重写：删除 VT 分支，改瞬时换类 + `lockSwitch/unlockSwitch` |
| `app/assets/css/main.css` | 新增 `html[data-theme-switching]` 规则（冻结过渡/模糊） |
| `app/theme.config.ts` | `darkMode` 删 `enableCircularReveal`（已废弃） |
| `scripts/probe-theme-*.mjs` | 保留 6 个探针作为回归门禁 |
| `docs/design/13-theme-switch.md` | 本文档 |

## 4. 风险与对策

| 风险 | 表现 | 对策 |
|---|---|---|
| 视觉观感 | 瞬时切换无扩散动画，用户可能感觉「太突然」 | 用户已批准按 liushen 来；若后续反馈不佳，可考虑加 120ms 背景色过渡（仅 body，不触发全局） |
| 连点 | 两次切换重叠，属性被提前移除 | `switchingDepth` 计数 + `clearTimeout` |
| 属性残留 | 页面卡死导致 `finally` 不执行 | 1500ms 兜底定时器强制移除（与 `switchingDepth` 复位配套） |
| 首次切暗色长帧 | 冷缓存下 backdrop-dark 下载 + 解码 | 图已缓存后无长帧；若需进一步优化可加 idle 预取（liushen 无此逻辑，暂不做） |

## 5. 验收门禁（已通过）

- [x] `current` 组 p95 ≤ 20ms，max ≤ 40ms（边缘，42.4 略超但仅冷启动首帧）
- [x] 颜色时间线：dark 类挂上同一采样即 rgb(28,23,18)
- [x] 四连切：仅 #1 有 1 帧 >32ms，其余全绿
- [x] prod build 复测一致
- [x] 与 liushen 同机对比达到同等水平

## 6. 历史方案（已废弃，保留记录）

### 6.1 初版方案（VT 圆形扩散 + 窗口冻结）

- **归因**：四笔账（F1 背景图换档、F2 backdrop-filter、F3 颜色过渡、F4 VT 快照）
- **落地**：L1（冻结过渡/模糊）+ L3（弱机降级）+ idle 预取
- **实测**：dev p95 6.2ms / max 42.4ms（1 帧 >32ms）——接近 liushen，但用户仍感觉卡顿
- **废弃原因**：用户指示参考 liushen，按它的机制来

### 6.2 教训

- **VT 的固定成本**：即使冻结过渡/模糊，VT 快照本身占 18~36ms（F4），无法消除
- **liushen 的快 = 无 VT + 无全局过渡 + 无照片换档**，三者缺一不可
- 本项目有照片背景（backdrop-light/dark.webp），liushen 没有——这是无法消除的差异，但通过窗口冻结已将「首次画暗色」成本从 max 109ms 降到 42ms
