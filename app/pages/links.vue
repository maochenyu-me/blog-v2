<script setup lang="ts">
const { ui, t } = useUi()
const pageCfg = usePageConfig('links')
const { friendLinks } = await import('~/data/links')

const dialogOpen = ref(false)

/**
 * 列数来自配置。用 CSS 变量传进 grid-template-columns，
 * 避免在样式里写死 2/3/4。
 */
const gridStyle = computed(() => ({
  '--cols-mobile': String(pageCfg.columns.mobile),
  '--cols-tablet': String(pageCfg.columns.tablet),
  '--cols-desktop': String(pageCfg.columns.desktop),
}))

useHead({ title: ui.pages.links })
</script>

<template>
  <div class="page-links">
    <div class="container">
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.links }}</h1>
        <button type="button" class="apply-btn" @click="dialogOpen = true">
          {{ ui.links.apply }}
        </button>
      </header>

      <ul class="link-grid" :style="gridStyle">
        <li v-for="link in friendLinks" :key="link.url" class="link-cell">
          <!-- 站内链接（owner）用 NuxtLink 做客户端跳转，外链才开新窗口 -->
          <NuxtLink
            v-if="link.owner"
            :to="link.url"
            class="link-card"
          >
            <NuxtImg
              v-if="pageCfg.showAvatar"
              :src="link.avatar"
              :alt="t(ui.links.avatarAlt, { name: link.name })"
              class="link-avatar"
              width="48"
              height="48"
              loading="eager"
              decoding="async"
            />
            <span class="link-body">
              <span class="link-name">
                {{ link.name }}
                <span v-if="link.owner" class="link-badge">{{ ui.links.self }}</span>
              </span>
              <span class="link-desc">{{ link.description }}</span>
            </span>
          </NuxtLink>

          <a v-else :href="link.url" class="link-card" target="_blank" rel="noopener noreferrer">
            <NuxtImg
              v-if="pageCfg.showAvatar"
              :src="link.avatar"
              :alt="t(ui.links.avatarAlt, { name: link.name })"
              class="link-avatar"
              width="48"
              height="48"
              loading="eager"
              decoding="async"
            />
            <span class="link-body">
              <span class="link-name">
                {{ link.name }}
                <span v-if="link.owner" class="link-badge">{{ ui.links.self }}</span>
              </span>
              <span class="link-desc">{{ link.description }}</span>
            </span>
          </a>
        </li>
      </ul>
    </div>

    <Teleport to="body">
      <div v-if="dialogOpen" class="dialog-overlay" @click.self="dialogOpen = false">
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-title"
          @keydown.esc="dialogOpen = false"
        >
          <div class="dialog-head">
            <h2 id="apply-title" class="dialog-title">{{ ui.links.applyTitle }}</h2>
            <button
              type="button"
              class="dialog-close"
              :aria-label="ui.common.close"
              @click="dialogOpen = false"
            >
              <Icon name="tabler:x" aria-hidden="true" />
            </button>
          </div>

          <ol class="rule-list">
            <li v-for="(rule, i) in pageCfg.applyRules" :key="i" class="rule-item">
              {{ rule }}
            </li>
          </ol>
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
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.page-head {
  display: flex;
  align-items: baseline;
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

.apply-btn {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.125rem;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.apply-btn:hover {
  color: var(--foreground);
  border-bottom-color: var(--accent);
}

/* 网格列数全部来自 pages.config.ts */
.link-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols-mobile, 2), minmax(0, 1fr));
  gap: 1px;
  background-color: var(--border);
  border: 1px solid var(--border);
}

@media (min-width: 768px) {
  .link-grid {
    grid-template-columns: repeat(var(--cols-tablet, 3), minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .link-grid {
    grid-template-columns: repeat(var(--cols-desktop, 4), minmax(0, 1fr));
  }
}

/* 网格用 1px 间隙 + 底色形成分隔线，避免每个格子都画边框导致双线 */
.link-cell {
  background-color: var(--background);
}

.link-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  height: 100%;
  transition: background-color var(--duration-base) var(--easing-base);
}

.link-card:hover {
  background-color: var(--muted);
}

.link-avatar {
  flex: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: calc(var(--radius) / 2);
  object-fit: cover;
}

.link-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.link-name {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  line-height: 1.4;
}

.link-badge {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--accent);
}

.link-desc {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--muted-foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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
  max-width: 30rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-item);
  /* 弹层是唯一允许阴影的地方（提示词 §5.2），暗色下已被全局禁用 */
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
}

.dialog-close:hover {
  color: var(--foreground);
}

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

/* 规则是真实的有序列表，允许编号 */
.rule-item::before {
  content: counter(rule);
  flex: none;
  font-family: var(--font-mono);
  color: var(--accent);
}
</style>
