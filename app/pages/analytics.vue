<script setup lang="ts">
/**
 * 站点统计 —— 基于 Umami 公开分享接口（纯客户端取数）。
 *
 * 预渲染阶段只输出骨架，水合后由 onMounted 拉数据，因此 SSG 产物零请求、
 * 不参与服务端渲染比对（不存在 hydration 偏差）。
 * 数据源、时间范围、榜单条数全部来自 pages.config.analytics。
 */
import {
  clearUmamiCache,
  fetchMetrics,
  fetchSeries,
  fetchShare,
  fetchStats,
  startOfLocalDay,
  type UmamiPoint,
  type UmamiRow,
  type UmamiShare,
  type UmamiStats,
} from '~/utils/umami'

interface ChangelogCommit {
  hash: string
  date: string
  type: string
  scope: string | null
  text: string
}

interface ChangelogData {
  generatedAt: string
  total: number
  commits: ChangelogCommit[]
}

const { ui, t } = useUi()
const pageCfg = usePageConfig('analytics')
const { site } = useBlogConfig()

useHead({ title: ui.pages.analytics })

/** 分享页地址：配置位 + 分享 ID + 站点主机名 */
const shareUrl = computed(() => {
  const base = pageCfg.shareApiBase.replace(/\/+$/, '')
  const host = pageCfg.siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `${base}/share/${pageCfg.shareId}/${host}`
})

const cacheTtl = pageCfg.cacheMinutes * 60 * 1000
const dayMs = 24 * 60 * 60 * 1000

/* ---------------- 状态 ---------------- */
const share = ref<UmamiShare | null>(null)
const allStats = ref<UmamiStats | null>(null)
const todayStats = ref<UmamiStats | null>(null)
const periodStats = ref<UmamiStats | null>(null)
const range = ref<7 | 30 | 90>(pageCfg.defaultRange)
const series = ref<{ pageviews: UmamiPoint[]; sessions: UmamiPoint[] }>({ pageviews: [], sessions: [] })
const hourlySeries = ref<{ pageviews: UmamiPoint[]; sessions: UmamiPoint[] }>({ pageviews: [], sessions: [] })
const topPages = ref<UmamiRow[]>([])
const referrers = ref<UmamiRow[]>([])
const countries = ref<UmamiRow[]>([])
const devices = ref<UmamiRow[]>([])
const browsers = ref<UmamiRow[]>([])
const loading = ref(true)
const failed = ref(false)
const updatedAt = ref(0)

const updatedLabel = computed(() => {
  if (!updatedAt.value) return ui.analytics.sourceHint
  const d = new Date(updatedAt.value)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())} ${ui.analytics.sourceHint}`
})

/* ---------------- 推送节奏（构建期 git log） ---------------- */
const { default: changelogData } = await import('~/data/changelog.json')
const changelog = changelogData as ChangelogData

const commitDays = computed(() => {
  const map = new Map<string, number>()
  for (const c of changelog.commits) map.set(c.date, (map.get(c.date) ?? 0) + 1)
  return map
})

/** 最近一次推送：changelog 首条即最新 */
const latestCommit = computed(() => changelog.commits[0] ?? null)

const daysSinceLatest = computed(() => {
  if (!latestCommit.value) return null
  const then = new Date(`${latestCommit.value.date}T00:00:00`).getTime()
  const today = startOfLocalDay()
  return Math.max(0, Math.round((today - startOfLocalDay(then)) / dayMs))
})

const commitsLast30 = computed(() => {
  const from = startOfLocalDay() - 29 * dayMs
  let n = 0
  for (const c of changelog.commits) {
    if (new Date(`${c.date}T00:00:00`).getTime() >= from) n++
  }
  return n
})

/** 连续活跃：从最后一次提交日往回数连续的日历天 */
const streakDays = computed(() => {
  const days = new Set(changelog.commits.map((c) => c.date))
  let n = 0
  let cursor = startOfLocalDay(latestCommit.value ? new Date(`${latestCommit.value.date}T00:00:00`).getTime() : Date.now())
  while (days.has(dk(cursor))) {
    n++
    cursor -= dayMs
  }
  return n
})

const averagePerWeek = computed(() => {
  if (!changelog.commits.length) return 0
  const first = new Date(`${changelog.commits[changelog.commits.length - 1]!.date}T00:00:00`).getTime()
  const last = new Date(`${latestCommit.value?.date ?? ''}T00:00:00`).getTime()
  const weeks = Math.max(1, (startOfLocalDay(last) - startOfLocalDay(first)) / dayMs / 7)
  return changelog.commits.length / weeks
})

/* ---------------- 工具 ---------------- */
function dk(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fmt(n: number) {
  return new Intl.NumberFormat('zh-CN').format(Math.max(0, Math.round(n || 0)))
}

function fmtDecimal(n: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(n || 0)
}

/** 路径 → 可读文案；首页显示为「首页」 */
function pageLabel(path: string) {
  const clean = String(path || '/').split(/[?#]/)[0]!.replace(/\/+$/, '') || '/'
  return clean === '/' ? '/' : clean
}

/** 本站域名（去掉 www. 便于比对自引用跳转） */
const selfHost = (() => {
  try {
    return new URL(pageCfg.siteUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
})()

function hostLabel(value: string) {
  const v = String(value || '').trim()
  if (!v) return ui.analytics.sourcesDirect
  let host = v
  try {
    host = new URL(v.includes('://') ? v : `https://${v}`).hostname
  } catch {
    return v
  }
  return host.replace(/^www\./, '') === selfHost ? ui.analytics.sourcesInternal : host
}

const COUNTRY_NAMES = ui.analytics.countries

function countryLabel(code: string) {
  const key = String(code || '').toUpperCase()
  return COUNTRY_NAMES[key] ?? key ?? ui.analytics.regionOther
}

const DEVICE_NAMES = ui.analytics.devices

function deviceLabel(key: string) {
  return DEVICE_NAMES[key] ?? key
}

