<script setup lang="ts">
/**
 * 文章目录 —— 桌面端右侧沟槽旁栏（≥1280px 生效）。
 *
 * <1280px 的目录已搬到顶栏按钮 + 抽屉（app/components/common/MobileToc.vue），
 * 原先塞在正文顶部的 <details> 折叠块已移除：滚过几百像素就够不到，
 * 而且那个形态没有高亮。
 *
 * 三处（本组件 / MobileToc / 文章页）共享同一份状态，见 app/composables/usePostToc.ts。
 */
const { ui } = useUi()
const { flat, activeId, available } = usePostToc()
const pageCfg = usePageConfig('post')

/**
 * 高亮当前章节。
 *
 * 曾经用 IntersectionObserver，实测完全失效：它的回调只在标题「进入/离开」观察带时触发，
 * 而 rootMargin '-80px 0px -70% 0px' 让观察带很窄，两个标题之间必然出现「没有任何条目相交」的
 * 空集；回调里只认 isIntersecting 的条目，空集时既不更新也不清空，一旦所有标题离开观察带
 * 就再也不会恢复 —— 滚到文章中段时 8 个条目一个都没高亮。
 *
 * 改为按滚动位置直接判定：取「最后一个已越过阅读线的标题」。
 * 9 个以内的标题，每次 scroll 遍历一次的开销远小于 IntersectionObserver 的调度成本。
 */
const navRef = ref<HTMLElement | null>(null)
let headings: HTMLElement[] = []
/** 阅读线：与标题的 scroll-margin-top（= 顶部导航高度 + 吸顶间距）保持一致，JS 侧不再复制数值 */
let readingLine = 0

function measure() {
  // 用类型谓词而非 filter(Boolean) + as：后者只是骗过编译器，
  // 拿到的是「声明为 HTMLElement 但实际可能含 null」的数组。
  headings = flat.value
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => el !== null)

  const first = headings[0]
  readingLine = first ? Number.parseFloat(getComputedStyle(first).scrollMarginTop) || 0 : 0
}

function syncActive() {
  // onMounted 时 <ContentRenderer> 可能还没把正文渲染出来（它是异步组件），
  // 此时 getElementById 全部落空。所以每次发现标题数不对就重新量一次，
  // 而不是在 onMounted 里量一次就永久信任那一次的结果。
  if (headings.length !== flat.value.length) measure()

  const first = headings[0]
  if (!first) return

  let current = first.id
  for (const h of headings) {
    if (h.getBoundingClientRect().top - readingLine <= 0) current = h.id
    else break
  }

  // 文章末尾正文可能撑不满一屏，永远越不过阅读线，此时强制高亮最后一节
  const doc = document.documentElement
  const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2
  const last = headings[headings.length - 1]
  const next = atBottom && last ? last.id : current

  if (next === activeId.value) return
  activeId.value = next
  revealActive()
}

/** 目录本身超长时，把当前项滚进目录的可见区（只动目录，不动页面） */
function revealActive() {
  const nav = navRef.value
  if (!nav) return
  const index = flat.value.findIndex((h) => h.id === activeId.value)
  const item = nav.querySelectorAll<HTMLElement>('.toc-item')[index]
  if (!item) return

  // 向上找最近的、真正可滚动的祖先（桌面端是 .post-aside）
  let container: HTMLElement | null = nav.parentElement
  while (container) {
    const overflowY = getComputedStyle(container).overflowY
    if (/(auto|scroll)/.test(overflowY) && container.scrollHeight > container.clientHeight + 1) break
    container = container.parentElement
  }
  if (!container) return

  const pad = 8
  const box = container.getBoundingClientRect()
  const rect = item.getBoundingClientRect()
  let delta = 0
  if (rect.top < box.top + pad) delta = rect.top - box.top - pad
  else if (rect.bottom > box.bottom - pad) delta = rect.bottom - box.bottom + pad
  if (!delta) return

  container.scrollTo({
    top: container.scrollTop + delta,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * scroll 监听直接算，不做 rAF 节流。
 *
 * 试过 rAF 节流，但 rAF 在后台标签页/被遮挡窗口里会被浏览器降到 0~1fps，
 * 高亮会明显滞后；而这里每次只遍历 ≤9 个标题的 getBoundingClientRect，
 * 开销远小于一次布局抖动，同步计算反而更稳。
 */
function onScroll() {
  syncActive()
}

function onResize() {
  measure()
  syncActive()
}

onMounted(() => {
  if (!available.value) return
  measure()
  // 直接带 #锚点 打开页面时也要立刻正确高亮
  syncActive()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('hashchange', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('hashchange', onResize)
})
</script>

<template>
  <nav v-if="available" ref="navRef" class="toc toc-desktop" :aria-label="ui.post.tocAria">
    <div class="toc-head">
      <p class="toc-label">{{ ui.post.toc }}</p>
      <a
        v-if="pageCfg.comments?.enabled"
        href="#comments"
        class="toc-jump-comments"
        :aria-label="ui.post.commentsJumpAria"
        :title="ui.post.commentsJumpAria"
      >
        <Icon name="tabler:message-dots" aria-hidden="true" />
      </a>
    </div>
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
</template>

<style scoped>
/* 默认隐藏；≥1280px 才作为旁栏出现（见文件底部断点） */
.toc-desktop {
  display: none;
}

.toc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.toc-label {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

/* 头部右上角直达评论（参考 blog-v3 Toc 的 action 插槽位） */
.toc-jump-comments {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  color: var(--muted-foreground);
  font-size: 1.125rem;
  transition: color var(--duration-base) var(--easing-base);
}

.toc-jump-comments:hover {
  color: var(--foreground);
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

@media (min-width: 1280px) {
  /*
   * sticky 不在这里：本元素的包含块是 <aside class="post-aside">，
   * 而 aside 作为 grid item 只按内容收缩，高度=目录高度，可滑动区间为 0，
   * sticky 会退化成 static。吸顶交给 aside 自己（见 pages/posts/[slug].vue）。
   */
  .toc-desktop {
    display: block;
    width: 100%;
  }
}
</style>
