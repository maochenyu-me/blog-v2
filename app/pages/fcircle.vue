<script setup lang="ts">
/**
 * 友链朋友圈 —— 聚合朋友们最近半年的博客更新。
 *
 * 数据源 app/data/fcircle.json 由 GitHub Actions 每日爬取（构建期内联），
 * 搜索 / 作者筛选 / 分页全部客户端完成，页面本体零运行时依赖。
 * 视觉沿用全站令牌，见 docs/design/07-fcircle.md。
 */
interface FcircleArticle {
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

const { ui, t } = useUi()
const pageCfg = usePageConfig('fcircle')
const { site } = useBlogConfig()
const { iso } = useDateFormat()

useHead({ title: ui.pages.fcircle })

const { default: fcircleData } = await import('~/data/fcircle.json')
const articles = fcircleData.articles as FcircleArticle[]

const fallbackCover = '/images/covers/default.svg'

/** ── 作者筛选：按文章数降序排 chip，「全部」置首 ── */
const authors = computed(() => {
  const map = new Map<string, { name: string; avatar: string; home: string; count: number }>()
  for (const a of articles) {
    const cur = map.get(a.author)
    if (cur) cur.count += 1
    else map.set(a.author, { name: a.author, avatar: a.avatar, home: a.home, count: 1 })
  }
  return [...map.values()].sort((x, y) => y.count - x.count)
})

const activeAuthor = ref<string | null>(null)

/** ── 搜索：防抖 + 标题/摘要/作者忽略大小写匹配 ── */
const searchInput = ref('')
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchQuery.value = v.trim()
  }, pageCfg.debounceMs)
})

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return articles.filter((a) => {
    if (activeAuthor.value && a.author !== activeAuthor.value) return false
    if (!q) return true
    return (
      a.title.toLowerCase().includes(q)
      || a.summary.toLowerCase().includes(q)
      || a.author.toLowerCase().includes(q)
    )
  })
})

/** ── 分页：页码分页，筛选/搜索变化回第 1 页 ── */
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageCfg.pageSize)))
const paged = computed(() => {
  const start = (page.value - 1) * pageCfg.pageSize
  return filtered.value.slice(start, start + pageCfg.pageSize)
})

watch([activeAuthor, searchQuery], () => {
  page.value = 1
})
/** 筛选后页数变少时，把当前页夹回有效范围 */
watch(pageCount, (n) => {
  if (page.value > n) page.value = n
})

/** 页码序列：1 … (c-1) c (c+1) … n，省略处用 0 占位 */
const pageItems = computed<(number | 0)[]>(() => {
  const n = pageCount.value
  const c = page.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const set = new Set([1, n, c - 1, c, c + 1].filter((p) => p >= 1 && p <= n))
  const list = [...set].sort((a, b) => a - b)
  const out: (number | 0)[] = []
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i] - list[i - 1] > 1) out.push(0)
    out.push(list[i])
  }
  return out
})

function goto(p: number) {
  page.value = Math.min(Math.max(1, p), pageCount.value)
}

