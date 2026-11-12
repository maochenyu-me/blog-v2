<script setup lang="ts">
/**
 * 搜索弹窗（提示词 §11.3 / §11.4 / §11.5）。
 *
 * 刻意不使用 shadcn-vue 的 Command 组件：
 *   仓库里没有 `components/ui/command`（shadcn-nuxt 只是接好了生成通道，组件需手动 add），
 *   而 cmdk 的默认键盘/高亮模型与「自己控制 ↑↓ 选中项」冲突。
 *   这里用 Teleport + 原生 input 手写，行为完全可控，样式只走全站 token。
 *
 * 状态来源：useSearch() —— 与 SearchTrigger / MobileTabBar 共享 useState('search-open')。
 */
import type { SearchHit, SnippetSegment } from '~/composables/useSearch'

const {
  enabled,
  isOpen,
  isLoading,
  loadError,
  history,
  historyVisible,
  shortcutLabel,
  close,
  run,
  ensureIndex,
  recordHistory,
  clearHistory,
  bindShortcut,
} = useSearch()

/**
 * 只取组件真正需要的两个字段。
 * 不直接用 useBlogConfig()：该名字目前被 nuxt-site-config 抢占（详见 useSearch.ts 内注释），
 * 直接解构会拿到 undefined。useSearch() 内已做归一化，这里跟随它取。
 */
const searchConfig = useSearch().config
const { ui } = useUi()

const inputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const query = ref('')
const activeIndex = ref(0)
const results = ref<SearchHit[]>([])

/** 防抖后的查询词，避免每敲一个字都跑一次检索 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const debouncedQuery = ref('')

const hasQuery = computed(() => query.value.trim().length > 0)
const showEmptyHint = computed(() => !hasQuery.value)
const showNoResult = computed(() => hasQuery.value && !isLoading.value && results.value.length === 0)
const showResults = computed(() => results.value.length > 0)

/** 初始加载：索引还没好且没有错误时显示骨架 */
const showSkeleton = computed(() => isLoading.value && !showResults.value)

/** 空态历史：只展示最近 3 条 */
const visibleHistory = computed(() => history.value.slice(0, historyVisible))

function scheduleSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  const ms = Number(searchConfig.debounceMs) >= 0 ? Number(searchConfig.debounceMs) : 200

  // debounce 为 0 时也要进微任务，保证 activeIndex 重置与结果更新同批
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = query.value
  }, ms)
}

watch(query, () => {
  activeIndex.value = 0
  scheduleSearch()
})

watch(debouncedQuery, (q) => {
  results.value = q.trim() ? run(q) : []
  activeIndex.value = 0
})

/** 索引就绪后如果已经有输入，立即补一次查询（覆盖「输入比索引先到」的竞态） */
watch(isLoading, (loading) => {
  if (!loading && query.value.trim()) {
    results.value = run(query.value)
  }
})

/** 弹窗打开：拉索引 + 聚焦 + 重置；关闭：清输入、解锁滚动 */
watch(isOpen, async (open_) => {
  if (!import.meta.client) return

  if (open_) {
    document.documentElement.style.setProperty('overflow', 'hidden')
    activeIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
    return
  }

  document.documentElement.style.removeProperty('overflow')
  // 关闭时清空输入：重新打开却看到上次结果会让人误以为搜索没刷新。
  // 历史是显式记录的用户数据，语义不同，保留。
  query.value = ''
  debouncedQuery.value = ''
  results.value = []
  activeIndex.value = 0
})

