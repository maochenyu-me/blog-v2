<script setup lang="ts">
/**
 * 首页侧栏「云服务商推荐」。
 *
 * 一项配置渲染成一张卡，支持同时推荐多家；卡片标题即服务商名。
 * 全部内容（名称 / 定位语 / 标签 / CTA）来自 pages.config.ts 的 sidebar.cloud.providers，
 * 通用文案（无障碍标签）来自 ui.pages.home.sidebar.cloud。
 *
 * CTA 的 url 留空时整颗按钮不渲染 —— 不给读者点一个没反应的死链。
 */
import type { CloudProviderItem } from '~/composables/usePageConfig'

interface CloudConfig {
  enabled: boolean
  providers: CloudProviderItem[]
  ctaExternal: boolean
}

const props = defineProps<{
  cfg: CloudConfig
}>()

const { ui, t } = useUi()
const c = ui.pages.home.sidebar.cloud

/** 只渲染开启且有名字的项，避免空配置占位 */
const providers = computed(() =>
  props.cfg.providers.filter((p) => p.enabled && p.name.trim()),
)
</script>

<template>
  <template v-for="p in providers" :key="p.name">
    <SidebarCard :title="p.name" :icon="p.icon">
      <div class="cloud">
        <p v-if="p.desc" class="cloud-desc">{{ p.desc }}</p>

        <ul
          v-if="p.tags.length"
          class="cloud-tags"
          :aria-label="t(c.tagsLabel, { name: p.name })"
        >
          <li v-for="tag in p.tags" :key="tag" class="cloud-tag">{{ tag }}</li>
        </ul>

        <a
          v-if="p.cta.url"
          class="cloud-cta"
          :href="p.cta.url"
          :target="cfg.ctaExternal ? '_blank' : undefined"
          :rel="cfg.ctaExternal ? 'noopener noreferrer' : undefined"
          :aria-label="t(c.ctaAria, { name: p.name })"
        >
          <Icon name="tabler:arrow-up-right" aria-hidden="true" />
          <span>{{ p.cta.label }}</span>
        </a>
      </div>
    </SidebarCard>
  </template>
</template>

<style scoped>
.cloud {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cloud-desc {
  margin: 0;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--foreground);
}

.cloud-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cloud-tag {
  padding: 0.1875rem 0.5rem;
  border-radius: calc(var(--radius) - 0.1875rem);
  background: color-mix(in srgb, var(--muted) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  line-height: 1.4;
  white-space: nowrap;
}

/* CTA 用强调色实心块，是卡片里唯一的强操作点 */
.cloud-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3125rem;
  align-self: flex-start;
  padding: 0.4375rem 0.75rem;
  border-radius: calc(var(--radius) - 0.125rem);
  background: var(--accent);
  color: var(--background);
  font-size: var(--fs-meta);
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  transition:
    opacity var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.cloud-cta:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}

.cloud-cta:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .cloud-cta {
    transition: none;
  }

  .cloud-cta:hover {
    transform: none;
  }
}
</style>