<script setup lang="ts">
/**
 * 发文热力图：GitHub 贡献图式样的文章发布日历，替代文章列表底部的 CTA 行。
 * 数据为构建期算好的逐日色阶（payload 序列化），渲染无时间依赖，无水合不一致。
 * SVG 按 viewBox 等比缩放铺满卡片宽度；窄屏退化为横向滚动，滚动容器最小宽兜底。
 */
import type { HeatData } from '~/utils/heatmap'

const props = defineProps<{
  heat: HeatData
  /** 「查看全部」链接（沿用 home.cta 配置） */
  more: { label: string; to: string }
}>()

const { ui, t } = useUi()

const h = ui.pages.home.heatmap
const months = ui.pages.home.calendar.months
const { site } = useBlogConfig()

const CELL = 10
const GAP = 3
const STEP = CELL + GAP
const LABEL_W = 26
const LABEL_H = 16

const totalCols = computed(() =>
  Math.ceil((props.heat.leadingBlanks + props.heat.days.length) / 7),
)
const viewBox = computed(
  () => `0 0 ${LABEL_W + totalCols.value * STEP} ${LABEL_H + 7 * STEP}`,
)

/** 汇总文案按 {n} 占位符拆成前后两段，数字单独加粗高亮 */
const summaryParts = computed(() => h.summary.split('{n}'))

interface MonthLabel {
  label: string
  column: number
}
/** 月份标签：标注每个月首次出现的列；残缺首月与过近的相邻月份跳过（与 GitHub 一致） */
const monthLabels = computed<MonthLabel[]>(() => {
  const labels: MonthLabel[] = []
  let lastMonth = -1
  let lastColumn = Number.NEGATIVE_INFINITY
  props.heat.days.forEach((day, index) => {
    const d = new Date(`${day.date}T00:00:00Z`)
    const month = d.getUTCMonth()
    if (month === lastMonth) return
    lastMonth = month
    if (index === 0 && d.getUTCDate() !== 1) return
    const column = Math.floor((props.heat.leadingBlanks + index) / 7)
    if (column - lastColumn < 2) return
    lastColumn = column
    labels.push({ label: months[month] ?? '', column })
  })
  return labels
})

interface Cell {
  x: number
  y: number
  date: string
  level: number
  tip: string
}
const cells = computed<Cell[]>(() =>
  props.heat.days.map((day, index) => {
    const column = Math.floor((props.heat.leadingBlanks + index) / 7)
    const row = (props.heat.leadingBlanks + index) % 7
    return {
      x: LABEL_W + column * STEP,
      y: LABEL_H + row * STEP,
      date: day.date,
      level: day.level,
      tip: day.count > 0 ? t(h.dayTooltip, { date: day.date, n: day.count }) : t(h.dayEmpty, { date: day.date }),
    }
  }),
)

const weekdayRows = computed(() =>
  h.weekdays
    .map((label, row) => ({ label, row }))
    .filter((r) => r.label !== ''),
)
</script>

<template>
  <SidebarCard>
    <div class="heat" role="img" :aria-label="h.regionLabel">
      <!-- 头部：头像 + 站名 + 汇总 + 查看全部 -->
      <header class="heat-head">
        <img class="heat-avatar" :src="site.author.avatar" :alt="t(ui.pages.home.sidebar.profileAlt, { name: site.author.name })" width="40" height="40" loading="lazy" decoding="async" />
        <div class="heat-head-text">
          <span class="heat-name">{{ site.author.name }}</span>
          <span class="heat-summary">{{ summaryParts[0] }}<strong class="heat-num">{{ heat.total }}</strong>{{ summaryParts[1] }}</span>
        </div>
        <NuxtLink :to="more.to" class="heat-more">{{ more.label }}</NuxtLink>
      </header>

      <div class="heat-scroll">
        <svg class="heat-svg" :viewBox="viewBox" preserveAspectRatio="xMinYMin meet">
          <text v-for="m in monthLabels" :key="`m-${m.column}`" class="heat-label" :x="LABEL_W + m.column * STEP" y="11">{{ m.label }}</text>
          <text v-for="w in weekdayRows" :key="`w-${w.row}`" class="heat-label" text-anchor="end" :x="LABEL_W - 6" :y="LABEL_H + w.row * STEP + 9">{{ w.label }}</text>
          <rect
            v-for="(c, i) in cells"
            :key="i"
            class="heat-cell" :class="`heat-l${c.level}`"
            :x="c.x" :y="c.y" :width="CELL" :height="CELL" rx="2"
          >
            <title>{{ c.tip }}</title>
          </rect>
        </svg>
      </div>

      <footer class="heat-legend">
        <span>Less</span>
        <span v-for="lv in 5" :key="lv" class="heat-cell" :class="`heat-l${lv - 1}`"></span>
        <span>More</span>
      </footer>
    </div>
  </SidebarCard>
</template>

<style scoped>
.heat {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.heat-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.heat-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.heat-head-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.heat-name {
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--foreground);
}

.heat-summary {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}

.heat-num {
  color: var(--accent);
  font-weight: 700;
  margin-inline: 0.125rem;
}

.heat-more {
  flex-shrink: 0;
  font-size: var(--fs-meta);
  color: var(--accent);
  transition: opacity var(--duration-base) var(--easing-base);
}

.heat-more:hover {
  opacity: 0.8;
}

.heat-scroll {
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.heat-scroll::-webkit-scrollbar {
  display: none;
}

.heat-svg {
  display: block;
  width: 100%;
  height: auto;
  min-width: 640px;
}

.heat-cell {
  fill: color-mix(in srgb, var(--foreground) 7%, transparent);
  transition: opacity var(--duration-base) var(--easing-base);
}

.heat-l1 { fill: color-mix(in srgb, var(--accent) 25%, var(--background)); }
.heat-l2 { fill: color-mix(in srgb, var(--accent) 45%, var(--background)); }
.heat-l3 { fill: color-mix(in srgb, var(--accent) 70%, var(--background)); }
.heat-l4 { fill: var(--accent); }

.heat-cell:hover {
  opacity: 0.75;
}

.heat-label {
  font-size: 10px;
  fill: var(--muted-foreground);
}

.heat-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  font-size: 10px;
  color: var(--muted-foreground);
}

.heat-legend .heat-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

@media (prefers-reduced-motion: reduce) {
  .heat-cell,
  .heat-more {
    transition: none;
  }
}
</style>
