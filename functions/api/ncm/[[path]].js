/**
 * NCM 数据源同源代理（Cloudflare Pages Function）。
 *
 * 播放器的第三个数据源 ncm 走自建 api-enhanced 实例，但浏览器不能直连：
 *   1. 上游 CORS 只放行 https://www.kemiaosw.top，本地 dev 与预览域名拿不到
 *      Access-Control-Allow-Origin，直接跨域失败；
 *   2. 上游只放行四个只读端点，其余（登录、cookie 相关）不该暴露给前端；
 *   3. 实例地址不该硬编码进前端产物。
 * 这里把 /api/ncm/* 转发到上游同名路径，非白名单一律 403，防止代理被当开放网关。
 *
 * 只透传查询串，不转发请求头（上游按未登录状态返回，收费曲目由前端逐曲
 * 带 unblock=true 取地址）。上游地址可用环境变量 NCM_BASE_URL 覆盖。
 */

const DEFAULT_BASE_URL = 'https://ncm.518339.xyz'

const ALLOWED = [
  /^playlist\/detail$/,
  /^song\/url\/v1$/,
  /^song\/detail$/,
  /^lyric$/,
  /^cloudsearch$/,
]

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
  const base = ((env && env.NCM_BASE_URL) || DEFAULT_BASE_URL).replace(/\/+$/, '')

  let upstream
  try {
    upstream = await fetch(`${base}/${rel}${url.search}`)
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