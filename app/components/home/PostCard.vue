<script setup lang="ts">
/**
 * 首页两栏文章卡片（Dusklight 风格：封面图 + 玻璃信息层）。
 *
 * - 有 cover：显示封面；无 cover：回退到配置的占位图
 * - 图片加载失败也回退到占位图（onerror 一次性替换）
 * - 明暗模式：卡片本体用 token，遮罩只存在于图片区域内
 */
import type { PostSummary } from '~/composables/usePosts'

interface CardConfig {
  fallbackCover: string
  excerptLength: number
  showReadingTime: boolean
}

const props = defineProps<{
  post: PostSummary
  cfg: CardConfig
}>()

const { ui, t } = useUi()
const { iso } = useDateFormat()
const { estimate, enabled: readingEnabled } = useReadingTime()

const coverSrc = ref(props.post.cover ?? props.cfg.fallbackCover)
const coverFailed = ref(false)

watch(() => props.post.cover, (v) => {
  coverSrc.value = v ?? props.cfg.fallbackCover
  coverFailed.value = false
})

function onCoverError() {
  if (coverFailed.value) return
  coverFailed.value = true
  coverSrc.value = props.cfg.fallbackCover
}

const excerpt = computed(() => {
  const d = props.post.description
  if (!d) return t(ui.pages.home.card.noExcerpt)
  return d.length > props.cfg.excerptLength
    ? d.slice(0, props.cfg.excerptLength) + '…'
    : d
})

const showReading = computed(() => props.cfg.showReadingTime && readingEnabled)
const readingMinutes = computed(() => estimate(props.post.description))
</script>

<template>
  <article class="post-card">
    <NuxtLink :to="post.path" class="card-link">
      <div class="card-cover">
        <img
          class="cover-img"
          :src="coverSrc"
          :alt="t(ui.pages.home.card.coverAlt, { title: post.title })"
          loading="lazy"
          draggable="false"
          @error="onCoverError"
        >
        <span v-if="post.pinned" class="pinned-badge">
          <Icon name="tabler:pin-filled" class="pinned-icon" aria-hidden="true" />
          {{ ui.pages.home.card.pinnedBadge }}
        </span>
      </div>

      <div class="card-body">
        <h3 class="card-title">{{ post.title }}</h3>
        <p class="card-excerpt">{{ excerpt }}</p>

        <div class="card-meta">
          <span class="meta-cat">{{ post.category }}</span>
          <span v-if="post.tags.length" class="meta-tags">
            <span v-for="tag in post.tags.slice(0, 2)" :key="tag" class="meta-tag">#{{ tag }}</span>
          </span>
          <span class="meta-spring" aria-hidden="true" />
          <time class="meta-date" :datetime="iso(post.date)">{{ iso(post.date) }}</time>
          <span
            v-if="showReading"
            class="meta-read"
            :aria-label="t(ui.pages.home.card.readingTime, { n: readingMinutes })"
          >
            <Icon name="tabler:clock" class="meta-icon" aria-hidden="true" />
            {{ t(ui.pages.home.card.readingTime, { n: readingMinutes }) }}
          </span>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>

<style scoped>
.post-card {
  border-radius: calc(var(--radius) + 0.25rem);
  overflow: hidden;
  background: var(--background);
  border: 1px solid var(--border);
  transition:
    border-color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.card-link {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--muted);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 300ms var(--easing-base);
}

.post-card:hover .cover-img {
  transform: scale(1.03);
}

.pinned-badge {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--fs-meta);
  line-height: 1;
  padding: 0.3125rem 0.5625rem;
  border-radius: 999px;
  color: #fff;
  background: color-mix(in srgb, var(--accent) 88%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.pinned-icon {
  font-size: 0.75rem;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.125rem 1.125rem;
  flex: 1;
}

.card-title {
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  font-weight: 700;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-excerpt {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  margin-top: auto;
  padding-top: 0.375rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem 0.625rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}

.meta-cat {
  color: var(--accent);
}

.meta-tags {
  display: inline-flex;
  gap: 0.375rem;
  min-width: 0;
}

.meta-tag {
  white-space: nowrap;
}

.meta-spring {
  flex: 1;
}

.meta-date {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.meta-read {
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  white-space: nowrap;
}

.meta-icon {
  font-size: 0.875em;
}
</style>
