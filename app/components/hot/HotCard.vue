<script setup lang="ts">
/**
 * 热搜单条卡片，三种形态：
 * - featured lead（首位单栏大卡：封面左 44% + 信息右，跨满整行）
 * - grid（两栏竖卡：封面在上）
 * - row（单列横卡：封面左 37%）
 * 形态由父页面按 pages.config.hot.layout + rank 计算，本组件只负责渲染。
 * 见 docs/design/12-hot.md。
 */
import type { HotItem } from '~/types/hot'

const props = defineProps<{
  item: HotItem
  rank: number
  platform: string
  icon: string
  variant: 'featured' | 'grid' | 'row'
}>()

const { ui, t } = useUi()

const itemLink = computed(() => (props.item.url || props.item.mobileUrl || '').trim())
const hasLink = computed(() => !!itemLink.value)
const descText = computed(() => props.item.desc?.trim() || t(ui.hot.noDesc))

/** 封面防盗链：no-referrer；加载失败换全站占位图 */
const FALLBACK_COVER = '/images/covers/default.svg'
const coverFailed = ref(false)
const coverSrc = computed(() =>
  props.item.cover && !coverFailed.value ? props.item.cover : FALLBACK_COVER,
)
const hasCover = computed(() => !!props.item.cover)

const hotText = computed(() => {
  const h = props.item.hot
  if (h == null) return ''
  if (h >= 1e6) return `${(h / 1e6).toFixed(1)}${ui.hot.hotUnitM}`
  if (h >= 1e4) return `${(h / 1e4).toFixed(1)}${ui.hot.hotUnitWan}`
  return String(h)
})

/** rank 前 3 特殊徽标色 */
const rankClass = computed(() => ({
  'is-top1': props.rank === 1,
  'is-top2': props.rank === 2,
  'is-top3': props.rank === 3,
}))
</script>

<template>
  <article class="hot-card" :class="`hot-card--${variant}`">
    <div v-if="variant === 'featured'" class="hot-hero" :class="{ 'is-no-cover': !hasCover }">
      <span v-if="hasCover" class="card-cover card-cover--hero">
        <img
          :src="coverSrc"
          :alt="item.title"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="coverFailed = true"
        />
      </span>
      <div class="card-body">
        <h3 class="card-title">
          <a
            v-if="hasLink"
            :href="itemLink"
            class="card-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t(ui.hot.titleLinkAria, { title: item.title })"
          >{{ item.title }}</a>
          <span v-else>{{ item.title }}</span>
        </h3>
        <p class="card-desc">{{ descText }}</p>
        <div class="card-meta">
          <span class="meta-hot">
            <Icon :name="icon" class="meta-icon" aria-hidden="true" />
            <span>{{ hotText ? t(ui.hot.hotValue, { value: hotText }) : platform }}</span>
          </span>
          <span class="card-rank" :class="rankClass" :aria-label="t(ui.hot.rankAria, { n: rank })">{{ rank }}</span>
        </div>
      </div>
    </div>

    <template v-else-if="variant === 'row'">
      <span class="card-cover card-cover--row">
        <img
          :src="coverSrc"
          :alt="item.title"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="coverFailed = true"
        />
      </span>
      <div class="card-body">
        <h3 class="card-title">
          <a
            v-if="hasLink"
            :href="itemLink"
            class="card-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t(ui.hot.titleLinkAria, { title: item.title })"
          >{{ item.title }}</a>
          <span v-else>{{ item.title }}</span>
        </h3>
        <p class="card-desc">{{ descText }}</p>
        <div class="card-meta">
          <span class="meta-hot">
            <Icon :name="icon" class="meta-icon" aria-hidden="true" />
            <span>{{ hotText ? t(ui.hot.hotValue, { value: hotText }) : platform }}</span>
          </span>
          <span class="card-rank" :class="rankClass" :aria-label="t(ui.hot.rankAria, { n: rank })">{{ rank }}</span>
        </div>
      </div>
    </template>

    <template v-else>
      <span class="card-cover">
        <img
          :src="coverSrc"
          :alt="item.title"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="coverFailed = true"
        />
      </span>
      <div class="card-body">
        <h3 class="card-title">
          <a
            v-if="hasLink"
            :href="itemLink"
            class="card-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t(ui.hot.titleLinkAria, { title: item.title })"
          >{{ item.title }}</a>
          <span v-else>{{ item.title }}</span>
        </h3>
        <p class="card-desc">{{ descText }}</p>
        <div class="card-meta">
          <span class="meta-hot">
            <Icon :name="icon" class="meta-icon" aria-hidden="true" />
            <span>{{ hotText ? t(ui.hot.hotValue, { value: hotText }) : platform }}</span>
          </span>
          <span class="card-rank" :class="rankClass" :aria-label="t(ui.hot.rankAria, { n: rank })">{{ rank }}</span>
        </div>
      </div>
    </template>
  </article>
</template>

<style scoped>
.hot-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  transition: background-color var(--duration-base) var(--easing-base);
}

.hot-card:hover {
  background-color: color-mix(in srgb, var(--muted) 85%, var(--foreground));
}

/* ── 封面 ── */
.card-cover {
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--muted);
}

.card-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--easing-base);
}

.hot-card:hover .card-cover img {
  transform: scale(1.03);
}

/* ── 信息体 ── */
.card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem 1rem;
  min-width: 0;
}

.card-title {
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: 700;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.card-link {
  color: inherit;
  transition: color var(--duration-base) var(--easing-base);
}

.card-link:hover,
.card-link:focus-visible {
  color: var(--accent);
}

.card-desc {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--muted-foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border);
}

.meta-hot {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  min-width: 0;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.meta-icon {
  flex: none;
  width: 1em;
  height: 1em;
  opacity: 0.7;
}

/* ── rank 徽标：top3 红/橙/黄，其余中性 ── */
.card-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: calc(var(--radius) / 2);
  background-color: var(--border);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.card-rank.is-top1 { background-color: #ea444d; color: #fff; }
.card-rank.is-top2 { background-color: #ed702d; color: #fff; }
.card-rank.is-top3 { background-color: #eead3f; color: #fff; }

/* ============ featured 首位大卡：封面左 44%（跨行由外层 li 负责） ============ */
.hot-hero {
  display: grid;
  grid-template-columns: minmax(0, 44%) minmax(0, 1fr);
  gap: 1rem;
  width: 100%;
}

.hot-hero.is-no-cover {
  grid-template-columns: minmax(0, 1fr);
}

.hot-card--featured .card-cover--hero {
  align-self: center;
  aspect-ratio: 16 / 9;
}

.hot-card--featured .card-title {
  font-size: 1.05rem;
}

.hot-card--featured .card-desc {
  font-size: 0.8rem;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.hot-card--featured .card-rank {
  width: 1.875rem;
  height: 1.875rem;
  font-size: 0.875rem;
}

/* ============ row 单列横卡：封面左 37% ============ */
.hot-card--row {
  flex-direction: row;
}

.hot-card--row .card-cover--row {
  flex: none;
  width: 37%;
  aspect-ratio: auto;
}

/* ============ 响应式 ============ */
@media (max-width: 600px) {
  .hot-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }

  .hot-card--featured .card-cover--hero {
    aspect-ratio: 16 / 9;
  }
}

@media (max-width: 480px) {
  .hot-card--row {
    flex-direction: column;
  }

  .hot-card--row .card-cover--row {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hot-card,
  .card-cover img,
  .card-link {
    transition: none;
  }
}
</style>
