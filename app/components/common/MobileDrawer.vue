<script setup lang="ts">
/**
 * 侧边导航抽屉 —— <1024px（手机 + 平板）共用。
 *
 * 取代了原来的两套实现：
 * - `MobileTabBar.vue`：<768px 固定底部 Tab 栏
 * - `MobileNav.vue`：768–1023px 顶部下拉 sheet
 * 两者都是单层平铺，撑不住两级导航（用户决策 3、5）。
 *
 * 形态按用户决策 8：贴边矩形面板 + 1px 左边框。
 * 即无圆角、无阴影、无毛玻璃 —— 与 Dusklight 参考实现刻意不同，
 * 那套是浮动药丸 + backdrop-filter，与本项目设计语言冲突（§5.2 / §5.4）。
 *
 * ── 为什么用 v-if 而不是只做 transform ─────────────
 * 只把面板 translateX(100%) 推出屏幕时，DOM 还在，
 * 键盘 Tab 会聚焦到看不见的链接上 —— 这是货真价实的可访问性缺陷。
 * 所以整块随 open 挂载/卸载，进出用 <Transition> 补动画。
 */
const { site } = useBlogConfig()
const { ui } = useUi()
const route = useRoute()

const open = ref(false)
const triggerEl = ref<HTMLButtonElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

function openDrawer() {
  open.value = true
}

function close() {
  open.value = false
  // 焦点还给触发按钮，否则键盘用户关抽屉后落回文档开头
  triggerEl.value?.focus()
}

/**
 * 打开时锁背景滚动，并把焦点送进面板，
 * 避免 Tab 键从页面顶部开始走一遍被遮住的内容。
 * 关闭时恢复 —— 与 SearchDialog 的锁法保持一致。
 */
watch(open, async (isOpen) => {
  if (import.meta.server) return
  const root = document.documentElement
  if (isOpen) {
    root.style.setProperty('overflow', 'hidden')
    await nextTick()
    panelEl.value?.querySelector<HTMLElement>('.drawer-close')?.focus()
  } else {
    root.style.removeProperty('overflow')
  }
})

// 路由变化即关闭：点子项跳转后抽屉不该还盖在页面上
watch(
  () => route.fullPath,
  () => {
    if (open.value) open.value = false
  },
)

/**
 * Escape 关闭 + Tab 焦点循环。
 *
 * 监听挂在 window 上而不是面板 div：焦点可能落在面板内任意位置，
 * 用户按 Esc 时事件不一定冒泡到我们绑定的那个元素。
 */
function onKeydown(event: KeyboardEvent) {
  if (!open.value) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  // aria-modal="true" 声明了这是模态，就该把 Tab 关在面板里，
  // 否则用户会 Tab 到背后被遮住的页面上。
  if (event.key !== 'Tab') return
  const panel = panelEl.value
  if (!panel) return

  const focusables = [
    ...panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
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

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.removeProperty('overflow')
})
</script>

<template>
  <button
    ref="triggerEl"
    type="button"
    class="drawer-trigger"
    :aria-label="open ? ui.nav.menuClose : ui.nav.menuOpen"
    :aria-expanded="open"
    aria-controls="site-drawer"
    @click="open ? close() : openDrawer()"
  >
    <Icon :name="open ? 'tabler:x' : 'tabler:menu-2'" class="drawer-trigger__icon" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="open" class="drawer-overlay" @click="close" />
    </Transition>

    <Transition name="drawer-slide">
      <aside
        v-if="open"
        id="site-drawer"
        ref="panelEl"
        class="drawer"
        role="dialog"
        aria-modal="true"
        :aria-label="ui.nav.menuDialog"
      >
        <div class="drawer-head">
          <NuxtLink to="/" class="drawer-wordmark" @click="close">{{ site.shortName }}</NuxtLink>
          <button type="button" class="drawer-close" :aria-label="ui.nav.menuClose" @click="close">
            <Icon name="tabler:x" aria-hidden="true" />
          </button>
        </div>

        <nav class="drawer-body" :aria-label="ui.nav.mobile">
          <NavTree :items="site.nav" />
        </nav>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.drawer-trigger:hover {
  color: var(--foreground);
}

.drawer-trigger__icon {
  font-size: 1.25rem;
}

/* 桌面端有完整导航条，触发按钮隐藏 */
@media (min-width: 1024px) {
  .drawer-trigger {
    display: none;
  }
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background-color: color-mix(in srgb, var(--foreground) 25%, transparent);
}

.drawer {
  position: fixed;
  z-index: 61;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(82vw, 20rem);
  display: flex;
  flex-direction: column;
  background-color: var(--background);
  /* 决策 8：贴边、矩形、1px 左边框 —— 不用圆角也不用阴影做浮层感 */
  border-inline-start: 1px solid var(--border);
  /* 抽屉本身滚，页面锁住；safari 的橡皮筋不会带出背后内容 */
  overflow-y: auto;
  overscroll-behavior: contain;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 0 0 auto;
  height: var(--header-height);
  padding-inline: var(--space-gutter);
  border-bottom: 1px solid var(--border);
}

.drawer-wordmark {
  font-size: var(--fs-body);
  font-weight: var(--fw-body-h);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--muted-foreground);
  font-size: 1.25rem;
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.drawer-close:hover {
  color: var(--foreground);
}

.drawer-body {
  flex: 1;
  padding-inline: var(--space-gutter);
  padding-block: var(--space-item);
}

/* ── 进出场动画 ──
   抽屉从右侧滑入，遮罩淡入。时长与全站统一走 --duration-base（200ms）。 */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform var(--duration-base) var(--easing-base);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity var(--duration-base) var(--easing-base);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

/* 减少动效偏好：直接出现，不滑不淡 */
@media (prefers-reduced-motion: reduce) {
  .drawer-slide-enter-active,
  .drawer-slide-leave-active,
  .drawer-fade-enter-active,
  .drawer-fade-leave-active {
    transition: none;
  }
}
</style>
