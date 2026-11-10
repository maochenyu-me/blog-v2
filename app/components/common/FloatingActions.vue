<script setup lang="ts">
/**
 * 浮动操作按钮：回到顶部（全局常驻，滚动离开页顶即从右缘弹入）。
 * 玻璃 pill 取本站 token，暗色下全局禁阴影规则会自动剥掉投影，
 * 只留玻璃底 + 1px 边框，与头部胶囊同一套语言。
 */
const { ui } = useUi()

const visible = ref(false)

let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    visible.value = window.scrollY > 1
    ticking = false
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

function backToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="fabs">
    <button
      class="fab fab--top"
      :class="{ 'fab--visible': visible }"
      :aria-label="ui.fab.backTopAria"
      :title="ui.fab.backTopTitle"
      @click="backToTop"
    >
      <Icon name="tabler:arrow-up" />
    </button>
  </div>
</template>

<style scoped>
.fabs {
  /* 按钮堆叠的基准：底部留白与按钮尺寸，移动端媒体查询统一改。
   * 1rem 而非 1.5rem：页脚面板收口后，回顶键随之下沉，
   * 与页脚最后一行文字仍保持 ~12px 间隙 */
  --fab-bottom: 1rem;
  --fab-size: 44px;
}

.fab {
  position: fixed;
  right: 1rem;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--fab-size);
  height: var(--fab-size);
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 18px;
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(100% + 20px));
  box-shadow: var(--glass-scrolled-shadow), var(--glass-highlight);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  transition:
    opacity 0.18s var(--easing-base),
    transform 0.18s var(--easing-base);
}

/* 出场：缩回右缘 */
.fab--top {
  bottom: var(--fab-bottom);
}

.fab:hover {
  color: var(--foreground);
}

/* 入场：从右缘弹入 */
.fab--visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
  transition: opacity 0.22s var(--easing-base), transform 0.22s var(--easing-base);
}

@media (max-width: 768px) {
  .fabs {
    --fab-size: 40px;
  }

  .fab {
    right: 0.75rem;
    font-size: 16px;
  }
}
</style>
