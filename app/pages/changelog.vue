<script setup lang="ts">
/**
 * 更新日志 —— 构建期由 modules/changelog.ts 从 git log 落成 JSON，
 * 页面直接 import 静态数据，客户端零请求。
 *
 * 视觉沿用全站的「纯文字列表 + 1px 线」语言：竖脊线 + 圆点，不做卡片、
 * 不做玻璃底。类型差异只靠等宽前缀与筛选 chip 表达，不使用彩色标签。
 */
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

const { site } = useBlogConfig()
const pageCfg = usePageConfig('changelog')
const { ui, t } = useUi()

useHead({ title: ui.pages.changelog })

const { default: data } = await import('~/data/changelog.json')
const changelog = data as ChangelogData

const repoUrl = computed(() => site.repoUrl?.replace(/\/+$/, '') ?? '')

/** 类型 → 中文标签；未收录的类型回落到「其他」 */
type TypeKey = keyof typeof ui.changelog.types
function typeLabel(type: string): string {
  const map = ui.changelog.types as Record<string, string>
  return map[type] ?? map.other!
}

/**
 * 筛选顺序：先按配置的 typeOrder，再把数据里出现但没配置的类型，
 * 最后 always 兜底 other。只保留当前数据里真实存在的类型。
 */
const typeChips = computed(() => {
  const present = new Map<string, number>()
  for (const c of changelog.commits) present.set(c.type, (present.get(c.type) ?? 0) + 1)

  const ordered: string[] = []
  for (const type of pageCfg.typeOrder) {
    if (present.has(type)) ordered.push(type)
  }
  for (const type of present.keys()) {
    if (type !== 'other' && !ordered.includes(type)) ordered.push(type)
  }
  if (present.has('other')) ordered.push('other')

  return ordered.map((type) => ({ type, count: present.get(type)! }))
})

const activeType = ref<string | null>(null)

const filtered = computed(() =>
  activeType.value
    ? changelog.commits.filter((c) => c.type === activeType.value)
    : changelog.commits,
)

/** 全量按月分组 —— 分页时用于判断「这个月是否被拆到两页」 */
const monthGroups = computed(() => {
  const map = new Map<string, ChangelogCommit[]>()
  for (const c of filtered.value) {
    const key = c.date.slice(0, 7)
    const bucket = map.get(key)
    if (bucket) bucket.push(c)
    else map.set(key, [c])
  }
  return [...map.entries()].map(([key, list]) => ({
    key,
    year: key.slice(0, 4),
    month: Number(key.slice(5, 7)),
    total: list.length,
    list,
  }))
})

interface MonthSlice {
  key: string
  year: string
  month: number
  /** 该月全量条数（用于标题徽标） */
  total: number
  /** 本片是否是该月的续页 */
  continued: boolean
  list: ChangelogCommit[]
}

/**
 * 分页规则：尽量不在月份中间断开。
 * 先按月切块（单月超过 pageSize 时自身再切片），再贪心装页，
 * 这样页首永远是完整月份标题，不会被切成两半。
 */
const pages = computed<MonthSlice[][]>(() => {
  const pageSize = Math.max(1, pageCfg.pageSize)
  const chunks: MonthSlice[] = []

  for (const group of monthGroups.value) {
    for (let i = 0; i < group.list.length; i += pageSize) {
      chunks.push({
        key: group.key,
        year: group.year,
        month: group.month,
        total: group.total,
        continued: i > 0,
        list: group.list.slice(i, i + pageSize),
      })
    }
  }

  const result: MonthSlice[][] = []
  let current: MonthSlice[] = []
  let count = 0

  for (const chunk of chunks) {
    if (current.length > 0 && count + chunk.list.length > pageSize) {
      result.push(current)
      current = []
      count = 0
    }
    current.push(chunk)
    count += chunk.list.length
  }
  if (current.length) result.push(current)

  return result.length ? result : [[]]
})

const page = ref(1)
const totalPages = computed(() => Math.max(1, pages.value.length))
const currentPage = computed(() => pages.value[page.value - 1] ?? [])