function moveActive(delta: number) {
  const total = results.value.length
  if (!total) return
  activeIndex.value = (activeIndex.value + delta + total) % total
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  void nextTick(() => {
    const el = panelRef.value?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function go(hit: SearchHit) {
  recordHistory(query.value)
  close()
  return navigateTo(hit.doc.path)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const hit = results.value[activeIndex.value]
    if (hit) void go(hit)
    return
  }
  if (event.key === 'Tab') {
    // 单输入框弹窗里 Tab 没有可去的焦点，直接吃掉避免焦点逃逸到页面背后
    event.preventDefault()
  }
}

function applyHistory(keyword: string) {
  query.value = keyword
  // 历史项点击后立即出结果，不必等防抖
  debouncedQuery.value = keyword
  nextTick(() => inputRef.value?.focus())
}

/** 骨架条数：固定 3 条，与结果区最低高度一致，避免加载完成时布局跳动 */
const skeletonRows = [0, 1, 2]

let unbind: (() => void) | null = null

onMounted(() => {
  unbind = bindShortcut()
})

onBeforeUnmount(() => {
  unbind?.()
  if (debounceTimer) clearTimeout(debounceTimer)
  if (import.meta.client) document.documentElement.style.removeProperty('overflow')
})

/** 渲染高亮分段：命中段用 <mark> */
function segmentsOf(hit: SearchHit): SnippetSegment[] {
  return hit.segments
}
</script>

<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div
        v-if="enabled && isOpen"
        class="search-overlay"
        @click.self="close()"
      >
        <div
          ref="panelRef"
          class="search-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="ui.search.dialogAria"
          @keydown="onKeydown"
        >
          <!-- 输入区 -->
          <div class="search-input-row">
            <Icon name="tabler:search" class="input-icon" aria-hidden="true" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="search-input"
              :placeholder="ui.search.placeholder"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              :aria-label="ui.search.inputAria"
              :aria-expanded="showResults"
              aria-controls="search-results"
            />
            <button
              type="button"
              class="close-btn"
              :aria-label="ui.search.closeAria"
              @click="close()"
            >
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </div>

          <!-- 结果 / 空态 / 骨架 / 错误 -->
          <div class="search-body">
            <!-- 加载骨架（§11.5：100ms 内完成，不显示明显 loading） -->
            <div v-if="showSkeleton" class="skeleton-list" aria-hidden="true">
              <div v-for="row in skeletonRows" :key="row" class="skeleton-row">
                <div class="skeleton-line skeleton-title" />
                <div class="skeleton-line skeleton-text" />
              </div>
            </div>

            <!-- 索引加载失败 -->
            <div v-else-if="loadError" class="state-block">
              <p class="state-title">{{ ui.search.errorTitle }}</p>
              <p class="state-desc">{{ loadError }}</p>
              <button type="button" class="state-action" @click="ensureIndex()">
                {{ ui.search.retry }}
              </button>
            </div>

            <!-- 空态：提示 + 历史 -->
            <div v-else-if="showEmptyHint" class="state-block state-empty">
              <p class="state-title">{{ ui.search.emptyTitle }}</p>
              <p class="state-desc">
                {{ ui.search.emptyDesc }}
              </p>

              <div v-if="searchConfig.history && visibleHistory.length" class="history">
                <div class="history-head">
                  <span class="history-label">{{ ui.search.historyLabel }}</span>
                  <button type="button" class="history-clear" @click="clearHistory()">
                    {{ ui.search.clearHistory }}
                  </button>
                </div>
                <ul class="history-list">
                  <li v-for="item in visibleHistory" :key="item">
                    <button type="button" class="history-item" @click="applyHistory(item)">
                      <Icon name="tabler:history" class="history-icon" aria-hidden="true" />
                      <span>{{ item }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <!-- 无结果 -->
            <div v-else-if="showNoResult" class="state-block">
              <p class="state-title">{{ ui.search.noResultTitle }}</p>
              <p class="state-desc">{{ ui.search.noResultDesc }}</p>
            </div>

            <!-- 结果列表 -->
            <ul v-else id="search-results" class="result-list" role="listbox">
              <li
                v-for="(hit, index) in results"
                :key="hit.doc.path"
                class="result-item"
                :class="{ 'is-active': index === activeIndex }"
                :data-active="index === activeIndex"
                role="option"
                :aria-selected="index === activeIndex"
                @mouseenter="activeIndex = index"
                @click="go(hit)"
              >
                <div class="result-head">
                  <span class="result-title">{{ hit.doc.title }}</span>
                  <span v-if="hit.doc.category" class="result-category">
                    {{ hit.doc.category }}
                  </span>
                </div>

                <p v-if="hit.segments.length" class="result-snippet">
                  <template v-for="(seg, i) in segmentsOf(hit)" :key="i">
                    <mark v-if="seg.mark" class="hl">{{ seg.text }}</mark>
                    <template v-else>{{ seg.text }}</template>
                  </template>
                </p>

                <div v-if="hit.doc.tags.length" class="result-tags">
                  <span v-for="tag in hit.doc.tags" :key="tag" class="result-tag">{{ tag }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- 底部键盘提示 -->
          <div class="search-footer" aria-hidden="true">
            <span class="foot-hint"><kbd>{{ ui.search.hintKeys.select }}</kbd> {{ ui.search.hintSelect }}</span>
            <span class="foot-hint"><kbd>{{ ui.search.hintKeys.open }}</kbd> {{ ui.search.hintOpen }}</span>
            <span class="foot-hint"><kbd>{{ ui.search.hintKeys.close }}</kbd> {{ ui.search.hintClose }}</span>
            <span class="foot-spacer" />
            <span class="foot-hint">{{ shortcutLabel }} {{ ui.search.hintTrigger }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ---------- 遮罩 ---------- */
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  /* 顶部对齐让弹窗落在视线自然位置，而不是屏幕正中 */
  padding: clamp(3rem, 12vh, 8rem) var(--space-gutter) var(--space-block);
  background-color: color-mix(in srgb, var(--foreground) 32%, transparent);
  overflow-y: auto;
}

/* ---------- 面板 ---------- */
.search-panel {
  width: 100%;
  max-width: 38rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  /* 无阴影：暗色模式禁用阴影，亮色也不堆叠，靠 1px 边框与背景色分层 */
  overflow: hidden;
}

/* ---------- 输入行 ---------- */
.search-input-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0 var(--space-item);
  height: 3.25rem;
  border-bottom: 1px solid var(--border);
}

.input-icon {
  flex: none;
  font-size: 1.125rem;
  color: var(--muted-foreground);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--foreground);
  font-family: inherit;
  font-size: var(--fs-body);
}

.search-input::placeholder {
  color: var(--muted-foreground);
}

.close-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 1rem;
  transition: color var(--duration-base) var(--easing-base);
}

.close-btn:hover {
  color: var(--foreground);
}

/* ---------- 主体 ---------- */
.search-body {
  max-height: min(24rem, 55vh);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* ---------- 骨架 ---------- */
.skeleton-list {
  padding: 0.5rem 0;
}

.skeleton-row {
  padding: 0.75rem var(--space-item);
}

.skeleton-line {
  height: 0.75rem;
  border-radius: 2px;
  background-color: var(--muted);
}

.skeleton-title {
  width: 42%;
  margin-bottom: 0.5rem;
}

.skeleton-text {
  width: 78%;
  opacity: 0.7;
}

/* 骨架微光：唯一允许的非交互循环动效，且尊重 reduced-motion */
@media (prefers-reduced-motion: no-preference) {
  .skeleton-line {
    animation: skeleton-pulse 1.2s var(--easing-base) infinite;
  }
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

/* ---------- 空态 / 无结果 ---------- */
.state-block {
  padding: var(--space-block) var(--space-item);
  text-align: center;
}

.state-title {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

.state-desc {
  margin-top: 0.375rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}

.state-action {
  margin-top: 0.875rem;
  font-size: var(--fs-meta);
  color: var(--foreground);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.0625rem;
  cursor: pointer;
}

.state-action:hover {
  border-bottom-color: var(--accent);
}

.state-empty {
  text-align: start;
  padding-block: var(--space-item);
}

.state-empty .state-title {
  text-align: center;
}

.state-empty .state-desc {
  text-align: center;
}

/* ---------- 历史 ---------- */
.history {
  margin-top: var(--space-item);
}

.history-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.history-label {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.history-clear {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.history-clear:hover {
  color: var(--foreground);
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4375rem 0.25rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  text-align: start;
  cursor: pointer;
  border-radius: calc(var(--radius) / 2);
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.history-item:hover {
  color: var(--foreground);
  background-color: var(--muted);
}

.history-icon {
  flex: none;
  font-size: 0.9375rem;
  opacity: 0.7;
}

/* ---------- 结果 ---------- */
.result-list {
  padding: 0.375rem 0;
}

.result-item {
  padding: 0.625rem var(--space-item);
  cursor: pointer;
  border-inline-start: 2px solid transparent;
  transition: background-color var(--duration-base) var(--easing-base);
}

.result-item.is-active {
  background-color: var(--muted);
  border-inline-start-color: var(--accent);
}

.result-head {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  justify-content: space-between;
}

.result-title {
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  font-weight: var(--fw-list-title);
  color: var(--foreground);
}

.result-category {
  flex: none;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.result-snippet {
  margin-top: 0.25rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  /* 片段最多两行，避免一条结果撑满整个面板 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* 高亮：强调色背景 + background 作前景，保证对比度（§5.2 的强调色用法之一） */
.hl {
  background-color: var(--accent);
  color: var(--background);
  border-radius: 2px;
  padding-inline: 0.0625em;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.375rem;
}

.result-tag {
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--muted-foreground);
}

.result-tag::before {
  content: '#';
  opacity: 0.5;
}

/* ---------- 底部提示 ---------- */
.search-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem var(--space-item);
  border-top: 1px solid var(--border);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
}

.foot-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.foot-spacer {
  flex: 1;
}

.search-footer kbd {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  padding: 0.0625rem 0.25rem;
  border: 1px solid var(--border);
  border-radius: 3px;
}

/* 触屏上键盘提示无意义 */
@media (max-width: 640px) {
  .search-footer {
    display: none;
  }
}

/* ---------- 淡入淡出 ---------- */
.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity var(--duration-base) var(--easing-base);
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}

.search-fade-enter-active .search-panel {
  transition: transform var(--duration-base) var(--easing-base);
}

.search-fade-enter-from .search-panel {
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .search-fade-enter-active,
  .search-fade-leave-active,
  .search-fade-enter-active .search-panel {
    transition: none;
  }
}
</style>
