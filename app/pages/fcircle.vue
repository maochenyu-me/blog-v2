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

const { ui } = useUi()
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
    author: typeof article.author === 'string' && article.author.trim() ? article.author.trim() : hostOf(home) || '未知作者',
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
  if (!value) return '日期未知'
  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
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
const stats = computed(() => ({
  articles: typeof remoteStats.value?.articles === 'number' ? remoteStats.value.articles : records.value.length,
  authors: typeof remoteStats.value?.authors === 'number' ? remoteStats.value.authors : totalAuthors.value,
  sites: typeof remoteStats.value?.sites === 'number' ? remoteStats.value.sites : totalSites.value,
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
          <p class="eyebrow">FRIEND CIRCLE / {{ remoteState === 'remote' ? 'LIVE' : 'LOCAL' }}</p>
          <h1 class="page-title">{{ ui.pages.fcircle }}</h1>
          <p class="page-sub">来自 {{ stats.authors }} 位作者、{{ stats.sites }} 个站点的更新，安静地汇成一条时间线。</p>
        </div>
        <dl class="stats" aria-label="朋友圈统计">
          <div><dt>文章</dt><dd>{{ stats.articles }}</dd></div>
          <div><dt>作者</dt><dd>{{ stats.authors }}</dd></div>
          <div><dt>站点</dt><dd>{{ stats.sites }}</dd></div>
        </dl>
      </header>

      <section v-if="featured" class="featured" aria-labelledby="featured-title">
        <div class="featured-copy">
          <p class="eyebrow">随机 dispatch</p>
          <h2 id="featured-title"><a :href="featured.url" target="_blank" rel="noopener noreferrer">{{ featured.title }}</a></h2>
          <p class="featured-meta">{{ featured.author }} · {{ formatDate(featured.published) }}</p>
          <p v-if="featured.summary" class="featured-summary">{{ featured.summary }}</p>
          <div class="featured-actions">
            <a class="button button-primary" :href="featured.url" target="_blank" rel="noopener noreferrer">阅读原文</a>
            <button class="button" type="button" @click="pickRandom">再来亿点</button>
          </div>
        </div>
        <img v-if="featured.cover" class="featured-cover" :src="featured.cover" :alt="featured.title" referrerpolicy="no-referrer" loading="lazy" />
      </section>

      <section class="filters" aria-label="筛选朋友圈">
        <label class="search-field"><span class="sr-only">搜索文章</span><Icon name="tabler:search" aria-hidden="true" /><input v-model="query" type="search" placeholder="搜索标题、作者或站点" /></label>
        <label><span class="sr-only">站点</span><select v-model="selectedSite"><option value="all">全部站点</option><option v-for="([site, count]) in sites" :key="site" :value="site">{{ site }} ({{ count }})</option></select></label>
        <label><span class="sr-only">时间范围</span><select v-model="dateRange"><option value="all">全部时间</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="90">近 90 天</option><option value="365">近一年</option></select></label>
        <label><span class="sr-only">排序</span><select v-model="sortOrder"><option value="newest">最新发布</option><option value="oldest">最早发布</option></select></label>
      </section>

      <div class="timeline-layout">
        <section class="timeline" aria-label="文章时间线">
          <p class="list-status" role="status">显示 {{ visibleRecords.length }} / {{ filteredRecords.length }} 篇文章</p>
          <div v-if="visibleRecords.length" class="timeline-list">
            <article v-for="item in visibleRecords" :key="item.id" class="timeline-item">
              <div class="timeline-dot" aria-hidden="true" />
              <div class="timeline-content">
                <div class="item-meta">
                  <a :href="item.home || item.url" target="_blank" rel="noopener noreferrer" class="author"><img v-if="item.avatar" :src="item.avatar" :alt="`${item.author} avatar`" referrerpolicy="no-referrer" loading="lazy" /><span>{{ item.author }}</span></a>
                  <time :datetime="item.published">{{ formatDate(item.published) }}</time>
                  <span v-if="hostOf(item.home || item.url)" class="site">{{ hostOf(item.home || item.url) }}</span>
                </div>
                <h2><a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.title }}</a></h2>
                <p v-if="item.summary" class="summary">{{ item.summary }}</p>
                <img v-if="item.cover" class="item-cover" :src="item.cover" :alt="`${item.title} cover`" referrerpolicy="no-referrer" loading="lazy" />
                <a class="source-link" :href="item.url" target="_blank" rel="noopener noreferrer">打开原文 <Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
              </div>
            </article>
          </div>
          <div v-else class="empty" role="status">没有匹配的文章，换个关键词试试。</div>
          <button v-if="hasMore" class="load-more" type="button" @click="loadMore">加载更多</button>
        </section>
        <aside class="now-rail" aria-label="当前筛选状态">
          <p class="eyebrow">NOW</p>
          <p>{{ filteredRecords.length ? `正在浏览 ${filteredRecords.length} 条更新。` : '暂无符合条件的更新。' }}</p>
          <button type="button" class="rail-random" @click="pickRandom(true)">随机打开一篇</button>
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
.search-field input, .filters select { min-height: 2.4rem; border: 0; outline: 0; color: var(--foreground); background: transparent; }
.filters select { padding: 0 .65rem; border: 1px solid var(--border); border-radius: calc(var(--radius) / 2); background-color: var(--muted); }
.timeline-layout { display: grid; grid-template-columns: minmax(0, 1fr) 14rem; gap: 3rem; }
.timeline { min-width: 0; }
.list-status { margin: 0 0 1rem; color: var(--muted-foreground); font: .75rem var(--font-mono); }
.timeline-list { position: relative; }
.timeline-list::before { content: ''; position: absolute; inset: .4rem auto 0 .45rem; width: 1px; background: var(--border); }
.timeline-item { position: relative; display: grid; grid-template-columns: 1rem minmax(0, 1fr); gap: 1rem; padding-bottom: 2rem; }
.timeline-dot { width: .6rem; height: .6rem; margin-top: .35rem; border: 2px solid var(--accent); border-radius: 50%; background: var(--background); z-index: 1; }
.item-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; color: var(--muted-foreground); font-size: .75rem; }
.author { display: inline-flex; align-items: center; gap: .4rem; color: var(--foreground); }
.author img { width: 1.5rem; height: 1.5rem; border-radius: 50%; object-fit: cover; background: var(--muted); }
.item-meta time { font-family: var(--font-mono); }
.site { padding-left: .75rem; border-left: 1px solid var(--border); }
.timeline h2 { margin: .5rem 0; font-size: clamp(1.1rem, 2vw, 1.4rem); line-height: 1.35; }
.summary { max-width: 48rem; margin: 0; color: var(--muted-foreground); line-height: 1.7; }
.item-cover { width: min(100%, 30rem); max-height: 12rem; margin-top: .75rem; object-fit: cover; border-radius: calc(var(--radius) / 2); }
.source-link { display: inline-flex; align-items: center; gap: .25rem; margin-top: .8rem; color: var(--accent); font-size: .8rem; }
.load-more { display: block; margin: .5rem auto 0; }
.now-rail { align-self: start; padding-top: 1.8rem; border-top: 1px solid var(--border); color: var(--muted-foreground); font-size: .85rem; line-height: 1.7; }
.rail-random { margin-top: .75rem; color: var(--accent); }
.empty { padding: 3rem 1rem; color: var(--muted-foreground); text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
:where(a, button, input, select):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
@media (max-width: 760px) {
  .page-head, .timeline-layout { display: block; }
  .stats { margin-top: 1.25rem; }
  .now-rail { margin-top: 2rem; }
  .featured { grid-template-columns: 1fr; padding: 1rem; }
  .featured-cover { max-height: 12rem; }
  .filters label:not(.search-field) { flex: 1 1 8rem; }
  .filters select { width: 100%; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
