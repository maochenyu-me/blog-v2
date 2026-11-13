<script setup lang="ts">
import { badgeConfigs, getBadge, recommendedColor, type FriendLink } from '~/data/links'

const { ui, t } = useUi()
const pageCfg = usePageConfig('links')
const { site, feed } = useBlogConfig()
const { friendLinks } = await import('~/data/links')

useHead({ title: ui.pages.links })

/** 建交天数与等级印记：SSG 期计算，客户端不重算 */
const daysOf = (link: FriendLink) => {
  if (!link.daysSince) return null
  return Math.max(0, Math.floor((Date.now() - new Date(link.daysSince).getTime()) / 86_400_000))
}
const badgeOf = (link: FriendLink) => getBadge(daysOf(link) ?? 0, link.lost)

/** 头像绝对 URL：友链朋友圈等爬虫不做相对→绝对拼接，相对路径在站外会 404 */
const absoluteAvatar = (link: FriendLink) =>
  link.avatar.startsWith('http') ? link.avatar : `${site.url}${link.avatar}`

/** 分组：朋友们 → 失联。组内按建交天数降序（老朋友在前） */
const groups = computed(() => {
  const lost = friendLinks.filter((l) => l.lost)
  const active = friendLinks.filter((l) => !l.lost)
  const byDays = (a: FriendLink, b: FriendLink) => (daysOf(b) ?? 0) - (daysOf(a) ?? 0)
  return [
    { key: 'active' as const, list: [...active].sort(byDays) },
    { key: 'lost' as const, list: [...lost].sort(byDays) },
  ].filter((g) => g.list.length > 0)
})

const friendCount = friendLinks.length

/** 本站信息卡的字段（Dusklight 式逐行盒子，点击复制）。
 *  顺序按访客复制频率排：链接/头像/RSS 常显，其余折进「更多本站字段」。 */
const siteFields = computed(() => [
  { key: 'url', label: ui.links.fieldLabels.url, value: site.url },
  { key: 'avatar', label: ui.links.fieldLabels.avatar, value: `${site.url}${site.author.avatar}` },
  { key: 'rss', label: ui.links.fieldLabels.rss, value: `${site.url}${feed.rss.path}` },
  { key: 'name', label: ui.links.fieldLabels.name, value: site.name },
  { key: 'desc', label: ui.links.fieldLabels.desc, value: site.description },
  { key: 'screenshot', label: ui.links.fieldLabels.screenshot, value: `${site.url}${pageCfg.screenshot}` },
])
const primaryFields = computed(() => siteFields.value.slice(0, pageCfg.expandedFields))
const moreFields = computed(() => siteFields.value.slice(pageCfg.expandedFields))

/** 复制状态：字段级，1.5s 后归还 */
const copiedKey = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyField(key: string, value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    return
  }
  copiedKey.value = key
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copiedKey.value = ''), 1500)
}

/** 随机拜访：避开上一次抽中的，连续点也有新鲜感 */
const randomOpen = ref(false)
const randomPick = ref<FriendLink | null>(null)
let lastPicked = -1
function pickRandom() {
  const pool = friendLinks.filter((l) => !l.lost)
  if (pool.length === 0) return
  let i = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && i === lastPicked) i = (i + 1) % pool.length
  lastPicked = i
  randomPick.value = pool[i] ?? null
  randomOpen.value = true
  nextTick(() => dialogEl.value?.focus())
}
function confirmRandom() {
  const target = randomPick.value
  if (target) window.open(target.url, '_blank', 'noopener')
  randomOpen.value = false
}

/** 模态关闭时把焦点还给触发按钮 */
const randomBtnEl = ref<HTMLButtonElement | null>(null)
const dialogEl = ref<HTMLElement | null>(null)
function closeRandom() {
  randomOpen.value = false
  nextTick(() => randomBtnEl.value?.focus())
}

