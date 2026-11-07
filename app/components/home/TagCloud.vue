<script setup lang="ts">
/**
 * 侧栏标签云：按文章数调节字号档位，最多 maxCount 个。
 */
interface TagsConfig {
  maxCount: number
}

const props = defineProps<{
  cfg: TagsConfig
  tags: Array<{ name: string; count: number; slug: string }>
}>()

const { ui } = useUi()

const maxCount = computed(() => Math.max(1, ...props.tags.slice(0, props.cfg.maxCount).map((t) => t.count)))

function sizeClass(count: number): string {
  const ratio = count / maxCount.value
  if (ratio >= 0.75) return 'size-xl'
  if (ratio >= 0.5) return 'size-lg'
  if (ratio >= 0.25) return 'size-md'
  return 'size-sm'
}
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.tags" icon="tabler:tag">
    <div v-if="tags.length" class="cloud">
      <NuxtLink
        v-for="tag in tags.slice(0, cfg.maxCount)"
        :key="tag.slug"
        :to="`/tags/${tag.slug}`"
        class="cloud-tag"
        :class="sizeClass(tag.count)"
      >
        {{ tag.name }}
        <sup class="tag-count">{{ tag.count }}</sup>
      </NuxtLink>
    </div>
  </SidebarCard>
</template>

<style scoped>
.cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.625rem;
}

.cloud-tag {
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.cloud-tag:hover {
  color: var(--accent);
}

.size-sm {
  font-size: 0.75rem;
}

.size-md {
  font-size: 0.875rem;
}

.size-lg {
  font-size: 1rem;
}

.size-xl {
  font-size: 1.125rem;
  font-weight: 700;
}

.tag-count {
  font-size: 0.625rem;
  color: var(--accent);
  margin-left: 0.0625rem;
}
</style>
