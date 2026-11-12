<script setup lang="ts">
import type { FavoriteItem } from '~/data/about'

/**
 * 斜切封面墙：列按 clip-path 斜切拼接，hover 展开。
 * item.image 留空时渲染纯色占位块 + 名称。
 */
const props = defineProps<{
  tips: string
  title: string
  items: FavoriteItem[]
}>()
</script>

<template>
  <section class="wall-card">
    <header class="wall-head">
      <p class="wall-tips">{{ tips }}</p>
      <p class="wall-title">{{ title }}</p>
    </header>

    <div class="wall-box">
      <div
        v-for="(item, i) in items"
        :key="item.name"
        class="wall-item"
        :class="{ 'wall-item--landscape': item.landscape }"
        :title="item.name"
      >
        <img
          v-if="item.image"
          :src="item.image"
          :alt="item.name"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="wall-placeholder" :class="`wall-placeholder--${i % 3}`">
          {{ item.name }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 卡片壳（padding 0，封面墙铺满）：与 AboutCard 同源，等高靠行内 stretch */
.wall-card {
  position: relative;
  min-width: 0;
  box-sizing: border-box;
  min-height: 240px;
  border-radius: calc(var(--radius) + 0.25rem);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--foreground) 4%, transparent),
    0 8px 24px color-mix(in srgb, var(--foreground) 6%, transparent);
  overflow: hidden;
  isolation: isolate;
}

.wall-head {
  position: absolute;
  top: var(--space-item);
  left: var(--space-item);
  z-index: 3;
  pointer-events: none;
  padding: 0.5rem 0.75rem;
  border-radius: calc(var(--radius) + 0.125rem);
  background: color-mix(in srgb, var(--card) 72%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.wall-tips {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.wall-title {
  margin-top: 0.25rem;
  font-size: calc(var(--fs-h1) * 1.15);
  font-weight: 700;
  line-height: 1.1;
}

.wall-box {
  position: absolute;
  inset: 0 -6%;
  z-index: 1;
  display: flex;
  overflow: hidden;
}

.wall-item {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
  margin-inline: -1px;
  clip-path: polygon(12% 0, 100% 0, 88% 100%, 0 100%);
  transition: flex-grow 0.8s var(--ease-base);
}

.wall-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.08);
  transition: transform 0.8s var(--ease-base);
  max-width: none;
  border-radius: 0;
}

.wall-item--landscape img { transform: scale(1.34); }

/* 无图占位：accent 微色三档交替 */
.wall-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--muted-foreground);
  overflow-wrap: anywhere;
}

.wall-placeholder--0 { background: color-mix(in srgb, var(--accent) 10%, var(--muted)); }
.wall-placeholder--1 { background: color-mix(in srgb, var(--accent) 5%, var(--muted)); }
.wall-placeholder--2 { background: var(--muted); }

@media (hover: hover) and (pointer: fine) {
  .wall-box:hover .wall-item { flex-grow: 0.75; }
  .wall-box .wall-item:hover { flex-grow: 2.4; }
  .wall-item:hover img { transform: scale(1.16); }
  .wall-item--landscape:hover img { transform: scale(1.44); }
}

@media (max-width: 768px) {
  .wall-card { min-height: 200px; }
}

@media (prefers-reduced-motion: reduce) {
  .wall-item,
  .wall-item img { transition: none; }
}
</style>
