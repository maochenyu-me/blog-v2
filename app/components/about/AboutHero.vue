<script setup lang="ts">
import type { AuthorTag } from '~/data/about'

defineProps<{
  avatar: string
  name: string
  authorTags: AuthorTag[]
}>()
</script>

<template>
  <div class="about-hero">
    <div class="hero-tags hero-tags--left" aria-hidden="true">
      <span
        v-for="(tag, i) in authorTags"
        :key="`l${i}`"
        class="hero-tag"
        :style="{ animationDelay: `${i * 0.6}s` }"
      >{{ tag.left }}</span>
    </div>

    <img class="hero-avatar" :src="avatar" :alt="name" width="150" height="150" />

    <div class="hero-tags hero-tags--right" aria-hidden="true">
      <span
        v-for="(tag, i) in authorTags"
        :key="`r${i}`"
        class="hero-tag"
        :style="{ animationDelay: `${i * 0.6}s` }"
      >{{ tag.right }}</span>
    </div>
  </div>
</template>

<style scoped>
.about-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-block);
}

.hero-tags {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-tags--left { align-items: flex-end; }
.hero-tags--right { align-items: flex-start; }

.hero-tag {
  box-sizing: border-box;
  width: 142px;
  padding: 2px 10px;
  text-align: center;
  white-space: nowrap;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--muted-foreground);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: var(--radius-base);
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  animation: hero-float 6s ease-in-out infinite;
}

.hero-tags--left .hero-tag { transform: translate(0, -4px); }
.hero-tags--right .hero-tag { transform: translate(0, 4px); }

@keyframes hero-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
}

.hero-avatar {
  flex-shrink: 0;
  width: 150px;
  height: 150px;
  margin-inline: var(--space-item);
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  transition: transform var(--duration-slow) var(--ease-base);
}

.hero-avatar:hover { transform: scale(1.08); }

@media (max-width: 768px) {
  .hero-tags { display: none; }
  .hero-avatar { width: 120px; height: 120px; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-tag { animation: none; }
}
</style>
