<script setup lang="ts">
/**
 * 文章目录（提示词 §7.2）。
 * ≥1280px：右侧沟槽外 sticky 旁栏
 * <1280px：折叠到正文顶部
 */
interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

const props = withDefaults(
  defineProps<{
    toc: TocLink[]
    /**
     * inline = 正文顶部的折叠目录（<1280px 生效）
     * aside  = 右侧沟槽的常驻目录（≥1280px 生效）
     */
    variant?: 'inline' | 'aside'
  }>(),
  { variant: 'inline' },
)

const appConfig = useAppConfig()
const tocCfg = (appConfig.theme as any).toc as {
  enabled: boolean
  minDepth: number
  maxDepth: number
  mobileCollapsible: boolean
}
const { ui } = useUi()
const pageCfg = usePageConfig('post')

const activeId = ref('')

/** 扁平化，只保留 minDepth..maxDepth 的标题 */
const flat = computed(() => {
  const out: Array<{ id: string; text: string; depth: number }> = []
  function walk(items: TocLink[]) {
    for (const item of items) {
      if (item.depth >= tocCfg.minDepth && item.depth <= tocCfg.maxDepth) {
        out.push({ id: item.id, text: item.text, depth: item.depth })
      }
      if (item.children) walk(item.children)
    }
  }
  walk(props.toc)
  return out
})

const visible = computed(() => pageCfg.showToc && tocCfg.enabled && flat.value.length > 0)

/**
 * 用 IntersectionObserver 高亮当前章节。
 * 不用 scroll 事件：scroll 每次都要算位置，IntersectionObserver 由浏览器优化。
 */
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!visible.value) return

  const headings = flat.value
    .map((h) => document.getElementById(h.id))
    .filter(Boolean) as HTMLElement[]

  if (!headings.length) return

  observer = new IntersectionObserver(
    (entries) => {
      // 取第一个进入视口上部的标题
      const entering = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (entering[0]) activeId.value = entering[0].target.id
    },
    {
      // 顶部 80px 留给固定导航，底部留大半屏避免过早切换
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0,
    },
  )

  for (const h of headings) observer.observe(h)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const mobileOpen = ref(false)
</script>

<template>
  <template v-if="visible">
    <!--
      同一个组件在文章页会被渲染两次（正文列 + 右侧旁栏），
      所以必须按 variant 各管一段，否则桌面端会出现两份目录。
        variant="inline"：正文顶部，只在 < 1280px 显示（折叠式）
        variant="aside" ：右侧沟槽，只在 ≥ 1280px 显示（常驻式）
    -->
    <nav v-if="variant === 'aside'" class="toc toc-desktop" :aria-label="ui.post.tocAria">
      <p class="toc-label">{{ ui.post.toc }}</p>
      <ul class="toc-list">
        <li
          v-for="item in flat"
          :key="item.id"
          class="toc-item"
          :class="[`depth-${item.depth}`, { 'is-active': activeId === item.id }]"
        >
          <a :href="`#${item.id}`" class="toc-link">{{ item.text }}</a>
        </li>
      </ul>
    </nav>

    <!-- 移动/平板：折叠在正文顶部 -->
    <details
      v-if="variant === 'inline' && tocCfg.mobileCollapsible"
      class="toc-mobile"
      :open="mobileOpen">
      <summary class="toc-mobile-summary">
        <span>{{ ui.post.toc }}</span>
        <Icon name="tabler:chevron-down" class="toc-chevron" aria-hidden="true" />
      </summary>
      <ul class="toc-list toc-list-mobile">
        <li
          v-for="item in flat"
          :key="item.id"
          class="toc-item"
          :class="`depth-${item.depth}`"
        >
          <a :href="`#${item.id}`" class="toc-link">{{ item.text }}</a>
        </li>
      </ul>
    </details>
  </template>
</template>

<style scoped>
/* ---------- 桌面旁栏 ---------- */
.toc-desktop {
  display: none;
}

.toc-label {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  margin-bottom: 0.75rem;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  border-inline-start: 1px solid var(--border);
}

.toc-item {
  line-height: 1.5;
}

.toc-item.depth-3 {
  padding-inline-start: 0.75rem;
}

.toc-link {
  display: block;
  padding-inline-start: 0.75rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  border-inline-start: 1px solid transparent;
  margin-inline-start: -1px;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.toc-link:hover {
  color: var(--foreground);
}

/* 强调色使用的四处之一：当前章节 */
.toc-item.is-active .toc-link {
  color: var(--foreground);
  border-inline-start-color: var(--accent);
}

/* ---------- 移动折叠 ---------- */
.toc-mobile {
  margin-bottom: var(--space-block);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.toc-mobile-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 0.625rem;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  list-style: none;
}

.toc-mobile-summary::-webkit-details-marker {
  display: none;
}

.toc-chevron {
  transition: transform var(--duration-base) var(--easing-base);
}

.toc-mobile[open] .toc-chevron {
  transform: rotate(180deg);
}

.toc-list-mobile {
  padding-bottom: 0.75rem;
  border-inline-start: none;
}

.toc-list-mobile .toc-link {
  border-inline-start: none;
  padding-block: 0.25rem;
}

/* ---------- 断点 ---------- */
@media (min-width: 1280px) {
  .toc-desktop {
    display: block;
    position: sticky;
    top: 5rem;
    width: var(--toc-width);
    max-height: calc(100dvh - 8rem);
    overflow-y: auto;
  }

  .toc-mobile {
    display: none;
  }
}
</style>
