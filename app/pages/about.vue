<script setup lang="ts">
import type { Component } from 'vue'
import AboutCard from '~/components/about/AboutCard.vue'
import AboutHello from '~/components/about/AboutHello.vue'
import AboutTips from '~/components/about/AboutTips.vue'
import AboutSkills from '~/components/about/AboutSkills.vue'
import AboutPersonality from '~/components/about/AboutPersonality.vue'
import AboutCoverWall from '~/components/about/AboutCoverWall.vue'
import AboutSiteCards from '~/components/about/AboutSiteCards.vue'
import AboutVisitStats from '~/components/about/AboutVisitStats.vue'
import AboutSelfInfo from '~/components/about/AboutSelfInfo.vue'
import AboutReward from '~/components/about/AboutReward.vue'
import {
  aboutConfig as cfg,
  buildAboutLayout,
  isBlockEnabled,
  type AboutBlockKey,
  type RenderCell,
  type RenderRow,
  type VisitStatsData,
} from '~/data/about'
import sponsorsData from '~/data/sponsors.json'

const { ui } = useUi()

const { data: about } = await useAsyncData('about', () =>
  queryCollection('about').first(),
)

/** 实时访问统计：客户端经 /api/umami 代理拉自建 Umami；未就绪/失败时组件显示占位符 */
const liveStats = ref<VisitStatsData | null>(null)

onMounted(async () => {
  liveStats.value = await fetchVisitStats()
})

/** 打赏名单：本地数据（打赏 issue 工作流自动维护），构建时内联 */
const rewardItems = sponsorsData

useHead({ title: ui.pages.about })

const vis = (key: AboutBlockKey) => isBlockEnabled(key)

/** 渲染行：相邻两条「独苗行」自动合并成一行（上左、下右），任一行恢复满员即退回居中 */
const layout = computed(() =>
  buildAboutLayout((key) => vis(key) && (key !== 'aboutMe' || !!about.value)),
)

/** 同行组件按 span/总 span 分配宽度（保留行 gap 的份额）；
 *  关闭同行某个组件后，剩余组件保持自身原宽并由行居中。 */
function cellStyle(row: RenderRow, cell: RenderCell) {
  const total = row.totalSpan || 1
  const span = cell.span || 1
  return { '--about-basis': `calc((${span} / ${total}) * (100% - 1.25rem))` }
}

/** 行内锚点：打赏行带 id，供打赏弹窗「赞赏者名单」跳转 */
function rowId(row: RenderRow) {
  return row.cells.some((c) => c.key === 'reward') ? 'reward' : undefined
}

type BlockDef = { comp: Component; props: Record<string, unknown> }

/** aboutMe 走模板内联（要渲染 ContentRenderer 正文），这里只占位 */
const placeholderBlock: BlockDef = {
  comp: { name: 'AboutBlockPlaceholder', render: () => null },
  props: {},
}

const blocks = computed<Record<AboutBlockKey, BlockDef>>(() => ({
  hello: {
    comp: AboutHello,
    props: {
      prefix: cfg.hello.prefix,
      tips: cfg.hello.tips,
      name: cfg.hello.name,
      intro: cfg.hello.intro,
    },
  },
  tips: {
    comp: AboutTips,
    props: {
      lead: cfg.tips.lead,
      line1: cfg.tips.line1,
      line2: cfg.tips.line2,
      words: [...cfg.tips.words],
    },
  },
  skills: {
    comp: AboutSkills,
    props: {
      tips: cfg.skills.tips,
      title: cfg.skills.title,
      icons: [...cfg.skills.icons],
    },
  },
  personality: {
    comp: AboutPersonality,
    props: {
      tips: cfg.personality.tips,
      title: cfg.personality.title,
      mbti: cfg.personality.mbti,
      desc: cfg.personality.desc,
      link: cfg.personality.link,
      image: cfg.personality.image || undefined,
    },
  },
  anime: {
    comp: AboutCoverWall,
    props: {
      tips: cfg.anime.tips,
      title: cfg.anime.title,
      items: [...cfg.anime.items],
    },
  },
  games: {
    comp: AboutCoverWall,
    props: {
      tips: cfg.games.tips,
      title: cfg.games.title,
      items: [...cfg.games.items],
    },
  },
  siteCards: {
    comp: AboutSiteCards,
    props: { cards: [...cfg.siteCards.cards] },
  },
  selfInfo: {
    comp: AboutSelfInfo,
    props: { items: [...cfg.selfInfo.items] },
  },
  visitStats: {
    comp: AboutVisitStats,
    props: {
      tips: cfg.visitStats.tips,
      title: cfg.visitStats.title,
      data: liveStats.value,
      labels: cfg.visitStats.labels,
    },
  },
  aboutMe: placeholderBlock,
  reward: {
    comp: AboutReward,
    props: {
      tips: cfg.reward.tips,
      title: cfg.reward.title,
      desc: cfg.reward.desc,
      stats: cfg.reward.stats,
      chargeLabel: cfg.reward.chargeLabel,
      countText: cfg.reward.countText,
      items: rewardItems ?? [],
      emptyText: cfg.reward.emptyText,
    },
  },
}))

const blockOf = (key: AboutBlockKey): BlockDef => blocks.value[key]
</script>

<template>
  <div class="page-about">
    <div class="container">
      <SiteBreadcrumb />
      <h1 class="visually-hidden">{{ ui.pages.about }} {{ cfg.hero.name }}</h1>

      <AboutHero
        v-if="cfg.hero.enabled"
        :avatar="cfg.hero.avatar"
        :name="cfg.hero.name"
        :author-tags="cfg.hero.authorTags"
      />

      <div class="about-rows">
        <div v-for="(row, i) in layout" :id="rowId(row)" :key="i" class="about-row">
          <template v-for="cell in row.cells" :key="cell.key">
            <!-- 关于我：正文来自 content/about.md -->
            <component
              :is="AboutCard"
              v-if="cell.key === 'aboutMe' && about"
              :style="cellStyle(row, cell)"
              class="aboutme-card"
            >
              <h2 class="aboutme-title">{{ cfg.aboutMe.title }}</h2>
              <ContentRenderer :value="about" class="prose aboutme-prose" />
            </component>
            <component
              :is="blockOf(cell.key).comp"
              v-else
              :style="cellStyle(row, cell)"
              v-bind="blockOf(cell.key).props"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 与首页同款宽版式：卡片行需要横向空间 */
.page-about {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--home-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.about-rows {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.about-row {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
}

.about-row > * {
  flex: 0 1 var(--about-basis, 100%);
  min-width: 0;
}

/* ---- 关于我卡 ---- */
.aboutme-title {
  font-size: calc(var(--fs-h1) * 1.15);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1rem;
}

.aboutme-prose {
  max-width: 90ch;
}

/* ---- 响应式：≤768px 单列 ---- */
@media (max-width: 768px) {
  .about-row {
    flex-direction: column;
  }

  .about-row > * {
    flex-basis: auto;
    width: 100%;
  }
}
</style>
