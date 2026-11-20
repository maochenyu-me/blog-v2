<script setup lang="ts">
import type { MetaSlotsTree } from '~~/remark-plugins/rehype-meta-slots'

/**
 * meta 插槽渲染器：把 rehype-meta-slots 抽出的 minimark 树重新交给
 * ContentRenderer 渲染（组件、Markdown 全量能力都在）。
 *
 * 与参考站对齐：插槽元素上的 MDC 属性（`::meta-aside-foo{title="…" card}`）
 * 被保留在 tree.props 里，其中 title 作面板标题渲染，card 只影响参考站的
 * 卡片外壳；本站外壳由调用方的 .aside-panel.glass-panel 提供，故忽略。
 */
const props = defineProps<{
  tree: MetaSlotsTree | undefined
}>()

const title = computed(() => {
  const raw = (props.tree as { props?: Record<string, unknown> } | undefined)?.props?.title
  return typeof raw === 'string' ? raw.trim() : ''
})
</script>

<template>
  <section v-if="tree" class="meta-slot">
    <div v-if="title" class="slot-label">
      {{ title }}
    </div>
    <ContentRenderer :value="tree" />
  </section>
</template>

<style scoped>
.meta-slot {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 与 PostRelated 的 .related-label 同一套面板标题语言 */
.slot-label {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  font-weight: 400;
  color: var(--muted-foreground);
}
</style>
