<script setup lang="ts">
const { ui } = useUi()
const pageCfg = usePageConfig('about')
const { skills, now, contacts } = await import('~/data/about')

const { data: about } = await useAsyncData('about', () =>
  queryCollection('about').first(),
)

useHead({ title: ui.pages.about })

const has = (block: string) => pageCfg.blocks.includes(block)
</script>

<template>
  <div class="page-about">
    <div class="container">
      <header class="page-head">
        <h1 class="page-title">{{ about?.title ?? ui.pages.about }}</h1>
      </header>

      <!-- intro：正文来自 content/about.md -->
      <section v-if="has('intro') && about" class="block">
        <ContentRenderer :value="about" class="prose" />
      </section>

      <!-- now -->
      <section v-if="has('now')" class="block">
        <h2 class="block-label">{{ ui.about.now }}</h2>
        <dl class="now-list">
          <div v-for="item in now" :key="item.label" class="now-row">
            <dt class="now-key">{{ item.label }}</dt>
            <dd class="now-value">{{ item.value }}</dd>
          </div>
        </dl>
      </section>

      <!-- skills：纯文字列表，禁止进度条 -->
      <section v-if="has('skills')" class="block">
        <h2 class="block-label">{{ ui.about.skills }}</h2>
        <div class="skill-groups">
          <div v-for="group in skills" :key="group.title" class="skill-group">
            <h3 class="skill-title">{{ group.title }}</h3>
            <ul class="skill-items">
              <li v-for="item in group.items" :key="item" class="skill-item">
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- timeline -->
      <section v-if="has('timeline')" class="block">
        <h2 class="block-label">{{ ui.about.timeline }}</h2>
        <ol class="timeline">
          <li v-for="item in pageCfg.timeline" :key="item.year" class="timeline-row">
            <span class="timeline-year">{{ item.year }}</span>
            <span class="timeline-body">
              <span class="timeline-title">{{ item.title }}</span>
              <span v-if="item.detail" class="timeline-detail">{{ item.detail }}</span>
            </span>
          </li>
        </ol>
      </section>

      <!-- contact -->
      <section v-if="has('contact')" class="block">
        <h2 class="block-label">{{ ui.about.contact }}</h2>
        <ul class="contact-list">
          <li v-for="item in contacts" :key="item.label" class="contact-row">
            <span class="contact-key">{{ item.label }}</span>
            <a v-if="item.href" :href="item.href" class="contact-value is-link">
              {{ item.value }}
            </a>
            <span v-else class="contact-value">{{ item.value }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-about {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.page-head {
  margin-bottom: var(--space-block);
}

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.block + .block {
  margin-top: var(--space-section);
}

.block-label {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  font-weight: 400;
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  margin-bottom: 1rem;
}

/* now */
.now-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.now-row {
  display: flex;
  gap: 1rem;
  align-items: baseline;
}

.now-key {
  flex: none;
  width: 3.5rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.now-value {
  font-size: var(--fs-body);
  line-height: 1.6;
}

/* skills */
.skill-groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.skill-title {
  font-size: var(--fs-meta);
  font-weight: 400;
  color: var(--muted-foreground);
  margin-bottom: 0.375rem;
}

.skill-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.skill-item {
  font-size: var(--fs-body);
  line-height: 1.6;
}

/* timeline */
.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-row {
  display: flex;
  gap: 1.25rem;
  padding-block: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.timeline-row:first-child {
  border-top: 1px solid var(--border);
}

.timeline-year {
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  padding-top: 0.15rem;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.timeline-title {
  font-size: var(--fs-body);
  line-height: 1.5;
}

.timeline-detail {
  font-size: var(--fs-meta);
  line-height: 1.6;
  color: var(--muted-foreground);
}

/* contact */
.contact-list {
  display: flex;
  flex-direction: column;
}

.contact-row {
  display: flex;
  gap: 1rem;
  align-items: baseline;
  padding-block: 0.625rem;
  border-bottom: 1px solid var(--border);
}

.contact-row:first-child {
  border-top: 1px solid var(--border);
}

.contact-key {
  flex: none;
  width: 4.5rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.contact-value {
  font-size: var(--fs-body);
  font-family: var(--font-mono);
}

.contact-value.is-link {
  border-bottom: 1px solid var(--border);
  transition: border-color var(--duration-base) var(--easing-base);
}

.contact-value.is-link:hover {
  border-bottom-color: var(--accent);
}
</style>
