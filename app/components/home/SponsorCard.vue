<script setup lang="ts">
/**
 * 首页侧栏「赞赏者 / 能量榜」（liushen 风格）：
 * 头部链接跳关于页打赏名单；榜一（最新一笔）大卡展示，其余头像墙。
 * 数据 = app/data/sponsors.json（打赏 issue 工作流维护），构建时内联。
 */
import sponsorsData from '~/data/sponsors.json'
import type { RewardItem } from '~/data/about'

const { ui } = useUi()

const list = computed(() =>
  [...(sponsorsData as RewardItem[])]
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount),
)

const featured = computed(() => list.value[0])
const wall = computed(() => list.value.slice(1))

/** 整数金额不带小数位 */
function fmt(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

/** 头像加载失败降级为首字占位圆 */
const brokenAvatars = reactive(new Set<string>())
</script>

<template>
  <SidebarCard v-if="list.length" :title="ui.pages.home.sidebar.sponsors" icon="tabler:coffee">
    <template #action>
      <NuxtLink to="/about#reward" class="sponsor-more" :aria-label="ui.pages.home.sidebar.sponsorsLinkAria">
        {{ ui.pages.home.sidebar.sponsorsLink }}
        <Icon name="tabler:arrow-right" aria-hidden="true" />
      </NuxtLink>
    </template>

    <!-- 榜一：最新一笔打赏 -->
    <NuxtLink v-if="featured" to="/about#reward" class="sponsor-featured">
      <img
        v-if="featured.avatar && !brokenAvatars.has(featured.name)"
        class="featured-avatar"
        :src="featured.avatar"
        :alt="featured.name"
        loading="lazy"
        @error="brokenAvatars.add(featured.name)"
      >
      <span v-else class="featured-avatar featured-avatar--fallback" aria-hidden="true">
        {{ featured.name.slice(0, 1) }}
      </span>
      <span class="featured-meta">
        <span class="featured-name">{{ featured.name }}</span>
        <span class="featured-amount">¥{{ fmt(featured.amount) }}</span>
        <span class="featured-date">{{ featured.date }}</span>
      </span>
    </NuxtLink>

    <!-- 头像墙：其余赞赏者 -->
    <ul v-if="wall.length" class="sponsor-wall">
      <li v-for="s in wall" :key="`${s.name}-${s.date}`">
        <NuxtLink to="/about#reward" class="wall-item" :title="s.name">
          <img
            v-if="s.avatar && !brokenAvatars.has(s.name)"
            class="wall-avatar"
            :src="s.avatar"
            :alt="s.name"
            loading="lazy"
            @error="brokenAvatars.add(s.name)"
          >
          <span v-else class="wall-avatar wall-avatar--fallback" aria-hidden="true">
            {{ s.name.slice(0, 1) }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </SidebarCard>
</template>

<style scoped>
.sponsor-more {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
  transition: opacity var(--duration-base) var(--easing-base);
}

.sponsor-more:hover {
  opacity: 0.75;
}

.sponsor-more :deep(.icon) {
  font-size: 1em;
}

/* 榜一卡 */
.sponsor-featured {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--card);
  text-decoration: none;
  transition: border-color var(--duration-base) var(--easing-base);
}

.sponsor-featured:hover {
  border-color: var(--accent);
}

.featured-avatar {
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 1px solid var(--border);
}

.featured-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  font-size: 1.1rem;
  font-weight: 700;
}

.featured-meta {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.2rem;
}

.featured-name {
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.featured-amount {
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.featured-date {
  align-self: flex-end;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* 头像墙 */
.sponsor-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.25rem, 1fr));
  gap: 0.5rem;
  margin: 0.75rem 0 0;
}

.wall-item {
  display: block;
  border-radius: var(--radius-full);
}

.wall-avatar {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 1px solid var(--border);
  transition: transform var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.wall-item:hover .wall-avatar {
  transform: scale(1.1);
  border-color: var(--accent);
}

.wall-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 700;
}
</style>
