<script setup lang="ts">
import { getRelativeDateParts } from '~/utils/siteStats'

interface StatsConfig {
  showPostCount: boolean
  showWordCount: boolean
  showVisitorCount: boolean
  showViewCount: boolean
  showLatestUpdate: boolean
}

const props = defineProps<{
  cfg: StatsConfig
  postCount: number
  wordCount: number
  visitorCount: string | null
  viewCount: string | null
  latestUpdate: string | null
}>()

const { ui, t } = useUi()
const now = ref<number | null>(null)
onMounted(() => { now.value = Date.now() })

const relativeUpdate = computed(() => {
  if (!props.latestUpdate || now.value === null) return null
  return getRelativeDateParts(props.latestUpdate, now.value)
})

const timeText = computed(() => {
  if (!relativeUpdate.value) return ''
  const parts = relativeUpdate.value
  if (parts.key === 'today') return ui.pages.home.sidebar.relativeToday
  const template = parts.key === 'days'
    ? ui.pages.home.sidebar.relativeDays
    : parts.key === 'months'
      ? ui.pages.home.sidebar.relativeMonths
      : ui.pages.home.sidebar.relativeYears
  return t(template, { n: parts.amount })
})

const items = computed(() => {
  const list: Array<{ key: string; label: string; value: string; clientOnly?: boolean }> = []
  if (props.cfg.showPostCount) list.push({ key: 'posts', label: ui.pages.home.sidebar.postCount, value: props.postCount.toLocaleString('zh-CN') })
  if (props.cfg.showWordCount) list.push({ key: 'words', label: ui.pages.home.sidebar.wordCount, value: props.wordCount.toLocaleString('zh-CN') })
  if (props.cfg.showVisitorCount) list.push({ key: 'visitors', label: ui.pages.home.sidebar.visitorCount, value: props.visitorCount ?? '', clientOnly: true })
  if (props.cfg.showViewCount) list.push({ key: 'views', label: ui.pages.home.sidebar.viewCount, value: props.viewCount ?? '', clientOnly: true })
  if (props.cfg.showLatestUpdate) list.push({ key: 'updated', label: ui.pages.home.sidebar.latestUpdate, value: timeText.value, clientOnly: true })
  return list
})
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.stats" icon="tabler:chart-bar">
    <dl class="stats">
      <div v-for="item in items" :key="item.key" class="stat">
        <dt class="stat-label">{{ item.label }}</dt>
        <dd class="stat-value">
          <ClientOnly v-if="item.clientOnly">
            {{ item.value || '—' }}
            <template #fallback>
              <span aria-hidden="true">—</span>
            </template>
          </ClientOnly>
          <template v-else>{{ item.value }}</template>
        </dd>
      </div>
    </dl>
  </SidebarCard>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
}

.stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 2.75rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--border) 75%, transparent);
}

.stat:last-child {
  border-bottom: 0;
}

.stat-label,
.stat-value {
  margin: 0;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
}

.stat-label {
  color: var(--muted-foreground);
}

.stat-value {
  flex: 0 0 auto;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: clamp(var(--fs-meta), 4vw, 1rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

@media (max-width: 600px) {
  .stat {
    min-height: 2.625rem;
    gap: 0.75rem;
  }
}
</style>
