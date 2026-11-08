<template>
  <section class="about-card">
    <slot />
  </section>
</template>

<style scoped>
/* 与 SidebarCard 同源的卡片壳：半透明 muted 底 + 轻模糊 + 极轻阴影。
   不写 height —— 同行等高交给 .about-row 的 align-items: stretch。 */
.about-card {
  position: relative;
  min-width: 0;
  box-sizing: border-box;
  padding: var(--space-item);
  border-radius: calc(var(--radius) + 0.25rem);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    0 8px 24px color-mix(in srgb, var(--foreground) 6%, transparent);
  overflow: hidden;
}

@media (max-width: 480px) {
  .about-card {
    padding: 1rem;
  }
}
</style>