/** 翻页后把列表顶部滚回视口，键盘用户也不丢上下文 */
const listTopEl = ref<HTMLElement | null>(null)
function gotoAndScroll(p: number) {
  goto(p)
  nextTick(() => listTopEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

/** ── 摘要展示层兜底截断 ── */
const excerptOf = (a: FcircleArticle) => {
  const s = a.summary
  return s.length > pageCfg.excerptLength ? `${s.slice(0, pageCfg.excerptLength)}…` : s
}

/** ── 封面兜底：有 cover 用 cover（加载失败换全站占位图）；
      无 cover 不硬拉头像，渲染装饰带（头像水印 + 图标），见 07-fcircle.md ── */
const failedCovers = reactive(new Set<string>())
const coverSrcOf = (a: FcircleArticle) =>
  failedCovers.has(a.id) ? fallbackCover : a.cover
const onCoverError = (a: FcircleArticle) => {
  failedCovers.add(a.id)
}

const gridVars = computed(() => ({
  '--cols-mobile': '1',
  '--cols-tablet': '2',
  '--cols-desktop': String(pageCfg.desktopColumns),
}))
</script>

<template>
  <div class="page-fcircle">
    <div class="container">
      <SiteBreadcrumb />
      <!-- ── 页头 ── -->
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.fcircle }}</h1>
        <p class="page-sub">
          {{ t(ui.fcircle.subtitle, { n: authors.length, m: articles.length }) }}
        </p>
      </header>

      <!-- ── 工具栏：搜索 + 作者筛选 ── -->
      <div class="toolbar">
        <div class="search-box">
          <Icon name="tabler:search" class="search-icon" aria-hidden="true" />
          <input
            v-model="searchInput"
            type="search"
            class="search-input"
            :placeholder="ui.fcircle.searchPlaceholder"
            :aria-label="ui.fcircle.searchAria"
          />
        </div>

        <nav class="author-filter" :aria-label="ui.fcircle.filterLabel">
          <button
            type="button"
            class="chip"
            :class="{ 'is-active': activeAuthor === null }"
            @click="activeAuthor = null"
          >
            {{ ui.fcircle.filterAll }}
          </button>
          <button
            v-for="author in authors"
            :key="author.name"
            type="button"
            class="chip chip-author"
            :class="{ 'is-active': activeAuthor === author.name }"
            @click="activeAuthor = activeAuthor === author.name ? null : author.name"
          >
            <img
              :src="author.avatar"
              :alt="t(ui.fcircle.avatarAlt, { name: author.name })"
              class="chip-avatar"
              width="20"
              height="20"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            />
            <span class="chip-name">{{ author.name }}</span>
            <span class="chip-count">{{ author.count }}</span>
          </button>
        </nav>
      </div>

      <!-- ── 状态行 + 卡片流 ── -->
      <div ref="listTopEl" class="list-top" aria-hidden="true" />
      <p class="list-status" role="status">
        {{ t(ui.fcircle.status, { total: filtered.length, page, pages: pageCount }) }}
      </p>

      <ul v-if="paged.length > 0" class="card-grid" :style="gridVars">
        <li v-for="a in paged" :key="a.id" class="card-cell">
          <article class="fc-card">
            <a :href="a.url" class="card-cover-link" target="_blank" rel="noopener noreferrer">
              <span class="card-cover">
                <img
                  v-if="a.cover"
                  :src="coverSrcOf(a)"
                  :alt="t(ui.fcircle.coverAlt, { title: a.title })"
                  class="cover-img"
                  loading="lazy"
                  decoding="async"
                  referrerpolicy="no-referrer"
                  @error="onCoverError(a)"
                />
                <span v-else class="cover-empty" aria-hidden="true">
                  <span
                    class="cover-watermark"
                    :style="{ backgroundImage: `url(${a.avatar})` }"
                  />
                  <Icon name="tabler:newspaper" class="cover-icon" />
                </span>
              </span>
            </a>
            <div class="card-body">
              <h3 class="card-title">
                <a :href="a.url" class="card-title-link" target="_blank" rel="noopener noreferrer">
                  {{ a.title }}
                </a>
              </h3>
              <p class="card-excerpt">{{ excerptOf(a) }}</p>
              <div class="card-meta">
                <a :href="a.home" class="meta-author" target="_blank" rel="noopener noreferrer">
                  <img
                    :src="a.avatar"
                    :alt="t(ui.fcircle.avatarAlt, { name: a.author })"
                    class="meta-avatar"
                    width="22"
                    height="22"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                  />
                  <span class="meta-name">{{ a.author }}</span>
                </a>
                <time class="meta-date" :datetime="iso(a.published)">{{ iso(a.published) }}</time>
              </div>
            </div>
          </article>
        </li>
      </ul>

      <!-- ── 空态：全站无数据 / 筛选无结果 ── -->
      <div v-else class="empty">
        <Icon name="tabler:rss-off" class="empty-icon" aria-hidden="true" />
        <p>{{ articles.length === 0 ? ui.fcircle.empty : ui.fcircle.emptyFiltered }}</p>
      </div>

      <!-- ── 页码分页 ── -->
      <nav v-if="pageCount > 1" class="pager" :aria-label="ui.fcircle.pagerAria">
        <button
          type="button"
          class="pager-btn"
          :disabled="page === 1"
          :aria-label="ui.fcircle.prevPage"
          @click="gotoAndScroll(page - 1)"
        >
          <Icon name="tabler:chevron-left" aria-hidden="true" />
        </button>
        <template v-for="(item, i) in pageItems" :key="`${item}-${i}`">
          <span v-if="item === 0" class="pager-ellipsis" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            class="pager-btn pager-num"
            :class="{ 'is-current': item === page }"
            :aria-label="t(ui.fcircle.pageAria, { n: item })"
            :aria-current="item === page ? 'page' : undefined"
            @click="gotoAndScroll(item)"
          >
            {{ item }}
          </button>
        </template>
        <button
          type="button"
          class="pager-btn"
          :disabled="page === pageCount"
          :aria-label="ui.fcircle.nextPage"
          @click="gotoAndScroll(page + 1)"
        >
          <Icon name="tabler:chevron-right" aria-hidden="true" />
        </button>
      </nav>

      <p class="source-note">{{ ui.fcircle.dataSourceNote }}</p>
    </div>
  </div>
