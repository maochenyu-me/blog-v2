<script setup lang="ts">
/**
 * 热搜页 —— 聚合各平台公开热榜（docs/design/12-hot.md）。
 *
 * 数据源 hot-api.liiiu.cn 由 pages.config.hot 配置；CORS 全开，
 * 纯客户端拉取（server: false），预渲染产物为骨架屏，水合后取真数据，
 * 与 SSG 无冲突。接口失败显示错误态 + 重试，不阻塞构建。
 */
import type { HotApiResponse, HotItem } from '~/types/hot'

const { ui, t } = useUi()
const pageCfg = usePageConfig('hot')

useHead({ title: ui.pages.hot })

/** ── 平台 tab ── */
const activeKey = ref(pageCfg.platforms[0]!.key)
const activePlatform = computed(
  () => pageCfg.platforms.find((p) => p.key === activeKey.value) ?? pageCfg.platforms[0]!,
)

function requestUrl(key: string) {
  const q = pageCfg.cache ? '?cache=true' : ''
  return `${pageCfg.apiBase}/${key}${q}`
}

const { data: response, pending, error, refresh } = useFetch<HotApiResponse>(
  computed(() => requestUrl(activeKey.value)),
  {
    key: computed(() => `hot-${activeKey.value}`),
    server: false,
    default: () => undefined,
  },
)

const items = computed<HotItem[]>(() =>
  Array.isArray(response.value?.data) ? response.value!.data : [],
)
const updateTime = computed(() => response.value?.updateTime ?? '')

const isReady = computed(() => !pending.value && !error.value)
const isEmpty = computed(() => isReady.value && items.value.length === 0)

/** 更新时间：本地 MM-DD HH:mm（仅客户端渲染，水合后才有值） */
const timeText = computed(() => {
  if (!updateTime.value) return ''
  const d = new Date(updateTime.value)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
})

/** ── 分页：页码分页，切平台回第 1 页（交互对齐 fcircle） ── */
const page = ref(1)
const pageCount = computed(() =>
  Math.max(1, Math.ceil(items.value.length / pageCfg.pageSize)),
)
const paged = computed(() => {
  const start = (page.value - 1) * pageCfg.pageSize
  return items.value.slice(start, start + pageCfg.pageSize)
})

watch(activeKey, () => {
  page.value = 1
})
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
    const current = list[i]!
    const previous = i > 0 ? list[i - 1] : undefined
    if (previous !== undefined && current - previous > 1) out.push(0)
    out.push(current)
  }
  return out
})

