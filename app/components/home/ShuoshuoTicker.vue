<script setup lang="ts">
/**
 * 首页说说轮播条（参考 LiuShen 首页 bber-talk 版式）：
 * 整条跳转 /shuoshuo，左侧图标 + 单行说说纵向轮播（带图标记）+ 右箭头。
 * 数据经 useShuoshuoData 与 /shuoshuo 页共享同一次请求。
 */
interface ShuoshuoBarConfig {
  enabled: boolean
  count: number
  interval: number
  hideWhenEmpty: boolean
}

const props = defineProps<{ cfg: ShuoshuoBarConfig }>()

const { ui } = useUi()
const { echos, state, load } = useShuoshuoData()

onMounted(load)

const items = computed(() =>
  echos.value.slice(0, props.cfg.count).map((e) => ({
    id: e.id,
    text: stripMd(e.content),
    hasImage: ech0Images(e).length > 0,
  })),
)

const visible = computed(
  () => state.value === 'ready' && (items.value.length > 0 || !props.cfg.hideWhenEmpty),
)

/** 说说正文转单行纯文本：删图片/代码块，链接留文字，去强调符号，压空白 */
function stripMd(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const active = ref(0)
const leaving = ref(-1)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startTimer() {
  stopTimer()
  if (props.cfg.interval <= 0 || items.value.length <= 1) return
  if (import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!paused.value && items.value.length > 1) {
      leaving.value = active.value
      active.value = (active.value + 1) % items.value.length
    }
  }, props.cfg.interval)
}

watch(items, () => {
  active.value = 0
  leaving.value = -1
  startTimer()
})

onMounted(startTimer)
onBeforeUnmount(stopTimer)
</script>

<template>
  <section
    v-if="cfg.enabled && (state === 'idle' || state === 'loading' || visible)"
    class="ss-ticker"
    :aria-label="ui.pages.home.shuoshuoBar.navLabel"
  >
    <NuxtLink to="/shuoshuo" class="ticker-link" :aria-label="ui.pages.home.shuoshuoBar.linkAria">
      <span class="ticker-icon" aria-hidden="true">
        <Icon name="tabler:message-dots" />
      </span>

      <span v-if="state !== 'ready'" class="ticker-viewport is-skeleton" aria-hidden="true"></span>

      <span v-else-if="items.length > 0" class="ticker-viewport" aria-live="polite">
        <span
          v-for="(it, i) in items"
          :key="it.id"
          class="ticker-item"
          :class="{ 'is-active': i === active, 'is-leaving': i === leaving && leaving !== active }"
        >
          <span class="ticker-text">{{ it.text || ui.pages.home.shuoshuoBar.empty }}</span>
          <Icon v-if="it.hasImage" name="tabler:photo" class="ticker-photo" :aria-label="ui.pages.home.shuoshuoBar.photoAria" />
        </span>
      </span>

      <span v-else class="ticker-viewport">{{ ui.pages.home.shuoshuoBar.empty }}</span>

      <Icon name="tabler:arrow-right" class="ticker-arrow" aria-hidden="true" />
    </NuxtLink>
  </section>
</template>

<style scoped>
.ss-ticker {
  margin-block: 1.25rem;
}

.ticker-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  padding: 0.5rem 0.875rem 0.5rem 0.5rem;
  text-decoration: none;
  color: var(--foreground);
  transition:
    border-color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.ticker-link:hover {
  border-color: var(--accent);
}

.ticker-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.ticker-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  color: var(--muted-foreground);
  font-size: 1rem;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.ticker-link:hover .ticker-icon {
  color: var(--accent);
  border-color: var(--accent);
}

.ticker-viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 1.5em;
  overflow: hidden;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.ticker-viewport.is-skeleton {
  border-radius: var(--radius);
  background: linear-gradient(90deg, var(--border) 25%, var(--muted) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: ticker-shimmer 1.4s ease-in-out infinite;
}

@keyframes ticker-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.ticker-item {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  opacity: 0;
  transform: translateY(100%);
  transition:
    transform var(--duration-slow) var(--easing-base),
    opacity var(--duration-slow) var(--easing-base);
  pointer-events: none;
}

.ticker-item.is-active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.ticker-item.is-leaving {
  opacity: 0;
  transform: translateY(-100%);
}

.ticker-text {
  min-width: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--foreground);
}

.ticker-photo {
  flex: none;
  color: var(--muted-foreground);
}

.ticker-arrow {
  flex: none;
  color: var(--muted-foreground);
  transition:
    color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.ticker-link:hover .ticker-arrow {
  color: var(--accent);
  transform: translateX(0.125rem);
}

@media (prefers-reduced-motion: reduce) {
  .ticker-item {
    transition: none;
  }

  .ticker-viewport.is-skeleton {
    animation: none;
  }
}
</style>