/** 印记图例：完整 16 级，按建交天数区间划分（数据与颜色来自 links.ts） */
const legendBadges = computed(() =>
  badgeConfigs.map((b) => ({
    key: b.icon,
    zh: b.name.split('/')[0],
    en: b.name.split('/')[1] ?? '',
    color: b.color,
    icon: b.icon,
    range:
      b.maxDays === 0
        ? '—'
        : b.maxDays === Number.POSITIVE_INFINITY
          ? t(ui.links.legendDaysPlus, { min: b.minDays })
          : t(ui.links.legendDaysRange, { min: b.minDays, max: b.maxDays }),
  })),
)

const applyRules = pageCfg.applyRules
const gridVars = computed(() => ({
  '--cols-mobile': String(pageCfg.columns.mobile),
  '--cols-tablet': String(pageCfg.columns.tablet),
  '--cols-desktop': String(pageCfg.columns.desktop),
}))
</script>

<template>
  <div class="page-links">
    <div class="container">
      <SiteBreadcrumb />
      <!-- ── 页头：标题 + 计数副题 + 随机拜访 ── -->
      <header class="page-head">
        <div class="page-head-text">
          <h1 class="page-title">{{ ui.pages.links }}</h1>
          <p class="page-sub">{{ t(ui.links.subtitle, { n: friendCount }) }}</p>
        </div>
        <button
          v-if="pageCfg.randomVisit && friendCount > 0"
          ref="randomBtnEl"
          type="button"
          class="random-btn"
          :aria-label="ui.links.randomAria"
          @click="pickRandom"
        >
          <Icon name="tabler:dice-5" aria-hidden="true" />
          <span>{{ ui.links.randomVisit }}</span>
        </button>
      </header>

      <!-- ── 本站信息 ‖ 申请须知（窄屏上下堆叠） ── -->
      <div class="info-grid">
        <section class="info-card" :aria-label="ui.links.infoTitle">
          <h2 class="section-label">{{ ui.links.infoTitle }}</h2>
          <div class="info-identity">
            <img
              :src="site.author.avatar"
              :alt="site.name"
              class="info-avatar"
              width="56"
              height="56"
              loading="lazy"
              decoding="async"
            />
            <div class="info-identity-text">
              <span class="info-name">{{ site.name }}</span>
              <span class="info-motto">{{ site.description }}</span>
            </div>
          </div>
          <ul class="info-fields">
            <li v-for="field in primaryFields" :key="field.key" class="info-field">
              <span class="field-label">{{ field.label }}</span>
              <span class="field-value" :title="field.value">{{ field.value }}</span>
              <button
                type="button"
                class="field-copy"
                :class="{ 'is-copied': copiedKey === field.key }"
                :aria-label="copiedKey === field.key ? t(ui.links.copiedAria, { name: field.label }) : t(ui.links.copyAria, { name: field.label })"
                @click="copyField(field.key, field.value)"
              >
                <Icon :name="copiedKey === field.key ? 'tabler:check' : 'tabler:copy'" aria-hidden="true" />
              </button>
            </li>
          </ul>

          <!-- 其余字段默认折叠，防止左栏远高于右栏（申请须知）造成大面积留白 -->
          <details v-if="moreFields.length > 0" class="info-more">
            <summary class="info-more-summary">
              <span>{{ ui.links.moreFields }}</span>
              <Icon name="tabler:chevron-down" class="disclaimer-chevron" aria-hidden="true" />
            </summary>
            <ul class="info-fields info-fields-more">
              <li v-for="field in moreFields" :key="field.key" class="info-field">
                <span class="field-label">{{ field.label }}</span>
                <span class="field-value" :title="field.value">{{ field.value }}</span>
                <button
                  type="button"
                  class="field-copy"
                  :class="{ 'is-copied': copiedKey === field.key }"
                  :aria-label="copiedKey === field.key ? t(ui.links.copiedAria, { name: field.label }) : t(ui.links.copyAria, { name: field.label })"
                  @click="copyField(field.key, field.value)"
                >
                  <Icon :name="copiedKey === field.key ? 'tabler:check' : 'tabler:copy'" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </details>
        </section>

        <section class="rules-card" :aria-label="ui.links.rulesTitle">
          <h2 class="section-label">{{ ui.links.rulesTitle }}</h2>
          <ol class="rule-list">
            <li v-for="(rule, i) in applyRules" :key="i" class="rule-item">
              {{ rule }}
            </li>
          </ol>

          <!-- 申请方式：GitHub 议题表单直达（外链），邮箱作次要渠道备注 -->
          <div class="apply-channel">
            <span class="channel-label">{{ ui.links.applyChannel }}</span>
            <a
              class="apply-cta"
              :href="pageCfg.applyIssueUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="tabler:brand-github" aria-hidden="true" />
              <span>{{ ui.links.applyIssue }}</span>
              <Icon name="tabler:external-link" class="apply-cta-ext" aria-hidden="true" />
            </a>
            <p class="channel-note">
              {{ t(ui.links.applyEmailNote, { email: site.author.email }) }}
            </p>
          </div>
        </section>
      </div>

      <!-- ── 免责声明（details 折叠，非弹层） ── -->
      <details class="disclaimer">
        <summary class="disclaimer-summary">
          <span>{{ ui.links.disclaimerTitle }}</span>
          <Icon name="tabler:chevron-down" class="disclaimer-chevron" aria-hidden="true" />
        </summary>
        <div class="disclaimer-body">
          <p>{{ ui.links.disclaimerIntro }}</p>
          <ul>
            <li v-for="item in ui.links.disclaimerItems" :key="item">{{ item }}</li>
          </ul>
          <p>{{ ui.links.disclaimerOutro }}</p>
        </div>
      </details>

      <!-- ── 友链卡片墙：朋友们 / 失联 两段 ── -->
      <section v-for="group in groups" :key="group.key" class="friend-section">
        <h2 class="section-label friend-section-label">
          {{ group.key === 'active' ? ui.links.friendsTitle : ui.links.legendLost }}
          <span class="section-count">{{ t(ui.links.friendsCount, { n: group.list.length }) }}</span>
        </h2>

        <ul class="link-grid" :style="gridVars">
          <li v-for="link in group.list" :key="link.url" class="link-cell">
            <!-- 朋友卡：1:1 移植 Saneko FriendList —— 圆角独立卡 + hover 遮罩箭头 +
                 头像水墨背景 + 右上角 40px 裁切印章 + 右下 DAYS -->
            <a :href="link.url" class="link-card" target="_blank" rel="noopener noreferrer">
              <span class="avatar-wrap">
                <NuxtImg
                  :src="absoluteAvatar(link)"
                  :alt="t(ui.links.avatarAlt, { name: link.name })"
                  class="link-avatar"
                  width="56"
                  height="56"
                  loading="lazy"
                  decoding="async"
                />
                <span class="avatar-veil" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="veil-arrow"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" class="arrow-line" />
                    <polyline points="12 5 19 12 12 19" class="arrow-head" />
                  </svg>
                </span>
              </span>
              <span class="link-body">
                <span class="link-name">
                  {{ link.name }}
                  <Icon
                    v-if="link.recommended"
                    name="tabler:thumb-up"
                    class="rec-icon"
                    :style="{ color: recommendedColor }"
                    aria-hidden="true"
                  />
                </span>
                <!-- 无障碍文本放 link-name 外：朋友圈爬虫按 .link-name 全后代取文本，放里面会拼进作者名 -->
                <span v-if="link.recommended" class="visually-hidden">{{ ui.links.recommendedAria }}</span>
                <span class="link-desc">{{ link.description }}</span>
                <span class="days-label">
                  {{ link.lost ? ui.links.daysLost : t(ui.links.daysBadge, { n: daysOf(link) ?? 0 }) }}
                </span>
              </span>
              <!-- 等级印章：40px 徽标色图标溢出右上角，hover 逆转放大（Saneko 式） -->
              <span class="days-stamp" :style="{ color: badgeOf(link).color }" aria-hidden="true">
                <Icon :name="`tabler:${badgeOf(link).icon}`" class="stamp-icon" />
              </span>
              <span
                class="avatar-watermark"
                :style="{ backgroundImage: `url(${link.avatar})` }"
                aria-hidden="true"
              />
            </a>
          </li>
        </ul>
      </section>

      <!-- ── 友链等级 · 印记图例（16 级） ── -->
      <details v-if="pageCfg.showLegend" class="legend">
        <summary class="legend-summary">
          <span>{{ ui.links.legendTitle }}</span>
          <Icon name="tabler:chevron-down" class="disclaimer-chevron" aria-hidden="true" />
        </summary>
        <div class="legend-grid">
          <div v-for="badge in legendBadges" :key="badge.key" class="legend-item">
            <span class="legend-medal" :style="{ color: badge.color }" aria-hidden="true">
              <Icon :name="`tabler:${badge.icon}`" class="legend-medal-icon" />
            </span>
            <span class="legend-meta">
              <span class="legend-name" :style="{ color: badge.color }">
                {{ badge.zh }}<span class="legend-en">{{ badge.en }}</span>
              </span>
              <span class="legend-range">{{ badge.range }}</span>
            </span>
          </div>
        </div>
      </details>
    </div>

    <!-- ── 随机拜访确认模态 ── -->
    <Teleport to="body">
      <div v-if="randomOpen" class="dialog-overlay" @click.self="closeRandom">
        <div
          ref="dialogEl"
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="random-visit-title"
          tabindex="-1"
          @keydown.esc="closeRandom"
        >
          <div class="dialog-head">
            <h2 id="random-visit-title" class="dialog-title">{{ ui.links.modalHeading }}</h2>
            <button type="button" class="dialog-close" :aria-label="ui.links.modalCloseAria" @click="closeRandom">
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </div>
          <div v-if="randomPick" class="random-pick">
            <img
              :src="randomPick.avatar"
              :alt="t(ui.links.avatarAlt, { name: randomPick.name })"
              class="pick-avatar"
              width="48"
              height="48"
              decoding="async"
            />
            <div class="pick-text">
              <span class="pick-name">{{ randomPick.name }}</span>
              <span class="pick-url">{{ randomPick.url }}</span>
            </div>
          </div>
          <p class="pick-desc" :aria-label="ui.links.modalDescAria">{{ randomPick?.description }}</p>
          <div class="pick-actions">
            <button type="button" class="pick-cancel" @click="closeRandom">
              {{ ui.links.modalCancel }}
            </button>
            <button type="button" class="pick-confirm" @click="confirmRandom">
              {{ ui.links.modalVisit }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-links {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--wide-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: var(--space-block);
}

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.page-sub {
  margin-top: 0.375rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.random-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex: none;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.random-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* ── 信息区：双栏（信息 ‖ 须知），窄屏堆叠 ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background-color: var(--border);
  border: 1px solid var(--border);
}

@media (min-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.info-card,
.rules-card {
  /* grid item 的自动最小尺寸归零：让 1fr 轨道能被窄视口压缩，
     内部 nowrap 的 URL 字段靠 overflow + ellipsis 截断 */
  min-width: 0;
  background-color: var(--card);
  padding: var(--space-item);
}

.section-label {
  font-size: var(--fs-meta);
  font-weight: 400;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  margin-bottom: 1rem;
}

.info-identity {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.info-avatar {
  flex: none;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  object-fit: cover;
}

.info-identity-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.info-name {
  font-size: var(--fs-h1);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.info-motto {
  font-size: var(--fs-meta);
  line-height: 1.6;
  color: var(--muted-foreground);
}

.info-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 字段行：Dusklight 式独立圆角盒子（label + 值 + 复制按钮） */
.info-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  background-color: var(--muted);
  min-width: 0;
}

.field-label {
  flex: none;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-meta);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-copy {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.field-copy:hover,
.field-copy.is-copied {
  color: var(--accent);
}

/* 「更多本站字段」折叠块：摘要做成字段行同款盒子，视觉上连成一组 */
.info-more {
  margin-top: 0.5rem;
}

.info-more-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  background-color: var(--muted);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  list-style: none;
  transition: color var(--duration-base) var(--easing-base);
}

.info-more-summary::-webkit-details-marker {
  display: none;
}

.info-more-summary:hover {
  color: var(--accent);
}

.info-fields-more {
  margin-top: 0.5rem;
}

/* ── 申请须知 ── */
.rule-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  counter-reset: rule;
}

.rule-item {
  display: flex;
  gap: 0.625rem;
  font-size: var(--fs-meta);
  line-height: 1.6;
  color: var(--muted-foreground);
  counter-increment: rule;
}

.rule-item::before {
  content: counter(rule);
  flex: none;
  font-family: var(--font-mono);
  color: var(--accent);
}

/* ── 申请方式：GitHub 议题直达 CTA（外链） + 邮箱次要备注 ── */
.apply-channel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.channel-label {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  margin-bottom: 0.125rem;
}

.apply-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  font-size: var(--fs-meta);
  color: var(--foreground);
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.apply-cta:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.apply-cta-ext {
  margin-left: auto;
  color: var(--muted-foreground);
}

.channel-note {
  font-size: var(--fs-meta);
  line-height: 1.6;
  color: var(--muted-foreground);
}

/* ── 免责声明 / 图例：贴在信息区网格之下的折叠条 ── */
.disclaimer,
.legend {
  border: 1px solid var(--border);
  border-top: none;
}

.disclaimer-summary,
.legend-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem var(--space-item);
  font-size: var(--fs-meta);
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  cursor: pointer;
  list-style: none;
  transition: color var(--duration-base) var(--easing-base);
}

.disclaimer-summary::-webkit-details-marker,
.legend-summary::-webkit-details-marker {
  display: none;
}

.disclaimer-summary:hover,
.legend-summary:hover {
  color: var(--accent);
}

.disclaimer-chevron {
  flex: none;
  transition: transform var(--duration-base) var(--easing-base);
}

details[open] .disclaimer-chevron,
details[open] .legend-summary .disclaimer-chevron {
  transform: rotate(180deg);
}

.disclaimer-body {
  padding: 0 var(--space-item) var(--space-item);
  font-size: var(--fs-meta);
  line-height: 1.7;
  color: var(--muted-foreground);
}

.disclaimer-body p {
  margin-bottom: 0.625rem;
}

.disclaimer-body ul {
  margin: 0.625rem 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.disclaimer-body li {
  margin-bottom: 0.375rem;
}

/* ── 友链区段标题 ── */
.friend-section {
  margin-top: var(--space-block);
}

.friend-section-label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.section-count {
  font-family: var(--font-mono);
}

/* ── 卡墙：2/3/4 列，独立圆角卡片（Saneko 式），卡片间留缝 ──
   末行不满时空轨道就是页面底色，卡片不强行补满。 */
.link-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols-mobile, 1), minmax(0, 1fr));
  gap: 0.875rem;
}

