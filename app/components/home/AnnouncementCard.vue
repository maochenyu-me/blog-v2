<script setup lang="ts">
/**
 * 侧栏公告栏：纯文本公告，支持 \n 换行；可配「了解更多」链接。
 */
interface AnnouncementConfig {
  text: string
  moreLabel: string
  moreTo: string
}

const props = defineProps<{
  cfg: AnnouncementConfig
}>()

const { ui } = useUi()

const lines = computed(() => props.cfg.text.split('\n').filter(Boolean))
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.announcement" icon="tabler:speakerphone">
    <div class="ann-body">
      <p v-for="(line, i) in lines" :key="i" class="ann-line">{{ line }}</p>
    </div>
    <NuxtLink v-if="cfg.moreLabel && cfg.moreTo" :to="cfg.moreTo" class="ann-more">
      {{ cfg.moreLabel }}
      <Icon name="tabler:chevron-right" class="more-icon" aria-hidden="true" />
    </NuxtLink>
  </SidebarCard>
</template>

<style scoped>
.ann-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ann-line {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--foreground);
  margin: 0;
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
