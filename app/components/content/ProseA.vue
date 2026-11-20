<script setup lang="ts">
/**
 * 正文链接组件（覆盖 @nuxtjs/mdc 默认 ProseA）。
 *
 * props 契约（来自 node_modules/@nuxtjs/mdc/dist/runtime/components/prose/ProseA.vue）：
 *   href: string   —— 链接地址
 *   target: string —— 原生 target 属性透传
 *
 * 与 blog-v3 的差异：
 *   - 无 UtilLink/Tooltip 组件：外链用原生 <a target="_blank" rel="noreferrer">，
 *     悬浮域名提示用原生 title 属性；
 *   - 未知外链域名图标回退 Google Favicon（与 Badge.vue 的 favicon 处理一致）；
 *   - 颜色全部走 blog-v2 token，下划线动画用 --duration-base/--easing-base。
 */
import { getDomain, getDomainIcon, getFaviconUrl, isExternalLink } from '~/utils/icon'

const props = defineProps<{
  href: string
  target?: string
  /** MDC 属性 `{icon="tabler:xxx"}`：显式指定图标，优先级高于域名映射 */
  icon?: string
}>()

const isExt = computed(() => isExternalLink(props.href))

/** 悬浮提示：外链显示域名，内链显示解码后的路径 */
const tip = computed(() => {
  if (!props.href) return ''
  if (isExt.value) return getDomain(props.href)
  try {
    return decodeURIComponent(props.href)
  } catch {
    return props.href
  }
})

/** 图标：显式 icon 属性 > 常见域名 tabler 映射 > 未知外链回退 Google Favicon */
const domainIcon = computed(() => props.icon || getDomainIcon(props.href))
const faviconSrc = computed(() =>
  isExt.value && !domainIcon.value ? getFaviconUrl(props.href) : '',
)

/**
 * favicon 是网络资源，取不到（被墙 / 站点无 favicon）时隐藏图标，
 * 而不是留下一个塌陷的破图占位。
 */
const faviconBroken = ref(false)
</script>

<template>
  <NuxtLink
    v-if="!isExt"
    class="prose-link"
    :to="href"
    :target="target"
    :title="tip"
  >
    <Icon v-if="domainIcon" class="domain-icon" :name="domainIcon" />
    <slot />
  </NuxtLink>
  <a
    v-else
    class="prose-link"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :title="tip"
  >
    <Icon v-if="domainIcon" class="domain-icon" :name="domainIcon" />
    <img
      v-else-if="faviconSrc && !faviconBroken"
      class="domain-icon favicon"
      :src="faviconSrc"
      alt=""
      loading="lazy"
      @error="faviconBroken = true"
    />
    <slot />
  </a>
</template>

<style scoped>
/*
 * 链接视觉：与 ProseBody 的 a 一致走下划线，悬浮换强调色。
 * 底部渐变条从 0.1em 拉满到 1em，替代 blog-v3 的背景填充方案。
 */
.prose-link {
  display: inline;
  padding: 0.1em 0.2em;
  margin: -0.1em -0.2em;
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  text-decoration-color: var(--border);
  background: linear-gradient(var(--accent), var(--accent)) no-repeat left bottom / 0% 0.1em;
  border-radius: 0.3em;
  transition:
    text-decoration-color var(--duration-base) var(--easing-base),
    background-size var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.prose-link:hover {
  color: var(--accent);
  text-decoration-color: transparent;
  background-size: 100% 0.1em;
}

.domain-icon {
  display: inline-block;
  margin-inline-end: 0.15em;
  vertical-align: -0.125em;
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.prose-link:hover .domain-icon {
  color: inherit;
}

.favicon {
  width: 1em;
  height: 1em;
  object-fit: contain;
  border-radius: 2px;
}
</style>
