<script setup lang="ts">
import { buildHeatmapDays } from '~/utils/heatmap'

const { site } = useBlogConfig()
const { ui, t } = useUi()
const pageCfg = usePageConfig('home')
const posts = usePosts()

const PAGE_SIZE = pageCfg.cards.pageSize

const currentPage = ref(1)
/** 分类筛选：'' = 全部；与卡片流分页联动，切换分类时回到第 1 页 */
const activeCategory = ref('')

const { data } = await useAsyncData('home-posts', async () => {
  const [featured, pinned, all] = await Promise.all([
    pageCfg.carousel.enabled ? posts.featuredPosts(pageCfg.carousel.maxFeatured) : Promise.resolve([]),
    posts.pinned(pageCfg.pinnedCount),
    posts.list(),
  ])

  // 卡片流：全部文章（已按 pinned DESC, date DESC 排序），分页在前端做
  // （数据集为个人博客量级，全量返回足够轻；分页逻辑与归档页口径一致）
  const categories = await posts.categories()
  const tags = await posts.tags()

  // 发文热力图在构建期定稿：窗口以构建日为锚点，随 payload 序列化到客户端，
  // 客户端不重算，避免「今天」两端不一致造成的水合错位
  const heat = buildHeatmapDays(all, new Date(), pageCfg.heatmap.weeks)

  return {
    featured,
    pinnedPaths: new Set(pinned.map((p) => p.path)),
    all,
    categories,
    tags,
    heat,
  }
})

const filteredPosts = computed(() => {
  const list = data.value?.all ?? []
  if (!activeCategory.value) return list
  return list.filter((p) => p.category === activeCategory.value)
})

const total = computed(() => filteredPosts.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const pagedPosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredPosts.value.slice(start, start + PAGE_SIZE)
})

