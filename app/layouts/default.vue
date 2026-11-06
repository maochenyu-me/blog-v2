<script setup lang="ts">
const { site, feed } = useBlogConfig()
const theme = useTheme()

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
    <SiteHeader />

    <main id="main-content" class="app-main">
      <slot />
    </main>

    <SiteFooter />
    <SearchDialog />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-main {
  flex: 1;
}
</style>
