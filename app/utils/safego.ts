/**
 * Safego — 外链中转工具函数
 *
 * 判断外链是否可信、编解码目标 URL、构建中转页地址。
 * 纯函数，无 Vue/Nuxt 依赖，便于单元测试。
 */

/**
 * 从 URL 中提取域名（含子域名）。
 * 无效 URL 返回空字符串。
 */
export function extractDomain(url: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    // 只处理 http/https 协议
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.hostname
  } catch {
    return ''
  }
}

/**
 * 判断链接是否为"可信链接"（不需要中转）。
 *
 * 规则：
 * 1. 内部链接（相对路径、锚点、mailto: 等）→ 可信
 * 2. 域名包含白名单中任一条目 → 可信（子域名匹配）
 * 3. 其余外链 → 不可信
 */
export function isTrustedLink(href: string, whitelist: string[]): boolean {
  if (!href) return true

  // 内部链接：相对路径、锚点、javascript:、mailto: 等
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return true
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true
  if (href.startsWith('javascript:')) return true

  const domain = extractDomain(href)
  if (!domain) return true // 无法解析的协议（如 javascript:void(0)）视为可信

  // 白名单匹配：域名等于或包含白名单条目
  // 例如 whitelist=['kemiaosw.top']，则 www.kemiaosw.top 和 bsz.518339.xyz 都匹配
  return whitelist.some(
    (entry) => domain === entry || domain.endsWith('.' + entry),
  )
}

/**
 * Base64url 编码目标 URL（URL 安全，无 + / =）。
 */
export function encodeTargetUrl(url: string): string {
  if (!url) return ''
  const base64 = btoa(unescape(encodeURIComponent(url)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Base64url 解码回原始 URL。
 * 解码失败返回 null。
 */
export function decodeTargetUrl(encoded: string): string | null {
  if (!encoded) return null
  try {
    // 还原标准 base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // 补齐 padding
    const pad = base64.length % 4
    if (pad === 2) base64 += '=='
    else if (pad === 3) base64 += '='
    else if (pad === 1) return null // 非法长度

    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return null
  }
}

/**
 * 构建中转页 URL。
 * @param targetUrl 目标外链
 * @param paramName 查询参数名（默认 'u'）
 */
export function buildSafegoUrl(targetUrl: string, paramName = 'u'): string {
  const encoded = encodeTargetUrl(targetUrl)
  return `/safego?${paramName}=${encoded}`
}
