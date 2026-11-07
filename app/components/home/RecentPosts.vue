<script setup lang="ts">
/**
 * 侧栏最新文章：标题 + 小缩略图（可关），数量可配。
 * 缩略图加载失败回退到默认占位图。
 */
import type { PostSummary } from '~/composables/usePosts'

interface RecentConfig {
  count: number
  showThumb: boolean
}

const props = defineProps<{
  posts: PostSummary[]
  cfg: RecentConfig
  fallbackCover: string
}>()

const { ui } = useUi()
const { iso } = useDateFormat()

const failed = reactive(new Set<string>())

function src(post: PostSummary): string {
  return failed.has(post.path) || !post.cover ? props.fallbackCover : post.cover
}

function onErr(post: PostSummary) {
  failed.add(post.path)
}
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.recent" icon="tabler:clock-hour-4">
    <ul class="recent">
      <li v-for="post in posts.slice(0, cfg.count)" :key="post.path" class="recent-row">
        <NuxtLink :to="post.path" class="recent-link">
          <img
            v-if="cfg.showThumb"
            class="recent-thumb"
            :src="src(post)"
            :alt="post.title"
            loading="lazy"
            @error="onErr(post)"
          >
          <span class="recent-body">
            <span class="recent-title">{{ post.title }}</span>
            <time class="recent-date" :datetime="iso(post.date)">{{ iso(post.date) }}</time>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </SidebarCard>
</template>

<style scoped>
.recent {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.recent-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.recent-thumb {
  flex: none;
  width: 3rem;
  height: 3rem;
  border-radius: calc(var(--radius) - 0.125rem);
  object-fit: cover;
  background: var(--muted);
}

.recent-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.recent-title {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-base) var(--easing-base);
}

.recent-link:hover .recent-title {
  color: var(--accent);
}

.recent-date {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
</style>
