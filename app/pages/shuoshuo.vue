<script setup lang="ts">
import type { Ech0Echo } from '~/utils/ech0'
import ShuoshuoCard from '~/components/shuoshuo/ShuoshuoCard.vue'

const { site } = useBlogConfig()
const pageCfg = usePageConfig('shuoshuo')
const { ui, t } = useUi()

useHead({ title: ui.pages.shuoshuo })

/** 数据经 useShuoshuoData 与首页说说轮播条共享同一次请求 */
const { echos: all, state: dataState, load } = useShuoshuoData()
const loading = computed(() => dataState.value === 'idle' || dataState.value === 'loading')
const failed = computed(() => dataState.value === 'failed')

const activeTag = ref<string | null>(null)
const page = ref(1)

const pageSize = pageCfg.pageSize

const displayName = computed(() => pageCfg.displayName || site.author.name)
const avatarSrc = computed(() => pageCfg.avatar || site.author.avatar)

const tagList = computed(() => {
  const map = new Map<string, number>()
  for (const echo of all.value) {
    for (const tag of echo.tags ?? []) {
      map.set(tag.name, (map.get(tag.name) ?? 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
})

const filtered = computed(() =>
  activeTag.value ? all.value.filter((e) => (e.tags ?? []).some((tag) => tag.name === activeTag.value)) : all.value,
)

const total = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

/** 分页窗：最多 5 个页码，跟随当前页滑动 */
const pageWindow = computed(() => {
  const span = 5
  let start = Math.max(1, page.value - Math.floor(span / 2))
  const end = Math.min(totalPages.value, start + span - 1)
  start = Math.max(1, end - span + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

/** 当前激活列数：<768 单列，768~1279 两列，≥1280 取配置 */
const colCount = ref(1)
function updateCols() {
  const w = window.innerWidth
  colCount.value = w < 768 ? 1 : w < 1280 ? 2 : pageCfg.desktopColumns
}
onMounted(() => {
  updateCols()
  window.addEventListener('resize', updateCols)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateCols))

/**
 * 瀑布流分发：按序轮转投递（第 1 条→列 1，第 2 条→列 2 ……），
 * 保持横向阅读序 —— 最新在左上，时间向右递减、再换行（LiuShen 式）。
 */
const columns = computed(() => {
  const cols: Ech0Echo[][] = Array.from({ length: colCount.value }, () => [])
  pageItems.value.forEach((item, i) => cols[i % colCount.value]!.push(item))
  return cols
})

const skeletonCount = Math.min(pageSize, 8)
const skeletonCols = computed(() => {
  const cols: number[][] = Array.from({ length: colCount.value }, () => [])
  for (let i = 1; i <= skeletonCount; i++) cols[(i - 1) % colCount.value]!.push(i)
  return cols
})

onMounted(load)

function pickTag(name: string | null) {
  activeTag.value = name
  page.value = 1
  scrollToTop()
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  scrollToTop()
}

function scrollToTop() {
  nextTick(() => listEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const listEl = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="page-shuoshuo">
    <div class="container">
      <header class="page-head">
        <div class="page-head-text">
          <h1 class="page-title">{{ ui.pages.shuoshuo }}</h1>
          <p class="page-sub">{{ t(ui.shuoshuo.subtitle, { n: total }) }}</p>
        </div>
      </header>

      <nav v-if="tagList.length" class="tag-filter" :aria-label="ui.shuoshuo.filterAria">
        <button
          type="button"
          class="tag-chip"
          :class="{ 'is-active': activeTag === null }"
          @click="pickTag(null)"
        >
          {{ ui.shuoshuo.filterAll }}
        </button>
        <button
          v-for="[name, count] in tagList"
          :key="name"
          type="button"
          class="tag-chip"
          :class="{ 'is-active': activeTag === name }"
          @click="pickTag(name)"
        >
          {{ name }}
          <span class="tag-count">{{ count }}</span>
        </button>
      </nav>

      <div v-if="loading" class="masonry" role="status" :aria-label="ui.shuoshuo.loading">
        <div v-for="(col, ci) in skeletonCols" :key="ci" class="masonry-col">
          <div v-for="i in col" :key="i" class="ss-skeleton"></div>
        </div>
      </div>

      <p v-else-if="failed" class="ss-note is-error" role="alert">
        {{ ui.shuoshuo.loadError }}
        <button type="button" class="ss-retry" @click="load">{{ ui.shuoshuo.retry }}</button>
      </p>
      <p v-else-if="total === 0" class="ss-note">{{ ui.shuoshuo.empty }}</p>

      <template v-else>
        <div ref="listEl" class="masonry">
          <div v-for="(col, ci) in columns" :key="ci" class="masonry-col">
            <ShuoshuoCard
              v-for="echo in col"
              :key="echo.id"
              :echo="echo"
              :api-base="pageCfg.apiBase"
              :display-name="displayName"
              :avatar="avatarSrc"
              :reactions-enabled="pageCfg.reactionsEnabled"
              :comments-enabled="pageCfg.commentsEnabled"
            />
          </div>
        </div>

        <nav v-if="totalPages > 1" class="pager" :aria-label="ui.shuoshuo.paginationAria">
          <button
            type="button"
            class="pager-btn"
            :disabled="page === 1"
            :aria-label="ui.shuoshuo.prevPage"
            @click="goPage(page - 1)"
          >
            <Icon name="tabler:chevron-left" aria-hidden="true" />
          </button>
          <button
            v-for="p in pageWindow"
            :key="p"
            type="button"
            class="pager-btn pager-num"
            :class="{ 'is-current': p === page }"
            :aria-label="t(ui.shuoshuo.pageLabel, { n: p })"
            :aria-current="p === page ? 'page' : undefined"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button
            type="button"
            class="pager-btn"
            :disabled="page === totalPages"
            :aria-label="ui.shuoshuo.nextPage"
            @click="goPage(page + 1)"
          >
            <Icon name="tabler:chevron-right" aria-hidden="true" />
          </button>
        </nav>
        <p class="pager-status">{{ t(ui.shuoshuo.pageStatus, { n: page, total: totalPages, count: total }) }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page-shuoshuo {
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

/* ── 标签筛选条 ── */
.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: var(--space-item);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--background);
  padding: 0.3125rem 0.75rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.tag-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.tag-chip.is-active {
  border-color: var(--accent);
  color: var(--accent);
}

.tag-count {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
}

/* ── 瀑布流：横向阅读序分发（最新在左上，向右递减），列数由 JS 按断点控制 ── */
.masonry {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.masonry-col {
  flex: 1;
  min-width: 0;
}

/* ── 状态文案与骨架 ── */
.ss-note {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  padding: var(--space-item) 0;
}

.ss-note.is-error {
  color: var(--accent);
}

.ss-retry {
  margin-left: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--background);
  color: var(--foreground);
  padding: 0.25rem 0.875rem;
  font-size: var(--fs-meta);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--easing-base);
}

.ss-retry:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ss-skeleton {
  height: 9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  margin-bottom: 1rem;
  animation: ss-pulse 1.4s ease-in-out infinite;
}

@keyframes ss-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

/* ── 分页 ── */
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.375rem;
  margin-top: var(--space-block);
}

.pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--muted-foreground);
  font-size: var(--fs-meta);
  font-family: var(--font-mono);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.pager-btn:hover:not(:disabled):not(.is-current) {
  border-color: var(--accent);
  color: var(--accent);
}

.pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pager-btn.is-current {
  border-color: var(--accent);
  color: var(--accent);
}

.pager-status {
  margin-top: 0.625rem;
  text-align: center;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}
</style>
