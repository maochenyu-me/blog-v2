<script setup lang="ts">
/**
 * 文章目录抽屉 —— <1280px（手机 + 平板 + 1024–1279 的空档）共用。
 *
 * 取代了原先塞在正文顶部的 <details> 折叠块：
 *   那个块滚过几百像素就够不到了，而且 li 不带 is-active，压根没有「当前在哪」。
 *
 * 形态按用户决策：贴边矩形面板 + 1px 左边框（与 MobileDrawer 同一套语言），
 * 高亮沿用桌面端的左侧 accent 竖线 + 亮色文字 —— 不引入新的色块层级。
 *
 * a11y 与锁滚动照抄 MobileDrawer.vue：v-if 挂载/卸载（不给隐藏的链接留 Tab 入口）、
 * Escape 关闭、Tab 焦点循环、关闭后焦点还给触发按钮、路由变化自动关闭。
 */
const { ui } = useUi()
const route = useRoute()
const { flat, activeId, isOpen, available } = usePostToc()

const triggerEl = ref<HTMLButtonElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const bodyEl = ref<HTMLElement | null>(null)
/** 首屏不显示，避免 SSR 无数据时与服务端渲染结果打架 */
const mounted = ref(false)

/**
 * 只在文章页出现：/posts/<slug>，且真的解析出了目录。
 * 用 available（已含 showToc + enabled + 有标题）而不是只看路由 ——
 * 一篇文章如果只用了 H1，按钮点了会是空的。
 */
const isPost = computed(() => /^\/posts\/[^/]+$/.test(route.path))
const show = computed(() => mounted.value && isPost.value && available.value)

function openDrawer() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
  triggerEl.value?.focus()
}

/**
 * 跳转必须「先关再跳」：
 * 打开时页面被 overflow:hidden 锁住，此时 scrollIntoView 不会生效。
 */
function go(event: MouseEvent, id: string) {
  event.preventDefault()
  close()
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    history.pushState(null, '', `#${id}`)
    el.scrollIntoView({ block: 'start' })
  })
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

watch(isOpen, async (open) => {
  if (import.meta.server) return
  const root = document.documentElement
  if (open) {
    root.style.setProperty('overflow', 'hidden')
    await nextTick()
    panelEl.value?.querySelector<HTMLElement>('.toc-drawer-close')?.focus()
    // 目录可能比面板长：打开时先把当前项摆到中间，省得用户自己找
    const body = bodyEl.value
    if (!body || !activeId.value) return
    const index = flat.value.findIndex((item) => item.id === activeId.value)
    const item = body.querySelectorAll<HTMLElement>('.toc-item')[index]
    if (!item) return
    const box = body.getBoundingClientRect()
    const rect = item.getBoundingClientRect()
    const delta = rect.top - box.top - (box.height - rect.height) / 2
    body.scrollTo({ top: body.scrollTop + delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  } else {
    root.style.removeProperty('overflow')
  }
})

// 路由变化即关闭（点子项跳转后不该还盖在页面上）
watch(
  () => route.fullPath,
  () => {
    if (isOpen.value) close()
  },
)

function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key !== 'Tab') return
  const panel = panelEl.value
  if (!panel) return

  const focusables = [
    ...panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null || el === document.activeElement)

  if (!focusables.length) return

  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.removeProperty('overflow')
})
</script>

<template>
  <button
    v-if="show"
    ref="triggerEl"
    type="button"
    class="toc-trigger"
    :aria-label="isOpen ? ui.post.tocClose : ui.post.tocOpen"
    :aria-expanded="isOpen"
    aria-controls="post-toc-drawer"
    @click="isOpen ? close() : openDrawer()"
  >
    <Icon name="tabler:list" class="toc-trigger__icon" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <Transition name="toc-fade">
      <div v-if="isOpen" class="toc-overlay" @click="close" />
    </Transition>

    <Transition name="toc-slide">
      <aside
        v-if="isOpen"
        id="post-toc-drawer"
        ref="panelEl"
        class="toc-drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="ui.post.tocDialog"
      >
        <div class="toc-drawer-head">
          <p class="toc-drawer-title">{{ ui.post.toc }}</p>
          <button type="button" class="toc-drawer-close" :aria-label="ui.post.tocClose" @click="close">
            <Icon name="tabler:x" aria-hidden="true" />
          </button>
        </div>

        <nav ref="bodyEl" class="toc-drawer-body" :aria-label="ui.post.tocAria">
          <ul class="toc-list">
            <li
              v-for="item in flat"
              :key="item.id"
              class="toc-item"
              :class="[`depth-${item.depth}`, { 'is-active': activeId === item.id }]"
            >
              <a :href="`#${item.id}`" class="toc-link" @click="go($event, item.id)">{{ item.text }}</a>
            </li>
          </ul>
        </nav>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 触发按钮与 SearchTrigger / ThemeToggle 同规格：2rem 见方，半圆角 */
.toc-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.toc-trigger:hover {
  color: var(--foreground);
}

.toc-trigger__icon {
  font-size: 1.125rem;
}

/* ≥1280px 有右侧旁栏，按钮让位 */
@media (min-width: 1280px) {
  .toc-trigger {
    display: none;
  }
}

/* 比 MobileDrawer（60/61）高一层：手机上两个按钮并存，偶尔会同开 */
.toc-overlay {
  position: fixed;
  inset: 0;
  z-index: 62;
  background-color: color-mix(in srgb, var(--foreground) 25%, transparent);
}

.toc-drawer {
  position: fixed;
  z-index: 63;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(82vw, 20rem);
  display: flex;
  flex-direction: column;
  background-color: var(--background);
  border-inline-start: 1px solid var(--border);
  overscroll-behavior: contain;
}

.toc-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 0 0 auto;
  height: var(--header-height);
  padding-inline: var(--space-gutter);
  border-bottom: 1px solid var(--border);
}

.toc-drawer-title {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.toc-drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--muted-foreground);
  font-size: 1.125rem;
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.toc-drawer-close:hover {
  color: var(--foreground);
}

.toc-drawer-body {
  flex: 1;
  min-height: 0;
  padding-inline: var(--space-gutter);
  padding-block: var(--space-item);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 条目样式与桌面旁栏一致：左侧 1px 轨道，当前项把轨道染成 accent */
.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  border-inline-start: 1px solid var(--border);
}

.toc-item.depth-3 {
  padding-inline-start: 0.75rem;
}

.toc-link {
  display: flex;
  align-items: center;
  min-height: 2.25rem;
  padding-inline-start: 0.75rem;
  padding-block: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  border-inline-start: 1px solid transparent;
  margin-inline-start: -1px;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.toc-item.is-active .toc-link {
  color: var(--foreground);
  border-inline-start-color: var(--accent);
}

.toc-slide-enter-active,
.toc-slide-leave-active {
  transition: transform var(--duration-base) var(--easing-base);
}

.toc-slide-enter-from,
.toc-slide-leave-to {
  transform: translateX(100%);
}

.toc-fade-enter-active,
.toc-fade-leave-active {
  transition: opacity var(--duration-base) var(--easing-base);
}

.toc-fade-enter-from,
.toc-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .toc-slide-enter-active,
  .toc-slide-leave-active,
  .toc-fade-enter-active,
  .toc-fade-leave-active {
    transition: none;
  }
}
</style>
