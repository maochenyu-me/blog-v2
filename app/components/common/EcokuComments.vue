<script setup lang="ts">
/**
 * Ecoku 评论区（文章页挂相关文章下方；留言板页作为整页评论区）。
 *
 * 接入方式：npm 包 ecoku 的 SDK，onMounted 后动态 import（纯客户端，
 * SSR/预渲染输出空壳，不参与水合比对）。
 *
 * 两种作用域模式由 source 决定：
 *   - post（默认）：pageKey 跟随 route.path。路由在两篇文章间切换时
 *     实例复用，靠 setPageKey 换页；离开文章页时 destroy。
 *   - message：pageKey 固定为 scopeKey（留言板），不随 URL 漂移，
 *     因此不挂路由监听，评论区始终落在同一个留言作用域里。
 *
 * 主题：theme: 'auto' 时 Ecoku 读取宿主 CSS 变量与 color-scheme。
 * 下面的 :deep 规则把 --ecoku-* 映射到本站 token，.dark 切换时
 * CSS 变量级联生效，评论区即时跟随明暗，不重建实例、不清草稿。
 */
const props = withDefaults(
  defineProps<{
    pageTitle: string
    /** 配置来源：post（文章页）| message（留言板） */
    source?: 'post' | 'message'
    /** 固定作用域键；提供后不随路由变化（留言板用） */
    scopeKey?: string
    /** 撑满父容器宽度（默认限制在正文列宽 764px） */
    fullWidth?: boolean
  }>(),
  { source: 'post', scopeKey: '', fullWidth: false },
)

const route = useRoute()
const { ui } = useUi()

// 两份配置都取（composable 不能在分支里调用）；按 source 选其一
const postComments = usePageConfig('post').comments
const messageComments = usePageConfig('message').comments
const comments = computed(() => (props.source === 'message' ? messageComments : postComments))

/** 作用域键：固定键优先，否则跟随路由 */
const currentKey = () => props.scopeKey || route.path

const mount = ref<HTMLElement | null>(null)
// SDK 类型仅作标注，运行时走动态 import，不进首屏 chunk
type EcokuClient = import('ecoku').default
let ecoku: EcokuClient | null = null

onMounted(async () => {
  if (!comments.value?.enabled || !mount.value) return
  const initialKey = currentKey()
  try {
    const { default: Ecoku } = await import('ecoku')
    ecoku = new Ecoku({
      container: mount.value,
      serverURL: comments.value.serverUrl,
      siteId: comments.value.siteId,
      pageKey: initialKey,
      pageTitle: props.pageTitle,
      pageSize: comments.value.pageSize,
      theme: 'auto',
      i18n: 'zh-CN',
    })
    await ecoku.init()
    // init 期间路由已切走（仅 post 模式可能）：补同步，避免评论串页
    if (currentKey() !== initialKey) {
      await ecoku.setPageKey(currentKey(), props.pageTitle)
    }
  } catch (err) {
    console.error('[EcokuComments] init failed', err)
    ecoku = null
  }
})

// 仅 post 模式（未固定作用域）跟随客户端路由在文章间跳转
watch(
  () => route.path,
  (path) => {
    if (props.scopeKey || !ecoku?.isInitialized()) return
    ecoku.setPageKey(path, props.pageTitle).catch(console.error)
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
    v-if="comments?.enabled"
    id="comments"
    class="ecoku-comments-section"
    :class="{ 'ecoku-comments-section--full': fullWidth }"
    :aria-label="ui.comment.aria"
  >
    <div ref="mount" class="comments-mount" />
  </section>
</template>

<style scoped>
.ecoku-comments-section {
  max-width: var(--content-max-width);
  margin: var(--space-section) auto 0;
  padding-inline: var(--space-gutter);
  padding-top: var(--space-item);
  border-top: 1px solid var(--border);
  /* 目录头部「跳转到评论」锚点的落点：与标题锚点同样避让吸顶导航 */
  scroll-margin-top: calc(var(--header-height) + var(--toc-sticky-offset));
}

/* 留言板：宽度交给页面容器，不再二次收窄 */
.ecoku-comments-section--full {
  max-width: none;
  margin-top: 0;
  padding-inline: 0;
}

/*
 * Ecoku 自带 `.ecoku-comments { max-width: 720px }`（普通类，非 :where），
 * 在留言板里会把评论区收窄并居中，与上方 952px 的内容卡错位。
 * 本选择器编译后为 0,2,0 > 0,1,0，可直接覆盖。
 */
.ecoku-comments-section--full :deep(.ecoku-comments) {
  max-width: none;
}

.comments-mount:not(:empty) {
  margin-top: var(--space-item);
}

/*
 * 主题映射：Ecoku 默认样式用 :where() 零优先级声明，
 * 这里同名变量直接覆盖，无需 !important。
 * 全部取自本站 token，.dark 类切换时自动跟随。
 */
.ecoku-comments-section :deep(.ecoku-comments) {
  --ecoku-theme: var(--card);
  --ecoku-entry: var(--card);
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