@media (min-width: 768px) {
  .link-grid {
    grid-template-columns: repeat(var(--cols-tablet, 3), minmax(0, 1fr));
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .link-grid {
    grid-template-columns: repeat(var(--cols-desktop, 4), minmax(0, 1fr));
  }
}

/* 卡片：rounded-2xl 边框卡，底色 muted 与页面区分，hover 再深一档 */
.link-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  background-color: var(--muted);
  transition: background-color var(--duration-base) var(--easing-base);
}

.link-card:hover {
  background-color: color-mix(in srgb, var(--muted) 85%, var(--foreground));
}

/* 头像区：圆形 + hover 遮罩箭头（Saneko 式出站动效） */
.avatar-wrap {
  position: relative;
  flex: none;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  overflow: hidden;
}

.link-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background-color: var(--muted);
}

.avatar-veil {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--foreground);
  opacity: 0;
  transition: opacity var(--duration-slow) var(--easing-base);
}

.veil-arrow {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--background);
}

.arrow-line {
  transform: translateX(1rem) scaleX(0);
  transition: transform var(--duration-slow) var(--easing-base);
}

.arrow-head {
  transition: transform var(--duration-slow) var(--easing-base);
}

.link-card:hover .avatar-veil {
  opacity: 0.55;
}

.link-card:hover .arrow-line {
  transform: translateX(0.25rem) scaleX(1);
}

