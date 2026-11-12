<script setup lang="ts">
/**
 * AI 智能摘要卡片（文章头卡下方）。
 * 移植自 wxuyu.top 的 post/Excerpt：图标 + 「智能摘要」+ 模型徽章 + 摘要正文；
 * 每次进页打字机动画（reduced-motion / 配置关闭时降级直出），
 * 窄屏长摘要折叠可展开。SSG HTML 里是全文，爬虫可见，动画纯客户端。
 */
const props = defineProps<{ summary: string }>()

const { ai } = useBlogConfig()
const { ui, t } = useUi()

const text = ref(props.summary)
const caret = ref('')
const isFolded = ref(true)
const isNarrowScreen = ref(false)
const isReducedMotion = ref(false)
const isDev = import.meta.dev

const showToggle = computed(() => props.summary.length > 80 && isNarrowScreen.value)

const narrowQuery = '(max-width: 768px)'
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function syncMedia() {
  isNarrowScreen.value = window.matchMedia(narrowQuery).matches
  isReducedMotion.value = window.matchMedia(reducedMotionQuery).matches
}

function toggleFold() {
  isFolded.value = !isFolded.value
}

/** 打字机：逐字追加，尾部下划线光标；完成后光标消失 */
async function runTypingAnimation(content: string) {
  text.value = ''
  caret.value = '_'
  for (const char of content) {
    text.value += char
    await new Promise((resolve) => setTimeout(resolve, 30))
  }
  caret.value = ''
}

function render() {
  if (ai.animation && !isReducedMotion.value) {
    runTypingAnimation(props.summary)
  } else {
    text.value = props.summary
    caret.value = ''
  }
}

onMounted(() => {
  syncMedia()
  const narrow = window.matchMedia(narrowQuery)
  const reduced = window.matchMedia(reducedMotionQuery)
  narrow.addEventListener('change', syncMedia)
  reduced.addEventListener('change', syncMedia)
  onBeforeUnmount(() => {
    narrow.removeEventListener('change', syncMedia)
    reduced.removeEventListener('change', syncMedia)
  })
  render()
})

if (isDev) {
  watch(() => props.summary, () => {
    text.value = props.summary
    isFolded.value = true
    render()
  })
}
</script>

<template>
  <aside class="ai-summary" :aria-label="t(ui.post.aiSummaryRegionAria)">
    <div class="summary-head">
      <span class="summary-title">
        <span class="ai-icon">
          <Icon name="tabler:brand-openai" />
        </span>
        {{ ai.label }}
      </span>
      <span class="summary-badge">{{ ai.badge }}</span>
    </div>

    <div
      class="summary-content"
      :class="{
        'summary-content--folded': showToggle && isFolded,
        'summary-content--unfolded': showToggle && !isFolded,
      }"
      role="region"
      :aria-expanded="!isFolded"
    >{{ text }}{{ caret }}</div>

    <div v-if="showToggle" class="summary-toggle-row">
      <button
        class="summary-toggle"
        :aria-expanded="!isFolded"
        @click="toggleFold"
      >
        {{ isFolded ? t(ui.post.aiSummaryExpand) : t(ui.post.aiSummaryCollapse) }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.ai-summary {
  margin-bottom: var(--space-block);
  padding: 1rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background-color: var(--card);
}

.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.summary-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
}

.ai-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, white));
  color: var(--background);
}

.ai-icon :deep(.icon) {
  font-size: 1rem;
}

.summary-badge {
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  font-weight: 500;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

.summary-content {
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--background);
  font-size: var(--fs-meta);
  line-height: 1.8;
  color: var(--muted-foreground);
  white-space: pre-wrap;
  word-break: break-word;
  transition: max-height 0.28s var(--easing-base);
}

.summary-content--folded {
  max-height: 4.8em;
  overflow: hidden;
}

.summary-content--unfolded {
  max-height: 28em;
  overflow: hidden;
}

.summary-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.6rem;
}

.summary-toggle {
  padding: 0.3rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background-color: transparent;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.summary-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .summary-content {
    transition: none;
  }
}
</style>
