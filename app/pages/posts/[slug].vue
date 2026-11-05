<script setup lang="ts">
const route = useRoute()
const { site } = useBlogConfig()
const { ui, t } = useUi()
const pageCfg = usePageConfig('post')
const posts = usePosts()
const { estimate, enabled: showReadingTime } = useReadingTime()
const { iso } = useDateFormat()

const path = computed(() => `/posts/${route.params.slug as string}`)

const { data: post } = await useAsyncData(
  () => `post-${path.value}`,
  () => queryCollection('posts').path(path.value).first(),
  { watch: [path] },
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: ui.post.notFound })
}

// 草稿在生产环境不可访问
if (post.value.draft && !import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: ui.post.notFound })
}

const { data: nav } = await useAsyncData(
  () => `post-nav-${path.value}`,
  () => posts.prevNext(path.value),
  { watch: [path] },
)

const { data: related } = await useAsyncData(
  () => `post-related-${path.value}`,
  () => (pageCfg.showRelated ? posts.related(path.value, pageCfg.relatedCount) : Promise.resolve([])),
  { watch: [path] },
)

/** 阅读时长：优先用 body 文本估算，无 body 时退回 description */
const readingMinutes = computed(() => {
  const body = post.value?.body
  if (!body) return estimate(post.value?.description ?? '')
  // minimark AST 转成纯文本再估算
  const text = JSON.stringify(body).replace(/"[^"]*":/g, '')
  return estimate(text)
})

const title = computed(() => post.value?.title ?? '')
const description = computed(() => post.value?.description ?? '')
const canonical = computed(() => `${site.url}${path.value}`)

useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
  ],
  link: [{ rel: 'canonical', href: canonical }],
})

const toc = computed(() => post.value?.body?.toc?.links ?? [])

/**
 * 规范化 Shiki 内联样式标签的逗号空格，消除正文 hydration 失配。
 * Vue 水合会按 CSS 规则重新序列化样式文本（逗号后补空格），
 * 与 SSR 原文逐字不等就触发 mismatch。这里让两端用同一份规范文本。
 * 详见 app/composables/useProseBody.ts 顶部注释。
 */
const normalizedBody = useNormalizedBody(post.value?.body)
const renderValue = computed(() =>
  post.value ? { ...post.value, body: normalizedBody } : post.value,
)
</script>

<template>
  <div v-if="post" class="page-post">
    <div class="post-shell">
      <article class="post-article">
        <header class="post-head">
          <h1 class="post-title">{{ post.title }}</h1>

          <div class="post-meta">
            <time class="meta-date" :datetime="iso(post.date)">{{ iso(post.date) }}</time>

            <span v-if="post.updated" class="meta-updated">
              {{ t(ui.post.updatedAt, { date: iso(post.updated) }) }}
            </span>

            <span v-if="showReadingTime" class="meta-reading">
              {{ t(ui.post.readingTime, { n: readingMinutes }) }}
            </span>

            <NuxtLink :to="`/categories/${post.category}`" class="meta-category">
              {{ post.category }}
            </NuxtLink>
          </div>

          <ul v-if="post.tags?.length" class="post-tags">
            <li v-for="tag in post.tags" :key="tag">
              <NuxtLink :to="`/tags/${tag}`" class="post-tag">{{ tag }}</NuxtLink>
            </li>
          </ul>
        </header>

        <!-- 移动端目录折叠在正文顶部（<1280px） -->
        <ProseToc :toc="toc" variant="inline" />

        <ImageLightbox :enabled="pageCfg.showImageViewer">
          <ProseBody>
            <ContentRenderer v-if="renderValue" :value="renderValue" />
          </ProseBody>
        </ImageLightbox>

        <CodeCopyButton v-if="pageCfg.showCopyButton" :enabled="pageCfg.showCopyButton" />

        <CommentSlot />
      </article>

      <!-- 桌面端目录旁栏，挂在正文右侧沟槽外 -->
      <aside class="post-aside">
        <ProseToc :toc="toc" variant="aside" />
      </aside>
    </div>

    <!-- 上一篇 / 下一篇 -->
    <nav v-if="pageCfg.showPrevNext && (nav?.prev || nav?.next)" class="post-nav" :aria-label="ui.post.navAria">
      <NuxtLink v-if="nav?.prev" :to="nav.prev.path" class="nav-item nav-prev">
        <span class="nav-dir">{{ ui.post.prev }}</span>
        <span class="nav-title">{{ nav.prev.title }}</span>
      </NuxtLink>
      <span v-else class="nav-item nav-empty" />

      <NuxtLink v-if="nav?.next" :to="nav.next.path" class="nav-item nav-next">
        <span class="nav-dir">{{ ui.post.next }}</span>
        <span class="nav-title">{{ nav.next.title }}</span>
      </NuxtLink>
    </nav>

    <!-- 相关文章 -->
    <section v-if="pageCfg.showRelated && related?.length" class="post-related">
      <h2 class="related-label">{{ ui.post.related }}</h2>
      <PostList :posts="related" :show-date="false" :show-tags="true" />
    </section>
  </div>