.link-card:hover .arrow-head {
  transform: translateX(0.25rem);
}

/* 头像水墨背景：左浓右淡渐隐 mask，正文区 zIndex 压在其上（Saneko 口径 opacity-15） */
.avatar-watermark {
  position: absolute;
  left: -0.5rem;
  top: 0;
  z-index: 0;
  width: 66%;
  height: 100%;
  background-size: cover;
  background-position: left center;
  opacity: 0.15;
  mask-image: linear-gradient(to left, transparent 0%, black 100%);
  -webkit-mask-image: linear-gradient(to left, transparent 0%, black 100%);
  pointer-events: none;
}

.link-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
}

.link-name {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-meta);
  font-weight: 400;
  line-height: 1.4;
}

.rec-icon {
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
}

.link-desc {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--muted-foreground);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 天数角标：右下角，10px mono（Saneko 口径 self-end text-[10px]） */
.days-label {
  align-self: flex-end;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  line-height: 1;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* 等级印章：40px 徽标色图标，96px 容器溢出右上角裁切，hover 逆转放大 */
.days-stamp {
  position: absolute;
  right: -1.25rem;
  top: -1.5625rem;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  height: 6rem;
  transition: transform var(--duration-slow) var(--easing-base);
  pointer-events: none;
}

.stamp-icon {
  width: 2.5rem;
  height: 2.5rem;
  opacity: 0.2;
  transition: opacity var(--duration-slow) var(--easing-base);
}

.link-card:hover .days-stamp {
  transform: rotate(-12deg) scale(1.1);
}

.link-card:hover .stamp-icon {
  opacity: 0.3;
}

/* ── 友链等级图例（16 级网格） ── */
.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0 var(--space-item) var(--space-item);
}

