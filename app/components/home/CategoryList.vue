<script setup lang="ts">
/**
 * 侧栏分类列表：分类名 + 文章计数，最多 maxCount 条。
 */
interface CategoriesConfig {
  maxCount: number
}

defineProps<{
  cfg: CategoriesConfig
  categories: Array<{ name: string; count: number; slug: string }>
}>()

const { ui, t } = useUi()
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.categories" icon="tabler:folder">
    <ul v-if="categories.length" class="cat-list">
      <li v-for="c in categories.slice(0, cfg.maxCount)" :key="c.slug" class="cat-row">
        <NuxtLink :to="`/categories/${c.slug}`" class="cat-link">
          <span class="cat-name">{{ c.name }}</span>
          <span class="cat-count">{{ t(ui.common.count, { n: c.count }) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p v-else class="cat-empty">{{ ui.pages.home.sidebar.viewAll }}</p>
  </SidebarCard>
</template>

<style scoped>
.cat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.cat-row + .cat-row {
  border-top: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
}

.cat-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4375rem 0.125rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  transition: color var(--duration-base) var(--easing-base);
}

.cat-link:hover .cat-name {
  color: var(--accent);
}

.cat-name {
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-base) var(--easing-base);
}

.cat-count {
  flex: none;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.cat-empty {
  margin: 0;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}
</style>
