<script setup lang="ts">
/**
 * 链接卡片：横向布局，左侧信息，右侧图标。
 * 在文章中居中显示，宽度 20rem。
 */
const props = defineProps<{
  link: string
  title: string
  description?: string
  icon?: string
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
    class="link-card"
    target="_blank"
    rel="noreferrer"
  >
    <div class="link-card-info">
      <div class="link-card-title">{{ title }}</div>
      <div class="link-card-description">{{ displayDesc }}</div>
    </div>
    <img
      v-if="icon"
      class="link-card-icon"
      :src="icon"
      :alt="title"
      loading="lazy"
      decoding="async"
    >
  </a>
</template>

<style scoped>
.link-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5em 0.8em;
  font-size: 0.9em;
  line-height: 1.4;
  color: var(--foreground);
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  transition:
    border-color var(--duration-base) var(--easing-base);

  article & {
    width: 20rem;
    max-width: 90%;
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

.link-card-info {
  flex-grow: 1;
  overflow: hidden;
}

.link-card-title {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.link-card-description {
  overflow: hidden;
  margin-top: 0.2em;
  font-size: 0.9em;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--muted-foreground);
}

.link-card-icon {
  flex-shrink: 0;
  height: 3rem;
  max-width: 5rem;
  border-radius: 0.5rem;
  object-fit: cover;
}
</style>
