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
    <!-- 文案整体收进 .mbti-body：右侧留出立绘通道，链接回到正常流里，
         长文案换行也不会被立绘或绝对定位的链接压住。 -->
    <div class="mbti-body">
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
    </div>
    <img v-if="image" class="mbti-figure" :src="image" :alt="`${title} ${mbti}`" loading="lazy" />
  </AboutCard>
</template>

<style scoped>
.mbti-card {
  display: block;
  min-height: 220px;
  isolation: isolate;
}

/* 桌面端把文案压在左侧 ~2/3，给立绘留通道。立绘按卡高定尺寸，
   11rem 的预留比「卡高 × 76%」再宽一档，长文案加高卡片也不会贴上去。 */
.mbti-body {
  position: relative;
  z-index: 2;
  max-width: calc(100% - 11rem);
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
  font-size: var(--fs-meta);
  line-height: 1.65;
  color: var(--muted-foreground);
}

/* 链接回到正常流：文案再长也只是把卡片撑高，不会再和正文叠在一起 */
.mbti-link {
  display: inline-block;
  margin-top: 0.75rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}

.mbti-link:hover { text-decoration: underline; }

/* 立绘按卡片高度定尺寸（占 3/4 以上），并给宽度兜底：
   max-width + object-fit: contain 让超宽时等比缩小、贴右下角，
   不会横向压进文案区。 */
.mbti-figure {
  position: absolute;
  right: var(--space-item);
  bottom: 0;
  width: auto;
  height: 76%;
  max-width: 46%;
  object-fit: contain;
  object-position: 100% 100%;
  transform-origin: 60% 100%;
  transition: transform 2s cubic-bezier(0.13, 0.45, 0.21, 1.02);
  z-index: 1;
  filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--foreground) 15%, transparent));
}

.mbti-card:hover .mbti-figure {
  transform: rotate(-10deg) scale(0.92) translateY(-28px);
}

@media (max-width: 768px) {
  /* 窄屏不再固定卡高：高度交给内容，立绘跟着收窄，文案靠右内边距避开 */
  .mbti-card { min-height: 0; }

  .mbti-body {
    max-width: 100%;
    padding-right: 46%;
  }

  .mbti-figure {
    height: 58%;
    max-width: 42%;
    right: -0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mbti-figure { transition: none; }
  .mbti-card:hover .mbti-figure { transform: none; }
}
</style>
