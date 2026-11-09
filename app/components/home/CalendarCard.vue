<script setup lang="ts">
/**
 * 侧栏日历卡（替代旧「最新文章」列表）。
 * 交互架构等效移植自 Dusklight 的 Calendar 组件：
 * 日视图（月历 + 年度热力图 + 文章列表）↔ 月选择器 ↔ 年选择器。
 * 数据不走接口，直接消费首页已取回的全量文章（SSG 友好）。
 * 「今天」只在客户端确定：挂载后才渲染网格，避免预渲染 HTML 的水合不一致。
 */
import type { PostSummary } from '~/composables/usePosts'

const props = defineProps<{
  posts: PostSummary[]
}>()

const { iso } = useDateFormat()
const { ui, t } = useUi()
const cal = ui.pages.home.calendar

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

const ready = ref(false)
const view = ref<'day' | 'month' | 'year'>('day')
const today = ref({ year: 0, month: 0, day: 0 })
const displayYear = ref(0)
const displayMonth = ref(0)
const selectedDay = ref<string | null>(null)

/** 按日期建索引；无效日期直接过滤 */
const postDateMap = computed<Record<string, PostSummary[]>>(() => {
  const map: Record<string, PostSummary[]> = {}
  for (const p of props.posts) {
    const key = iso(p.date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    ;(map[key] ||= []).push(p)
  }
  return map
})

const postsByMonth = computed<Record<string, PostSummary[]>>(() => {
  const map: Record<string, PostSummary[]> = {}
  for (const [key, list] of Object.entries(postDateMap.value)) {
    const monthKey = key.slice(0, 7)
    ;(map[monthKey] ||= []).push(...list)
  }
  return map
})

const availableYears = computed(() => {
  const years = new Set<number>(Object.keys(postDateMap.value).map((k) => Number(k.slice(0, 4))))
  if (today.value.year) years.add(today.value.year)
  return [...years].sort((a, b) => b - a)
})

const todayKey = computed(() =>
  ready.value ? dateKey(today.value.year, today.value.month, today.value.day) : '',
)

/** 月历网格：前置空位 + 日期格 */
const leading = computed(() =>
  ready.value ? (new Date(displayYear.value, displayMonth.value, 1).getDay() + 6) % 7 : 0,
)

const dayCells = computed(() => {
  if (!ready.value) return []
  const total = new Date(displayYear.value, displayMonth.value + 1, 0).getDate()
  const cells: Array<{
    key: string
    day: number
    count: number
    isToday: boolean
    isSelected: boolean
    aria: string
  }> = []
  for (let day = 1; day <= total; day++) {
    const key = dateKey(displayYear.value, displayMonth.value, day)
    const count = postDateMap.value[key]?.length ?? 0
    cells.push({
      key,
      day,
      count,
      isToday: key === todayKey.value,
      isSelected: key === selectedDay.value,
      aria: t(cal.dayAria, {
        year: displayYear.value,
        month: displayMonth.value + 1,
        day,
        posts: count ? t(cal.withPosts, { count }) : '',
      }),
    })
  }
  return cells
})

/** 年度热力图：12 月 × 5 周（1–7 / 8–14 / 15–21 / 22–28 / 29 日至月底） */
const heatCells = computed(() => {
  if (!ready.value) return []
  const counts = Array.from({ length: 12 }, () => [0, 0, 0, 0, 0])
  for (const [key, list] of Object.entries(postDateMap.value)) {
    if (Number(key.slice(0, 4)) !== displayYear.value) continue
    const month = Number(key.slice(5, 7)) - 1
    const week = Math.min(Math.floor((Number(key.slice(8, 10)) - 1) / 7), 4)
    counts[month]![week] += list.length
  }
  const cells: Array<{ week: number; month: number; count: number; level: number; label: string }> = []
  for (let week = 0; week < 5; week++) {
    for (let month = 0; month < 12; month++) {
      const count = counts[month]![week]!
      cells.push({
        week,
        month,
        count,
        level: Math.min(count, 4),
        label: t(cal.heatAria, {
          year: displayYear.value,
          month: month + 1,
          range: cal.weekRanges[week]!,
          count,
        }),
      })
    }
  }
  return cells
})

const activeMonths = computed(() => {
  const set = new Set<number>()
  for (const key of Object.keys(postsByMonth.value)) {
    const [y, m] = key.split('-').map(Number)
    if (y === displayYear.value) set.add(m! - 1)
  }
  return set
})

const yearsWithPosts = computed(() => {
  const set = new Set<number>()
  for (const key of Object.keys(postDateMap.value)) set.add(Number(key.slice(0, 4)))
  return set
})

/** 日视图下方文章列表：选中日 > 当月全部 */
const visiblePosts = computed(() => {
  const list = selectedDay.value
    ? postDateMap.value[selectedDay.value] ?? []
    : postsByMonth.value[`${displayYear.value}-${pad(displayMonth.value + 1)}`] ?? []
  return [...list].sort((a, b) => b.date.localeCompare(a.date))
})

const shortDate = (d: string) => {
  const [, m, day] = iso(d).split('-')
  return `${Number(m)}-${Number(day)}`
}

const titleText = computed(() => {
  if (!ready.value) return cal.titlePlaceholder
  if (view.value === 'day') return t(cal.dayTitle, { year: displayYear.value, month: cal.months[displayMonth.value] })
  if (view.value === 'month') return t(cal.monthTitle, { year: displayYear.value })
  return cal.yearTitle
})
const titleAria = computed(() =>
  view.value === 'day' ? cal.selectMonth : view.value === 'month' ? cal.selectYear : cal.backToDay,
)
const resetHidden = computed(() =>
  view.value === 'day'
    && ready.value
    && displayYear.value === today.value.year
    && displayMonth.value === today.value.month
    && selectedDay.value === null,
)

function cycleView() {
  view.value = view.value === 'day' ? 'month' : view.value === 'month' ? 'year' : 'day'
  selectedDay.value = null
}

function prevMonth() {
  displayMonth.value--
  if (displayMonth.value < 0) {
    displayMonth.value = 11
    displayYear.value--
  }
  selectedDay.value = null
}

function nextMonth() {
  displayMonth.value++
  if (displayMonth.value > 11) {
    displayMonth.value = 0
    displayYear.value++
  }
  selectedDay.value = null
}

function resetToday() {
  const d = new Date()
  today.value = { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
  displayYear.value = today.value.year
  displayMonth.value = today.value.month
  selectedDay.value = null
  view.value = 'day'
}

function toggleDay(key: string) {
  selectedDay.value = selectedDay.value === key ? null : key
}

function pickMonth(month: number) {
  displayMonth.value = month
  selectedDay.value = null
  view.value = 'day'
}

function pickYear(year: number) {
  displayYear.value = year
  selectedDay.value = null
  view.value = 'month'
}

/* 热力格悬浮提示：teleport 到 body，绕开玻璃卡的 overflow 裁剪 */
const tip = reactive({ show: false, x: 0, y: 0, text: '' })

function showTip(e: Event, text: string) {
  const el = e.currentTarget instanceof HTMLElement ? e.currentTarget : null
  if (!el) return
  const r = el.getBoundingClientRect()
  tip.x = r.left + r.width / 2
  tip.y = r.top - 6
  tip.text = text
  tip.show = true
}
function hideTip() {
  tip.show = false
}

let midnightTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  resetToday()
  ready.value = true
  midnightTimer = setInterval(() => {
    const d = new Date()
    if (d.getDate() === today.value.day) return
    resetToday()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (midnightTimer) clearInterval(midnightTimer)
})
</script>

<template>
  <SidebarCard>
    <div class="cal">
      <div class="cal-header">
        <button type="button" class="cal-title" :aria-label="titleAria" @click="cycleView">
          <span>{{ titleText }}</span>
        </button>
        <div class="cal-actions">
          <button
            type="button"
            class="cal-nav cal-nav--reset"
            :hidden="resetHidden"
            :aria-label="cal.backToToday"
            @click="resetToday"
          >
            <Icon name="tabler:rotate-2" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="cal-nav"
            :style="{ visibility: view === 'day' ? 'visible' : 'hidden' }"
            :aria-label="cal.prevMonth"
            @click="prevMonth"
          >
            <Icon name="tabler:caret-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="cal-nav"
            :style="{ visibility: view === 'day' ? 'visible' : 'hidden' }"
            :aria-label="cal.nextMonth"
            @click="nextMonth"
          >
            <Icon name="tabler:caret-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div v-if="!ready" class="cal-skeleton" aria-hidden="true" />

      <template v-else>
        <div v-show="view === 'day'" class="cal-dayview">
          <div class="cal-weekdays" aria-hidden="true">
            <span v-for="w in cal.weekdays" :key="w">{{ w }}</span>
          </div>

          <div class="cal-grid" role="grid" :aria-label="cal.gridLabel">
            <div v-for="n in leading" :key="`empty-${n}`" class="cal-day cal-day--empty" aria-hidden="true" />
            <button
              v-for="cell in dayCells"
              :key="cell.key"
              type="button"
              role="gridcell"
              class="cal-day"
              :class="{
                'cal-day--has-post': cell.count > 0,
                'cal-day--today': cell.isToday,
                'cal-day--selected': cell.isSelected,
              }"
              :aria-pressed="String(cell.isSelected)"
              :aria-label="cell.aria"
              @click="toggleDay(cell.key)"
            >
              {{ cell.day }}
              <span v-if="cell.count > 0" class="cal-dot" />
              <span v-if="cell.count > 1" class="cal-count">{{ cell.count }}</span>
            </button>
          </div>

          <div class="cal-heat">
            <div class="cal-heat-months" aria-hidden="true">
              <span v-for="i in 12" :key="i">{{ i }}</span>
            </div>
            <div class="cal-heat-grid" role="grid" :aria-label="t(cal.heatLabel, { year: displayYear })">
              <button
                v-for="c in heatCells"
                :key="`${c.week}-${c.month}`"
                type="button"
                role="gridcell"
                class="cal-heat-cell"
                :data-level="c.level"
                :aria-label="c.label"
                @click="pickMonth(c.month)"
                @mouseenter="showTip($event, c.label)"
                @mouseleave="hideTip"
                @focus="showTip($event, c.label)"
                @blur="hideTip"
              />
            </div>
          </div>

          <div v-if="visiblePosts.length" class="cal-posts">
            <div class="cal-divider" />
            <div class="cal-post-list">
              <NuxtLink v-for="p in visiblePosts" :key="p.path" :to="p.path" class="cal-post-link">
                <span class="cal-post-title">{{ p.title }}</span>
                <span class="cal-post-date">{{ shortDate(p.date) }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <div v-if="view === 'month'" class="cal-pick cal-pick--months">
          <button
            v-for="(name, m) in cal.months"
            :key="name"
            type="button"
            class="cal-pick-cell"
            :class="{ 'cal-pick-cell--current': m === displayMonth }"
            :aria-label="t(cal.pickMonthAria, { year: displayYear, month: name })"
            :aria-current="m === displayMonth ? 'date' : undefined"
            @click="pickMonth(m)"
          >
            {{ name }}
            <span v-if="activeMonths.has(m)" class="cal-dot" />
          </button>
        </div>

        <div v-if="view === 'year'" class="cal-pick cal-pick--years">
          <button
            v-for="y in availableYears"
            :key="y"
            type="button"
            class="cal-pick-cell"
            :class="{ 'cal-pick-cell--current': y === displayYear }"
            :aria-label="t(cal.pickYearAria, { year: y })"
            :aria-current="y === displayYear ? 'date' : undefined"
            @click="pickYear(y)"
          >
            {{ t(cal.monthTitle, { year: y }) }}
            <span v-if="yearsWithPosts.has(y)" class="cal-dot" />
          </button>
        </div>

        <Teleport to="body">
          <div
            v-show="tip.show"
            class="cal-tooltip"
            :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
          >
            {{ tip.text }}
          </div>
        </Teleport>
      </template>
    </div>
  </SidebarCard>
</template>

<style scoped>
.cal {
  min-width: 0;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

/* 标题：accent 竖条 + 年月，点击在 日/月/年 视图间切换 */
.cal-title {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--foreground);
  font-size: var(--fs-meta);
  font-weight: 700;
  cursor: pointer;
  transition: background var(--duration-base) var(--easing-base);
}

.cal-title::before {
  position: absolute;
  left: 0;
  width: 4px;
  height: 1rem;
  border-radius: var(--radius-full);
  background: var(--accent);
  content: '';
}

.cal-title:hover {
  background: color-mix(in srgb, var(--muted-foreground) 10%, transparent);
}

.cal-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted-foreground);
  font-size: 1rem;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    background var(--duration-base) var(--easing-base);
}