watch([totalPages, activeCategory], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

function goPage(p: number) {
  currentPage.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

useHead({
  title: site.name,
  meta: [{ name: 'description', content: site.description }],
})
</script>

<template>
  <div class="page-home">
    <div class="container">
      <h1 class="visually-hidden">{{ site.name }}</h1>

      <div class="home-grid" :class="{ 'no-aside': !pageCfg.sidebar.enabled }">
        <div class="home-main">
          <FeaturedCarousel
            v-if="pageCfg.carousel.enabled && !(pageCfg.carousel.hideWhenEmpty && !(data?.featured.length))"
            :slides="data?.featured ?? []"
            :cfg="pageCfg.carousel"
          />

          <ShuoshuoTicker v-if="pageCfg.shuoshuoBar.enabled" :cfg="pageCfg.shuoshuoBar" />

          <div v-if="pageCfg.categoryBar.enabled && (data?.categories.length ?? 0) > 0" class="cat-bar-row">
            <CategoryBar
              :cfg="pageCfg.categoryBar"
              :categories="data?.categories ?? []"
              :active="activeCategory"
              @select="activeCategory = $event"
            />
          </div>

          <section class="section" :aria-label="ui.pages.home.sections.postList">
            <div class="card-grid">
              <PostCard
                v-for="post in pagedPosts"
                :key="post.path"
                :post="post"
                :cfg="pageCfg.cards"
              />
            </div>

            <nav v-if="totalPages > 1" class="pager" :aria-label="ui.pages.home.sections.pager">
              <button
                type="button"
                class="pager-btn"
                :disabled="currentPage === 1"
                @click="goPage(currentPage - 1)"
              >
                <Icon name="tabler:chevron-left" aria-hidden="true" />
              </button>
              <button
                v-for="p in totalPages"
                :key="p"
                type="button"
                class="pager-btn pager-num"
                :class="{ active: p === currentPage }"
                :aria-current="p === currentPage ? 'page' : undefined"
                @click="goPage(p)"
              >
                {{ p }}
              </button>
              <button
                type="button"
                class="pager-btn"
                :disabled="currentPage === totalPages"
                @click="goPage(currentPage + 1)"
              >
                <Icon name="tabler:chevron-right" aria-hidden="true" />
              </button>
            </nav>
          </section>

          <PostHeatmap
            v-if="pageCfg.heatmap.enabled && data?.heat"
            :heat="data.heat"
            :more="pageCfg.cta"
            class="heat-row"
          />

          <div v-else class="cta-row">
            <NuxtLink :to="pageCfg.cta.to" class="cta-link">
              {{ pageCfg.cta.label }}
            </NuxtLink>
          </div>
        </div>

        <aside v-if="pageCfg.sidebar.enabled" class="home-aside" :aria-label="ui.pages.home.sidebar.asideLabel">
          <template v-for="key in pageCfg.sidebar.order" :key="key">
            <ProfileCard
              v-if="key === 'profile' && pageCfg.sidebar.profile.enabled"
              :cfg="pageCfg.sidebar.profile"
            />
            <AnnouncementCard
              v-else-if="key === 'announcement' && pageCfg.sidebar.announcement.enabled"
              :cfg="pageCfg.sidebar.announcement"
            />
            <VisitorCard
              v-else-if="key === 'visitor' && pageCfg.sidebar.visitor.enabled"
              :cfg="pageCfg.sidebar.visitor"
            />
            <MottoCard
              v-else-if="key === 'motto' && pageCfg.sidebar.motto.enabled"
              :cfg="pageCfg.sidebar.motto"
            />
            <StatsCard
              v-else-if="key === 'stats' && pageCfg.sidebar.stats.enabled"
              :cfg="pageCfg.sidebar.stats"
              :post-count="total"
              :category-count="data?.categories.length ?? 0"
              :tag-count="data?.tags.length ?? 0"
            />
            <CategoryList
              v-else-if="key === 'categories' && pageCfg.sidebar.categories.enabled"
              :cfg="pageCfg.sidebar.categories"
              :categories="data?.categories ?? []"
            />
            <TagCloud
              v-else-if="key === 'tags' && pageCfg.sidebar.tags.enabled"
              :cfg="pageCfg.sidebar.tags"
              :tags="data?.tags ?? []"
            />
            <CalendarCard
              v-else-if="key === 'calendar' && pageCfg.sidebar.calendar.enabled"
              :posts="data?.all ?? []"
            />
          </template>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 顶部紧贴顶栏（含桌面端），底部保留区块间距 */
.page-home {
  padding-block: var(--space-item) var(--space-block);
}

/* 首页容器：Dusklight 式宽版式，流体占满、上限 --home-max-width（1400px） */
.container {
  max-width: var(--home-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

/* ---- 两栏布局：≥1024px 主内容 + 侧栏；窄屏单栏 ---- */
.home-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-block);
  align-items: start;
}

.home-aside {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* 关键：禁止子内容（轮播 img 固有宽度 1200px）把 1fr 网格轨道撑破视口。
   网格项默认 min-width:auto，min-content 会传导进轨道尺寸，
   必须显式归零，让 carousel-viewport 的 overflow:hidden 生效。 */
.home-main {
  min-width: 0;
}

.home-aside {
  min-width: 0;
}

@media (min-width: 1024px) {
  .home-grid:not(.no-aside) {
    /* 侧栏固定宽，主内容吃剩余空间 */
    grid-template-columns: minmax(0, 1fr) var(--home-sidebar-width);
  }
}

.section {
  margin-top: var(--space-block);
}

.cat-bar-row {
  margin-top: 1.25rem;
}

/* ---- 两栏卡片网格 ---- */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

/* 平板 768-1023px：单栏（需求 §5） */
@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* ---- 分页 ---- */
.pager {
  margin-top: var(--space-block);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.375rem;
}

.pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.25rem;
  padding-inline: 0.375rem;
  border-radius: calc(var(--radius) - 0.125rem);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.pager-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.pager-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.pager-num.active {
  color: var(--background);
  background: var(--accent);
  border-color: var(--accent);
}

/* ---- CTA / 发文热力图 ---- */
.cta-row,
.heat-row {
  margin-top: var(--space-block);
}

.cta-row {
  text-align: center;
}

.cta-link {
  display: inline-block;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.125rem;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.cta-link:hover {
  color: var(--foreground);
  border-bottom-color: var(--accent);
}
</style>
