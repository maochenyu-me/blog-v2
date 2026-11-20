<script setup lang="ts">
/**
 * 表格组件（覆盖 @nuxtjs/mdc 默认 ProseTable）。
 *
 * props 契约（来自 node_modules/@nuxtjs/mdc/.../prose/ProseTable.vue）：
 *   无 props，只接收 slot（thead/tbody/tr/td 等子节点）。
 *
 * 与 blog-v3 的差异：
 *   - 无 Tooltip/ZButton 组件：切换按钮改为绝对定位在表格右上角的小按钮，
 *     hover 时 opacity 0→1（参考 blog-v3 ProsePre 的 .operations 做法）；
 *   - 颜色全部走 blog-v2 token。
 *
 * 默认横向滚动（table.scroll），悬浮右上按钮可切换为自动换行。
 */
const scroll = ref(true)
function toggleScroll() {
  scroll.value = !scroll.value
}
</script>

<template>
  <figure class="md-table">
    <button
      type="button"
      class="toggle-btn"
      :aria-label="scroll ? '切换为自动换行' : '切换为横向滚动'"
      :title="scroll ? '自动换行' : '横向滚动'"
      @click="toggleScroll()"
    >
      <Icon :name="scroll ? 'tabler:text-wrap' : 'tabler:text-wrap-disabled'" />
    </button>
    <table class="scrollcheck-x" :class="{ scroll }">
      <slot />
    </table>
  </figure>
</template>

<style scoped>
.md-table {
  position: relative;
  margin-block: var(--paragraph-spacing);
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-meta);
  line-height: 1.6;
  word-break: break-all;
}

/* 切换按钮：右上角悬浮显示 */
.toggle-btn {
  position: absolute;
  inset-inline-end: 0;
  top: -0.25rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 3px;
  background-color: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.md-table:hover > .toggle-btn,
.toggle-btn:focus-visible {
  opacity: 1;
}

.toggle-btn:hover {
  color: var(--foreground);
  border-color: var(--muted-foreground);
}

table.scroll {
  contain: layout; /* KaTeX 撑开宽度 */
  display: block;
  white-space: nowrap;
  word-break: normal;
}

table {
  max-height: 80vh;
  max-height: 80dvh;
  margin: auto;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

th {
  background-color: var(--muted);
  font-weight: 700;
  text-align: center;
  border-bottom-color: var(--foreground);
}

tr {
  transition: background-color var(--duration-base) var(--easing-base);

  &:hover {
    background-color: color-mix(in srgb, var(--muted) 60%, transparent);
  }
}

th,
td {
  padding: 0.5em 0.8em;
  border: 1px solid var(--border);
  text-align: start;
}
</style>
