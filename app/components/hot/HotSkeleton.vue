<script setup lang="ts">
/**
 * 热搜骨架屏：shimmer 动画占位。
 * featured 布局下首条占满整行且更高，与真实卡片形态一致，避免加载后跳动。
 */
const props = withDefaults(
  defineProps<{
    count?: number
    featured?: boolean
  }>(),
  { count: 12, featured: true },
)
</script>

<template>
  <ul class="hot-skeleton" :class="{ 'is-featured': featured }" aria-hidden="true">
    <li
      v-for="n in props.count"
      :key="n"
      class="skel"
      :class="{ 'is-lead': featured && n === 1 }"
      :style="{ animationDelay: `${(n % 6) * 80}ms` }"
    />
  </ul>
</template>

<style scoped>
.hot-skeleton {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 768px) {
  .hot-skeleton {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.skel {
  min-height: 8.125rem;
  border-radius: calc(var(--radius) * 2);
  background: linear-gradient(
    110deg,
    var(--muted) 30%,
    color-mix(in srgb, var(--muted) 70%, var(--foreground)) 50%,
    var(--muted) 70%
  );
  background-size: 200% 100%;
  animation: hot-shimmer 1.5s infinite ease-in-out;
}

.skel.is-lead {
  grid-column: 1 / -1;
  min-height: 12.5rem;
}

@keyframes hot-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skel {
    animation: none;
  }
}
</style>
