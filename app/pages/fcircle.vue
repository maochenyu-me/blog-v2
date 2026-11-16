<script setup lang="ts">
interface FcircleRecord {
  id: string
  title: string
  url: string
  author: string
  avatar: string
  home: string
  published: string
  summary: string
  cover: string | null
}

interface LocalPayload {
  generatedAt?: string
  articles?: Array<Partial<FcircleRecord> & { link?: string; created?: string }>
}

interface RemoteArticle {
  id?: string | number
  title?: string
  link?: string
  url?: string
  author?: string
  avatar?: string
  home?: string
  created?: string
  published?: string
  summary?: string
  description?: string
  cover?: string | null
  image?: string
}

type ArticleInput = {
  id?: string | number
  title?: string
  link?: string
  url?: string
  author?: string
  avatar?: string
  home?: string
  created?: string
  published?: string
  summary?: string
  description?: string
  cover?: string | null
  image?: string
}

interface RemotePayload {
  statistical_data?: Record<string, unknown>
  article_data?: RemoteArticle[]
}

const { ui, t } = useUi()
useHead({ title: ui.pages.fcircle })

const localPayload = (await import('~/data/fcircle.json')).default as LocalPayload
const localArticles = Array.isArray(localPayload.articles) ? localPayload.articles : []

const safeUrl = (value: unknown, fallback = '') => {
  if (typeof value !== 'string' || !value.trim()) return fallback
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback
  } catch {
    return fallback
  }
}

const safeDate = (value: unknown) => {
  const date = new Date(typeof value === 'string' || typeof value === 'number' ? value : '')
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const hostOf = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const normalizeArticle = (article: ArticleInput, index: number): FcircleRecord | null => {
  const url = safeUrl(article.link ?? article.url)
  const title = typeof article.title === 'string' ? article.title.trim() : ''
  if (!url || !title) return null
  const home = safeUrl(article.home, `${new URL(url).origin}/`)
  return {
    id: String(article.id ?? `${url}-${index}`),
    title,
    url,
    author: typeof article.author === 'string' && article.author.trim() ? article.author.trim() : hostOf(home) || ui.fcircle.unknownAuthor,
    avatar: safeUrl(article.avatar),
    home,
    published: safeDate(article.created ?? article.published),
    summary: typeof article.summary === 'string' ? article.summary.trim() : typeof article.description === 'string' ? article.description.trim() : '',
    cover: safeUrl(article.cover ?? article.image) || null,
  }
}

const localRecords = localArticles.map((article, index) => normalizeArticle(article, index)).filter((article): article is FcircleRecord => Boolean(article))
const records = ref<FcircleRecord[]>(localRecords)
const remoteStats = ref<Record<string, unknown> | null>(null)
const remoteState = ref<'local' | 'loading' | 'remote'>('local')

const query = ref('')
const selectedSite = ref('all')
const dateRange = ref('all')
const sortOrder = ref<'newest' | 'oldest'>('newest')
const visibleCount = ref(10)
const featured = ref<FcircleRecord | null>(localRecords[0] ?? null)

const formatDate = (value: string) => {
  if (!value) return ui.fcircle.unknownDate
  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Shanghai' }).format(new Date(value))
  } catch {
    return value.slice(0, 10)
  }
}

