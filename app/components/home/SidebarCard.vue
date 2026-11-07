<script setup lang="ts">
/**
 * 侧栏玻璃卡片骨架：统一的容器质感，标题可带 tabler 图标。
 * 所有侧栏模块经它包装，保证视觉一致、增删自由。
 */
defineProps<{
  /** 模块标题（空字符串则不渲染标题行） */
  title?: string
  /** 标题前的 tabler 图标名 */
  icon?: string
}>()
</script>

<template>
  <section class="glass-card">
    <header v-if="title" class="glass-head">
      <Icon v-if="icon" :name="icon" class="glass-icon" aria-hidden="true" />
      <h2 class="glass-title">{{ title }}</h2>
    </header>
    <div class="glass-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.glass-card {
  border-radius: calc(var(--radius) + 0.25rem);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  /* 玻璃质感：半透明底 + 背景模糊；颜色全部从 token 派生，明暗自动跟随 */
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    0 8px 24px color-mix(in srgb, var(--foreground) 6%, transparent);
  overflow: hidden;
}

.glass-head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.875rem 1rem 0;
}

.glass-icon {
  font-size: 1rem;
  color: var(--accent);
}

.glass-title {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  font-weight: 700;
  margin: 0;
  color: var(--foreground);
}

.glass-body {
  padding: 0.75rem 1rem 1rem;
}
</style>
