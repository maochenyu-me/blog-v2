<script setup lang="ts">
import { toSlug } from '~/utils/taxonomy'

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
 * 目录数据上报给共享状态：顶栏的目录按钮在 layout 里，与本文页是兄弟关系，
 * 拿不到这篇的 toc —— 只能这样交接（同 useSearch 的做法）。
 */
const postToc = usePostToc()
watchEffect(() => postToc.setLinks(toc.value as any))
onBeforeUnmount(() => postToc.clear())

/**
 * 把 Shiki 写进正文末尾的 style 节点摘出来，改由 head 注入。
 * 该节点的文本在 SSR HTML 与 _payload.json 里并不逐字相同
 * （构建期 CSS 压缩会吃掉 `{`、`:` 前后的空格），Vue 水合比对必然失配。
 * 详见 app/composables/useProseBody.ts 顶部注释。
 */
const prose = useProseBody(post.value?.body)
const renderValue = computed(() =>
  post.value ? { ...post.value, body: prose.body } : post.value,
)

useHead({
  style: prose.css ? [{ key: 'shiki', textContent: prose.css }] : [],
})
</script>

<template>
  <div v-if="post" class="page-post">
    <div class="post-shell">
      <article class="post-article">
        <!-- 面包屑放在 article 内：≥1280px 时 post-shell 是「正文 + 目录」两列 grid，
             作为独立 grid item 会抢占列位、打乱 article/aside 的自动放置 -->
        <SiteBreadcrumb :current="title" back />

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

            <NuxtLink :to="`/categories/${toSlug(post.category)}`" class="meta-category">
              {{ post.category }}
            </NuxtLink>
          </div>

          <ul v-if="post.tags?.length" class="post-tags">
            <li v-for="tag in post.tags" :key="tag">
              <NuxtLink :to="`/tags/${toSlug(tag)}`" class="post-tag">{{ tag }}</NuxtLink>
            </li>
          </ul>
        </header>

        <ImageLightbox :enabled="pageCfg.showImageViewer">
          <ProseBody>
            <ContentRenderer v-if="renderValue" :value="renderValue" />
          </ProseBody>
        </ImageLightbox>

        <CodeCopyButton v-if="pageCfg.showCopyButton" :enabled="pageCfg.showCopyButton" />
        <MathCopyButton v-if="pageCfg.showCopyButton" :enabled="pageCfg.showCopyButton" />
      </article>

      <!-- 桌面端目录旁栏，挂在正文右侧沟槽外（<1280px 时目录在顶栏按钮里） -->
      <aside class="post-aside">
        <ProseToc />
      </aside>
    </div>

    <!-- 上一篇 / 下一篇：一体式双格面板，缺侧格弱化占位保持结构对称 -->
    <nav v-if="pageCfg.showPrevNext && (nav?.prev || nav?.next)" class="post-nav" :aria-label="ui.post.navAria">
      <NuxtLink v-if="nav?.prev" :to="nav.prev.path" class="nav-item nav-prev">
        <span class="nav-dir">{{ ui.post.prev }}</span>
        <span class="nav-title">{{ nav.prev.title }}</span>
      </NuxtLink>
      <span v-else class="nav-item nav-empty">
        <span class="nav-empty-text">{{ ui.post.navEmptyPrev }}</span>
      </span>

      <NuxtLink v-if="nav?.next" :to="nav.next.path" class="nav-item nav-next">
        <span class="nav-dir">{{ ui.post.next }}</span>
        <span class="nav-title">{{ nav.next.title }}</span>
      </NuxtLink>
      <span v-else class="nav-item nav-empty">
        <span class="nav-empty-text">{{ ui.post.navEmptyNext }}</span>
      </span>
    </nav>

    <!-- 相关文章：三列小卡（与导航面板、评论区共享 1px 语言） -->
    <section v-if="pageCfg.showRelated && related?.length" class="post-related">
      <h2 class="related-label">{{ ui.post.related }}</h2>
      <div class="related-grid">
        <NuxtLink
          v-for="rel in related"
          :key="rel.path"
          :to="rel.path"
          class="related-card"
        >
          <span class="card-kicker">
            {{ rel.tags?.length ? rel.tags.slice(0, 2).map((tag) => `#${tag}`).join(' · ') : rel.category }}
          </span>
          <span class="card-title">{{ rel.title }}</span>
          <span v-if="(rel.tags?.length ?? 0) > 2" class="card-extra">
            {{ rel.tags.slice(2).map((tag) => `#${tag}`).join(' ') }}
          </span>
        </NuxtLink>
      </div>
    </section>

    <!-- Ecoku 评论区（仅文章页，相关文章下方） -->
    <EcokuComments :page-title="title" />
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

/* ---------- 上/下一篇：一体式双格面板 ---------- */
/*
 * 外框 1px + 格间 1px 间隙，页面底色从缝隙透出形成中缝分隔线；
 * 暗色下同一机制自然呈现深灰线，与全站 1px 线语言一致。
 */
.post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  width: calc(var(--content-max-width) - var(--space-gutter) * 2);
  /* 窄视口下随视口收缩，防止固定宽撑出横向滚动 */
  max-width: calc(100% - var(--space-gutter) * 2);
  margin: var(--space-section) auto 0;
  border: 1px solid var(--border);
}

.nav-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  min-height: 6.5rem;
  padding: 1.25rem;
  background-color: var(--card);
  transition: background-color var(--duration-base) var(--easing-base);
}

.nav-item:not(.nav-empty):hover {
  background-color: var(--muted);
}

.nav-item:not(.nav-empty):hover .nav-title {
  color: var(--accent);
}

.nav-next {
  text-align: end;
}

.nav-empty {
  justify-content: center;
  align-items: center;
}

.nav-empty-text {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.nav-dir {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--accent);
}

.nav-title {
  font-size: var(--fs-meta);
  line-height: 1.5;
  transition: color var(--duration-base) var(--easing-base);
}

/* ---------- 相关：三列小卡 ---------- */
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

.related-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.related-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  border: 1px solid var(--border);
  transition: border-color var(--duration-base) var(--easing-base);
}

.related-card:hover {
  border-color: var(--muted-foreground);
}

.related-card:hover .card-title {
  color: var(--accent);
}

.card-kicker,
.card-extra {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title {
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  color: var(--foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.card-extra {
  margin-top: auto;
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

  /*
   * 目录吸顶必须挂在 grid item（aside）上，不能挂在它内部的 <nav> 上：
   * grid item 的包含块是整个 grid area（由正文列撑开的整行高度），才有滑动区间。
   */
  .post-aside {
    display: block;
    position: sticky;
    top: calc(var(--header-height) + var(--toc-sticky-offset));
    align-self: start;
    /* 目录比视口高时内部滚动，上下各留一个 stickyOffset */
    max-height: calc(100dvh - var(--header-height) - var(--toc-sticky-offset) * 2);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}

/* 平板：相关卡收成两列 */
@media (max-width: 1024px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .post-nav {
    grid-template-columns: 1fr;
  }

  .nav-empty {
    display: none;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>
