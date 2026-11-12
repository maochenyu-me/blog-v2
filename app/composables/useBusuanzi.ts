/**
 * 自建 busuanzi（bsz.518339.xyz）文章页计数。
 *
 * 不用官方 /js 脚本：它靠 DOM 填充 busuanzi_value_* 元素，填充往往先于
 * Vue 水合完成，value span 的文本会被水合当作 children mismatch 清掉
 * （容器 inline style 不受影响，表现为「有容器无数值」）。
 * 改为直接 POST /api —— 与脚本同一端点、同一请求头，浏览器 CORS 已
 * 验证可通（预检 204）；数值走响应式 ref 渲染，无 DOM 注入竞态。
 *
 * 请求头与官方脚本一致：
 *   x-bsz-referer  当前页面 URL（服务端据此分页计数）
 *   Authorization  Bearer bsz-id（localStorage 持久的访客身份，用于 UV 去重）
 * 身份由响应头 Set-Bsz-Identity 下发，服务端已 Access-Control-Expose-Headers 暴露。
 */

const BSZ_API = 'https://bsz.518339.xyz/api'
const BSZ_IDENTITY_KEY = 'bsz-id'

interface BszResponse {
  success: boolean
  data?: { site_pv: number; site_uv: number; page_pv: number; page_uv: number }
}

export function useBusuanzi() {
  const pagePv = ref<string | null>(null)
  const pageUv = ref<string | null>(null)

  async function track() {
    try {
      const headers: Record<string, string> = { 'x-bsz-referer': window.location.href }
      let identity: string | null = null
      try { identity = localStorage.getItem(BSZ_IDENTITY_KEY) } catch { /* 隐私模式 */ }
      if (identity) headers.Authorization = `Bearer ${identity}`

      const res = await fetch(BSZ_API, { method: 'POST', headers, signal: AbortSignal.timeout(8000) })
      const nextIdentity = res.headers.get('Set-Bsz-Identity')
      if (nextIdentity) {
        try { localStorage.setItem(BSZ_IDENTITY_KEY, nextIdentity) } catch { /* 同上 */ }
      }

      const json = (await res.json()) as BszResponse
      if (json.success && json.data) {
        pagePv.value = json.data.page_pv.toLocaleString('zh-CN')
        pageUv.value = json.data.page_uv.toLocaleString('zh-CN')
      }
    } catch { /* 计数失败不打断页面，计数项保持隐藏 */ }
  }

  return { pagePv, pageUv, track }
}
