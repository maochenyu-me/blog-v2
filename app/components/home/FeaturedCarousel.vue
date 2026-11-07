<script setup lang="ts">
/**
 * 首页顶部推荐文章轮播（Dusklight 风格宽幅封面版式）。
 *
 * 实现约定：
 * - 零依赖：原生 transform + 定时器，不用任何轮播库
 * - 数据：只渲染传入的 slides（已由页面筛过 featured + cover）
 * - 交互：自动播放 / 左右箭头 / 指示点 / 触摸滑动 / hover 暂停 / 键盘可达
 * - 主题：遮罩与玻璃控件全部从 token 派生（color-mix），明暗自动跟随
 * - 无障碍：region + aria-roledescription，指示点为 tablist 语义
 */
import type { PostSummary } from '~/composables/usePosts'

interface CarouselConfig {
  interval: number
  showArrows: boolean
  showDots: boolean
  badge: string
}

const props = defineProps<{
  slides: PostSummary[]
  cfg: CarouselConfig
}>()

const { ui, t } = useUi()
const { iso } = useDateFormat()

const current = ref(0)
const paused = ref(false)
const trackEl = ref<HTMLElement | null>(null)

/** 外链封面等加载失败时，回退到本地占位图（keyed by path，一次性） */
const failed = reactive(new Set<string>())

const FALLBACK_COVER = '/images/covers/default.svg'

function srcOf(cover: string | undefined): string {
  return !cover || failed.has(cover) ? FALLBACK_COVER : cover
}

function onCoverErr(cover: string | undefined) {
  if (cover) failed.add(cover)
}

const count = computed(() => props.slides.length)

let timer: ReturnType<typeof setInterval> | null = null

function go(i: number) {
  if (count.value === 0) return
  current.value = ((i % count.value) + count.value) % count.value
}

function next() {
  go(current.value + 1)
}

function prev() {
  go(current.value - 1)
}

/** 自动播放：interval <= 0、悬浮暂停、reduce-motion 时均不启动 */
function startTimer() {
  stopTimer()
  if (props.cfg.interval <= 0 || count.value <= 1) return
  if (import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!paused.value) next()
  }, props.cfg.interval)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 触摸滑动：记录起点，横向位移超阈值即翻页 */
let touchStartX = 0
let touchDeltaY = 0

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0]!.clientX
  touchDeltaY = e.touches[0]!.clientY
}

function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0]!.clientX - touchStartX
  const dy = e.changedTouches[0]!.clientY - touchDeltaY
  // 横向位移 48px 以上且明显大于纵向位移才判定为滑动，避免吃掉页面纵向滚动
  if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    dx < 0 ? next() : prev()
  }
}

