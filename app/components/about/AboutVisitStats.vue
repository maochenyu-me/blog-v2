<script setup lang="ts">
import type { VisitStatsData } from '~/data/about'

/**
 * 访问统计卡：apiUrl 为空时展示 placeholder 占位数据，
 * 接入统计服务后由页面传入实时数据替换。
 */
defineProps<{
  tips: string
  title: string
  data: VisitStatsData
  labels: Record<keyof VisitStatsData, string>
}>()

const rows = (d: VisitStatsData, l: Record<keyof VisitStatsData, string>) => [
  { label: l.todayUv, value: d.todayUv },
  { label: l.todayPv, value: d.todayPv },
  { label: l.yesterdayUv, value: d.yesterdayUv },
  { label: l.yesterdayPv, value: d.yesterdayPv },
  { label: l.lastMonthPv, value: d.lastMonthPv },
  { label: l.totalPv, value: d.totalPv },
]
</script>

<template>
  <AboutCard class="stats-card">
    <p class="stats-tips">{{ tips }}</p>
    <p class="stats-title">{{ title }}</p>
    <dl class="stats-grid">
      <div v-for="row in rows(data, labels)" :key="row.label">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
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

@media (max-width: 480px) {
  .stats-grid { column-gap: var(--space-item); }
  .stats-grid dd { font-size: calc(var(--fs-h1) * 0.75); }
}
</style>
