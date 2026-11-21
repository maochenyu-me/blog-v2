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
        <NavPanel />
        <!--
          移动端站名换成图标圆标（参考站同款）：窄屏上文字站名挤压右胶囊
          （≤375px 时还要省略号），一个 house 图标的回首页语义比头像更干净
          （头像需裁圆且亮暗不受控，图标直接吃 --foreground / --accent）。
          两个节点各自挂显示断点，aria-label 都带站名保证读屏一致。
        -->
        <NuxtLink to="/" class="wordmark-mark" :aria-label="site.name">
          <Icon name="tabler:home" class="wordmark-mark-icon" aria-hidden="true" />
        </NuxtLink>
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
  border-radius: var(--radius-base);
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

/*
 * 图标圆标（仅移动端显示）：替代窄屏上被挤压的站名。
 * 与右胶囊的动作按钮同尺寸（40px），玻璃边色描边、图标取 --foreground，
 * hover 染 accent（描边 + 底 + 图标色），反馈与参考站 nav-icon-btn 一致。
 */
.wordmark-mark {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  color: var(--foreground);
  /* 与左侧指纹触发钮（1.25rem）同号，两枚圆钮里的图标光学大小一致 */
  font-size: 1.25rem;
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.wordmark-mark-icon {
  width: 1em;
  height: 1em;
}

.wordmark-mark:hover {
  color: var(--accent);
  background-color: color-mix(in srgb, var(--accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--accent) 24%, transparent);
}

/* 移动端：站名让位给图标圆标 */
@media (max-width: 640px) {
  .wordmark {
    display: none;
  }

  .wordmark-mark {
    display: inline-flex;
  }
}

.header-pill--left {
  min-width: 0;
}

.header-pill--left > :deep(.nav-panel-root),
.header-pill--left > .wordmark,
.header-pill--left > .wordmark-mark {
  transform: translateX(-0.5rem);
}

.header-pill--right {
  gap: 0.25rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0;
}

@media (prefers-reduced-motion: reduce) {
  .header-pill,
  .header-pill::before,
  .header-pill::after {
    transition: none;
  }
}
</style>