/** 键盘：聚焦在轮播区域内时左右键翻页 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  }
  else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  }
}

watch(count, startTimer)

onMounted(startTimer)
onBeforeUnmount(stopTimer)
</script>

<template>
  <section
    v-if="count > 0"
    class="carousel"
    role="region"
    :aria-label="ui.pages.home.carousel.regionLabel"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
    @keydown="onKeydown"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div
      ref="trackEl"
      class="carousel-viewport"
      aria-roledescription="carousel"
    >
      <div
        class="carousel-track"
        :style="{ transform: `translateX(-${current * 100}%)` }"
      >
        <NuxtLink
          v-for="(post, i) in slides"
          :key="post.path"
          :to="post.path"
          class="carousel-slide"
          :aria-hidden="i !== current"
          :tabindex="i === current ? 0 : -1"
        >
          <img
            class="carousel-img"
            :src="srcOf(post.cover)"
            :alt="t(ui.pages.home.card.coverAlt, { title: post.title })"
            loading="eager"
            draggable="false"
            @error="onCoverErr(post.cover)"
          >
          <span class="carousel-shade" aria-hidden="true" />

          <span class="carousel-caption">
            <span v-if="cfg.badge" class="carousel-badge">
              <Icon name="tabler:star-filled" class="badge-icon" aria-hidden="true" />
              {{ cfg.badge }}
            </span>
            <span class="carousel-title">{{ post.title }}</span>
            <span class="carousel-meta">
              <span class="carousel-cat">{{ post.category }}</span>
              <span class="carousel-dot" aria-hidden="true">·</span>
              <time :datetime="iso(post.date)">{{ iso(post.date) }}</time>
            </span>
          </span>
        </NuxtLink>
      </div>
    </div>

    <template v-if="cfg.showArrows && count > 1">
      <button
        type="button"
        class="carousel-arrow arrow-prev"
        :aria-label="ui.pages.home.carousel.prevAria"
        @click.stop="prev"
      >
        <Icon name="tabler:chevron-left" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="carousel-arrow arrow-next"
        :aria-label="ui.pages.home.carousel.nextAria"
        @click.stop="next"
      >
        <Icon name="tabler:chevron-right" aria-hidden="true" />
      </button>
    </template>

    <div
      v-if="cfg.showDots && count > 1"
      class="carousel-dots"
      role="tablist"
      :aria-label="ui.pages.home.carousel.dotsAria"
    >
      <button
        v-for="(post, i) in slides"
        :key="post.path"
        type="button"
        role="tab"
        class="carousel-dot"
        :class="{ active: i === current }"
        :aria-selected="i === current"
        :aria-label="t(ui.pages.home.carousel.dotAria, { n: i + 1 })"
        @click.stop="go(i)"
      />
    </div>
  </section>
</template>

<style scoped>
.carousel {
  position: relative;
  border-radius: calc(var(--radius) + 0.375rem);
  overflow: hidden;
  isolation: isolate;
}

.carousel-viewport {
  overflow: hidden;
  aspect-ratio: 21 / 8;
  background: var(--muted);
}

.carousel-track {
  display: flex;
  height: 100%;
  transition: transform 500ms var(--easing-base);
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track {
    transition: none;
  }
}

.carousel-slide {
  position: relative;
  flex: 0 0 100%;
  height: 100%;
  display: block;
}

.carousel-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
}

/* 底部渐变遮罩：文字可读性的唯一保障，明暗同构 */
.carousel-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgb(0 0 0 / 0.72) 0%,
    rgb(0 0 0 / 0.35) 38%,
    rgb(0 0 0 / 0.05) 68%,
    transparent 100%
  );
}

.carousel-caption {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem 2.75rem;
  color: #fff;
}

.carousel-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  border: 1px solid rgb(255 255 255 / 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.badge-icon {
  font-size: 0.875em;
}

.carousel-title {
  font-size: clamp(1.125rem, 2.5vw, 1.5rem);
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: balance;
}

.carousel-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  opacity: 0.85;
}

.carousel-cat {
  color: #fff;
}

/* 玻璃箭头：白色半透明玻璃，叠在图片上明暗通用 */
.carousel-arrow {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  z-index: 2;
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.3);
  background: rgb(255 255 255 / 0.14);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-size: 1.25rem;
  cursor: pointer;
  transition:
    background var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.carousel-arrow:hover {
  background: rgb(255 255 255 / 0.28);
  transform: scale(1.05);
}

.arrow-prev {
  left: 0.875rem;
}

.arrow-next {
  right: 0.875rem;
}

/* 指示点：胶囊式，位于遮罩之上 */
.carousel-dots {
  position: absolute;
  z-index: 2;
  inset-inline: 0;
  bottom: 0.875rem;
  display: flex;
  justify-content: center;
  gap: 0.375rem;
}

.carousel-dot {
  width: 1.375rem;
  height: 0.375rem;
  min-width: 24px;
  min-height: 24px;
  padding: 0;
  border: none;
  border-radius: 999px;
  /* 24px 触控热区内画 6px 胶囊 */
  background:
    linear-gradient(#fff, #fff) center / 100% 0.375rem no-repeat,
    transparent;
  background-clip: content-box;
  opacity: 0.4;
  cursor: pointer;
  transition:
    opacity var(--duration-base) var(--easing-base),
    width var(--duration-base) var(--easing-base);
}

.carousel-dot.active {
  opacity: 1;
}

@media (hover: none), (max-width: 767px) {
  /* 移动端：隐藏箭头（需求 §5），滑动 + 指示点接管 */
  .carousel-arrow {
    display: none;
  }
}

@media (max-width: 767px) {
  .carousel-viewport {
    aspect-ratio: 16 / 10;
  }

  .carousel-caption {
    padding: 1rem 1rem 2.5rem;
  }
}
</style>
