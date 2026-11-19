/**
 * Safego 客户端插件 —— 拦截非信任域名的站外链接点击，重定向到中转页。
 *
 * 只在客户端运行（.client.ts），通过事件委托监听 document 上的 click，
 * 向上冒泡找到最近的 <a>，判断是否需要中转。
 */
import { isTrustedLink, buildSafegoUrl } from '~/utils/safego'

export default defineNuxtPlugin(() => {
  const appConfig = useAppConfig()
  const safegoConfig = appConfig.safego as {
    enabled: boolean
    whitelist: string[]
    countdown: number
    paramName: string
    pages?: string[]
  } | undefined

  // 未启用或缺少配置则跳过
  if (!safegoConfig?.enabled) return

  const whitelist = safegoConfig.whitelist ?? []
  const paramName = safegoConfig.paramName || 'u'

  // 页面范围：配置了 pages 数组时只在这些页面启用拦截
  // 空数组 = 所有页面都启用
  const pagePatterns = (safegoConfig.pages ?? []).map(p => new RegExp(p))
  const hasPageFilter = pagePatterns.length > 0

  /** 当前路由是否命中 pages 配置 */
  function isPageEnabled(path: string): boolean {
    if (!hasPageFilter) return true
    return pagePatterns.some(re => re.test(path))
  }

  /**
   * 判断一个 <a> 是否需要被中转。
   * 规则：
   *   1. href 存在且是 http(s) 外链
   *   2. 域名不在白名单内
   *   3. 没有 data-safego-ignore 属性（允许手动排除）
   */
  function shouldIntercept(anchor: HTMLAnchorElement): boolean {
    if (anchor.hasAttribute('data-safego-ignore')) return false
    const href = anchor.getAttribute('href')
    if (!href) return false

    // 只处理 http/https 外链
    if (!/^https?:\/\//i.test(href)) return false

    // 同站链接不处理
    try {
      const targetUrl = new URL(href, window.location.origin)
      if (targetUrl.origin === window.location.origin) return false
    } catch {
      return false
    }

    return !isTrustedLink(href, whitelist)
  }

  // 事件委托：在 document 上监听 click，向上冒泡找 <a>
  document.addEventListener('click', (event) => {
    // 页面范围检查：只在配置的路径上启用拦截
    if (!isPageEnabled(window.location.pathname)) return

    const target = event.target as HTMLElement
    if (!target) return

    // 向上查找最近的 <a>（最多 5 层）
    let el: HTMLElement | null = target
    let depth = 0
    while (el && el.tagName !== 'A' && depth < 5) {
      el = el.parentElement
      depth++
    }
    if (!el || el.tagName !== 'A') return

    const anchor = el as HTMLAnchorElement
    if (!shouldIntercept(anchor)) return

    // 阻止默认跳转，改为跳转到中转页
    event.preventDefault()
    event.stopPropagation()

    const href = anchor.getAttribute('href')!
    const safegoUrl = buildSafegoUrl(href, paramName)

    // 保留 target 属性行为（新窗口打开等）
    const targetAttr = anchor.getAttribute('target')
    if (targetAttr === '_blank') {
      window.open(safegoUrl, '_blank')
    } else {
      window.location.href = safegoUrl
    }
  }, true) // 使用 capture 阶段，确保在 Vue 的事件处理之前拦截
})
