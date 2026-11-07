<script setup lang="ts">
/**
 * 分类筛选栏（Dusklight 风格）：轮播下方、文章列表上方的横向分类条。
 * 「全部」+ 按文章数降序的前 N 个分类；右侧可选「更多」跳转分类页。
 * 点击切换 activeCategory，由首页消费以筛选卡片流。
 */
interface CategoryBarConfig {
  maxCount: number
  showMore: boolean
}

defineProps<{
  cfg: CategoryBarConfig
  categories: Array<{ name: string; count: number; slug: string }>
  active: string
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

const { ui } = useUi()
</script>

<template>
  <nav class="cat-bar" :aria-label="ui.pages.home.categoryBar.navLabel">
    <div class="cat-bar-scroll">
      <button
        type="button"
        class="cat-chip"
        :class="{ active: active === '' }"
        :aria-pressed="active === ''"
        @click="emit('select', '')"
      >
        <Icon name="tabler:layout-grid" class="chip-icon" aria-hidden="true" />
        {{ ui.pages.home.categoryBar.all }}
      </button>

      <button
        v-for="c in categories.slice(0, cfg.maxCount)"
        :key="c.slug"
        type="button"
        class="cat-chip"
        :class="{ active: active === c.name }"
        :aria-pressed="active === c.name"
        @click="emit('select', c.name)"
      >
        <Icon name="tabler:folder" class="chip-icon" aria-hidden="true" />
        {{ c.name }}
      </button>
    </div>

    <NuxtLink v-if="cfg.showMore" to="/categories" class="cat-more">
      {{ ui.pages.home.categoryBar.more }}
      <Icon name="tabler:chevron-right" class="more-icon" aria-hidden="true" />
    </NuxtLink>
  </nav>
</template>

<style scoped>
.cat-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: calc(var(--radius) + 0.25rem);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  padding: 0.5rem 0.75rem;
}

.cat-bar-scroll {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.cat-bar-scroll::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  height: 2rem;
  padding-inline: 0.75rem;
  border-radius: calc(var(--radius) - 0.125rem);
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted-foreground);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    background var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.cat-chip:hover {
  color: var(--foreground);
}

.cat-chip.active {
  color: var(--background);
  background: var(--accent);
  border-color: var(--accent);
}

.chip-icon {
  font-size: 0.9375rem;
}

.cat-more {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  padding-inline: 0.25rem;
  transition: color var(--duration-base) var(--easing-base);
}

.cat-more:hover {
  color: var(--accent);
}

.more-icon {
  font-size: 0.875em;
}
</style>
