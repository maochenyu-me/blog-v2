<script setup lang="ts">
import type { VisitStatsData } from '~/data/about'

/**
 * 访问统计卡：数据全部来自自建 Umami（见 useUmamiStats）。
 * 拉取中或失败时 data 为 null，各指标显示占位符——不展示任何假数据。
 */
const props = defineProps<{
  tips: string
  title: string
  data: VisitStatsData | null
  labels: Record<keyof VisitStatsData, string>
}>()

/** 拉取中/失败时的占位符 */
const DASH = '—'

const rows = computed(() => {
  const d = props.data
  const l = props.labels
  return [
    { label: l.todayUv, value: d?.todayUv ?? DASH },
    { label: l.todayPv, value: d?.todayPv ?? DASH },
    { label: l.yesterdayUv, value: d?.yesterdayUv ?? DASH },
    { label: l.yesterdayPv, value: d?.yesterdayPv ?? DASH },
    { label: l.totalUv, value: d?.totalUv ?? DASH },
    { label: l.totalPv, value: d?.totalPv ?? DASH },
    // 最近月访问口径与上面几项不同（滚动 30 天），单独占满一行作区分
    { label: l.lastMonthPv, value: d?.lastMonthPv ?? DASH, wide: true },
  ]
})
</script>

<template>
  <AboutCard class="stats-card">
    <p class="stats-tips">{{ tips }}</p>
    <p class="stats-title">{{ title }}</p>
    <dl class="stats-grid" :aria-busy="!data">
      <div v-for="row in rows" :key="row.label" :class="{ 'is-wide': row.wide }">
        <dt>{{ row.label }}</dt>
        <dd :class="{ 'is-pending': !data }">{{ row.value }}</dd>
      </div>
    </dl>
  </AboutCard>
</template>

<style scoped>
.stats-tips {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.stats-title {
  margin-top: 0.375rem;
  font-size: calc(var(--fs-h1) * 1.15);
  font-weight: 700;
  line-height: 1.1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-item) var(--space-block);
  margin: 1.25rem 0 0;
}

.stats-grid div { min-width: 0; }

/* 口径不同的指标（滚动 30 天）整行铺开，与「今日/昨日/累计」分组区隔 */
.stats-grid div.is-wide { grid-column: 1 / -1; }

.stats-grid dt {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.stats-grid dd {
  margin: 0.25rem 0 0;
  font-size: calc(var(--fs-h1) * 0.86);
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

/* 拉取中/失败：占位符弱化，避免被误读成真实数字 */
.stats-grid dd.is-pending {
  color: var(--muted-foreground);
  opacity: 0.65;
}

@media (max-width: 480px) {
  .stats-grid { column-gap: var(--space-item); }
  .stats-grid dd { font-size: calc(var(--fs-h1) * 0.75); }
}
</style>
