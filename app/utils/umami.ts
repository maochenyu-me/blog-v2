/**
 * Umami 公开分享接口的极简客户端。
 *
 * 只走「/api/share/:id 换 token → 带 x-umami-share-token 查指标」这条公开链路，
 * 不需要站点私钥，CORS 全开。所有函数都在浏览器侧调用（页面 onMounted），
 * SSG 预渲染阶段不产生请求。
 */

export interface UmamiShare {
  websiteId: string
  token: string
}

export interface UmamiStats {
  visitors: number
  pageviews: number
  visits: number
  bounces: number
  totaltime: number
}

export interface UmamiPoint {
  x: string
  y: number
}

export interface UmamiRow {
  x: string | null
  y: number
}

export interface UmamiSeries {
  pageviews: UmamiPoint[]
  sessions: UmamiPoint[]
}

interface StatsPayload {
  visitors?: { value?: number }
  pageviews?: { value?: number }
  visits?: { value?: number }
  bounces?: { value?: number }
  totaltime?: { value?: number }
}

function cacheKey(scope: string) {
  return `analytics:umami:${scope}`
}

function readCache<T>(scope: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(scope))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; value: T }
    if (!parsed || Date.now() - parsed.at > ttlMs) return null
    return parsed.value
  } catch {
    return null
  }
}

function writeCache<T>(scope: string, value: T) {
  try {
    localStorage.setItem(cacheKey(scope), JSON.stringify({ at: Date.now(), value }))
  } catch {
    /* 隐私模式下 localStorage 不可用，直接放弃缓存 */
  }
}

function joinUrl(base: string, path: string) {
  return `${String(base).replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return (await res.json()) as T
}

/** 分享 ID 换 websiteId + 短期 token；token 有效期长，缓存一天 */
export async function fetchShare(
  apiBase: string,
  shareId: string,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<UmamiShare> {
  const scope = `share:${shareId}`
  const cached = readCache<UmamiShare>(scope, ttlMs)
  if (cached) return cached

  const raw = await getJson<Partial<UmamiShare>>(
    joinUrl(apiBase, `api/share/${encodeURIComponent(shareId)}`),
  )
  if (!raw?.websiteId || !raw?.token) throw new Error('分享接口返回不完整')
  const share: UmamiShare = { websiteId: raw.websiteId, token: raw.token }
  writeCache(scope, share)
  return share
}

function shareHeaders(share: UmamiShare) {
  return {
    'x-umami-share-token': share.token,
    'x-umami-share-context': '1',
  }
}

function statsUrl(apiBase: string, websiteId: string, startAt: number, endAt: number) {
  const url = new URL(joinUrl(apiBase, `api/websites/${websiteId}/stats`))
  url.searchParams.set('startAt', String(startAt))
  url.searchParams.set('endAt', String(endAt))
  return url.toString()
}

export async function fetchStats(
  apiBase: string,
  share: UmamiShare,
  startAt: number,
  endAt: number,
  cacheTtlMs: number,
): Promise<UmamiStats> {
  const scope = `stats:${share.websiteId}:${startAt}:${endAt}`
  const cached = readCache<UmamiStats>(scope, cacheTtlMs)
  if (cached) return cached

  const raw = await getJson<StatsPayload>(statsUrl(apiBase, share.websiteId, startAt, endAt), shareHeaders(share))
  const stats: UmamiStats = {
    visitors: Number(raw.visitors?.value) || 0,
    pageviews: Number(raw.pageviews?.value) || 0,
    visits: Number(raw.visits?.value) || 0,
    bounces: Number(raw.bounces?.value) || 0,
    totaltime: Number(raw.totaltime?.value) || 0,
  }
  writeCache(scope, stats)
  return stats
}

/** 时间序列；unit=day 稳定，unit=hour 只对约 3 天内的区间有效（超出 Umami 自动按天聚合） */
export async function fetchSeries(
  apiBase: string,
  share: UmamiShare,
  startAt: number,
  endAt: number,
  unit: 'day' | 'hour',
  cacheTtlMs: number,
): Promise<UmamiSeries> {
  const scope = `series:${share.websiteId}:${unit}:${startAt}:${endAt}`
  const cached = readCache<UmamiSeries>(scope, cacheTtlMs)
  if (cached) return cached

  const url = new URL(joinUrl(apiBase, `api/websites/${share.websiteId}/pageviews`))
  url.searchParams.set('startAt', String(startAt))
  url.searchParams.set('endAt', String(endAt))
  url.searchParams.set('unit', unit)
  url.searchParams.set('timezone', 'Asia/Shanghai')

  const raw = await getJson<{ pageviews?: UmamiPoint[]; sessions?: UmamiPoint[] }>(
    url.toString(),
    shareHeaders(share),
  )
  const series: UmamiSeries = {
    pageviews: Array.isArray(raw.pageviews) ? raw.pageviews : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
  }
  writeCache(scope, series)
  return series
}

export type UmamiMetricType =
  | 'url'
  | 'referrer'
  | 'title'
  | 'country'
  | 'region'
  | 'city'
  | 'device'
  | 'browser'
  | 'os'
  | 'language'
  | 'screen'

export async function fetchMetrics(
  apiBase: string,
  share: UmamiShare,
  type: UmamiMetricType,
  startAt: number,
  endAt: number,
  limit: number,
  cacheTtlMs: number,
): Promise<UmamiRow[]> {
  const scope = `metrics:${share.websiteId}:${type}:${startAt}:${endAt}:${limit}`
  const cached = readCache<UmamiRow[]>(scope, cacheTtlMs)
  if (cached) return cached

  const url = new URL(joinUrl(apiBase, `api/websites/${share.websiteId}/metrics`))
  url.searchParams.set('startAt', String(startAt))
  url.searchParams.set('endAt', String(endAt))
  url.searchParams.set('type', type)
  url.searchParams.set('limit', String(limit))

  const raw = await getJson<UmamiRow[]>(url.toString(), shareHeaders(share))
  const rows = Array.isArray(raw) ? raw : []
  writeCache(scope, rows)
  return rows
}

/** 本地零点时间戳（按访客时区，与页面「今日」口径一致） */
export function startOfLocalDay(now = Date.now()) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 清空本站统计缓存，供「刷新」按钮强制取新数据（仍受 Umami 自身缓存影响） */
export function clearUmamiCache() {
  try {
    const prefix = 'analytics:umami:'
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    /* 隐私模式下不处理 */
  }
}