.cal-nav:hover {
  background: color-mix(in srgb, var(--muted-foreground) 10%, transparent);
  color: var(--accent);
}

.cal-nav--reset {
  color: var(--accent);
}

.cal-nav[hidden] {
  display: none;
}

/* 挂载前的占位，高度贴近日视图，避免卡片跳动 */
.cal-skeleton {
  min-height: 332px;
}

.cal-dayview {
  min-height: 332px;
}

.cal-weekdays,
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.cal-weekdays {
  margin-bottom: 0.25rem;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
}

.cal-weekdays span {
  padding: 2px 0;
}

.cal-day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 36px;
  height: 36px;
  min-width: 0;
  justify-self: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    background var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.cal-day:hover {
  background: color-mix(in srgb, var(--muted-foreground) 10%, transparent);
  color: var(--foreground);
}

.cal-day--empty {
  border: 0;
  pointer-events: none;
}

.cal-day--has-post {
  color: var(--foreground);
  font-weight: 700;
}

.cal-day--has-post:hover {
  transform: translateY(-1px);
}

.cal-day--today {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-weight: 700;
}

.cal-day--selected,
.cal-day--selected:hover {
  border-color: transparent;
  background: var(--accent);
  color: var(--background);
}

.cal-dot {
  position: absolute;
  bottom: 3px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  transform: translateX(-50%);
}