</template>

<style scoped>
.page-fcircle {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--wide-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.page-head {
  margin-bottom: var(--space-block);
}

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.page-sub {
  margin-top: 0.375rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

/* ── 工具栏：搜索框 + 作者 chips，窄屏纵向堆叠 ── */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  width: 1rem;
  height: 1rem;
  color: var(--muted-foreground);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  font-size: var(--fs-meta);
  color: var(--foreground);
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  outline: none;
  transition:
    border-color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

.search-input:focus-visible {
  border-color: var(--accent);
  background-color: var(--card);
}

/* 作者筛选：横向滚动条，移动端滑得动 */
.author-filter {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
}

.author-filter::-webkit-scrollbar {
  display: none;
}

.chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.chip:hover {
  color: var(--foreground);
  border-color: var(--accent);
}

.chip.is-active {
  color: var(--accent);
  border-color: var(--accent);
  background-color: color-mix(in srgb, var(--accent) 8%, var(--card));
}

.chip-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  object-fit: cover;
  background-color: var(--muted);
}

.chip-name {
  max-width: 8em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-count {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ── 状态行：mono 数字，读屏可感知筛选结果变化 ── */
.list-top {
  scroll-margin-top: 5rem;
}

.list-status {
  margin-bottom: 1rem;
  font-size: var(--fs-meta);
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ── 卡片流：1/2/3 列，16:9 封面卡 ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols-mobile, 1), minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(var(--cols-tablet, 2), minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(var(--cols-desktop, 3), minmax(0, 1fr));
  }
}

.fc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  transition: background-color var(--duration-base) var(--easing-base);
}

.fc-card:hover {
  background-color: color-mix(in srgb, var(--muted) 85%, var(--foreground));
}

.card-cover-link {
  display: block;
}

.card-cover {
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--muted);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--duration-slow) var(--easing-base);
}

/* 无封面装饰带：头像低透明水印 + 图标，不做拉伸填充 */
.cover-empty {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cover-watermark {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.12;
  mask-image: radial-gradient(circle at 30% 40%, black 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(circle at 30% 40%, black 0%, transparent 75%);
  pointer-events: none;
}

.cover-icon {
  width: 2rem;
  height: 2rem;
  color: var(--muted-foreground);
  opacity: 0.55;
}

.fc-card:hover .cover-img {
  transform: scale(1.03);
}

.card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem 1rem;
}

.card-title {
  font-size: var(--fs-meta);
  font-weight: 700;
  line-height: 1.5;
}

.card-title-link {
  color: inherit;
  transition: color var(--duration-base) var(--easing-base);
}

.card-title-link:hover {
  color: var(--accent);
}

.card-excerpt {
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--muted-foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border);
}

.meta-author {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  min-width: 0;
}

.meta-avatar {
  flex: none;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  object-fit: cover;
  background-color: var(--muted);
}

.meta-name {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--duration-base) var(--easing-base);
}

.meta-author:hover .meta-name {
  color: var(--accent);
}

.meta-date {
  flex: none;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ── 空态 ── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding-block: 4rem;
  color: var(--muted-foreground);
}

.empty-icon {
  width: 2rem;
  height: 2rem;
  opacity: 0.5;
}

.empty p {
  font-size: var(--fs-meta);
}

/* ── 页码分页 ── */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: var(--space-block);
}

.pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.25rem;
  padding-inline: 0.5rem;
  font-size: var(--fs-meta);
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.pager-btn:hover:not(:disabled):not(.is-current) {
  color: var(--accent);
  border-color: var(--accent);
}

.pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-btn.is-current {
  color: var(--background);
  background-color: var(--accent);
  border-color: var(--accent);
}

.pager-ellipsis {
  min-width: 1.5rem;
  text-align: center;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.source-note {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-align: center;
}
</style>
