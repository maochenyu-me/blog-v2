<script setup lang="ts">
/**
 * 相关文章卡组。两个挂载点共用：
 * - 移动端/单列：挂在上下篇下方（related-inline），多列网格；
 * - 桌面端：挂在目录旁栏下方（related-aside + stacked），单列堆叠窄卡。
 */
interface RelatedItem {
  path: string
  title: string
  category?: string
  tags?: string[]
}

const props = defineProps<{
  items: RelatedItem[]
  /** 窄栏堆叠模式（目录旁栏内），单列布局 */
  stacked?: boolean
}>()

const { ui } = useUi()
</script>

<template>
  <section v-if="items.length" class="post-related" :class="{ stacked }">
    <h2 class="related-label">{{ ui.post.related }}</h2>
    <div class="related-grid">
      <NuxtLink
        v-for="rel in items"
        :key="rel.path"
        :to="rel.path"
        class="related-card"
      >
        <span class="card-kicker">
          {{ rel.tags?.length ? rel.tags.slice(0, 2).map((tag) => `#${tag}`).join(' · ') : rel.category }}
        </span>
        <span class="card-title">{{ rel.title }}</span>
        <span v-if="(rel.tags?.length ?? 0) > 2" class="card-extra">
          {{ rel.tags?.slice(2).map((tag) => `#${tag}`).join(' ') }}
        </span>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.post-related {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.related-label {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  font-weight: 400;
  color: var(--muted-foreground);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.related-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  border: 1px solid var(--border);
  transition: border-color var(--duration-base) var(--easing-base);
}

.related-card:hover {
  border-color: var(--muted-foreground);
}

.related-card:hover .card-title {
  color: var(--accent);
}

.card-kicker,
.card-extra {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title {
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  color: var(--foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.card-extra {
  margin-top: auto;
}

/* 窄栏堆叠：目录旁栏下方单列 */
.post-related.stacked .related-grid {
  grid-template-columns: 1fr;
}

/* 平板：多列网格收成两列（堆叠模式不受影响） */
@media (max-width: 1024px) {
  .post-related:not(.stacked) .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .post-related:not(.stacked) .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>