/* ---------------- 趋势图 ---------------- */
/** 把接口返回的稀疏序列补齐成连续的日轴（缺的日期补 0） */
const chartPoints = computed(() => {
  const days = range.value
  const end = startOfLocalDay()
  const start = end - (days - 1) * dayMs
  const views = new Map<string, number>()
  const visitors = new Map<string, number>()

  for (const p of series.value.pageviews) {
    const key = String(p.x).slice(0, 10)
    views.set(key, (views.get(key) ?? 0) + (Number(p.y) || 0))
  }
  for (const p of series.value.sessions) {
    const key = String(p.x).slice(0, 10)
    visitors.set(key, (visitors.get(key) ?? 0) + (Number(p.y) || 0))
  }

  return Array.from({ length: days }, (_, i) => {
    const ts = start + i * dayMs
    const key = dk(ts)
    const d = new Date(ts)
    return {
      key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      views: views.get(key) ?? 0,
      visitors: visitors.get(key) ?? 0,
    }
  })
})

const chartMax = computed(() => Math.max(1, ...chartPoints.value.map((p) => p.views)))

/** 图表几何：viewBox 960×300，绘图区 x 42→944，y 38→230 */
const GEO = { x0: 42, x1: 944, y0: 38, y1: 230 }

function toX(i: number) {
  const n = chartPoints.value.length
  if (n <= 1) return GEO.x0
  return GEO.x0 + ((GEO.x1 - GEO.x0) * i) / (n - 1)
}

function toY(value: number) {
  const max = chartMax.value
  return GEO.y1 - ((GEO.y1 - GEO.y0) * value) / max
}

