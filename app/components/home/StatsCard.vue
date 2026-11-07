<script setup lang="ts">
/**
 * 侧栏站点统计：运行天数 / 文章数 / 分类数 / 标签数。
 * 运行天数依赖客户端时钟，用 <ClientOnly> 包裹避免 SSG 预渲染与水合结果不一致。
 * 各项计数可经 sidebar.stats 单独开关。
 */
interface StatsConfig {
  siteStartDate: string
  showRunDays: boolean
  showPostCount: boolean
  showCategoryCount: boolean
  showTagCount: boolean
}

const props = defineProps<{
  cfg: StatsConfig
  postCount: number
  categoryCount: number
  tagCount: number
}>()

const { ui, t } = useUi()

const runDays = ref<number | null>(null)

onMounted(() => {
  const start = new Date(props.cfg.siteStartDate).getTime()
  if (Number.isNaN(start)) {
    runDays.value = null
    return
  }
  const diff = Date.now() - start
  runDays.value = Math.max(0, Math.floor(diff / 86_400_000))
})

const items = computed(() => {
  const list: Array<{ key: string; label: string; value: string }> = []
  if (props.cfg.showRunDays && runDays.value !== null) {
    list.push({
      key: 'run',
      label: ui.pages.home.sidebar.runDays,
      value: `${runDays.value}${ui.pages.home.sidebar.runDaysUnit}`,
    })
  }
  if (props.cfg.showPostCount) {
    list.push({ key: 'posts', label: ui.pages.home.sidebar.postCount, value: String(props.postCount) })
  }
  if (props.cfg.showCategoryCount) {
    list.push({ key: 'cats', label: ui.pages.home.sidebar.categoryCount, value: String(props.categoryCount) })
  }
  if (props.cfg.showTagCount) {
    list.push({ key: 'tags', label: ui.pages.home.sidebar.tagCount, value: String(props.tagCount) })
  }
  return list
})
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.stats" icon="tabler:chart-bar">
    <dl class="stats">
      <div v-for="item in items" :key="item.key" class="stat">
        <dd class="stat-value">{{ item.value }}</dd>
        <dt class="stat-label">{{ item.label }}</dt>
      </div>
    </dl>
  </SidebarCard>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem 0.5rem;
  margin: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  margin: 0;
}

.stat-label {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}
</style>