@media (min-width: 768px) {
  .legend-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  min-width: 0;
}

.legend-medal {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid currentColor;
  border-radius: 50%;
}

.legend-medal-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.legend-meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.legend-name {
  font-size: var(--fs-meta);
  font-weight: 700;
  line-height: 1.2;
}

.legend-en {
  margin-left: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 400;
  opacity: 0.65;
}

.legend-range {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ── 随机拜访模态 ── */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-gutter);
  background-color: color-mix(in srgb, var(--foreground) 30%, transparent);
}

.dialog {
  width: 100%;
  max-width: 24rem;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-item);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.dialog-title {
  font-size: var(--fs-body);
  font-weight: 700;
}

.dialog-close {
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 1.125rem;
  background: none;
  border: none;
}

.dialog-close:hover {
  color: var(--foreground);
}

.random-pick {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.pick-avatar {
  flex: none;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  object-fit: cover;
  background-color: var(--muted);
}

.pick-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.pick-name {
  font-size: var(--fs-meta);
  font-weight: 700;
}

.pick-url {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-desc {
  font-size: var(--fs-meta);
  line-height: 1.6;
  color: var(--muted-foreground);
  margin-bottom: 1.25rem;
}

.pick-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.pick-cancel,
.pick-confirm {
  font-size: var(--fs-meta);
  cursor: pointer;
  border-radius: calc(var(--radius) / 2);
  padding: 0.5rem 1rem;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.pick-cancel {
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  background: none;
}

.pick-cancel:hover {
  color: var(--foreground);
}

.pick-confirm {
  color: var(--background);
  border: 1px solid var(--accent);
  background-color: var(--accent);
}

.pick-confirm:hover {
  opacity: 0.9;
}
</style>
