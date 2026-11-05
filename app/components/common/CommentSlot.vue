<script setup lang="ts">
/**
 * 评论占位（提示词 §7.2 / §13：暂不接入，预留组件位）。
 * 用一条 1px 线占位，不画空框，避免视觉噪音。
 */
const { ui } = useUi()
</script>

<template>
  <section class="comment-slot" :aria-label="ui.comment.aria">
    <p class="comment-note">{{ ui.comment.closed }}</p>
  </section>
</template>

<style scoped>
.comment-slot {
  margin-top: var(--space-section);
  padding-top: var(--space-item);
  border-top: 1px solid var(--border);
}

.comment-note {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}
</style>
