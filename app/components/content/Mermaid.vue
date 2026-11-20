<script setup lang="ts">
const props = defineProps<{
  code: string
}>()

const { isDark } = useTheme()
const container = useTemplateRef('mermaid')
const scroll = ref(true)

const id = useId()
// mermaid 会移除 DOM 中同 id 的旧图，故每次渲染另起 id，避免切换主题时高度塌陷
let renderCount = 0

// mermaid 体积较大，接近视口时才动态引入
const shouldRender = ref(false)
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!container.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        shouldRender.value = true
        observer?.disconnect()
      }
    },
    { rootMargin: '50%' },
  )
  observer.observe(container.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

const diagram = ref<{ svg?: string, width?: number, error?: string }>({})

// 监听 shouldRender、code、isDark 变化触发重新渲染
watch(
  () => [shouldRender.value, props.code, isDark.value] as const,
  async ([ready]) => {
    if (!ready) return
    const darkMode = isDark.value
    const { code } = props

    try {
      const { default: mermaid } = await import('mermaid')
      // 等待换好根元素类名，以及字体就绪——否则取到旧配色、量出偏窄的文本
      await Promise.all([nextTick(), document.fonts.ready])

      const style = getComputedStyle(document.documentElement)
      const cssVar = (name: string) => style.getPropertyValue(name)

      mermaid.initialize({
        fontFamily: 'inherit',
        // 须在 load 事件前关闭，否则 mermaid 会自行扫描并接管页面元素
        startOnLoad: false,
        suppressErrorRendering: true,
        // themeVariables 仅对 base 主题生效，其余主题会重算这些颜色
        theme: 'base',
        themeVariables: {
          darkMode,
          // 不指定则深色下连线被推导为近黑色、边标签被推导为绿色
          background: cssVar('--background'),
          edgeLabelBackground: cssVar('--card'),
          // 仅把自带主题的紫色换成博客主题色，其余配色仍由 mermaid 推导
          primaryBorderColor: cssVar('--accent'),
          primaryColor: cssVar('--muted'),
          primaryTextColor: cssVar('--foreground'),
          textColor: cssVar('--foreground'),
        },
      })
      const { svg } = await mermaid.render(`${id}-${renderCount++}`, code)
      // 用原始画布宽度保留字号，超宽图表在容器内滚动
      const width = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('svg')?.viewBox.baseVal.width
      diagram.value = { svg, width }
    }
    catch (error) {
      diagram.value = { error: error instanceof Error ? error.message : String(error) }
    }
  },
  { immediate: true },
)
</script>

<template>
  <div ref="mermaid" class="mermaid-diagram">
    <div v-if="diagram.svg" class="mermaid-wrapper">
      <button
        class="mermaid-toggle"
        type="button"
        :title="scroll ? '适应宽度' : '横向滚动'"
        @click="scroll = !scroll"
      >
        <Icon :name="scroll ? 'tabler:arrows-minimize' : 'tabler:arrows-horizontal'" />
      </button>
      <div class="scrollcheck-x" tabindex="0" role="region" aria-label="Mermaid 图表">
        <div :style="{ minWidth: scroll && diagram.width ? `${diagram.width}px` : undefined }" v-html="diagram.svg" />
      </div>
    </div>
    <template v-else-if="diagram.error">
      <details class="mermaid-error">
        <summary>图表渲染失败，查看错误详情</summary>
        <pre>{{ diagram.error }}</pre>
      </details>
      <ProsePre :code language="mermaid" meta="wrap" />
    </template>
  </div>
</template>

<style scoped>
/* 不可命名为 .mermaid：mermaid 会按此类名自动扫描并接管元素 */
.mermaid-diagram {
  margin: 0.5em 0;

  /* mermaid 在 <body> 下量取文本，此处需与根元素排版一致，否则图形错位 */
  line-height: 1.4;

  :deep(svg) {
    display: block;
    height: auto;
    max-width: 100%;
    margin-inline: auto;
  }

  /* 文本标签由 foreignObject 承载，会继承文章的段落样式 */
  :deep(p) {
    margin: 0;
  }
}

.mermaid-wrapper {
  position: relative;
}

.mermaid-toggle {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.mermaid-wrapper:hover .mermaid-toggle,
.mermaid-toggle:focus-visible {
  opacity: 1;
}

.mermaid-toggle:hover {
  color: var(--accent);
}

.mermaid-error {
  font-size: 0.85em;
  color: var(--muted-foreground);

  summary {
    color: var(--accent);
    cursor: pointer;
  }

  pre {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}
</style>