</template>

<style scoped>
.page-post {
  padding-block: var(--space-section) var(--space-block);
}

/* 默认单列；≥1280px 时正文 764px + 右侧目录沟槽 */
.post-shell {
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.post-head {
  margin-bottom: var(--space-block);
}

.post-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-top: 1rem;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

/* 元信息之间用 1px 竖线分隔，不用中点 */
.post-meta > * + *::before {
  content: '';
  display: inline-block;
  width: 1px;
  height: 0.75em;
  background-color: var(--border);
  margin-inline-end: 0.75rem;
  vertical-align: middle;
}

.meta-date {
  font-variant-numeric: tabular-nums;
}

.meta-category {
  transition: color var(--duration-base) var(--easing-base);
}

.meta-category:hover {
  color: var(--foreground);
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  margin-top: 0.75rem;
}

.post-tag {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.post-tag::before {
  content: '#';
  opacity: 0.5;
}

.post-tag:hover {
  color: var(--foreground);
}

.post-aside {
  display: none;
}

/* ---------- 上/下一篇 ---------- */
.post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  max-width: var(--content-max-width);
  margin: var(--space-section) auto 0;
  padding-inline: var(--space-gutter);
}

.nav-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 1rem;
  border: 1px solid var(--border);
  transition: background-color var(--duration-base) var(--easing-base);
}

.nav-item:not(.nav-empty):hover {
  background-color: var(--muted);
}

.nav-next {
  text-align: end;
}

.nav-empty {
  border-color: transparent;
}

.nav-dir {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.nav-title {
  font-size: var(--fs-meta);
  line-height: 1.5;
}

/* ---------- 相关 ---------- */
.post-related {
  max-width: var(--content-max-width);
  margin: var(--space-section) auto 0;
  padding-inline: var(--space-gutter);
}

.related-label {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  font-weight: 400;
  color: var(--muted-foreground);
  margin-bottom: 0.75rem;
}

/* ---------- 桌面：目录旁栏 ---------- */
@media (min-width: 1280px) {
  .post-shell {
    display: grid;
    grid-template-columns: minmax(0, var(--content-max-width)) var(--toc-width);
    gap: var(--toc-gap);
    max-width: calc(var(--content-max-width) + var(--toc-width) + var(--toc-gap));
    /* 正文仍在原位置，目录挂在右侧沟槽外 */
    justify-content: start;
    align-items: start;
  }

  .post-aside {
    display: block;
  }

  /* 桌面端隐藏正文顶部的折叠目录，避免重复 */
  .post-article :deep(.toc-mobile) {
    display: none;
  }
}

@media (max-width: 600px) {
  .post-nav {
    grid-template-columns: 1fr;
  }

  .nav-empty {
    display: none;
  }
}
</style>