function linePath(key: 'views' | 'visitors') {
  const pts = chartPoints.value
  if (!pts.length) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(p[key]).toFixed(2)}`)
    .join(' ')
}

const areaPath = computed(() => {
  const pts = chartPoints.value
  if (!pts.length) return ''
  const line = linePath('views')
  return `${line} L ${GEO.x1} ${GEO.y1} L ${GEO.x0} ${GEO.y1} Z`
})

const hasChartData = computed(() => chartPoints.value.some((p) => p.views > 0 || p.visitors > 0))

const yTicks = computed(() => {
  const max = chartMax.value
  return [max, Math.round(max / 2), 0]
})

const xLabels = computed(() => {
  const pts = chartPoints.value
  if (!pts.length) return ['', '', '']
  return [pts[0]!.label, pts[Math.floor(pts.length / 2)]!.label, pts[pts.length - 1]!.label]
})

/** 悬停提示 */
const hoverIndex = ref(-1)
const hoverPoint = computed(() => (hoverIndex.value >= 0 ? chartPoints.value[hoverIndex.value] ?? null : null))

function onChartMove(event: MouseEvent) {
  const svg = event.currentTarget as SVGElement
  const rect = svg.getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  const x = GEO.x0 + ratio * (GEO.x1 - GEO.x0)
  const n = chartPoints.value.length
  if (n <= 1) {
    hoverIndex.value = 0
    return
  }
  const step = (GEO.x1 - GEO.x0) / (n - 1)
  hoverIndex.value = Math.max(0, Math.min(n - 1, Math.round((x - GEO.x0) / step)))
}

/** 周期汇总：总量取区间 stats，活跃天与峰值从日轴推 */
const rangeStats = computed(() => {
  const pts = chartPoints.value
  const activeDays = pts.filter((p) => p.views > 0).length
  const peak = pts.reduce((m, p) => Math.max(m, p.views), 0)
  return {
    pageviews: periodStats.value?.pageviews ?? 0,
    visitors: periodStats.value?.visitors ?? 0,
    activeDays,
    peak,
  }
})

/** 榜单归一化百分比 */
function ranked(rows: UmamiRow[], limit: number) {
  const list = rows
    .filter((r) => r && Number(r.y) > 0)
    .slice(0, limit)
    .map((r) => ({ label: String(r.x ?? ''), value: Number(r.y) || 0 }))
  const max = Math.max(1, ...list.map((r) => r.value))
  const total = list.reduce((s, r) => s + r.value, 0)
  return list.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100), share: total ? r.value / total : 0 }))
}

const pageRanking = computed(() => ranked(topPages.value, pageCfg.rankLimit))

/** 来源榜单：Umami 的 referrer 不含直接访问，用区间访客数减出来补一行「直接访问」 */
const sourceRanking = computed(() => {
  const rows = ranked(referrers.value, pageCfg.rankLimit)
  const referred = rows.reduce((s, r) => s + r.value, 0)
  const direct = Math.max(0, (periodStats.value?.visitors ?? 0) - referred)
  const list = direct > 0 ? [{ label: '', value: direct, pct: 100, share: 0 }, ...rows] : rows
  const max = Math.max(1, ...list.map((r) => r.value))
  return list.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }))
})

const countryRanking = computed(() => ranked(countries.value, pageCfg.rankLimit))

/** 流量来源环形图：conic-gradient 直接由占比算出 */
const donutStops = computed(() => {
  const list = sourceRanking.value
  const total = list.reduce((s, r) => s + r.value, 0)
  if (!total) return ''
  let acc = 0
  const colors = [
    'var(--accent)',
    'color-mix(in srgb, var(--accent) 72%, var(--foreground))',
    'color-mix(in srgb, var(--accent) 52%, var(--foreground))',
    'color-mix(in srgb, var(--accent) 34%, var(--foreground))',
    'color-mix(in srgb, var(--accent) 20%, var(--foreground))',
    'color-mix(in srgb, var(--accent) 10%, var(--foreground))',
  ]
  return list
    .map((r, i) => {
      const from = acc
      acc += r.value / total
      return `${colors[i % colors.length]} ${(from * 100).toFixed(2)}% ${(acc * 100).toFixed(2)}%`
    })
    .join(', ')
})

const sourceTotal = computed(() => periodStats.value?.visitors ?? 0)

/* ---------------- 设备/浏览器条 ---------------- */
const deviceBars = computed(() => {
  const list = devices.value.filter((r) => Number(r.y) > 0).slice(0, 4)
  const total = list.reduce((s, r) => s + Number(r.y), 0) || 1
  return list.map((r) => ({
    label: deviceLabel(String(r.x ?? '')),
    value: Number(r.y) || 0,
    pct: Math.round(((Number(r.y) || 0) / total) * 100),
  }))
})

const browserBars = computed(() => {
  const list = browsers.value.filter((r) => Number(r.y) > 0).slice(0, 4)
  const total = list.reduce((s, r) => s + Number(r.y), 0) || 1
  return list.map((r) => ({
    label: String(r.x ?? ''),
    value: Number(r.y) || 0,
    pct: Math.round(((Number(r.y) || 0) / total) * 100),
  }))
})

/* ---------------- 活跃热力图（7×24） ---------------- */
const WEEKDAYS = ui.analytics.weekdays

/** Umami 只在约 3 天内给小时粒度；返回的点若都落在零点，说明已降级为按天 */
const activityBuckets = computed(() => {
  const cells = new Array<number>(7 * 24).fill(0)
  for (const p of hourlySeries.value.pageviews) {
    const raw = String(p.x)
    const value = Number(p.y) || 0
    if (!value) continue
    const [datePart, timePart = ''] = raw.split(' ')
    const d = new Date(`${datePart}T${timePart || '00:00:00'}`)
    if (Number.isNaN(d.getTime())) continue
    const weekday = (d.getDay() + 6) % 7
    const hour = d.getHours()
    cells[weekday * 24 + hour] = (cells[weekday * 24 + hour] ?? 0) + value
  }
  return cells
})

const activityMax = computed(() => Math.max(1, ...activityBuckets.value))

const activityDegraded = computed(() => {
  const pts = hourlySeries.value.pageviews
  if (!pts.length) return false
  return pts.every((p) => String(p.x).includes('00:00:00'))
})

function activityLevel(index: number) {
  const v = activityBuckets.value[index] ?? 0
  if (v <= 0) return 0
  const ratio = v / activityMax.value
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

function activityAria(index: number) {
  const weekday = WEEKDAYS[Math.floor(index / 24)]!
  const hour = index % 24
  return t(ui.analytics.activityCellAria, {
    day: weekday,
    hour: String(hour).padStart(2, '0'),
    n: activityBuckets.value[index] ?? 0,
  })
}

const activityPeakTime = computed(() => {
  if (activityDegraded.value) return '—'
  let best = -1
  let bestValue = 0
  activityBuckets.value.forEach((v, i) => {
    if (v > bestValue) {
      bestValue = v
      best = i
    }
  })
  if (best < 0) return '—'
  return `${String(best % 24).padStart(2, '0')}:00`
})

const activityPeakDay = computed(() => {
  if (activityDegraded.value) return '—'
  const totals = new Array(7).fill(0)
  activityBuckets.value.forEach((v, i) => {
    totals[Math.floor(i / 24)] += v
  })
  const max = Math.max(...totals)
  if (max <= 0) return '—'
  return WEEKDAYS[totals.indexOf(max)]!
})

const activityNightShare = computed(() => {
  if (activityDegraded.value) return '—'
  let night = 0
  let total = 0
  activityBuckets.value.forEach((v, i) => {
    total += v
    const hour = i % 24
    if (hour >= 22 || hour < 6) night += v
  })
  if (!total) return '—'
  return `${Math.round((night / total) * 100)}%`
})

/* ---------------- 推送热力图（近 53 周） ---------------- */
const pushCells = computed(() => {
  const weeks = 53
  const end = startOfLocalDay()
  const endWeekday = (new Date(end).getDay() + 6) % 7
  const start = end - (weeks * 7 - 1 - (6 - endWeekday)) * dayMs
  const cells: Array<{ key: string; date: string; count: number; future: boolean }> = []
  const todayKey = dk(end)
  for (let i = 0; i < weeks * 7; i++) {
    const ts = start + i * dayMs
    const key = dk(ts)
    cells.push({
      key,
      date: key,
      count: commitDays.value.get(key) ?? 0,
      future: ts > end && key !== todayKey,
    })
  }
  return cells
})

const pushMax = computed(() => Math.max(1, ...pushCells.value.map((c) => c.count)))

function pushLevel(count: number) {
  if (count <= 0) return 0
  const ratio = count / pushMax.value
  if (ratio > 0.66) return 4
  if (ratio > 0.4) return 3
  if (ratio > 0.15) return 2
  return 1
}

/** 月份标签：第一列出现新月份时打点 */
const pushMonths = computed(() => {
  const cells = pushCells.value
  const labels: Array<{ index: number; label: string }> = []
  let last = ''
  cells.forEach((cell, i) => {
    if (i % 7 !== 0) return
    const month = cell.date.slice(5, 7)
    if (month !== last) {
      last = month
      labels.push({ index: i / 7, label: t(ui.analytics.monthShort, { n: Number(month) }) })
    }
  })
  return labels
})

/* ---------------- 取数 ---------------- */
async function load(force = false) {
  loading.value = true
  failed.value = false

  try {
    if (force) clearUmamiCache()
    const sh = await fetchShare(pageCfg.shareApiBase, pageCfg.shareId)
    share.value = sh

    const now = Date.now()
    const dayStart = startOfLocalDay(now)
    const rangeStart = dayStart - (range.value - 1) * dayMs
    const activityStart = dayStart - (pageCfg.activityDays - 1) * dayMs

    const [all, today, period, dailySeries, hourly, pages, refs, geo, dev, brw] = await Promise.all([
      fetchStats(pageCfg.shareApiBase, sh, 0, now, cacheTtl),
      fetchStats(pageCfg.shareApiBase, sh, dayStart, now, cacheTtl),
      fetchStats(pageCfg.shareApiBase, sh, rangeStart, now, cacheTtl),
      fetchSeries(pageCfg.shareApiBase, sh, rangeStart, now, 'day', cacheTtl),
      fetchSeries(pageCfg.shareApiBase, sh, activityStart, now, 'hour', cacheTtl),
      fetchMetrics(pageCfg.shareApiBase, sh, 'url', rangeStart, now, pageCfg.rankLimit, cacheTtl),
      fetchMetrics(pageCfg.shareApiBase, sh, 'referrer', rangeStart, now, pageCfg.rankLimit, cacheTtl),
      fetchMetrics(pageCfg.shareApiBase, sh, 'country', rangeStart, now, pageCfg.rankLimit, cacheTtl),
      fetchMetrics(pageCfg.shareApiBase, sh, 'device', rangeStart, now, pageCfg.rankLimit, cacheTtl),
      fetchMetrics(pageCfg.shareApiBase, sh, 'browser', rangeStart, now, pageCfg.rankLimit, cacheTtl),
    ])

    allStats.value = all
    todayStats.value = today
    periodStats.value = period
    series.value = dailySeries
    hourlySeries.value = hourly
    topPages.value = pages
    referrers.value = refs
    countries.value = geo
    devices.value = dev
    browsers.value = brw
    updatedAt.value = now
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

function switchRange(next: 7 | 30 | 90) {
  if (next === range.value) return
  range.value = next
  void load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page-analytics">
    <div class="container">
      <SiteBreadcrumb />

      <!-- 页头 -->
      <header class="analytics-hero glass-panel">
        <div class="hero-copy">
          <p class="kicker">
            <span class="kicker-dot" aria-hidden="true" />
            {{ ui.analytics.kicker }}
          </p>
          <h1 class="page-title">{{ ui.pages.analytics }}</h1>
          <p class="hero-lead">{{ ui.analytics.lead }}</p>
          <div class="hero-notes">
            <span><Icon name="tabler:lock-open" aria-hidden="true" />{{ ui.analytics.notePublic }}</span>
            <span><Icon name="tabler:calendar-clock" aria-hidden="true" />{{ ui.analytics.noteTimezone }}</span>
          </div>
        </div>

        <div class="hero-meta">
          <div class="status" :data-state="failed ? 'error' : loading ? 'loading' : 'ready'">
            <span class="status-dot" aria-hidden="true" />
            <span>{{ failed ? ui.analytics.statusError : loading ? ui.analytics.statusLoading : ui.analytics.statusReady }}</span>
          </div>
          <a class="source-link" :href="shareUrl" target="_blank" rel="noopener noreferrer" :title="ui.analytics.sourceTitle">
            <strong>{{ ui.analytics.sourceLabel }}</strong>
            <Icon name="tabler:external-link" aria-hidden="true" />
          </a>
          <small class="source-hint">{{ updatedLabel }}</small>
        </div>
      </header>

      <!-- 概览四卡 -->
      <section class="summary" :aria-label="ui.analytics.summaryAria">
        <article class="sum-card">
          <div class="sum-top"><span>{{ ui.analytics.summaryAllTime }}</span><Icon name="tabler:users" aria-hidden="true" /></div>
          <strong>{{ allStats ? fmt(allStats.visitors) : '—' }}</strong>
          <span class="sum-label">{{ ui.analytics.visitors }}</span>
        </article>
        <article class="sum-card">
          <div class="sum-top"><span>{{ ui.analytics.summaryAllTime }}</span><Icon name="tabler:eye" aria-hidden="true" /></div>
          <strong>{{ allStats ? fmt(allStats.pageviews) : '—' }}</strong>
          <span class="sum-label">{{ ui.analytics.pageviews }}</span>
        </article>
        <article class="sum-card">
          <div class="sum-top"><span>{{ ui.analytics.summaryToday }}</span><Icon name="tabler:user-search" aria-hidden="true" /></div>
          <strong>{{ todayStats ? fmt(todayStats.visitors) : '—' }}</strong>
          <span class="sum-label">{{ ui.analytics.todayVisitors }}</span>
          <small>{{ ui.analytics.todaySince }}</small>
        </article>
        <article class="sum-card">
          <div class="sum-top"><span>{{ ui.analytics.summaryToday }}</span><Icon name="tabler:trending-up" aria-hidden="true" /></div>
          <strong>{{ todayStats ? fmt(todayStats.pageviews) : '—' }}</strong>
          <span class="sum-label">{{ ui.analytics.todayPageviews }}</span>
          <small>{{ ui.analytics.realtime }}</small>
        </article>
      </section>

      <div class="analytics-layout">
        <aside class="col col--side" :aria-label="ui.analytics.summaryAria">
          <!-- 本周期数据 -->
          <section class="panel">
            <header class="period-head">
              <strong>{{ ui.analytics.periodTitle }}</strong>
              <span>{{ t(ui.analytics.periodRange, { n: range }) }}</span>
            </header>
            <div class="period-grid">
              <div class="period-item">
                <span>{{ ui.analytics.periodPageviews }}</span>
                <strong>{{ fmt(rangeStats.pageviews) }}</strong>
              </div>
              <div class="period-item">
                <span>{{ ui.analytics.periodVisitors }}</span>
                <strong>{{ fmt(rangeStats.visitors) }}</strong>
              </div>
              <div class="period-item">
                <span>{{ ui.analytics.periodActiveDays }}</span>
                <strong>{{ fmt(rangeStats.activeDays) }}</strong>
                <small>{{ ui.analytics.periodActiveDaysHint }}</small>
              </div>
              <div class="period-item">
                <span>{{ ui.analytics.periodPeak }}</span>
                <strong>{{ fmt(rangeStats.peak) }}</strong>
                <small>{{ ui.analytics.periodPeakHint }}</small>
              </div>
            </div>
          </section>

          <!-- 地域分布 -->
          <section class="panel side-card">
            <header class="side-head">
              <div>
                <p class="kicker">{{ ui.analytics.regionKicker }}</p>
                <h2>{{ ui.analytics.regionTitle }}</h2>
                <p class="panel-desc">{{ ui.analytics.regionDesc }}</p>
              </div>
              <Icon name="tabler:world" aria-hidden="true" />
            </header>

            <p v-if="!countryRanking.length" class="empty-note">{{ ui.analytics.regionEmpty }}</p>
            <ol v-else class="region-list">
              <li v-for="(row, i) in countryRanking" :key="row.label">
                <span class="region-index">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="region-name">{{ countryLabel(row.label) }}</span>
                <span class="region-bar"><i :style="{ width: `${row.pct}%` }" /></span>
                <strong>{{ fmt(row.value) }}</strong>
              </li>
            </ol>

            <footer class="side-foot">
              <span>{{ t(ui.analytics.periodRange, { n: range }) }}</span>
              <a :href="shareUrl" target="_blank" rel="noopener noreferrer">
                {{ ui.analytics.viewDetail }}
                <Icon name="tabler:arrow-up-right" aria-hidden="true" />
              </a>
            </footer>
          </section>
        </aside>

        <main class="col col--main">
          <!-- 访问脉冲 -->
          <section class="panel traffic">
            <header class="panel-head">
              <div>
                <p class="kicker">{{ ui.analytics.trafficKicker }}</p>
                <h2>{{ ui.analytics.trafficTitle }}</h2>
                <p class="panel-desc">{{ ui.analytics.trafficDesc }}</p>
              </div>
              <div class="panel-controls">
                <div class="range" role="group" :aria-label="ui.analytics.rangeAria">
                  <button
                    v-for="r in pageCfg.ranges"
                    :key="r"
                    type="button"
                    :class="{ 'is-active': range === r }"
                    :aria-pressed="range === r"
                    @click="switchRange(r)"
                  >
                    {{ t(ui.analytics.rangeLabel, { n: r }) }}
                  </button>
                </div>
                <button type="button" class="refresh" :aria-label="ui.analytics.refresh" :disabled="loading" @click="load(true)">
                  <Icon name="tabler:refresh" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div class="chart-wrap">
              <div class="chart-y" aria-hidden="true">
                <span v-for="(tick, i) in yTicks" :key="i">{{ fmt(tick) }}</span>
              </div>
              <svg
                class="chart"
                viewBox="0 0 960 300"
                :aria-label="t(ui.analytics.chartAria, { n: range })"
                role="img"
                @mousemove="onChartMove"
                @mouseleave="hoverIndex = -1"
              >
                <defs>
                  <linearGradient id="an-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22" />
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <g class="chart-grid" aria-hidden="true">
                  <line v-for="(tick, i) in yTicks" :key="i" :x1="GEO.x0" :x2="GEO.x1" :y1="toY(tick)" :y2="toY(tick)" />
                </g>
                <template v-if="hasChartData">
                  <path class="chart-area" :d="areaPath" />
                  <path class="chart-line chart-line--views" :d="linePath('views')" />
                  <path class="chart-line chart-line--visitors" :d="linePath('visitors')" />
                  <line
                    v-if="hoverIndex >= 0"
                    class="chart-guide"
                    :x1="toX(hoverIndex)"
                    :x2="toX(hoverIndex)"
                    :y1="GEO.y0 - 14"
                    :y2="GEO.y1"
                  />
                  <circle
                    v-if="hoverPoint"
                    class="chart-point"
                    :cx="toX(hoverIndex)"
                    :cy="toY(hoverPoint.views)"
                    r="4"
                  />
                </template>
              </svg>

              <div v-if="hoverPoint" class="tooltip" :style="{ left: `${(toX(hoverIndex) / 960) * 100}%` }">
                <strong>{{ hoverPoint.label }}</strong>
                <span>{{ fmt(hoverPoint.views) }} {{ ui.analytics.legendPageviews }}</span>
                <span>{{ fmt(hoverPoint.visitors) }} {{ ui.analytics.legendVisitors }}</span>
              </div>

              <div class="chart-x" aria-hidden="true">
                <span v-for="(label, i) in xLabels" :key="i">{{ label }}</span>
              </div>

              <div v-if="!hasChartData && !loading" class="chart-empty">
                <Icon name="tabler:chart-dots" aria-hidden="true" />
                <strong>{{ ui.analytics.chartEmptyTitle }}</strong>
                <span>{{ ui.analytics.chartEmptyDesc }}</span>
              </div>
            </div>

            <footer class="chart-foot">
              <div class="legend">
                <span><i class="dot dot--views" />{{ ui.analytics.legendPageviews }}</span>
                <span><i class="dot dot--visitors" />{{ ui.analytics.legendVisitors }}</span>
              </div>
            </footer>
          </section>

          <!-- 大家在看什么 -->
          <section class="panel ranking">
            <header class="section-head">
              <strong>{{ ui.analytics.pagesTitle }}</strong>
              <span>{{ t(ui.analytics.pagesRange, { n: range }) }}</span>
            </header>
            <p v-if="!pageRanking.length" class="empty-note">{{ ui.analytics.pagesEmpty }}</p>
            <ol v-else class="rank-list">
              <li v-for="(row, i) in pageRanking" :key="row.label">
                <span class="rank-index">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="rank-main">
                  <span class="rank-label">{{ pageLabel(row.label) }}</span>
                  <span class="rank-bar"><i :style="{ width: `${row.pct}%` }" /></span>
                </span>
                <strong class="rank-value">{{ fmt(row.value) }}</strong>
              </li>
            </ol>
          </section>
        </main>

        <aside class="col col--side">
          <!-- 设备与浏览器 -->
          <section class="panel side-card">
            <header class="side-head">
              <div>
                <p class="kicker">VISITORS / DEVICES</p>
                <h2>{{ ui.analytics.deviceTitle }}</h2>
                <p class="panel-desc">{{ ui.analytics.deviceDesc }}</p>
              </div>
              <Icon name="tabler:devices" aria-hidden="true" />
            </header>

            <div class="bars" :aria-label="ui.analytics.deviceLabel">
              <div class="bars-title">{{ ui.analytics.deviceLabel }}</div>
              <div v-for="bar in deviceBars" :key="bar.label" class="bar-row">
                <span class="bar-label">{{ bar.label }}</span>
                <span class="bar-track"><i :style="{ width: `${bar.pct}%` }" /></span>
                <strong>{{ bar.pct }}%</strong>
              </div>
              <p v-if="!deviceBars.length" class="empty-note">—</p>
            </div>

            <div class="bars" :aria-label="ui.analytics.browserLabel">
              <div class="bars-title">{{ ui.analytics.browserLabel }}</div>
              <div v-for="bar in browserBars" :key="bar.label" class="bar-row">
                <span class="bar-label">{{ bar.label }}</span>
                <span class="bar-track"><i :style="{ width: `${bar.pct}%` }" /></span>
                <strong>{{ bar.pct }}%</strong>
              </div>
              <p v-if="!browserBars.length" class="empty-note">—</p>
            </div>
          </section>

          <!-- 流量来源 -->
          <section class="panel side-card">
            <header class="side-head side-head--simple">
              <h2>{{ ui.analytics.sourcesTitle }}</h2>
              <span class="badge">{{ t(ui.analytics.sourcesRange, { n: range }) }}</span>
            </header>

            <div class="donut-wrap">
              <div
                class="donut"
                :style="{ background: donutStops ? `conic-gradient(${donutStops})` : 'var(--muted)' }"
                role="img"
                :aria-label="ui.analytics.sourcesTitle"
              >
                <div class="donut-hole">
                  <strong>{{ fmt(sourceTotal) }}</strong>
                  <span>{{ ui.analytics.sourcesVisitors }}</span>
                </div>
              </div>
              <ol class="source-list">
                <li v-for="(row, i) in sourceRanking" :key="row.label">
                  <i class="source-dot" :data-index="i" />
                  <span class="source-name">{{ hostLabel(row.label) }}</span>
                  <strong>{{ fmt(row.value) }}</strong>
                </li>
                <li v-if="!sourceRanking.length" class="empty-note">{{ ui.analytics.sourcesEmpty }}</li>
              </ol>
            </div>

            <a class="source-more" :href="shareUrl" target="_blank" rel="noopener noreferrer">
              <span>{{ ui.analytics.viewDetail }}</span>
              <Icon name="tabler:arrow-up-right" aria-hidden="true" />
            </a>
          </section>
        </aside>
      </div>

      <!-- 推送节奏 -->
      <section class="panel deployment">
        <header class="panel-head">
          <div>
            <p class="kicker">{{ ui.analytics.pushKicker }}</p>
            <h2>{{ ui.analytics.pushTitle }}</h2>
            <p class="panel-desc">{{ ui.analytics.pushDesc }}</p>
          </div>
        </header>

        <div class="deploy-metrics">
          <div class="deploy-item">
            <span>{{ ui.analytics.pushLatest }}</span>
            <strong>{{ latestCommit ? latestCommit.date.slice(5) : '—' }}</strong>
            <small v-if="daysSinceLatest === 0">{{ ui.analytics.pushToday }}</small>
            <small v-else-if="daysSinceLatest !== null">{{ t(ui.analytics.pushInterval, { n: daysSinceLatest }) }}</small>
          </div>
          <div class="deploy-item">
            <span>{{ ui.analytics.pushRecent }}</span>
            <strong>{{ commitsLast30 }}</strong>
          </div>
          <div class="deploy-item">
            <span>{{ ui.analytics.pushAverage }}</span>
            <strong>{{ fmtDecimal(averagePerWeek) }}</strong>
            <small>{{ ui.analytics.pushAverageUnit }}</small>
          </div>
          <div class="deploy-item">
            <span>{{ ui.analytics.pushStreak }}</span>
            <strong>{{ streakDays }}</strong>
            <small>{{ ui.analytics.pushStreakUnit }}</small>
          </div>
        </div>

        <div class="heatmap-block">
          <div class="heatmap-head">
            <strong>{{ ui.analytics.pushTitle }}</strong>
            <span class="heatmap-count">{{ t(ui.analytics.pushCount, { n: changelog.total }) }}</span>
          </div>
          <div class="heatmap-scroll">
            <div class="heatmap">
              <div class="heat-grid" role="grid" :aria-label="ui.analytics.pushHeatmapAria">
                <span
                  v-for="cell in pushCells"
                  :key="cell.key"
                  class="heat-cell"
                  :data-level="cell.future ? 0 : pushLevel(cell.count)"
                  :title="t(ui.analytics.pushTip, { date: cell.date, n: cell.count })"
                  role="gridcell"
                />
              </div>
              <div class="heat-months" aria-hidden="true">
                <span v-for="m in pushMonths" :key="`${m.index}-${m.label}`" :style="{ left: `${(m.index / 53) * 100}%` }">{{ m.label }}</span>
              </div>
            </div>
          </div>
          <div class="heat-foot">
            <span>{{ ui.analytics.pushSource }}</span>
            <span class="heat-legend">
              <span>{{ ui.analytics.pushLess }}</span>
              <i v-for="l in [0, 1, 2, 3, 4]" :key="l" :data-level="l" />
              <span>{{ ui.analytics.pushMore }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 访客活跃时间 -->
      <section class="panel activity">
        <header class="panel-head">
          <div>
            <p class="kicker">{{ ui.analytics.activityKicker }}</p>
            <h2>{{ ui.analytics.activityTitle }}</h2>
            <p class="panel-desc">{{ ui.analytics.activityDesc }}</p>
          </div>
          <span class="badge">{{ t(ui.analytics.activityRange, { n: pageCfg.activityDays }) }}</span>
        </header>

        <div class="activity-body">
          <div class="activity-days" aria-hidden="true">
            <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
          </div>
          <div class="activity-grid-wrap">
            <div class="activity-grid" role="grid" :aria-label="t(ui.analytics.activityAria, { n: pageCfg.activityDays })">
              <span
                v-for="i in 7 * 24"
                :key="i"
                class="activity-cell"
                :data-level="activityLevel(i - 1)"
                :aria-label="activityAria(i - 1)"
                role="gridcell"
              />
            </div>
            <div class="activity-hours" aria-hidden="true">
              <span v-for="h in 12" :key="h">{{ t(ui.analytics.hourShort, { n: String((h - 1) * 2).padStart(2, '0') }) }}</span>
            </div>
          </div>
        </div>

        <p v-if="activityDegraded" class="activity-note activity-note--warn">{{ ui.analytics.activityDegraded }}</p>

        <div class="activity-stats">
          <div><span>{{ ui.analytics.activityPeakTime }}</span><strong>{{ activityPeakTime }}</strong></div>
          <div><span>{{ ui.analytics.activityPeakDay }}</span><strong>{{ activityPeakDay }}</strong></div>
          <div><span>{{ ui.analytics.activityNight }}</span><strong>{{ activityNightShare }}</strong></div>
          <div><span>{{ ui.analytics.activityToday }}</span><strong>{{ todayStats ? fmt(todayStats.visitors) : '—' }}</strong></div>
        </div>

        <footer class="activity-foot">
          <span>{{ ui.analytics.activityNote }}</span>
          <span class="heat-legend">
            <span>{{ ui.analytics.pushLess }}</span>
            <i v-for="l in [0, 1, 2, 3, 4]" :key="l" :data-level="l" />
            <span>{{ ui.analytics.pushMore }}</span>
          </span>
        </footer>
      </section>

      <footer class="page-foot glass-panel">
        <div>
          <span class="foot-eyebrow">A SMALL PUBLIC RECORD</span>
          <strong>{{ site.description }}</strong>
        </div>
        <NuxtLink class="foot-link" to="/about">
          {{ ui.pages.about }}
          <Icon name="tabler:arrow-up-right" aria-hidden="true" />
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.page-analytics {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  /* 三栏需要比正文更宽：1000px 下中栏只剩 ~450px，图表会挤 */
  max-width: 1240px;
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

/* ---------- 页头 ---------- */
.analytics-hero {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 1rem;
  padding: 1.5rem;
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.kicker-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.hero-lead {
  max-width: 44rem;
  margin-top: 0.5rem;
  font-size: var(--fs-meta);
  line-height: 1.7;
  color: var(--muted-foreground);
}

.hero-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.875rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.hero-notes span {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
}

.hero-meta {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  align-items: flex-end;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.status-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: var(--radius-full);
  background: var(--muted-foreground);
}

.status[data-state='ready'] .status-dot {
  background: var(--accent);
}

.status[data-state='loading'] .status-dot {
  animation: pulse 1.4s var(--easing-base) infinite;
}

.status[data-state='error'] {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  color: var(--accent);
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  font-size: 0.8125rem;
  color: var(--foreground);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.0625rem;
}

.source-link:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.source-hint {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  text-align: right;
}

/* ---------- 概览卡 ---------- */
.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-block: 1rem;
}

.sum-card {
  padding: 1rem 1.125rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}

.sum-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  color: var(--muted-foreground);
}

.sum-card strong {
  display: block;
  margin-top: 0.625rem;
  font-size: 1.75rem;
  line-height: 1.1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.sum-label {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.sum-card small {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  opacity: 0.8;
}

/* ---------- 布局：三栏 + 底部通栏 ---------- */
.analytics-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) 260px;
  gap: 0.875rem;
  align-items: start;
  margin-top: 1rem;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  min-width: 0;
}

.analytics-layout + .panel,
.panel + .panel {
  margin-top: 0.875rem;
}

/* 通栏面板（推送节奏 / 活跃时间）不参与三栏网格 */
.deployment,
.activity {
  margin-top: 0.875rem;
}

.panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 1.25rem;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.125rem;
}

.panel-head h2,
.side-head h2 {
  font-size: 1.125rem;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.panel-desc {
  margin-top: 0.1875rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.panel-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range {
  display: inline-flex;
  gap: 0.125rem;
  padding: 0.1875rem;
  background: var(--muted);
  border-radius: var(--radius-base);
}

.range button {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  background: transparent;
  border: none;
  border-radius: calc(var(--radius-base) - 0.125rem);
  cursor: pointer;
  transition: background-color var(--duration-base) var(--easing-base), color var(--duration-base) var(--easing-base);
}

.range button.is-active {
  background: var(--card);
  color: var(--foreground);
}

.refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  color: var(--muted-foreground);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  cursor: pointer;
}

.refresh:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.refresh:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ---------- 图表 ---------- */
.chart-wrap {
  position: relative;
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  gap: 0.5rem;
}

.chart-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 240px;
  padding-block: 0.125rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--muted-foreground);
  text-align: right;
}

.chart {
  display: block;
  width: 100%;
  height: 240px;
  overflow: visible;
}

.chart-grid line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

.chart-area {
  fill: url(#an-area);
}

.chart-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-line--views {
  stroke: var(--accent);
  stroke-width: 2;
}

.chart-line--visitors {
  stroke: color-mix(in srgb, var(--accent) 38%, var(--foreground));
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
  opacity: 0.85;
}

.chart-guide {
  stroke: var(--border);
  stroke-width: 1;
}

.chart-point {
  fill: var(--card);
  stroke: var(--accent);
  stroke-width: 2;
}

.tooltip {
  position: absolute;
  top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  transform: translateX(-50%);
  padding: 0.375rem 0.5rem;
  background: var(--surface-float);
  border: 1px solid var(--surface-float-border);
  border-radius: var(--radius-base);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}

.tooltip strong {
  color: var(--foreground);
  font-size: 0.75rem;
}

.chart-x {
  grid-column: 2;
  display: flex;
  justify-content: space-between;
  margin-top: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--muted-foreground);
}

.chart-empty {
  position: absolute;
  inset: 0 0 1.25rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-align: center;
  background: color-mix(in srgb, var(--card) 82%, transparent);
}

.chart-empty strong {
  font-size: 0.8125rem;
  color: var(--foreground);
}

.chart-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.legend {
  display: flex;
  gap: 0.875rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
}

.dot--views {
  background: var(--accent);
}

.dot--visitors {
  background: color-mix(in srgb, var(--accent) 38%, var(--foreground));
}

/* ---------- 周期 & 排行 ---------- */
.period-head,
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.period-head strong,
.section-head strong {
  font-size: 0.875rem;
}

.period-head span,
.section-head span {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.period-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
}

.period-item {
  padding: 0.625rem 0.75rem;
  background: var(--muted);
  border-radius: var(--radius-base);
}

.period-item span {
  display: block;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.period-item strong {
  display: block;
  margin-top: 0.125rem;
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
}

.period-item small {
  display: block;
  font-size: 0.625rem;
  color: var(--muted-foreground);
  opacity: 0.85;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
}

.rank-list li {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.rank-index {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--muted-foreground);
}

.rank-main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.rank-label {
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-bar {
  display: block;
  height: 3px;
  background: var(--muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.rank-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
}

.rank-value {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.empty-note {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* ---------- 推送节奏 ---------- */
.deploy-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.625rem;
}

.deploy-item {
  padding: 0.625rem 0.75rem;
  background: var(--muted);
  border-radius: var(--radius-base);
}

.deploy-item span {
  display: block;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.deploy-item strong {
  display: block;
  margin-top: 0.125rem;
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
}

.deploy-item small {
  display: block;
  font-size: 0.625rem;
  color: var(--muted-foreground);
}

.heatmap-block {
  margin-top: 1.125rem;
}

.heatmap-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
}

.heatmap-count {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.heatmap-scroll {
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: thin;
}

.heatmap {
  min-width: 560px;
}

.heat-grid {
  display: grid;
  grid-template-columns: repeat(53, minmax(0, 1fr));
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 0.6875rem);
  gap: 2px;
}

.heat-cell {
  border-radius: 2px;
  background: var(--muted);
}

.heat-cell[data-level='1'], .heat-legend i[data-level='1'] {
  background: color-mix(in srgb, var(--accent) 26%, var(--muted));
}

.heat-cell[data-level='2'], .heat-legend i[data-level='2'] {
  background: color-mix(in srgb, var(--accent) 46%, var(--muted));
}

.heat-cell[data-level='3'], .heat-legend i[data-level='3'] {
  background: color-mix(in srgb, var(--accent) 70%, var(--muted));
}

.heat-cell[data-level='4'], .heat-legend i[data-level='4'] {
  background: var(--accent);
}

.heat-months {
  position: relative;
  height: 1rem;
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  color: var(--muted-foreground);
}

.heat-months span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.heat-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.heat-legend {
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
}

.heat-legend i {
  display: block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 2px;
  background: var(--muted);
}

/* ---------- 活跃热力图 ---------- */
.badge {
  padding: 0.1875rem 0.5rem;
  background: var(--muted);
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.activity-body {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.375rem;
}

.activity-days {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  gap: 2px;
  font-size: 0.5625rem;
  color: var(--muted-foreground);
}

.activity-days span {
  display: flex;
  align-items: center;
  height: 0.75rem;
}

.activity-grid-wrap {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  grid-template-rows: repeat(7, 0.75rem);
  gap: 2px;
  min-width: 360px;
}

.activity-cell {
  border-radius: 2px;
  background: var(--muted);
}

.activity-cell[data-level='1'] {
  background: color-mix(in srgb, var(--accent) 24%, var(--muted));
}

.activity-cell[data-level='2'] {
  background: color-mix(in srgb, var(--accent) 44%, var(--muted));
}

.activity-cell[data-level='3'] {
  background: color-mix(in srgb, var(--accent) 68%, var(--muted));
}

.activity-cell[data-level='4'] {
  background: var(--accent);
}

.activity-hours {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  color: var(--muted-foreground);
}

.activity-note {
  margin-top: 0.625rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.activity-note--warn {
  color: var(--accent);
}

.activity-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
}

.activity-stats div {
  padding: 0.5rem 0.625rem;
  background: var(--muted);
  border-radius: var(--radius-base);
}

.activity-stats span {
  display: block;
  font-size: 0.625rem;
  color: var(--muted-foreground);
}

.activity-stats strong {
  display: block;
  margin-top: 0.125rem;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
}

.activity-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.875rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

/* ---------- 侧栏 ---------- */
.side-card {
  padding: 1.125rem;
}

.side-head {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.875rem;
}

.side-head--simple {
  align-items: baseline;
}

.side-head > svg {
  color: var(--muted-foreground);
  flex: none;
}

.bars + .bars {
  margin-top: 0.875rem;
}

.bars-title {
  margin-bottom: 0.375rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.bar-row {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr) 2.25rem;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.3125rem;
  font-size: 0.6875rem;
}

.bar-label {
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-track {
  display: block;
  height: 4px;
  background: var(--muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.bar-track i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
}

.bar-row strong {
  font-variant-numeric: tabular-nums;
  text-align: right;
  font-weight: 400;
}

.region-list {
  display: flex;
  flex-direction: column;
  gap: 0.4375rem;
  list-style: none;
}

.region-list li {
  display: grid;
  grid-template-columns: 1.25rem 3.5rem minmax(0, 1fr) 1.75rem;
  gap: 0.4375rem;
  align-items: center;
  font-size: 0.6875rem;
}

.region-index {
  font-family: var(--font-mono);
  color: var(--muted-foreground);
}

.region-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.region-bar {
  display: block;
  height: 3px;
  background: var(--muted);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.region-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
}

.region-list strong {
  font-variant-numeric: tabular-nums;
  text-align: right;
  font-weight: 400;
}

.side-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.875rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.side-foot a {
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  color: var(--foreground);
  text-decoration: none;
}

.side-foot a:hover {
  color: var(--accent);
}

.donut-wrap {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: 0.875rem;
  align-items: center;
}

.donut {
  position: relative;
  width: 6rem;
  height: 6rem;
  border-radius: var(--radius-full);
}

.donut-hole {
  position: absolute;
  inset: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border-radius: var(--radius-full);
  text-align: center;
}

.donut-hole strong {
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
}

.donut-hole span {
  font-size: 0.5625rem;
  color: var(--muted-foreground);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 0.3125rem;
  list-style: none;
  min-width: 0;
}

.source-list li {
  display: grid;
  grid-template-columns: 0.4375rem minmax(0, 1fr) auto;
  gap: 0.375rem;
  align-items: center;
  font-size: 0.6875rem;
}

.source-dot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: var(--radius-full);
  background: var(--accent);
}

.source-dot[data-index='1'] { background: color-mix(in srgb, var(--accent) 72%, var(--foreground)); }
.source-dot[data-index='2'] { background: color-mix(in srgb, var(--accent) 52%, var(--foreground)); }
.source-dot[data-index='3'] { background: color-mix(in srgb, var(--accent) 34%, var(--foreground)); }
.source-dot[data-index='4'] { background: color-mix(in srgb, var(--accent) 20%, var(--foreground)); }
.source-dot[data-index='5'] { background: color-mix(in srgb, var(--accent) 10%, var(--foreground)); }

.source-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-list strong {
  font-variant-numeric: tabular-nums;
  font-weight: 400;
}

.source-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 0.875rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  text-decoration: none;
}

.source-more:hover {
  color: var(--accent);
}

/* ---------- 页脚 ---------- */
.page-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  padding: 1.25rem 1.5rem;
}

.foot-eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  letter-spacing: 0.12em;
  color: var(--muted-foreground);
}

.page-foot strong {
  display: block;
  margin-top: 0.1875rem;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--muted-foreground);
}

.foot-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: var(--foreground);
  text-decoration: none;
}

.foot-link:hover {
  color: var(--accent);
}

/* ---------- 响应式 ---------- */
/* 三栏 → 单栏：两栏会在短列底部留大片空白，不如直接堆叠，主栏排最前 */
@media (max-width: 1000px) {
  .analytics-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .col {
    grid-column: 1;
    grid-row: auto;
  }

  .col--main {
    order: -1;
  }
}

@media (max-width: 720px) {
  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .deploy-metrics,
  .activity-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-wrap {
    grid-template-columns: minmax(0, 1fr);
  }

  .chart-y {
    display: none;
  }

  .chart-x {
    grid-column: 1;
  }

  .chart-empty {
    inset: 0 0 1.25rem 0;
  }

  .donut-wrap {
    grid-template-columns: 5rem minmax(0, 1fr);
  }

  .donut {
    width: 5rem;
    height: 5rem;
  }
}
</style>