/** 翻页后把列表顶部滚回视口 */
const listTopEl = ref<HTMLElement | null>(null)
function gotoAndScroll(p: number) {
  page.value = Math.min(Math.max(1, p), pageCount.value)
  nextTick(() => listTopEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

/** ── 卡片形态：featured 首条大卡 + 其余竖卡；grid/row 全量同形态 ── */
function variantOf(globalRank: number): 'featured' | 'grid' | 'row' {
  if (pageCfg.layout === 'featured') return globalRank === 1 ? 'featured' : 'grid'
  return pageCfg.layout
}

/** 骨架屏条数：贴近真实数量，无数据时取 12 */
const skeletonCount = computed(() =>
  Math.min(pageCfg.pageSize, Math.max(6, items.value.length || 12)),
)
</script>

<template>
  <div class="page-hot">
    <div class="container">
      <SiteBreadcrumb />
      <!-- ── 页头 ── -->
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.hot }}</h1>
        <p class="page-sub">
          {{ timeText ? t(ui.hot.subtitle, { platform: activePlatform.label, time: timeText }) : activePlatform.label }}
        </p>
      </header>

      <!-- ── 平台 tab ── -->
      <nav class="platform-tabs" :aria-label="ui.hot.tabsAria">
        <button
          v-for="p in pageCfg.platforms"
          :key="p.key"
          type="button"
          class="tab"
          :class="{ 'is-active': activeKey === p.key }"
          :aria-pressed="activeKey === p.key"
          @click="activeKey = p.key"
        >
          <Icon :name="p.icon" class="tab-icon" aria-hidden="true" />
          <span>{{ p.label }}</span>
        </button>
      </nav>

      <!-- ── 状态行 + 卡片流 ── -->
      <div ref="listTopEl" class="list-top" aria-hidden="true" />
      <p v-if="isReady && !isEmpty" class="list-status" role="status">
        {{ t(ui.hot.status, { total: items.length, page, pages: pageCount }) }}
      </p>

      <!-- 骨架屏 -->
      <HotSkeleton v-if="pending" :count="skeletonCount" :featured="pageCfg.layout === 'featured'" />

      <!-- 错误态 -->
      <div v-else-if="error" class="state state--error" role="alert">
        <Icon name="tabler:alert-triangle" class="state-icon" aria-hidden="true" />
        <p>{{ ui.hot.loadError }}</p>
        <button type="button" class="retry-btn" @click="refresh()">
          <Icon name="tabler:refresh" aria-hidden="true" />
          {{ ui.hot.retry }}
        </button>
      </div>

      <!-- 空态 -->
      <div v-else-if="isEmpty" class="state">
        <Icon name="tabler:mood-off" class="state-icon" aria-hidden="true" />
        <p>{{ ui.hot.empty }}</p>
      </div>

      <!-- 卡片流 -->
      <ul
        v-else
        class="card-grid"
        :class="[`is-${variantOf(1)}`, { 'is-row': pageCfg.layout === 'row' }]"
      >
        <li
          v-for="(item, i) in paged"
          :key="item.id || `${activeKey}-${i}`"
          class="card-cell"
          :class="{ 'is-lead': variantOf((page - 1) * pageCfg.pageSize + i + 1) === 'featured' }"
        >
          <HotCard
            :item="item"
            :rank="(page - 1) * pageCfg.pageSize + i + 1"
            :platform="activePlatform.label"
            :icon="activePlatform.icon"
            :variant="variantOf((page - 1) * pageCfg.pageSize + i + 1)"
          />
        </li>
      </ul>

      <!-- ── 页码分页 ── -->
      <nav v-if="isReady && !isEmpty && pageCount > 1" class="pager" :aria-label="ui.hot.pagerAria">
        <button
          type="button"
          class="pager-btn"
          :disabled="page === 1"
          :aria-label="ui.hot.prevPage"
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
            :aria-label="t(ui.hot.pageAria, { n: item })"
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
          :aria-label="ui.hot.nextPage"
          @click="gotoAndScroll(page + 1)"
        >
          <Icon name="tabler:chevron-right" aria-hidden="true" />
        </button>
      </nav>

      <p class="source-note">{{ ui.hot.dataSourceNote }}</p>
    </div>
  </div>
</template>

<style scoped>
.page-hot {
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
  font-variant-numeric: tabular-nums;
}

/* ── 平台 tab：横向滚动，移动端滑得动 ── */
.platform-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
}

.platform-tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
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

.tab:hover {
  color: var(--foreground);
  border-color: var(--accent);
}

.tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.tab.is-active {
  color: var(--accent);
  border-color: var(--accent);
  background-color: color-mix(in srgb, var(--accent) 8%, var(--card));
}

.tab-icon {
  width: 1.1rem;
  height: 1.1rem;
}

/* ── 状态行 ── */
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

/* ── 卡片流：1/2 列，row 布局单列 ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 768px) {
  .card-grid:not(.is-row) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* featured 首条大卡：跨满整行（li 才是网格项，跨行必须挂在它身上） */
.card-grid .card-cell.is-lead {
  grid-column: 1 / -1;
}

/* ── 错误 / 空态 ── */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding-block: 4rem;
  color: var(--muted-foreground);
}

.state-icon {
  width: 2rem;
  height: 2rem;
  opacity: 0.5;
}

.state p {
  margin: 0;
  font-size: var(--fs-meta);
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.75rem;
  padding: 0.5rem 1.25rem;
  font-size: var(--fs-meta);
  color: var(--foreground);
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.retry-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* ── 页码分页（对齐 fcircle） ── */
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
