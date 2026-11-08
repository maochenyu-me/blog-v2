<script setup lang="ts">
defineProps<{
  tips: string
  title: string
  mbti: string
  desc: string
  link: { label: string; url: string }
  image?: string
}>()
</script>

<template>
  <AboutCard class="mbti-card">
    <p class="mbti-tips">{{ tips }}</p>
    <p class="mbti-name">{{ title }}</p>
    <p class="mbti-code">{{ mbti }}</p>
    <p class="mbti-desc">{{ desc }}</p>
    <a
      class="mbti-link"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
    >{{ link.label }}</a>
    <img v-if="image" class="mbti-figure" :src="image" :alt="`${title} ${mbti}`" loading="lazy" />
  </AboutCard>
</template>

<style scoped>
.mbti-card {
  display: block;
  min-height: 220px;
  isolation: isolate;
}

.mbti-tips {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.mbti-name {
  margin-top: 0.375rem;
  font-size: calc(var(--fs-h1) * 1.15);
  font-weight: 700;
  line-height: 1.1;
}

.mbti-code {
  margin-top: 0.25rem;
  font-size: calc(var(--fs-h1) * 1.05);
  font-weight: 700;
  line-height: 1.1;
  color: var(--accent);
}

.mbti-desc {
  margin-top: 0.625rem;
  max-width: 52%;
  font-size: var(--fs-meta);
  line-height: 1.65;
  color: var(--muted-foreground);
}

.mbti-link {
  position: absolute;
  left: var(--space-item);
  bottom: var(--space-item);
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}

.mbti-link:hover { text-decoration: underline; }

.mbti-figure {
  position: absolute;
  right: var(--space-item);
  bottom: -96px;
  width: 240px;
  transform-origin: 60% 100%;
  transition: transform 2s cubic-bezier(0.13, 0.45, 0.21, 1.02);
  z-index: 1;
  filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--foreground) 15%, transparent));
}

.mbti-card:hover .mbti-figure {
  transform: rotate(-10deg) scale(0.92) translateY(-28px);
}

@media (max-width: 768px) {
  .mbti-desc { max-width: 62%; }
  .mbti-figure { width: 180px; right: -1rem; bottom: -72px; }
}

@media (prefers-reduced-motion: reduce) {
  .mbti-figure { transition: none; }
  .mbti-card:hover .mbti-figure { transform: none; }
}
</style>
