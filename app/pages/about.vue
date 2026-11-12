<script setup lang="ts">
import { aboutConfig as cfg, aboutRows, isBlockEnabled, type AboutBlockKey, type VisitStatsData } from '~/data/about'
import sponsorsData from '~/data/sponsors.json'

const { ui } = useUi()

const { data: about } = await useAsyncData('about', () =>
  queryCollection('about').first(),
)

/** 实时访问统计：客户端经 /api/umami 代理拉取，失败继续展示 placeholder */
const liveStats = ref<VisitStatsData | null>(null)

onMounted(async () => {
  if (!cfg.visitStats.apiUrl) return
  liveStats.value = await fetchVisitStats()
})

/** 打赏名单：本地数据（打赏 issue 工作流自动维护），构建时内联 */
const rewardItems = sponsorsData

useHead({ title: ui.pages.about })

const vis = (key: AboutBlockKey) => isBlockEnabled(key)

/** 同行组件按 span/总 span 分配宽度（保留行 gap 的份额）；
 *  关闭同行某个组件后，剩余组件保持自身原宽并由行居中。 */
function cell(
  row: Array<{ key: AboutBlockKey; span: number }> | undefined,
  key: AboutBlockKey,
) {
  const sum = row?.reduce((acc, c) => acc + c.span, 0) ?? 1
  const span = row?.find((c) => c.key === key)?.span ?? 1
  return { '--about-basis': `calc((${span} / ${sum}) * (100% - 1.25rem))` }
}

const rowHello = aboutRows[0]
const rowSkills = aboutRows[1]
const rowMbti = aboutRows[2]
const rowGames = aboutRows[3]
const rowData = aboutRows[4]
const rowAboutMe = aboutRows[5]
const rowReward = aboutRows[6]
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
        <!-- 问候 + 关键词轮播 -->
        <div v-if="vis('hello') || vis('tips')" class="about-row">
          <AboutHello
            v-if="vis('hello')"
            :style="cell(rowHello, 'hello')"
            :prefix="cfg.hello.prefix"
            :tips="cfg.hello.tips"
            :name="cfg.hello.name"
            :intro="cfg.hello.intro"
          />
          <AboutTips
            v-if="vis('tips')"
            :style="cell(rowHello, 'tips')"
            :lead="cfg.tips.lead"
            :line1="cfg.tips.line1"
            :line2="cfg.tips.line2"
            :words="[...cfg.tips.words]"
          />
        </div>

        <!-- 技能墙 -->
        <div v-if="vis('skills')" class="about-row">
          <AboutSkills
            :style="cell(rowSkills, 'skills')"
            :tips="cfg.skills.tips"
            :title="cfg.skills.title"
            :icons="[...cfg.skills.icons]"
          />
        </div>

        <!-- 性格 + 追番 -->
        <div v-if="vis('personality') || vis('anime')" class="about-row">
          <AboutPersonality
            v-if="vis('personality')"
            :style="cell(rowMbti, 'personality')"
            :tips="cfg.personality.tips"
            :title="cfg.personality.title"
            :mbti="cfg.personality.mbti"
            :desc="cfg.personality.desc"
            :link="cfg.personality.link"
            :image="cfg.personality.image || undefined"
          />
          <AboutCoverWall
            v-if="vis('anime')"
            :style="cell(rowMbti, 'anime')"
            :tips="cfg.anime.tips"
            :title="cfg.anime.title"
            :items="[...cfg.anime.items]"
          />
        </div>

        <!-- 游戏 + 站点资料 -->
        <div v-if="vis('games') || vis('siteCards')" class="about-row">
          <AboutCoverWall
            v-if="vis('games')"
            :style="cell(rowGames, 'games')"
            :tips="cfg.games.tips"
            :title="cfg.games.title"
            :items="[...cfg.games.items]"
          />
          <AboutSiteCards
            v-if="vis('siteCards')"
            :style="cell(rowGames, 'siteCards')"
            :cards="[...cfg.siteCards.cards]"
          />
        </div>

        <!-- 访问统计 + 个人信息 -->
        <div v-if="vis('visitStats') || vis('selfInfo')" class="about-row">
          <AboutVisitStats
            v-if="vis('visitStats')"
            :style="cell(rowData, 'visitStats')"
            :tips="cfg.visitStats.tips"
            :title="cfg.visitStats.title"
            :data="liveStats ?? cfg.visitStats.placeholder"
            :labels="cfg.visitStats.labels"
          />
          <AboutSelfInfo
            v-if="vis('selfInfo')"
            :style="cell(rowData, 'selfInfo')"
            :items="[...cfg.selfInfo.items]"
          />
        </div>

        <!-- 关于我（正文来自 content/about.md） -->
        <div v-if="vis('aboutMe') && about" class="about-row">
          <AboutCard :style="cell(rowAboutMe, 'aboutMe')" class="aboutme-card">
            <h2 class="aboutme-title">{{ cfg.aboutMe.title }}</h2>
            <ContentRenderer :value="about" class="prose aboutme-prose" />
          </AboutCard>
        </div>

        <!-- 打赏名单（id 供打赏弹窗「赞赏者名单」锚点跳转） -->
        <div v-if="vis('reward')" id="reward" class="about-row">
          <AboutReward
            :style="cell(rowReward, 'reward')"
            :tips="cfg.reward.tips"
            :title="cfg.reward.title"
            :desc="cfg.reward.desc"
            :stats="cfg.reward.stats"
            :charge-label="cfg.reward.chargeLabel"
            :count-text="cfg.reward.countText"
            :items="rewardItems ?? []"
            :empty-text="cfg.reward.emptyText"
          />
        </div>
      </div>

      <CommentSlot v-if="cfg.comments.enabled" class="about-comments" />
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

/* ---- 评论区 ---- */
.about-comments {
  margin-top: var(--space-section);
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
