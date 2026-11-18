/**
 * 自建 busuanzi（bsz.518339.xyz）站点/文章计数。
 *
 * 不用官方 /js 脚本：它靠 DOM 填充 busuanzi_value_* 元素，填充往往先于
 * Vue 水合完成，value span 的文本会被水合当作 children mismatch 清掉
 * （容器 inline style 不受影响，表现为「有容器无数值」）。
 * 改为直接 POST /api —— 与脚本同一端点、同一请求头，浏览器 CORS 已
 * 验证可通（预检 204）；站点/页面计数走响应式 ref 渲染，无 DOM 注入竞态。
 *
 * 请求头与官方脚本一致：
 *   x-bsz-referer  当前页面 URL（服务端据此分页计数）
 *   Authorization  Bearer bsz-id（localStorage 持久的访客身份，用于 UV 去重）
 * 身份由响应头 Set-Bsz-Identity 下发，服务端已 Access-Control-Expose-Headers 暴露。
 */

const BSZ_API = 'https://bsz.518339.xyz/api'
const BSZ_IDENTITY_KEY = 'bsz-id'
const BSZ_DEDUPE_TTL = 10_000

interface BszData {
  site_pv: number
  site_uv: number
  page_pv: number
  page_uv: number
}

interface BszResponse {
  success: boolean
  data?: BszData
}

/**
 * 模块级去重：同一页面地址在短窗口内只发一次计数请求。
 * 页面组件（首页/文章页）与页脚兜底可能先后调用 track()，
 * 不去重会让 site_pv 被重复 +1。
 */
let lastKey = ''
let lastData: BszData | null = null
let lastAt = 0
let inflight: Promise<BszData | null> | null = null

async function requestCount(): Promise<BszData | null> {
  const key = window.location.href
  if (key === lastKey && lastData && Date.now() - lastAt < BSZ_DEDUPE_TTL) return lastData
  if (inflight) return await inflight

  inflight = (async () => {
    try {
      const headers: Record<string, string> = { 'x-bsz-referer': key }
      let identity: string | null = null
      try { identity = localStorage.getItem(BSZ_IDENTITY_KEY) } catch { /* 隐私模式 */ }
      if (identity) headers.Authorization = `Bearer ${identity}`

      const res = await fetch(BSZ_API, { method: 'POST', headers, signal: AbortSignal.timeout(8000) })
      const nextIdentity = res.headers.get('Set-Bsz-Identity')
      if (nextIdentity) {
        try { localStorage.setItem(BSZ_IDENTITY_KEY, nextIdentity) } catch { /* 同上 */ }
      }

      const json = (await res.json()) as BszResponse
      const data = json.success && json.data ? json.data : null
      if (data) {
        lastKey = key
        lastData = data
        lastAt = Date.now()
      }
      return data
    } catch {
      /* 计数失败不打断页面，计数项保持隐藏 */
      return null
    } finally {
      inflight = null
    }
  })()

  return await inflight
}

export function useBusuanzi() {
  const pagePv = ref<string | null>(null)
  const pageUv = ref<string | null>(null)
  const sitePv = ref<string | null>(null)
  const siteUv = ref<string | null>(null)

  async function track() {
    const data = await requestCount()
    if (!data) return
    pagePv.value = data.page_pv.toLocaleString('zh-CN')
    pageUv.value = data.page_uv.toLocaleString('zh-CN')
    sitePv.value = data.site_pv.toLocaleString('zh-CN')
    siteUv.value = data.site_uv.toLocaleString('zh-CN')
  }

  return { pagePv, pageUv, sitePv, siteUv, track }
}
