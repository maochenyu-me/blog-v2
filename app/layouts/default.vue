<script setup lang="ts">
const { site, feed } = useBlogConfig()
const theme = useTheme()
const route = useRoute()
const musicPage = computed(() => route.path.replace(/\/$/, '') === '/music')

/**
 * 全站背景图（LiuShen 式 backdrop）。
 * enabled 是构建期常量，false 时整层不渲染，SSG 产物零成本。
 * 层级用 z-index:-1：html 无背景色，body 背景已传播到画布，
 * 本层恰好落在「画布之上、一切内容之下」，不动任何组件的层叠关系。
 */
const backdropEnabled = (useAppConfig().theme as any)?.backdrop?.enabled !== false

// 防 FOUC 的内联主题脚本已移到 nuxt.config.ts 的 app.head，
// 因为 404 / error 页不渲染布局，只在布局注入会让这些页面闪白。
onMounted(() => theme.init())

/**
 * feed 自动发现链接。
 * 直接给 useHead 传普通数组（不是 computed / 函数），
 * 因为 unhead 的 link 只接受 ResolvableArray，数组元素本身支持响应式。
 * 用 getter 取 current 值，在 setup 阶段求值一次即可 —— feed 开关是构建期常量。
 */
const feedLinks: Array<{
  rel: 'alternate'
  type: string
  title: string
  href: string
}> = []

if (feed.rss.enabled) {
  feedLinks.push({
    rel: 'alternate',
    type: 'application/rss+xml',
    title: site.name,
    href: site.url + feed.rss.path,
  })
}
if (feed.atom.enabled) {
  feedLinks.push({
    rel: 'alternate',
    type: 'application/atom+xml',
    title: site.name,
    href: site.url + feed.atom.path,
  })
}

useHead({ link: feedLinks })
</script>

<template>
  <div class="app-shell">
    <div v-if="backdropEnabled" class="site-backdrop" aria-hidden="true" />
    <div v-if="backdropEnabled" class="paper-grain" aria-hidden="true" />

    <SiteHeader />

    <main id="main-content" class="app-main">
      <slot />
    </main>

    <SiteFooter v-if="!musicPage" />
    <SearchDialog />
    <FloatingActions v-if="!musicPage" />
    <MusicPlayer />
  </div>
</template>

<style scoped>
.site-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background-image: var(--backdrop-gradient), var(--backdrop-image);
  background-position: top center;
  background-size: cover;
  background-repeat: no-repeat;
  filter: var(--backdrop-filter);
  opacity: var(--backdrop-opacity);
  /* 放大盖住模糊边缘，防止四周露出模糊发虚的接缝 */
  transform: scale(1.035);
  transform-origin: top;
}

/*
 * 纸纹层 —— 「宣纸墨书」浅色风格的纸面质感。
 * 独立于 .site-backdrop 的兄弟层（backdrop 有 blur 滤镜，噪点放里面会被糊掉），
 * 同为 z-index:-1，DOM 在后故叠在背景图之上、仍在一切内容之下。
 * SVG feTurbulence 生成暖棕纤维噪点，0.05 透明度隐约可见，零网络请求。
 */
.paper-grain {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.24 0 0 0 0 0.19 0 0 0 0 0.12 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E");
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  /*
   * 这里刻意不加 padding-bottom：页脚玻璃面板要直接贴到视口底部，
   * 固定按钮（音乐播放器左下、回顶键右下）的容身位由页脚自身的
   * --space-widget-clearance 底 padding 承担（按钮浮在玻璃上，视觉一体）。
   */
}

.app-main {
  flex: 1;
}
</style>
