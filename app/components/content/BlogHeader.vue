<script setup lang="ts">
/**
 * BlogHeader —— 卡片式居中头部，标题逐字 hover 弹出 emoji 动画。
 * 参考 blog-v3 的 BlogHeader.global.vue，适配 blog-v2 的 token 体系。
 *
 * 标题逐字拆分，hover 时每个字符弹出对应 emoji（猫鱼系），
 * emoji 列表在 data 里配置。
 */
const { site } = useBlogConfig()

/** 每个字符对应的 hover emoji（猫鱼系主题） */
const emojiMap: string[] = ['🐱', '🐟', '🐾', '🎣', '🐈']

function getEmoji(charIndex: number): string {
  return emojiMap[charIndex % emojiMap.length]
}

const titleChars = computed(() => site.name.split(''))
</script>

<template>
  <NuxtLink to="/" class="blog-header">
    <img
      src="/images/avatar.jpg"
      class="blog-avatar"
      :alt="site.name"
    />

    <div class="blog-text">
      <h1 class="header-title">
        <span
          v-for="(char, idx) in titleChars"
          :key="idx"
          class="split-char"
        >
          {{ char }}
          <span class="hover-emoji" :style="{ animationDelay: `${idx * 0.1}s` }">
            {{ getEmoji(idx) }}
          </span>
        </span>
      </h1>
      <div class="header-subtitle">{{ site.description }}</div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.blog-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: clamp(1rem, 2rem, 5vh) auto;
  padding: 1.25rem 1.5rem;
  max-width: 24rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  text-decoration: none;
  color: var(--foreground);
  transition: border-color var(--duration-base) var(--easing-base);
}

.blog-header:hover {
  border-color: var(--accent);
}

.blog-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.blog-text {
  min-width: 0;
}

.header-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.05em;
  display: flex;
  gap: 0;
}

.split-char {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--duration-base) var(--easing-base);
}

.blog-header:hover .split-char {
  color: var(--accent);
}

.hover-emoji {
  position: absolute;
  top: -1.6em;
  left: 50%;
  transform: translateX(-50%) scale(0);
  font-size: 0.9rem;
  opacity: 0;
  pointer-events: none;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.split-char:hover .hover-emoji {
  transform: translateX(-50%) scale(1);
  opacity: 1;
}

.header-subtitle {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  line-height: var(--lh-meta);
  margin-top: 0.25rem;
}
</style>
