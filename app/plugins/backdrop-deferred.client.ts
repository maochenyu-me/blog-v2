/**
 * 背景图延后加载。
 *
 * ── 为什么需要 ────────────────────────────────────────────────
 * 全站背景是一张 fixed 全屏 webp（两档 image-set，常规屏约 108KB / 高密度屏约
 * 216KB）。它在 :root 里以 CSS 变量的形式被 .site-backdrop 直接引用，于是
 * 浏览器解析样式时就会发起请求，与 HTML、主 CSS、字体、轮播首图抢首屏带宽。
 *
 * 但它**不参与 LCP 计算**（CSS background-image 不算 LCP 候选），也不影响
 * 任何内容可读性 —— 它只是一层氛围。让这种资源占用关键路径的带宽是纯亏。
 *
 * ── 做法 ─────────────────────────────────────────────────────
 * 构建期生成的 --backdrop-image 不带 url（只有渐变与其余参数，见
 * modules/design-tokens.ts 的 DEFERRED_BACKDROP 开关），所以首帧不会有图片请求。
 * 本插件在 DOMContentLoaded 之后（即首屏内容已经可以绘制）再把真实的
 * image-set 写回 :root / .dark，浏览器这才开始下载并淡入。
 *
 * 视觉上：背景从「纯渐变底色」过渡到「图 + 渐变」，因为 .site-backdrop 本身
 * 带 opacity 与 transition，衔接是渐显而非突然跳出。
 *
 * ── 边界 ─────────────────────────────────────────────────────
 * · 只在客户端执行；SSR 产物里没有图片 URL，因此不影响任何预渲染 HTML。
 * · 主题在 light/dark 间切换时不需要重新注入 —— :root 与 .dark 两份都写过了，
 *   由 CSS 层叠自动切换。
 * · prefers-reduced-motion 或保存数据模式：仍然加载（它已是必需背景），
 *   只是不做额外延迟。
 */

/** 与 modules/design-tokens.ts 里 backdropVars 的派生规则保持一致 */
function backgroundSet(mode: 'light' | 'dark'): string {
  const base = mode === 'light' ? '/images/backdrop-light' : '/images/backdrop-dark'
  return `image-set(url("${base}-1280.webp") 1x, url("${base}-1920.webp") 2x)`
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  function apply() {
    const root = document.documentElement
    const isDark = root.classList.contains('dark')

    /**
     * 写两个变量：
     *   --backdrop-image          真实 image-set（触发下载）
     *   --backdrop-image-opacity  1 → 让伪元素淡入
     *
     * 分两步写、中间隔一帧，是为了确保「有图」与「不透明」不在同一帧生效 ——
     * 否则淡入的起点已经是最终状态，过渡不会播。
     */
    root.style.setProperty('--backdrop-image', backgroundSet(isDark ? 'dark' : 'light'))
    requestAnimationFrame(() => {
      root.style.setProperty('--backdrop-image-opacity', '1')
    })

    // 主题切换后重新对齐（ThemeToggle 通过 class 切换，这里跟随观察）
    const obs = new MutationObserver(() => {
      root.style.setProperty(
        '--backdrop-image',
        backgroundSet(root.classList.contains('dark') ? 'dark' : 'light'),
      )
    })
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
  }

  /**
   * 触发时机：DOMContentLoaded 之后约 1 个空闲帧。
   *
   * 为什么不等 load：
   * 实测 Fast 3G 下 FCP 1368ms、DCL 3887ms、load 5482ms —— load 比 FCP 晚 4.1s。
   * 等 load 意味着背景图要拖到 4.8s 才出现，页面会长时间处于「只有渐变底色」的
   * 状态，氛围感丢失太久。DCL 之后首屏内容已经就绪，此时再取背景图既能彻底避开
   * 首屏关键路径，又能让背景在 1s 内跟上。
   *
   * 为什么用 requestIdleCallback：DCL 那一刻可能还有 hydration 在跑，抢在同一帧
   * 发起网络请求会让主线程更抖。空闲回调（带 timeout 兜底）能等到主线程真有空隙。
   */
  function schedule() {
    const kick = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(apply, { timeout: 1000 })
      }
      else {
        setTimeout(apply, 200)
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', kick, { once: true })
    }
    else {
      // 已经 DCL 过（SPA 内直达），让出一帧再注入
      requestAnimationFrame(kick)
    }
  }

  schedule()
})
