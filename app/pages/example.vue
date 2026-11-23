<script setup lang="ts">
import type { MetaSlotsTree } from '~~/remark-plugins/rehype-meta-slots'

/**
 * 组件示例预览页（previews collection，/example）。
 * 布局沿用 posts/[slug].vue 的骨架：正文 + 右侧目录沟槽 + 玻璃面板。
 * 差异：无头卡/AI 摘要/上下篇/相关文章/评论区，正文末尾渲染 meta-copyright 插槽。
 */
const { site } = useBlogConfig()
const { ui, t } = useUi()

const path = '/example'

const { data: page } = await useAsyncData(
  () => `preview-${path}`,
  () => queryCollection('previews').path(path).first(),
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: ui.post.notFound })
}

const title = computed(() => page.value?.title ?? '')
const canonical = computed(() => `${site.url}${path}`)

useHead({
  title,
  meta: [
    { name: 'description', content: t(ui.preview.description, { name: site.name }) },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: title },
    { property: 'og:url', content: canonical },
  ],
  link: [{ rel: 'canonical', href: canonical }],
})

const toc = computed(() => page.value?.body?.toc?.links ?? [])

/** 目录上报共享状态（同 posts 页：顶栏按钮在 layout 里拿不到本页 toc） */
const postToc = usePostToc()
watchEffect(() => postToc.setLinks(toc.value as any))
onBeforeUnmount(() => postToc.clear())

/** Shiki style 节点摘出到 head（水合失配规避，同 posts 页） */
const prose = useProseBody(page.value?.body)
const renderValue = computed(() =>
  page.value ? { ...page.value, body: prose.body } : page.value,
)

useHead({
  style: prose.css ? [{ key: 'shiki', textContent: prose.css }] : [],
})

/**
 * frontmatter aside 数组去掉 toc 项，剩下的就是 meta 插槽名。
 * frontmatter 写的是 meta-aside-foo / meta-aside-bar，
 * 而 rehype-meta-slots 存入 slots 时去掉 meta- 前缀（键为 aside-foo / aside-bar）。
 */
const asideSlotNames = computed(() => {
  // schema 外字段（aside）被 @nuxt/content 收进 meta
  const aside = (page.value as { meta?: { aside?: unknown } })?.meta?.aside
  if (!Array.isArray(aside)) return []
  return aside
    .filter((n): n is string => typeof n === 'string' && n !== 'toc')
    .map(n => (n.startsWith('meta-') ? n.slice('meta-'.length) : n))
})

/** meta 插槽树存于 page.meta.slots（schema 外字段被 @nuxt/content 收进 meta） */
function slotTree(name: string): MetaSlotsTree | undefined {
  const slots = (page.value as { meta?: { slots?: Record<string, MetaSlotsTree> } })?.meta?.slots
  return slots?.[name]
}
</script>

<template>
  <div v-if="page" class="page-preview">
    <div class="preview-shell">
      <article class="preview-article">
        <SiteBreadcrumb :current="title" back />

        <header class="preview-header">
          <h1 class="preview-title">{{ title }}</h1>
          <p class="preview-hint">{{ ui.preview.hint }}</p>
        </header>

        <ImageLightbox :enabled="true">
          <ProseBody>
            <ContentRenderer v-if="renderValue" :value="renderValue" />
            <MetaSlotsRenderer :tree="slotTree('copyright')" class="preview-copyright" />
          </ProseBody>
        </ImageLightbox>

        <CodeCopyButton :enabled="true" />
        <MathCopyButton :enabled="true" />
      </article>

      <aside class="preview-aside">
        <div class="aside-toc">
          <ProseToc class="aside-panel glass-panel" />
          <template v-for="name in asideSlotNames" :key="name">
            <MetaSlotsRenderer :tree="slotTree(name)" class="aside-panel glass-panel" />
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-preview {
  padding-block: var(--space-section) var(--space-block);
}

.preview-shell {
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.preview-aside {
  display: none;
}

.preview-header {
  margin-block: var(--space-item) var(--space-section);
}

.preview-title {
  font-size: var(--text-h1);
  font-weight: 700;
  line-height: 1.25;
}

.preview-hint {
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--text-meta);
  color: var(--muted-foreground);
}

@media (min-width: 1280px) {
  .preview-shell {
    display: grid;
    grid-template-columns: minmax(0, var(--content-max-width)) var(--toc-width);
    gap: var(--toc-gap);
    max-width: calc(var(--content-max-width) + var(--toc-width) + var(--toc-gap));
    justify-content: start;
    align-items: stretch;
  }

  .preview-aside {
    display: flex;
    flex-direction: column;
    gap: var(--space-item);
    min-width: 0;
  }

  .aside-toc {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: calc(var(--header-height) + var(--toc-sticky-offset));
    align-self: start;
  }

  .aside-panel {
    padding: 1.25rem 1rem;
  }
}
</style>
