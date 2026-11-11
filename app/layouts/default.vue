<script setup lang="ts">
const { site, feed } = useBlogConfig()
const theme = useTheme()

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

    <SiteHeader />

    <main id="main-content" class="app-main">
      <slot />
    </main>

    <SiteFooter />
    <SearchDialog />
    <FloatingActions />
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

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  /*
   * 给贴底常驻的界面留出呼吸位：左下角音乐折叠按钮（2.25rem）+ 间距。
   * 不加的话页脚最后几行永远压在按钮下面滚不上来。
   * 用 padding 而不是 margin-bottom，配合 box-sizing: border-box（main.css 已全局设置）。
   */
  padding-bottom: 3rem;
}

.app-main {
  flex: 1;
}
</style>