.cal-day--selected .cal-dot,
.cal-pick-cell--current .cal-dot {
  background: currentColor;
}

.cal-count {
  position: absolute;
  top: 1px;
  right: 2px;
  color: var(--accent);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.cal-day--selected .cal-count {
  color: currentColor;
}

/* ---- 年度热力图 ---- */
.cal-heat {
  width: 100%;
  max-width: 260px;
  margin: 1rem auto 0;
}

.cal-heat-months,
.cal-heat-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: 3px;
}

.cal-heat-months {
  margin-bottom: 3px;
}

.cal-heat-months span {
  color: var(--muted-foreground);
  font-size: 9px;
  line-height: 1;
  text-align: center;
}

.cal-heat-grid {
  row-gap: 3px;
}

.cal-heat-cell {
  width: 100%;
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--muted-foreground) 16%, transparent);
  border-radius: calc(var(--radius) - 0.25rem);
  background: color-mix(in srgb, var(--muted-foreground) 8%, var(--muted));
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.cal-heat-cell[data-level='1'] {
  background: color-mix(in srgb, var(--accent) 30%, var(--muted));
}

.cal-heat-cell[data-level='2'] {
  background: color-mix(in srgb, var(--accent) 50%, var(--muted));
}

.cal-heat-cell[data-level='3'] {
  background: color-mix(in srgb, var(--accent) 72%, var(--muted));
}

