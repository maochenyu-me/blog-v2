<script setup lang="ts">
const { site } = useBlogConfig()

/**
 * 滚动点亮态。SSR 端恒为 false（与预渲染 HTML 快照一致，无 hydration mismatch），
 * onMounted 时先同步一次真实位置（处理「刷新时已在页面中部」），再挂被动监听。
 */
const scrolled = ref(false)

let onScroll: (() => void) | null = null
let ticking = false

onMounted(() => {
  scrolled.value = window.scrollY > 20
  onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      scrolled.value = window.scrollY > 20
      ticking = false
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (onScroll) window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <header class="site-header" :class="{ 'header-scrolled': scrolled }">
    <div class="header-inner">
      <div class="header-pill header-pill--left">
        <NuxtLink to="/" class="wordmark" :aria-label="site.name">
          {{ site.name }}
        </NuxtLink>
      </div>

      <div class="header-pill header-pill--right">
        <NavDropdown :items="site.nav" />

        <div class="header-actions">
          <SearchTrigger />
          <!-- 目录按钮只出现在文章页（<1280px），内部自行判断是否显示 -->
          <MobileToc />
          <ThemeToggle />
          <MobileDrawer />
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/*
 * Dusklight 式双胶囊导航：外层 sticky 只负责留白与吸顶，
 * 玻璃底 / 描边 / 阴影全部长在胶囊上。初始透明，滚动 >20px 后点亮。
 */
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  padding: var(--header-pad-y) var(--header-pad-x);
}

.header-inner {
  max-width: var(--home-max-width);
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.header-pill {
  position: relative;
  display: flex;
  align-items: center;
  min-height: var(--header-pill-height);
  padding: 0.375rem 0.625rem;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  transition:
    transform var(--duration-slow) var(--easing-base),
    border-color var(--duration-slow) var(--easing-base);
}

/* 玻璃底：backdrop-filter 挂在伪元素上，opacity 过渡点亮 */
.header-pill::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: -1;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  box-shadow: var(--glass-highlight);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-slow) var(--easing-base);
}

/* Apple 式边缘反光：双线性渐变 + 径向遮罩，仅边缘留光 */
.header-pill::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: -1;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 40%),
    linear-gradient(315deg, rgba(255, 255, 255, 0.08) 0%, transparent 30%);
  -webkit-mask-image: radial-gradient(ellipse at center, transparent 60%, #000 100%);
  mask-image: radial-gradient(ellipse at center, transparent 60%, #000 100%);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-slow) var(--easing-base);
}

.header-scrolled .header-pill {
  border-color: var(--glass-border);
  box-shadow: var(--glass-scrolled-shadow), var(--glass-highlight);
  transform: translateY(6px);
}

.header-scrolled .header-pill::before,
.header-scrolled .header-pill::after {
  opacity: 1;
}

.wordmark {
  font-size: var(--fs-body);
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.header-pill--left {
  min-width: 0;
}

.header-pill--right {
  gap: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .header-pill,
  .header-pill::before,
  .header-pill::after {
    transition: none;
  }
}

/* 极窄屏：站名省略号，避免把右胶囊挤出视口 */
@media (max-width: 375px) {
  .wordmark {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
