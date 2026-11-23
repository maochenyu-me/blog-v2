/**
 * Umami API 同源代理（Cloudflare Pages Function）。
 *
 * 浏览器不能直连自建 Umami：
 *   1. 跨域 —— Umami 的 /api 不带 CORS 头；
 *   2. 若换成登录 token 等高权限凭据也不能进前端。
 * 这里把 /api/umami/* 转发到 Umami 的 /api/*，只放行 share 与 stats
 * 两个只读端点，其余一律 403，防止代理被当开放网关滥用。
 *
 * 鉴权头（原样透传，代理自身不存任何密钥）：
 *   x-umami-share-token    分享 JWT（GET /api/share/{shareId} 颁发，v2 无 exp）
 *   x-umami-share-context  v3 必需、v2.16 忽略；保留透传以兼容两种实例
 * 上游地址可用环境变量 UMAMI_BASE_URL 覆盖，默认指向自建实例（v2.16.1）。
 */

const DEFAULT_BASE_URL = 'https://um.518339.xyz'

const ALLOWED = [/^share\/[\w-]+$/, /^websites\/[\w-]+\/stats$/]

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function onRequestGet(context) {
  const { request, params, env } = context

  const raw = params.path
  const rel = Array.isArray(raw) ? raw.join('/') : raw

  if (!ALLOWED.some((re) => re.test(rel))) {
    return jsonResponse({ error: 'forbidden' }, 403)
  }

  const url = new URL(request.url)
  const base = ((env && env.UMAMI_BASE_URL) || DEFAULT_BASE_URL).replace(/\/+$/, '')

  const headers = new Headers()
  const token = request.headers.get('x-umami-share-token')
  const contextHeader = request.headers.get('x-umami-share-context')
  if (token) headers.set('x-umami-share-token', token)
  if (contextHeader) headers.set('x-umami-share-context', contextHeader)

  let upstream
  try {
    upstream = await fetch(`${base}/api/${rel}${url.search}`, { headers })
  } catch {
    return jsonResponse({ error: 'upstream unreachable' }, 502)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    },
  })
}