.cal-heat-cell[data-level='4'] {
  background: var(--accent);
}

.cal-heat-cell:hover,
.cal-heat-cell:focus-visible {
  z-index: 1;
  border-color: var(--accent);
  outline: none;
  transform: scale(1.12);
}

/* ---- 月 / 年选择器（覆盖在日视图上方） ---- */
.cal-pick {
  display: grid;
  align-content: center;
  gap: 0.5rem;
  min-height: 332px;
  padding: 0.75rem;
}

.cal-pick--months {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cal-pick--years {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cal-pick-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0.75rem 0.25rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: var(--fs-meta);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    background var(--duration-base) var(--easing-base);
}

.cal-pick-cell:hover {
  background: color-mix(in srgb, var(--muted-foreground) 10%, transparent);
  color: var(--foreground);
}

.cal-pick-cell--current {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-weight: 700;
}

.cal-pick-cell .cal-dot {
  bottom: 4px;
}

/* ---- 文章列表 ---- */
.cal-posts {
  margin-top: 0.75rem;
}

.cal-divider {
  width: 100%;
  height: 1px;
  margin-bottom: 0.5rem;
  background: var(--border);
}

.cal-post-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 150px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--muted-foreground) 50%, transparent) transparent;
}

.cal-post-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  color: var(--muted-foreground);
  font-size: var(--fs-meta);
  text-decoration: none;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    background var(--duration-base) var(--easing-base);
}

.cal-post-link:hover {
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--muted-foreground) 8%, transparent);
  color: var(--accent);
}

.cal-post-title {
  min-width: 0;
  overflow: hidden;
  color: var(--foreground);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal-post-date {
  flex-shrink: 0;
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

/* 悬浮提示：fixed + teleport，跟随热力格位置 */
.cal-tooltip {
  position: fixed;
  z-index: 999;
  padding: 4px 8px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--foreground);
  color: var(--background);
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -100%);
}

@media (prefers-reduced-motion: reduce) {
  .cal-title,
  .cal-nav,
  .cal-day,
  .cal-heat-cell,
  .cal-pick-cell,
  .cal-post-link {
    transition: none;
  }

  .cal-day--has-post:hover,
  .cal-heat-cell:hover,
  .cal-heat-cell:focus-visible {
    transform: none;
  }
}
</style>
