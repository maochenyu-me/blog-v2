<script setup lang="ts">
/**
 * 顶栏搜索入口（提示词 §11.3 触发方式之一）。
 *
 * 三处入口共享同一个开关状态 useState('search-open')：
 *   1. 本组件（顶栏按钮）
 *   2. 全局快捷键（在 SearchDialog 内绑定）
 *   3. 移动端底栏搜索按钮（MobileTabBar emit 'search'，由 Lead 接线）
 * 因此这里只负责「把 isOpen 置为 true」，不持有自己的弹窗。
 *
 * search.enabled === false 时整块不渲染（§11.6）。
 */
const { enabled, open, prefetch, shortcutLabel } = useSearch()
const { ui, t } = useUi()
</script>

<template>
  <button
    v-if="enabled"
    type="button"
    class="search-trigger"
    :aria-label="ui.search.trigger"
    :title="t(ui.search.triggerTitle, { shortcut: shortcutLabel })"
    @click="open()"
    @mouseenter="prefetch()"
    @focus="prefetch()"
  >
    <Icon name="tabler:search" class="search-icon" aria-hidden="true" />
    <kbd class="search-kbd" aria-hidden="true">{{ shortcutLabel }}</kbd>
  </button>
</template>

<style scoped>
.search-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2rem;
  padding-inline: 0.375rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.search-trigger:hover {
  color: var(--foreground);
  background-color: var(--muted);
}

.search-icon {
  font-size: 1.125rem;
}

/* 快捷键提示：等宽 + muted，属于「元信息」，不抢视觉 */
.search-kbd {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1;
  color: var(--muted-foreground);
  padding: 0.25rem 0.3125rem;
  border: 1px solid var(--border);
  border-radius: 3px;
}

/* 触屏 / 窄屏：隐藏键帽提示，按钮收敛成纯图标 */
@media (max-width: 767px) {
  .search-kbd {
    display: none;
  }
}

@media (hover: none) {
  .search-kbd {
    display: none;
  }
}
</style>
