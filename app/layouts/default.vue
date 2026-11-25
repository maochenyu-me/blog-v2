<script setup lang="ts">
const { site, feed } = useBlogConfig()
const theme = useTheme()
const route = useRoute()
const { ui } = useUi()
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

    <a href="#main-content" class="skip-link" data-safego-ignore>{{ ui.common.skipToContent }}</a>

    <SiteHeader />

    <main id="main-content" class="app-main">
      <slot />
    </main>

    <SiteFooter v-if="!musicPage" />
    <LazySearchDialog hydrate-on-idle />
    <FloatingActions v-if="!musicPage" />
    <MusicPlayer />
  </div>
</template>

<style scoped>
.skip-link {
  position: fixed;
  inset-inline: 0;
  top: -100%;
  z-index: 100;
  width: min(20rem, calc(100% - var(--space-gutter) * 2));
  margin-inline: auto;
  padding: 0.75rem 1rem;
  border: 1px solid var(--accent);
  background-color: var(--background);
  color: var(--foreground);
  text-align: center;
  font-size: var(--fs-meta);
}

.skip-link:focus {
  top: var(--space-gutter);
}

.site-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  /*
   * 三层结构（与参考站 background-image: gradient, url 的层序同义）：
   *   ::before 图片层 —— 延后加载（app/plugins/backdrop-deferred.client.ts），
   *                      --backdrop-image 由客户端在 load 之后写入根元素，
   *                      opacity 渐显，避免晚到的图「跳」出来；
   *   ::after  遮罩层 —— --backdrop-gradient 以视口为基准盖在图片上方。
   * 遮罩必须在图片之上：图片只在视口上部透出、向下淡出到纯背景色，
   * 正文直接坐在近纯色画布上 —— 这是不靠面板的可读性来源（参考站把
   * gradient 放在 background-image 首层正是这个用意）。
   * 整层再统一吃 filter（blur+saturate）与 opacity（参考站实测同值）。
   */
  filter: var(--backdrop-filter);
  opacity: var(--backdrop-opacity);
  /* 放大盖住模糊边缘，防止四周露出模糊发虚的接缝 */
  transform: scale(1.035);
  transform-origin: top;
}

/* 图片层：变量未定义时 background-image 为空，opacity 保持 0 → 不可见 */
.site-backdrop::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--backdrop-image, none);
  background-position: top center;
  background-size: cover;
  background-repeat: no-repeat;
  /* 变量由插件注入 → 该元素从无图变为有图，过渡由下面的 opacity 驱动 */
  opacity: var(--backdrop-image-opacity, 0);
  transition: opacity 320ms var(--easing-base);
}

/* 渐变遮罩层：::after 后绘于 ::before 之上，压淡图片、守住正文可读性 */
.site-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--backdrop-gradient);
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