const sites = computed(() => {
  const counts = new Map<string, number>()
  for (const item of records.value) {
    const site = hostOf(item.home || item.url)
    if (site) counts.set(site, (counts.get(site) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
})

const filteredRecords = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  const now = Date.now()
  const cutoff = dateRange.value === 'all' ? 0 : now - Number(dateRange.value) * 86_400_000
  return records.value
    .filter((item) => {
      const site = hostOf(item.home || item.url)
      if (selectedSite.value !== 'all' && site !== selectedSite.value) return false
      if (cutoff && (!item.published || new Date(item.published).getTime() < cutoff)) return false
      if (!needle) return true
      return [item.title, item.summary, item.author, site].some((value) => value.toLocaleLowerCase().includes(needle))
    })
    .sort((a, b) => {
      const left = new Date(a.published || 0).getTime()
      const right = new Date(b.published || 0).getTime()
      return sortOrder.value === 'newest' ? right - left : left - right
    })
})

const visibleRecords = computed(() => filteredRecords.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleRecords.value.length < filteredRecords.value.length)
const totalAuthors = computed(() => new Set(records.value.map((item) => item.author)).size)
const totalSites = computed(() => sites.value.length)
const statNumber = (key: string, fallback: number) => {
  const value = remoteStats.value?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
const stats = computed(() => ({
  articles: statNumber('article_num', records.value.length),
  friends: statNumber('friends_num', totalSites.value),
  active: statNumber('active_num', totalAuthors.value),
  errors: statNumber('error_num', 0),
  authors: totalAuthors.value,
  sites: totalSites.value,
}))

watch([query, selectedSite, dateRange, sortOrder], () => {
  visibleCount.value = 10
})

function pickRandom(open = false) {
  const pool = filteredRecords.value.length ? filteredRecords.value : records.value
  if (!pool.length) return
  const next = pool[Math.floor(Math.random() * pool.length)]
  if (!next) return
  featured.value = next
  if (open && import.meta.client) window.open(next.url, '_blank', 'noopener,noreferrer')
}

function loadMore() {
  visibleCount.value += 10
}

onMounted(async () => {
  remoteState.value = 'loading'
  try {
    const response = await fetch('https://fcircle.518339.xyz/all.json', { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`FCLite request failed: ${response.status}`)
    const payload = (await response.json()) as RemotePayload
    const remoteArticles = Array.isArray(payload.article_data)
      ? payload.article_data.map((article, index) => normalizeArticle(article, index)).filter((article): article is FcircleRecord => Boolean(article))
      : []
    if (remoteArticles.length) {
      records.value = remoteArticles
      featured.value = remoteArticles[0] ?? null
      remoteStats.value = payload.statistical_data ?? null
      remoteState.value = 'remote'
    } else {
      remoteState.value = 'local'
    }
  } catch {
    remoteState.value = 'local'
  }
})
</script>

<template>
  <main class="page-fcircle">
    <div class="container">
      <SiteBreadcrumb />
      <header class="page-head">
        <div>
          <p class="eyebrow">{{ t(ui.fcircle.eyebrow, { state: remoteState === 'remote' ? ui.fcircle.stateRemote : ui.fcircle.stateLocal }) }}</p>
          <h1 class="page-title">{{ ui.pages.fcircle }}</h1>
          <p class="page-sub">{{ t(ui.fcircle.subtitle, { friends: stats.friends, active: stats.active }) }}</p>
        </div>
        <dl class="stats" :aria-label="ui.fcircle.statsAria">
          <div><dt>{{ ui.fcircle.statArticles }}</dt><dd>{{ stats.articles }}</dd></div>
          <div><dt>{{ ui.fcircle.statFriends }}</dt><dd>{{ stats.friends }}</dd></div>
          <div><dt>{{ ui.fcircle.statActive }}</dt><dd>{{ stats.active }}</dd></div>
          <div class="stats-error"><dt>{{ ui.fcircle.statErrors }}</dt><dd>{{ stats.errors }}</dd></div>
        </dl>
      </header>

      <section v-if="featured" class="featured" aria-labelledby="featured-title">
        <div class="featured-copy">
          <p class="eyebrow">{{ ui.fcircle.featuredEyebrow }}</p>
          <h2 id="featured-title"><a :href="featured.url" target="_blank" rel="noopener noreferrer">{{ featured.title }}</a></h2>
          <p class="featured-meta">{{ t(ui.fcircle.featuredMeta, { author: featured.author, date: formatDate(featured.published) }) }}</p>
          <p v-if="featured.summary" class="featured-summary">{{ featured.summary }}</p>
          <div class="featured-actions">
            <a class="button button-primary" :href="featured.url" target="_blank" rel="noopener noreferrer">{{ ui.fcircle.readOriginal }}</a>
            <button class="button" type="button" @click="pickRandom()">{{ ui.fcircle.shuffle }}</button>
          </div>
        </div>
        <img v-if="featured.cover" class="featured-cover" :src="featured.cover" :alt="t(ui.fcircle.coverAlt, { title: featured.title })" referrerpolicy="no-referrer" loading="lazy" />
      </section>

      <section class="filters" :aria-label="ui.fcircle.filtersAria">
        <label class="search-field"><span class="sr-only">{{ ui.fcircle.searchLabel }}</span><Icon name="tabler:search" aria-hidden="true" /><input v-model="query" type="search" :placeholder="ui.fcircle.searchPlaceholder" /></label>
        <label><span class="sr-only">{{ ui.fcircle.siteLabel }}</span><select v-model="selectedSite"><option value="all">{{ ui.fcircle.siteAll }}</option><option v-for="([site, count]) in sites" :key="site" :value="site">{{ site }} ({{ count }})</option></select></label>
        <label><span class="sr-only">{{ ui.fcircle.rangeLabel }}</span><select v-model="dateRange"><option value="all">{{ ui.fcircle.rangeAll }}</option><option value="7">{{ ui.fcircle.rangeWeek }}</option><option value="30">{{ ui.fcircle.rangeMonth }}</option><option value="90">{{ ui.fcircle.rangeQuarter }}</option><option value="365">{{ ui.fcircle.rangeYear }}</option></select></label>
        <label><span class="sr-only">{{ ui.fcircle.sortLabel }}</span><select v-model="sortOrder"><option value="newest">{{ ui.fcircle.sortNewest }}</option><option value="oldest">{{ ui.fcircle.sortOldest }}</option></select></label>
      </section>

      <div class="timeline-layout">
        <section class="timeline" :aria-label="ui.fcircle.listAria">
          <div class="list-heading">
            <p class="list-status" role="status">{{ t(ui.fcircle.listStatus, { visible: visibleRecords.length, total: filteredRecords.length }) }}</p>
          </div>
          <div v-if="visibleRecords.length" class="waterfall-grid">
            <article v-for="item in visibleRecords" :key="item.id" class="waterfall-item">
              <img v-if="item.cover" class="item-cover" :src="item.cover" :alt="t(ui.fcircle.coverAlt, { title: item.title })" referrerpolicy="no-referrer" loading="lazy" />
              <div class="waterfall-content">
                <h2><a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }}</a></h2>
                <p v-if="item.summary" class="summary">{{ item.summary }}</p>
                <div class="item-meta">
                  <a :href="item.home || item.url" target="_blank" rel="noopener noreferrer" class="author"><img v-if="item.avatar" :src="item.avatar" :alt="t(ui.fcircle.avatarAlt, { name: item.author })" referrerpolicy="no-referrer" loading="lazy" /><span>{{ item.author }}</span></a>
                  <time :datetime="item.published">{{ formatDate(item.published) }}</time>
                </div>
                <a class="source-link" :href="item.url" target="_blank" rel="noopener noreferrer">{{ ui.fcircle.openSource }} <Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
              </div>
            </article>
          </div>
          <div v-else class="empty" role="status">{{ ui.fcircle.empty }}</div>
          <button v-if="hasMore" class="load-more" type="button" @click="loadMore">{{ ui.fcircle.loadMore }}</button>
        </section>
        <aside class="now-rail" :aria-label="ui.fcircle.railAria">
          <p class="eyebrow">NOW</p>
          <p>{{ filteredRecords.length ? t(ui.fcircle.railBrowsing, { n: filteredRecords.length }) : ui.fcircle.railNone }}</p>
          <button type="button" class="rail-random" @click="pickRandom(true)">{{ ui.fcircle.railRandom }}</button>
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page-fcircle { padding-block: var(--space-section) var(--space-block); }
.container { max-width: var(--wide-max-width); margin-inline: auto; padding-inline: var(--space-gutter); }
.page-head { display: flex; justify-content: space-between; gap: 2rem; align-items: end; margin: 2rem 0 2.5rem; }
.eyebrow { margin: 0 0 .5rem; color: var(--muted-foreground); font: .7rem/1.2 var(--font-mono); letter-spacing: .08em; }
.page-title { margin: 0; font-size: var(--fs-h1); line-height: var(--lh-h1); letter-spacing: -.03em; }
.page-sub { max-width: 42rem; margin: .75rem 0 0; color: var(--muted-foreground); }
.stats { display: flex; gap: 1.25rem; margin: 0; }
.stats div { min-width: 4.5rem; padding-left: .75rem; border-left: 1px solid var(--border); }
.stats dt { color: var(--muted-foreground); font-size: .75rem; }
.stats dd { margin: .2rem 0 0; color: var(--foreground); font: 1.25rem var(--font-mono); }
.featured { display: grid; grid-template-columns: 1fr minmax(12rem, 24rem); gap: 1.5rem; margin-bottom: 2rem; padding: 1.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); }
.featured h2 { margin: 0; max-width: 38rem; font-size: clamp(1.35rem, 3vw, 2rem); line-height: 1.25; }
.featured h2 a:hover, .timeline h2 a:hover { color: var(--accent); }
.featured-meta, .featured-summary { color: var(--muted-foreground); }
.featured-cover { width: 100%; height: 100%; min-height: 10rem; max-height: 15rem; object-fit: cover; border-radius: calc(var(--radius) / 2); }
.featured-actions { display: flex; gap: .6rem; margin-top: 1.25rem; }
.button, .load-more, .rail-random { display: inline-flex; align-items: center; justify-content: center; min-height: 2.4rem; padding: .5rem .9rem; border: 1px solid var(--border); border-radius: calc(var(--radius) / 2); color: var(--foreground); background: var(--muted); cursor: pointer; }
.button-primary { border-color: var(--accent); color: var(--background); background: var(--accent); }
.filters { display: flex; flex-wrap: wrap; gap: .6rem; margin-bottom: 1.75rem; }
.filters label { display: flex; align-items: center; }
.search-field { flex: 1 1 18rem; gap: .5rem; padding: 0 .75rem; border: 1px solid var(--border); border-radius: calc(var(--radius) / 2); background: var(--muted); }
.search-field input, .filters select { min-height: 2.4rem; border: 0; color: var(--foreground); background: transparent; }
.search-field input:focus-visible, .filters select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.filters select { padding: 0 .65rem; border: 1px solid var(--border); border-radius: calc(var(--radius) / 2); background-color: var(--muted); }
.timeline-layout { display: block; }
.timeline { min-width: 0; }
.list-heading { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 1rem; }
.list-status { margin: 0; color: var(--muted-foreground); font: .75rem var(--font-mono); }
.waterfall-grid { column-count: 4; column-gap: .85rem; }
.waterfall-item { display: inline-block; width: 100%; margin: 0 0 .85rem; overflow: hidden; break-inside: avoid; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); vertical-align: top; transition: border-color .2s ease, transform .2s ease; }
.waterfall-item:hover { border-color: color-mix(in srgb, var(--accent) 55%, var(--border)); transform: translateY(-2px); }
.waterfall-content { padding: 1rem; }
.item-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .45rem .7rem; color: var(--muted-foreground); font-size: .75rem; }
.author { display: inline-flex; min-width: 0; align-items: center; gap: .4rem; color: var(--foreground); }
.author span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.author img { width: 1.5rem; height: 1.5rem; flex: 0 0 auto; border-radius: 50%; object-fit: cover; background: var(--muted); }
.item-meta time { font-family: var(--font-mono); white-space: nowrap; }
.waterfall-item h2 { margin: 0 0 .55rem; font-size: clamp(1rem, 1.4vw, 1.18rem); line-height: 1.45; }
.waterfall-item h2 a:hover { color: var(--accent); }
.summary { margin: 0 0 .85rem; color: var(--muted-foreground); line-height: 1.65; }
.item-cover { display: block; width: 100%; max-height: 15rem; object-fit: cover; }
.source-link { display: inline-flex; align-items: center; gap: .25rem; margin-top: .8rem; color: var(--accent); font-size: .8rem; }
.load-more { display: block; margin: .5rem auto 0; }
.now-rail { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted-foreground); font-size: .85rem; line-height: 1.7; }
.now-rail .eyebrow { margin: 0; }
.now-rail p:not(.eyebrow) { flex: 1; margin: 0; }
.rail-random { flex: 0 0 auto; color: var(--accent); }
.empty { padding: 3rem 1rem; color: var(--muted-foreground); text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
:where(a, button, input, select):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
@media (max-width: 1040px) {
  .waterfall-grid { column-count: 3; }
}
@media (max-width: 760px) {
  .page-head, .timeline-layout { display: block; }
  .stats { margin-top: 1.25rem; }
  .now-rail { margin-top: 2rem; }
  .featured { grid-template-columns: 1fr; padding: 1rem; }
  .featured-cover { max-height: 12rem; }
  .filters label:not(.search-field) { flex: 1 1 8rem; }
  .filters select { width: 100%; }
  .waterfall-grid { column-count: 2; }
}
@media (max-width: 460px) {
  .waterfall-grid { column-count: 1; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
