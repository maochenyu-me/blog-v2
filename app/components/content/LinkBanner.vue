<script setup lang="ts">
/**
 * 带横幅图片的链接卡片：顶部横幅图，下方标题和描述。
 */
const props = defineProps<{
  banner?: string
  title: string
  description?: string
  link: string
}>()

/** 从 URL 提取域名作为默认描述 */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const displayDesc = computed(() => props.description ?? getDomain(props.link))
</script>

<template>
  <a
    :href="link"
    class="link-banner"
    target="_blank"
    rel="noreferrer"
  >
    <img
      v-if="banner"
      class="link-banner-bg"
      :src="banner"
      :alt="title"
      loading="lazy"
      decoding="async"
    >
    <div class="link-banner-info">
      <div class="link-banner-title">{{ title }}</div>
      <div class="link-banner-desc">{{ displayDesc }}</div>
    </div>
  </a>
</template>

<style scoped>
.link-banner {
  display: block;
  line-height: 1.4;
  color: var(--foreground);
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition:
    border-color var(--duration-base) var(--easing-base);

  article & {
    max-width: 528px;
    margin: 2rem auto;
  }

  &:hover {
    border-color: var(--accent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.link-banner-bg {
  display: block;
  width: 100%;
  aspect-ratio: 2.4;
  object-fit: cover;
  mask-image: linear-gradient(#fff 50%, transparent);
}

.link-banner-info {
  padding: 0.5em 1em;
}

.link-banner-title {
  font-size: 1.2em;
}

.link-banner-desc {
  margin-top: 0.5em;
  font-size: 0.8em;
  color: var(--muted-foreground);
}
</style>
