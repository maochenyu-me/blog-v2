<script setup lang="ts">
const route = useRoute()
const { site, reward, copyright } = useBlogConfig()
const { ui } = useUi()
const pageCfg = usePageConfig('post')
const posts = usePosts()
const { countWords } = useReadingTime()
const { pagePv, pageUv, track: trackBsz } = useBusuanzi()

/** 分享 / 打赏弹窗开关 */
const shareOpen = ref(false)
const rewardOpen = ref(false)

const path = computed(() => `/posts/${route.params.slug as string}`)

/** 文章页计数：进入时上报一次；SPA 站内切换文章时组件复用，重新上报 */
onMounted(trackBsz)
watch(path, () => trackBsz())

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

/** 正文纯文本（minimark AST 摊平），阅读时长与字数共用同一份估算 */
const bodyText = computed(() => {
  const body = post.value?.body
  if (!body) return post.value?.description ?? ''
  // minimark AST 转成纯文本再估算
  return JSON.stringify(body).replace(/"[^"]*":/g, '')
})

const wordCount = computed(() => countWords(bodyText.value))

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

        <PostHeaderCard
          :title="post.title"
          :date="post.date"
          :updated="post.updated"
          :category="post.category"
          :words="wordCount"
          :pv="pageCfg.showBusuanzi ? pagePv : null"
          :uv="pageCfg.showBusuanzi ? pageUv : null"
          :show-share="pageCfg.showShare"
          @share="shareOpen = true"
        />

        <PostAiSummary v-if="post.aisummary" :summary="post.aisummary" />

        <ImageLightbox :enabled="pageCfg.showImageViewer">
          <ProseBody>
            <ContentRenderer v-if="renderValue" :value="renderValue" />
          </ProseBody>
        </ImageLightbox>

        <CodeCopyButton v-if="pageCfg.showCopyButton" :enabled="pageCfg.showCopyButton" />
        <MathCopyButton v-if="pageCfg.showCopyButton" :enabled="pageCfg.showCopyButton" />

        <PostFooterCard
          v-if="pageCfg.showCopyright"
          :title="post.title"
          :url="canonical"
          :author="site.author.name"
          :date="post.date"
          :updated="post.updated"
          :tags="post.tags"
          :license="copyright.license"
          :license-url="copyright.licenseUrl"
          :show-reward="pageCfg.showReward && reward.enabled"
          @reward="rewardOpen = true"
        />

        <!-- 上一篇/下一篇：与版权卡同列（不居中），一体式双格面板，缺侧格弱化占位保持结构对称 -->
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

        <!-- 相关文章（移动端实例）：挂在上下篇下方；≥1280px 由旁栏实例接管 -->
        <PostRelated :items="related ?? []" class="related-inline" />
      </article>

      <!-- 桌面端目录旁栏，挂在正文右侧沟槽外（<1280px 时目录在顶栏按钮里）；
           相关文章挂在目录下方，与目录同组吸顶常驻 -->
      <aside class="post-aside">
        <div class="aside-toc">
          <ProseToc />
          <PostRelated :items="related ?? []" stacked />
        </div>
      </aside>
    </div>

    <!-- Ecoku 评论区（仅文章页） -->
    <EcokuComments :page-title="title" />

    <!-- 分享 / 打赏弹窗（Teleport 到 body） -->
    <PostShareModal
      :open="shareOpen"
      :url="canonical"
      :title="post.title"
      :description="description"
      @close="shareOpen = false"
    />
    <PostRewardModal :open="rewardOpen" @close="rewardOpen = false" />
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

/* 目录旁栏默认隐藏，≥1280px 才挂到右侧沟槽（见文件末尾） */
.post-aside {
  display: none;
}

/*
 * 外框 1px + 格间 1px 间隙，页面底色从缝隙透出形成中缝分隔线；
 * 暗色下同一机制自然呈现深灰线，与全站 1px 线语言一致。
 * 位于 article 内：与版权卡同列对齐，不再页面居中。
 */
.post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: var(--space-section);
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

/* ---------- 桌面：目录旁栏 + 相关文章窄栏 ---------- */
@media (min-width: 1280px) {
  .post-shell {
    display: grid;
    grid-template-columns: minmax(0, var(--content-max-width)) var(--toc-width);
    gap: var(--toc-gap);
    max-width: calc(var(--content-max-width) + var(--toc-width) + var(--toc-gap));
    /* 正文仍在原位置，目录挂在右侧沟槽外 */
    justify-content: start;
    /* aside 拉伸到与正文列等高：给内部 sticky toc 留出滑动区间 */
    align-items: stretch;
  }

  /*
   * sticky 挂在 aside 内部的 toc wrapper 上：aside 被 stretch 成正文列等高
   * （grid area 高度），wrapper 才有完整滑动区间；相关文章在 wrapper 下方
   * 随页面正常流动，不参与吸顶。
   */
  .post-aside {
    display: flex;
    flex-direction: column;
    gap: var(--space-item);
    min-width: 0;
  }

  .aside-toc {
    display: flex;
    flex-direction: column;
    gap: var(--space-item);
    position: sticky;
    top: calc(var(--header-height) + var(--toc-sticky-offset));
    align-self: start;
    /* 目录 + 相关高于视口时内部滚动，上下各留一个 stickyOffset */
    max-height: calc(100dvh - var(--header-height) - var(--toc-sticky-offset) * 2);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  /* 桌面端相关文章由旁栏实例接管，正文列里的移动端实例隐藏 */
  .related-inline {
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