/** 页码窗：最多 5 个，跟随当前页滑动 */
const pageWindow = computed(() => {
  const span = 5
  let start = Math.max(1, page.value - Math.floor(span / 2))
  const end = Math.min(totalPages.value, start + span - 1)
  start = Math.max(1, end - span + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const listEl = ref<HTMLElement | null>(null)

function scrollToList() {
  nextTick(() => listEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function pickType(type: string | null) {
  activeType.value = type
  page.value = 1
  scrollToList()
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  scrollToList()
}

/** 筛选后页码可能越界（比如原在第 3 页，切到只有 1 页的类型） */
watch(totalPages, (n) => {
  if (page.value > n) page.value = n
})
</script>

<template>
  <div class="page-changelog">
    <div class="container">
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.changelog }}</h1>
        <p v-if="pageCfg.showCount" class="page-sub">
          {{ t(ui.changelog.subtitle, { n: changelog.total }) }}
        </p>
      </header>

      <nav
        v-if="pageCfg.showTypeFilter && typeChips.length > 1"
        class="type-filter"
        :aria-label="ui.changelog.filterLabel"
      >
        <button
          type="button"
          class="type-chip"
          :class="{ 'is-active': activeType === null }"
          :aria-pressed="activeType === null"
          @click="pickType(null)"
        >
          {{ ui.changelog.filterAll }}
          <span class="type-count">{{ changelog.commits.length }}</span>
        </button>

        <button
          v-for="chip in typeChips"
          :key="chip.type"
          type="button"
          class="type-chip"
          :class="{ 'is-active': activeType === chip.type }"
          :aria-pressed="activeType === chip.type"
          @click="pickType(chip.type)"
        >
          {{ typeLabel(chip.type) }}
          <span class="type-count">{{ chip.count }}</span>
        </button>
      </nav>

      <div ref="listEl" class="tl-anchor">
        <p v-if="!filtered.length" class="tl-note">
          {{ activeType ? ui.changelog.emptyFiltered : ui.changelog.empty }}
        </p>

        <template v-else>
          <section v-for="slice in currentPage" :key="slice.key + (slice.continued ? '-c' : '')" class="tl-month">
            <h2 class="tl-month-title">
              <span class="tl-month-year">{{ slice.year }}{{ ui.changelog.monthUnit }}</span>
              <span class="tl-month-md">{{ t(ui.changelog.monthLabel, { n: slice.month }) }}</span>
              <span class="tl-month-count">{{ t(ui.changelog.monthCount, { n: slice.total }) }}</span>
              <span v-if="slice.continued" class="tl-month-cont">{{ ui.changelog.continued }}</span>
            </h2>

            <ol class="tl-list">
              <li v-for="commit in slice.list" :key="commit.hash" class="tl-item">
                <span class="tl-dot" aria-hidden="true" />

                <div class="tl-row">
                  <time class="tl-date" :datetime="commit.date">{{ commit.date }}</time>

                  <span class="tl-main">
                    <span class="tl-type" :title="typeLabel(commit.type)">{{ commit.type }}</span>
                    <span v-if="commit.scope" class="tl-scope">({{ commit.scope }})</span>
                    <span class="tl-text">{{ commit.text }}</span>
                  </span>

                  <a
                    v-if="pageCfg.showHash && repoUrl"
                    class="tl-hash"
                    :href="`${repoUrl}/commit/${commit.hash}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    :aria-label="t(ui.changelog.commitLinkAria, { hash: commit.hash })"
                  >{{ commit.hash }}</a>
                  <span v-else-if="pageCfg.showHash" class="tl-hash">{{ commit.hash }}</span>
                </div>
              </li>
            </ol>
          </section>

          <nav v-if="totalPages > 1" class="pager" :aria-label="ui.changelog.pagerAria">
            <button
              type="button"
              class="pager-btn"
              :disabled="page === 1"
              :aria-label="ui.changelog.prevPage"
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
              :aria-label="t(ui.changelog.pageAria, { n: p })"
              :aria-current="p === page ? 'page' : undefined"
              @click="goPage(p)"
            >
              {{ p }}
            </button>
            <button
              type="button"
              class="pager-btn"
              :disabled="page === totalPages"
              :aria-label="ui.changelog.nextPage"
              @click="goPage(page + 1)"
            >
              <Icon name="tabler:chevron-right" aria-hidden="true" />
            </button>
          </nav>

          <p v-if="totalPages > 1" class="pager-status">
            {{ t(ui.changelog.pageStatus, { n: page, pages: totalPages, total: filtered.length }) }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-changelog {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--content-max-width);
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
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}

/* ---------- 类型筛选 ---------- */
.type-filter {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: var(--space-item);
  /* 窄屏横向滚动而不是折三行，保持日期区不被顶下去 */
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 0.125rem;
}

.type-filter::-webkit-scrollbar {
  display: none;
}

.type-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  min-height: 1.75rem;
  padding: 0.25rem 0.6875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--background);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.type-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.type-chip.is-active {
  border-color: var(--accent);
  color: var(--accent);
}

.type-count {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  opacity: 0.75;
}

/* ---------- 时间线 ---------- */
.tl-anchor {
  scroll-margin-top: calc(var(--header-height) + var(--toc-sticky-offset));
}

.tl-note {
  padding: var(--space-item) 0;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.tl-month + .tl-month {
  margin-top: var(--space-block);
}

.tl-month-title {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}

/* 年份用等宽数字，月份用正文体 —— 与归档页的年份标签同构 */
.tl-month-year {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.tl-month-md {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.tl-month-count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* 月份被分页切开时，续页加一个明确标记，避免读者以为标题重复 */
.tl-month-cont::before {
  content: '· ';
}

.tl-month-cont {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.tl-list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 竖脊线：只覆盖本月的条目，不穿过月份标题 */
.tl-list::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 0.75rem;
  bottom: 0.75rem;
  width: 1px;
  background: var(--border);
}

.tl-item {
  position: relative;
  padding-left: 1.5rem;
}

.tl-item + .tl-item {
  margin-top: 0.125rem;
}

/*
 * 圆点压在脊线上：2px 边框用页面底色把线「咬断」，
 * 不用 box-shadow —— 暗色模式会全局禁用阴影。
 * 默认用 muted-foreground 保证在浅色与暗色下都够清晰，
 * hover 提到 foreground，不额外占用强调色。
 */
.tl-dot {
  position: absolute;
  left: calc(5px - 5.5px);
  top: 0.5625rem;
  box-sizing: border-box;
  width: 11px;
  height: 11px;
  border: 2px solid var(--background);
  border-radius: 50%;
  background: var(--muted-foreground);
  transition: background var(--duration-base) var(--easing-base);
}

.tl-item:hover .tl-dot {
  background: var(--foreground);
}

.tl-row {
  display: grid;
  grid-template-columns: 4.75rem minmax(0, 1fr) auto;
  gap: 0.5rem 0.875rem;
  align-items: baseline;
  padding: 0.4375rem 0.625rem 0.4375rem 0.5rem;
  border-radius: var(--radius);
  transition: background var(--duration-base) var(--easing-base);
}

.tl-row:hover {
  background: var(--muted);
}

.tl-date {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/*
 * 这里是行内流而非 flex：type / scope / 正文要能自然连排，
 * 用 flex 会让长正文整体换到下一行，前缀孤零零占一行。
 */
.tl-main {
  min-width: 0;
  font-size: var(--fs-body);
  line-height: var(--lh-list-title);
  overflow-wrap: anywhere;
}

/* conventional commits 前缀：等宽、弱化，作为「这是什么改动」的零色彩标记 */
.tl-type {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-right: 0.375rem;
}

.tl-item:hover .tl-type {
  color: var(--accent);
}

.tl-scope {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted-foreground);
  opacity: 0.8;
  margin-right: 0.375rem;
}

.tl-text {
  color: var(--foreground);
}

.tl-hash {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted-foreground);
  white-space: nowrap;
  transition: color var(--duration-base) var(--easing-base);
}

a.tl-hash:hover {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---------- 分页 ---------- */
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

/* ---------- 窄屏：日期与 hash 一行，正文独占下一行 ---------- */
@media (max-width: 640px) {
  .tl-row {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.125rem 0.5rem;
    padding: 0.375rem 0.25rem;
  }

  .tl-date {
    grid-area: 1 / 1;
  }

  .tl-main {
    grid-area: 2 / 1 / auto / -1;
  }

  .tl-hash {
    grid-area: 1 / 2;
    justify-self: end;
    /* 12px 字号本身只有 18px 高，撑到 24px 才够触控下限 */
    display: inline-flex;
    align-items: center;
    min-height: 24px;
  }

  .tl-dot {
    top: 0.5rem;
  }
}
</style>
