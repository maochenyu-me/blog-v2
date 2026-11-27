/**
 * 天气接口同源代理（Cloudflare Pages Function）。
 *
 * 为什么需要它：上游 uapis.cn 在限流时返回 429，而这个响应由 ESA 边缘节点
 * 生成、**完全不带 Access-Control-Allow-Origin**。浏览器于是把它当成 CORS
 * 失败，前端拿不到状态码、也没法优雅降级，控制台还会留一条红色报错。
 * 走同源代理后，成功与失败都以同源 JSON 返回，前端只需判断 res.ok。
 *
 * ── 访客定位怎么保住 ─────────────────────────────
 * 代理后上游看到的是 CF 边缘节点 IP，「按请求方 IP 定位」就全变成机房所在地。
 * 好在 Pages 会把访客的地理信息挂在 request.cf 上（city / region），
 * 这里直接取 cf.city 作为 city 参数传给上游 —— 访客仍看到自己所在地的天气。
 * 实测 city=Beijing / Shanghai / Guangzhou 等英文名上游都能识别。
 *
 * ── 配额 ─────────────────────────────────────────
 * 上游 visitor-quota 只有 1500 credits / 31 天，所以这里再叠一层边缘缓存：
 * 同一城市 10 分钟内只真正打一次上游。前端另有 30 分钟 localStorage 缓存，
 * 两层叠加后实际请求量远低于配额。
 *
 * 本地预览（scripts/serve-dist.mjs）没有 request.cf，此时不带 city，
 * 上游按请求方 IP 定位 —— 等价于本机所在地，调试时符合预期。
 */

const DEFAULT_UPSTREAM = 'https://uapis.cn/api/v1/misc/weather'

/** 允许透传给上游的查询参数，其余一律忽略（防止代理被当开放网关） */
const ALLOWED_PARAMS = ['extended', 'forecast', 'city', 'adcode']

/** 边缘缓存时长（秒）：上游按城市出结果，10 分钟内复用 */
const EDGE_CACHE_TTL = 600

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // 失败响应绝不缓存：否则一次限流会被边缘放大成整整一分钟的持续失败
      'cache-control': status >= 400 ? 'no-store' : 'public, max-age=60',
    },
  })
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const upstream = new URL((env && env.WEATHER_API_URL) || DEFAULT_UPSTREAM)

  for (const key of ALLOWED_PARAMS) {
    const value = url.searchParams.get(key)
    if (value) upstream.searchParams.set(key, value)
  }

  // 未显式指定城市时，用 CF 提供的访客城市补位（本地预览没有 cf，跳过）
  const cf = request.cf
  if (!url.searchParams.has('city') && !url.searchParams.has('adcode') && cf?.city) {
    upstream.searchParams.set('city', cf.city)
  }

  let res
  try {
    res = await fetch(upstream.toString(), {
      // 让 CF 边缘缓存上游响应的 cf 选项在 Node（本地预览）下会被忽略，不影响
      cf: { cacheTtl: EDGE_CACHE_TTL, cacheEverything: true },
    })
  } catch {
    return jsonResponse({ error: 'upstream_unreachable' }, 502)
  }

  // 上游限流 / 5xx 时转成同源错误码，前端拿到 res.ok=false 后走失败态
  if (!res.ok) {
    return jsonResponse({ error: 'upstream_error', status: res.status }, 502)
  }

  // 原样透传 JSON 正文；不复制上游头（避免把不带 CORS 头的问题带进来）
  const body = await res.text()
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  })
}