<script setup lang="ts">
/**
 * 侧栏公告栏：Markdown 公告（GFM，单换行即 <br>）；可配「了解更多」链接。
 */
import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

interface AnnouncementConfig {
  text: string
  moreLabel: string
  moreTo: string
}

const props = defineProps<{
  cfg: AnnouncementConfig
}>()

const { ui } = useUi()

const html = computed(() => marked.parse(props.cfg.text, { async: false }) as string)
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.announcement" icon="tabler:speakerphone">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="ann-body" v-html="html"></div>
    <NuxtLink v-if="cfg.moreLabel && cfg.moreTo" :to="cfg.moreTo" class="ann-more">
      {{ cfg.moreLabel }}
      <Icon name="tabler:chevron-right" class="more-icon" aria-hidden="true" />
    </NuxtLink>
  </SidebarCard>
</template>

<style scoped>
.ann-body {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--foreground);
}

.ann-body :deep(p) {
  margin: 0 0 0.25rem;
}

.ann-body :deep(p:last-child) {
  margin-bottom: 0;
}

.ann-body :deep(strong) {
  font-weight: 700;
}

.ann-body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ann-body :deep(a:hover) {
  opacity: 0.8;
}

.ann-body :deep(code) {
  font-size: 0.9em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--muted, rgba(127, 127, 127, 0.15));
}

.ann-body :deep(ul),
.ann-body :deep(ol) {
  margin: 0 0 0.25rem;
  padding-left: 1.25em;
}

.ann-body :deep(blockquote) {
  margin: 0.25rem 0;
  padding-left: 0.625rem;
  border-left: 3px solid var(--border);
  color: var(--muted-foreground, var(--foreground));
}

.ann-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}

.ann-more {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  margin-top: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--accent);
  transition: opacity var(--duration-base) var(--easing-base);
}

.ann-more:hover {
  opacity: 0.8;
}

.more-icon {
  font-size: 0.875em;
}
</style>
