<script setup lang="ts">
/**
 * 留言板（/message）。
 *
 * 版式参考 blog.liushen.fun/comment/ 的信息架构（hero 卡 → 引言双栏 →
 * 规范折叠 → 整页评论区），皮肤一律内化到本站令牌：muted 底 + 1px 线 +
 * radiusCard，参考站的 aurora 光球 / 玻璃 / 大阴影收敛成 hero 内一层极淡的
 * accent 径向微光。取舍与依据见 docs/design/09-message.md。
 *
 * 评论走 Ecoku，scopeKey 固定为配置里的 pageKey —— 不随路由漂移，
 * 全站共用一个留言作用域。
 */
const { ui } = useUi()
const { site } = useBlogConfig()
const pageCfg = usePageConfig('message')

useHead({ title: ui.pages.message })

/** 留言作用域的展示标题（进入 Ecoku 通知文案） */
const commentTitle = computed(() => `${ui.pages.message} · ${site.name}`)
</script>

<template>
  <div class="page-message">
    <div class="container">
      <SiteBreadcrumb />

      <!-- ── Hero：标题 + 斜体副题 + chips（内嵌一层极端克制的 accent 微光） ── -->
      <section class="hero" :aria-label="ui.pages.message">
        <span class="hero-glow" aria-hidden="true" />
        <div class="hero-body">
          <h1 class="hero-title">{{ ui.pages.message }}</h1>
          <p class="hero-sub">{{ ui.message.heroSubtitle }}</p>
          <div class="hero-chips">
            <span class="chip">{{ ui.message.heroChip.start }}</span>
            <span class="chip">{{ ui.message.heroChip.talk }}</span>
            <NuxtLink
              to="/links"
              class="chip chip--link"
              :aria-label="ui.message.heroChipApplyAria"
            >
              <Icon name="tabler:arrow-up-right" aria-hidden="true" />
              <span>{{ ui.message.heroChip.apply }}</span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- ── 引言区：≥860px 左文右引，窄屏堆叠 ── -->
      <section class="intro" :aria-label="ui.message.introTitle">
        <div class="intro-text">
          <p class="kicker">{{ ui.message.kicker }}</p>
          <h2 class="intro-title">{{ ui.message.introTitle }}</h2>
          <p class="intro-p">{{ ui.message.introLead }}</p>
          <p class="intro-p">{{ ui.message.introFollow }}</p>
        </div>
        <blockquote class="intro-quote">
          <p>{{ ui.message.introQuote }}</p>
        </blockquote>
      </section>

      <!-- ── 留言板规范：details 折叠，虚线边表达「提示」而非「卡片」 ── -->
      <details class="rules" :open="pageCfg.rulesOpen">
        <summary class="rules-summary">
          <Icon name="tabler:shield-check" class="rules-icon" aria-hidden="true" />
          <span>{{ ui.message.rulesSummary }}</span>
          <Icon name="tabler:chevron-down" class="rules-chevron" aria-hidden="true" />
        </summary>
        <div class="rules-body">
          <ol class="rule-list">
            <li v-for="(rule, i) in pageCfg.rules" :key="i" class="rule-item">
              <strong class="rule-name">{{ rule.name }}</strong>
              <span class="rule-desc">{{ rule.desc }}</span>
            </li>
          </ol>
          <p class="rules-warn">{{ ui.message.rulesWarn }}</p>
        </div>
      </details>

      <!-- ── 评论区：整页宽度，固定留言作用域 ── -->
      <EcokuComments
        source="message"
        :scope-key="pageCfg.comments.pageKey"
        :page-title="commentTitle"
        full-width
      />
    </div>
  </div>
</template>

<style scoped>
.page-message {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--wide-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

/* ── Hero ── */
.hero {
  position: relative;
  overflow: hidden;
  padding: 2.5rem 2rem;
  margin-bottom: var(--space-block);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
  background-color: var(--muted);
}

/*
 * 氛围层：参考站是 blur(70px) 的 aurora 光球，这里收敛成一层
 * 右上角落的 accent 径向渐变（无 blur、无 opacity 动画、无阴影），
 * 暗色下同一表达式自然变淡，不需要单独覆盖。
 */
.hero-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    120% 140% at 88% -10%,
    color-mix(in srgb, var(--accent) 12%, transparent) 0%,
    transparent 58%
  );
  pointer-events: none;
}

.hero-body {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.hero-sub {
  max-width: 46ch;
  margin-top: 0.75rem;
  font-style: italic;
  font-size: var(--fs-body);
  line-height: 1.8;
  color: var(--muted-foreground);
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  background-color: var(--background);
}

.chip--link {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 32%, transparent);
  background-color: color-mix(in srgb, var(--accent) 8%, transparent);
  transition:
    border-color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.chip--link:hover {
  border-color: var(--accent);
  background-color: color-mix(in srgb, var(--accent) 14%, transparent);
}

/* ── 引言区 ── */
.intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  padding: var(--space-item);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) * 2);
}

@media (min-width: 860px) {
  .intro {
    grid-template-columns: minmax(0, 1fr) 18rem;
    align-items: stretch;
  }
}

.intro-text {
  min-width: 0;
}

.kicker {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

.intro-title {
  margin-top: 0.35rem;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.35;
}

.intro-p {
  margin-top: 0.65rem;
  font-size: var(--fs-meta);
  line-height: 1.85;
  color: var(--muted-foreground);
}

.intro-quote {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: calc(var(--radius) * 2);
  background-color: color-mix(in srgb, var(--accent) 6%, transparent);
  font-size: var(--fs-meta);
  font-style: italic;
  line-height: 1.8;
  color: var(--muted-foreground);
}

/* ── 规范折叠块 ── */
.rules {
  margin-top: var(--space-item);
  border: 1px dashed color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: calc(var(--radius) * 1.5);
}

.rules-summary {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 1.25rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--muted-foreground);
  cursor: pointer;
  list-style: none;
  transition: color var(--duration-base) var(--easing-base);
}

.rules-summary::-webkit-details-marker {
  display: none;
}

.rules-summary:hover {
  color: var(--foreground);
}

.rules-icon {
  flex: none;
  color: var(--accent);
}

.rules-chevron {
  flex: none;
  margin-left: auto;
  transition: transform var(--duration-base) var(--easing-base);
}

details[open] .rules-chevron {
  transform: rotate(180deg);
}

.rules-body {
  padding: 0 1.25rem 1.25rem;
}

.rule-list {
  display: grid;
  gap: 0.625rem;
  list-style: none;
  counter-reset: rule;
}

.rule-item {
  position: relative;
  display: grid;
  gap: 0.125rem;
  padding-left: 1.25rem;
  font-size: var(--fs-meta);
  line-height: 1.7;
  color: var(--muted-foreground);
  counter-increment: rule;
}

.rule-item::before {
  content: counter(rule) '.';
  position: absolute;
  left: 0;
  font-family: var(--font-mono);
  color: var(--accent);
}

.rule-name {
  font-weight: 700;
  color: var(--foreground);
}

.rules-warn {
  margin-top: 0.85rem;
  padding-left: 0.85rem;
  border-left: 3px solid color-mix(in srgb, var(--accent) 32%, transparent);
  font-size: var(--fs-meta);
  font-style: italic;
  line-height: 1.7;
  color: var(--muted-foreground);
}

/* ── 响应式收紧 ── */
@media (max-width: 640px) {
  .hero {
    padding: 1.5rem 1.25rem;
  }

  .intro {
    padding: 1.25rem;
  }

  .intro-title {
    font-size: 1.1rem;
  }
}
</style>
