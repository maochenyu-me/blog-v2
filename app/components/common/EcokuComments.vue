<script setup lang="ts">
/**
 * Ecoku 评论区（仅文章页使用，挂在相关文章下方）。
 *
 * 接入方式：npm 包 ecoku 的 SDK，onMounted 后动态 import（纯客户端，
 * SSR/预渲染输出空壳，不参与水合比对）。路由在两篇文章间切换时
 * [slug].vue 实例复用，靠 setPageKey 换页；离开文章页时 destroy。
 *
 * 主题：theme: 'auto' 时 Ecoku 读取宿主 CSS 变量与 color-scheme。
 * 下面的 :deep 规则把 --ecoku-* 映射到本站 token，.dark 切换时
 * CSS 变量级联生效，评论区即时跟随明暗，不重建实例、不清草稿。
 */
const props = defineProps<{ pageTitle: string }>()

const route = useRoute()
const pageCfg = usePageConfig('post')
const { ui } = useUi()

const mount = ref<HTMLElement | null>(null)
// SDK 类型仅作标注，运行时走动态 import，不进首屏 chunk
type EcokuClient = import('ecoku').default
let ecoku: EcokuClient | null = null

onMounted(async () => {
  const { comments } = pageCfg
  if (!comments?.enabled || !mount.value) return
  const initialPath = route.path
  try {
    const { default: Ecoku } = await import('ecoku')
    ecoku = new Ecoku({
      container: mount.value,
      serverURL: comments.serverUrl,
      siteId: comments.siteId,
      pageKey: route.path,
      pageTitle: props.pageTitle,
      pageSize: comments.pageSize,
      theme: 'auto',
      i18n: 'zh-CN',
    })
    await ecoku.init()
    // init 期间用户已切到另一篇文章：补同步 pageKey，避免评论串页
    if (route.path !== initialPath) {
      await ecoku.setPageKey(route.path, props.pageTitle)
    }
  } catch (err) {
    console.error('[EcokuComments] init failed', err)
    ecoku = null
  }
})

// 客户端路由在文章间跳转（同一路由记录，组件实例复用）
watch(
  () => route.path,
  (path) => {
    if (ecoku?.isInitialized()) {
      ecoku.setPageKey(path, props.pageTitle).catch(console.error)
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  ecoku?.destroy()
  ecoku = null
})
</script>

<template>
  <section
    v-if="pageCfg.comments?.enabled"
    id="comments"
    class="post-comments"
    :aria-label="ui.comment.aria"
  >
    <div ref="mount" class="comments-mount" />
  </section>
</template>

<style scoped>
.post-comments {
  max-width: var(--content-max-width);
  margin: var(--space-section) auto 0;
  padding-inline: var(--space-gutter);
  padding-top: var(--space-item);
  border-top: 1px solid var(--border);
  /* 目录头部「跳转到评论」锚点的落点：与标题锚点同样避让吸顶导航 */
  scroll-margin-top: calc(var(--header-height) + var(--toc-sticky-offset));
}

.comments-mount:not(:empty) {
  margin-top: var(--space-item);
}

/*
 * 主题映射：Ecoku 默认样式用 :where() 零优先级声明，
 * 这里同名变量直接覆盖，无需 !important。
 * 全部取自本站 token，.dark 类切换时自动跟随。
 */
.post-comments :deep(.ecoku-comments) {
  --ecoku-theme: var(--background);
  --ecoku-entry: var(--background);
  --ecoku-primary: var(--foreground);
  --ecoku-secondary: var(--muted-foreground);
  --ecoku-content: var(--foreground);
  --ecoku-border: var(--border);
  --ecoku-border-soft: var(--border);
  --ecoku-surface-muted: var(--muted);
  --ecoku-accent: var(--accent);
  --ecoku-focus: var(--accent);
  --ecoku-radius: var(--radius);
  --ecoku-radius-sm: 0.25rem;
  --ecoku-font-mono: var(--font-mono);
  --ecoku-font-size: var(--fs-body);
  --ecoku-font-size-small: var(--fs-meta);
  --ecoku-font-size-title: 1.25rem;
  --ecoku-shadow: 0 8px 24px rgb(24 24 27 / 0.08);
}
</style>
