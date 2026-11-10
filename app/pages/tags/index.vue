<script setup lang="ts">
const { ui } = useUi()
const pageCfg = usePageConfig('tags')
const posts = usePosts()

const { data } = await useAsyncData('tags', () => posts.tags())

/**
 * 字号梯度 —— 按文章数映射到 4 档。
 * 提示词 §7.5：字号随文章数梯度变化，不使用颜色区分。
 */
const sizeMap = {
  sm: '0.875rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
} as const

const scale = computed(() => {
  const list = data.value ?? []
  if (!list.length) return []
  const counts = list.map((t) => t.count)
  const max = Math.max(...counts)
  const min = Math.min(...counts)

  const steps: Array<keyof typeof sizeMap> = ['sm', 'md', 'lg', 'xl']

  return list.map((t) => {
    // 全部同频时统一用 md
    const ratio = max === min ? 0.5 : (t.count - min) / (max - min)
    const idx = Math.min(steps.length - 1, Math.floor(ratio * steps.length))
    return { ...t, size: steps[idx]!, fontSize: sizeMap[steps[idx]!] }
  })
})

useHead({ title: ui.pages.tags })
</script>

<template>
  <div class="page-tags">
    <div class="container">
      <SiteBreadcrumb />
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.tags }}</h1>
      </header>

      <ul class="cloud">
        <li v-for="tag in scale" :key="tag.name">
          <NuxtLink
            :to="`/tags/${tag.slug}`"
            class="cloud-tag"
            :style="{ fontSize: tag.fontSize }"
          >
            {{ tag.name }}<span class="cloud-count">{{ tag.count }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.page-tags {
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

.cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.75rem 1.25rem;
}

.cloud-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  line-height: 1.3;
  color: var(--foreground);
  transition: font-weight var(--duration-base) var(--easing-base);
}

.cloud-tag:hover {
  font-weight: 700;
}

.cloud-count {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
</style>
