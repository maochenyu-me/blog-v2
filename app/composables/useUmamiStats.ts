import type { VisitStatsData } from '~/data/about'
import { umamiConfig } from '~/utils/umami-config'

/**
 * 从自建 Umami 拉取访问统计（走同源 Pages Function 代理 /api/umami/*）。
 *
 * 数据口径（Asia/Shanghai 日界）：
 *   today     当日 0 点 ~ 现在
 *   yesterday 昨日 0 点 ~ 今日 0 点
 *   lastMonth 最近 30 天（滚动窗口，对应「最近月访问」）
 *   total     建站至今（startAt=0）
 *
 * 全链路失败时返回 null，页面继续展示 placeholder；成功结果在
 * sessionStorage 缓存 10 分钟，避免刷新反复打代理。
 */

interface UmamiStats {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
}

const CACHE_KEY = 'umami-stats-cache'
const CACHE_TTL = 10 * 60 * 1000
const SHANGHAI_OFFSET = 8 * 60 * 60 * 1000

/** 模块级缓存：SPA 内跳转不重复请求；share token 无过期，进程内复用 */
let shareToken: string | null = null
let inflight: Promise<VisitStatsData | null> | null = null

/** 北京时区的当日 0 点（毫秒时间戳） */
function shanghaiDayStart(now: number): number {
  return Math.floor((now + SHANGHAI_OFFSET) / 86400000) * 86400000 - SHANGHAI_OFFSET
}

async function requestStats(startAt: number, endAt: number, token: string): Promise<UmamiStats> {
  return await $fetch<UmamiStats>(
    `/api/umami/websites/${umamiConfig.websiteId}/stats`,
    {
      params: { startAt, endAt },
      headers: {
        'x-umami-share-token': token,
        'x-umami-share-context': umamiConfig.shareId,
      },
      timeout: 10000,
    },
  )
}

async function loadStats(): Promise<VisitStatsData | null> {
  let token = shareToken
  if (!token) {
    const share = await $fetch<{ token: string }>(
      `/api/umami/share/${umamiConfig.shareId}`,
      { timeout: 10000 },
    )
    token = share.token
    shareToken = token
  }

  const now = Date.now()
  const today0 = shanghaiDayStart(now)
  const yesterday0 = today0 - 86400000
  const monthAgo = now - 30 * 86400000

  const [today, yesterday, lastMonth, total] = await Promise.all([
    requestStats(today0, now, token),
    requestStats(yesterday0, today0, token),
    requestStats(monthAgo, now, token),
    requestStats(0, now, token),
  ])

  const fmt = (n: number) => n.toLocaleString('zh-CN')

  return {
    todayUv: fmt(today.visitors),
    todayPv: fmt(today.pageviews),
    yesterdayUv: fmt(yesterday.visitors),
    yesterdayPv: fmt(yesterday.pageviews),
    lastMonthPv: fmt(lastMonth.pageviews),
    totalPv: fmt(total.pageviews),
  }
}

function readCache(): VisitStatsData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as { data: VisitStatsData; at: number }
    return Date.now() - cached.at < CACHE_TTL ? cached.data : null
  } catch {
    return null
  }
}

function writeCache(data: VisitStatsData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, at: Date.now() }))
  } catch {
    /* 隐私模式等场景写不进就算了 */
  }
}

export async function fetchVisitStats(): Promise<VisitStatsData | null> {
  const cached = readCache()
  if (cached) return cached

  inflight ??= loadStats()
    .then((data) => {
      if (data) writeCache(data)
      return data
    })
    .catch((err) => {
      console.warn('[umami] 访问统计拉取失败，继续展示占位数据', err)
      return null
    })
    .finally(() => {
      inflight = null
    })

  return await inflight
}
