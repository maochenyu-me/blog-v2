<script setup lang="ts">
/**
 * 文章正文的排版样式。
 * 用 :deep() 穿透 ContentRenderer 渲染出的 HTML。
 * 全部取值走 CSS 变量，无魔法数字。
 */
</script>

<template>
  <div class="prose">
    <slot />
  </div>
</template>

<style scoped>
.prose {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--foreground);
  max-width: var(--content-max-width);
}

/* ---------- 标题：同字号，靠字重与色阶分层 ---------- */

.prose :deep(h2) {
  font-size: var(--fs-body-h);
  line-height: var(--lh-body-h);
  font-weight: var(--fw-body-h);
  margin-top: 2.5em;
  margin-bottom: 0.75em;
  scroll-margin-top: 5rem;
}

/* h3 用 400 + 次级色：文楷只有 400/700 两档，同字号下必须靠色阶区分 */
.prose :deep(h3) {
  font-size: var(--fs-body-h-minor);
  line-height: var(--lh-body-h-minor);
  font-weight: var(--fw-body-h-minor);
  color: var(--muted-foreground);
  margin-top: 2em;
  margin-bottom: 0.5em;
  scroll-margin-top: 5rem;
}

.prose :deep(h4) {
  font-size: var(--fs-body);
  font-weight: 700;
  margin-top: 1.75em;
  margin-bottom: 0.5em;
}

/* ---------- 段落：间距 > 行距 ---------- */

.prose :deep(p) {
  margin-block: var(--paragraph-spacing);
}

.prose :deep(p:first-child) {
  margin-top: 0;
}

/* ---------- 链接：靠下划线，不用强调色 ---------- */

.prose :deep(a) {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  text-decoration-color: var(--border);
  transition: text-decoration-color var(--duration-base) var(--easing-base);
}

.prose :deep(a:hover) {
  text-decoration-color: var(--accent);
}

/* ---------- 列表 ---------- */

.prose :deep(ul),
.prose :deep(ol) {
  margin-block: var(--paragraph-spacing);
  padding-inline-start: 1.5em;
}

.prose :deep(ul) {
  list-style: disc;
}

.prose :deep(ol) {
  list-style: decimal;
}

.prose :deep(li) {
  margin-block: 0.375em;
}

.prose :deep(li::marker) {
  color: var(--muted-foreground);
}

.prose :deep(li > ul),
.prose :deep(li > ol) {
  margin-block: 0.375em;
}

/* ---------- 引用：强调色使用的四处之一（左侧竖线） ---------- */

.prose :deep(blockquote) {
  margin-block: var(--paragraph-spacing);
  padding-inline-start: 1rem;
  border-inline-start: 2px solid var(--accent);
  color: var(--muted-foreground);
}

.prose :deep(blockquote p) {
  margin-block: 0.5em;
}

/* ---------- 行内代码 ---------- */

.prose :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background-color: var(--muted);
  padding: 0.15em 0.35em;
  border-radius: 3px;
}

/* ---------- 代码块 ---------- */

.prose :deep(pre) {
  margin-block: var(--paragraph-spacing);
  padding: 1rem;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  font-size: var(--fs-code);
  line-height: var(--lh-code);
  tab-size: 2;
}

.prose :deep(pre code) {
  background: none;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}

/* 代码块配色：shiki 用 CSS 变量输出，这里统一映射到明暗两套主题 */
.prose :deep(.shiki) {
  background-color: var(--muted) !important;
}

.prose :deep(.shiki span) {
  color: var(--shiki-default, var(--foreground));
}

.dark .prose :deep(.shiki span) {
  color: var(--shiki-dark, var(--foreground));
}

/* ---------- 表格：允许横向滚动 ---------- */

.prose :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  margin-block: var(--paragraph-spacing);
  border-collapse: collapse;
  font-size: var(--fs-meta);
  line-height: 1.6;
}

.prose :deep(th),
.prose :deep(td) {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: start;
}

.prose :deep(th) {
  font-weight: 700;
  border-bottom-color: var(--foreground);
}

/* ---------- 图片 ---------- */

.prose :deep(img) {
  max-width: 100%;
  height: auto;
  margin-block: var(--paragraph-spacing);
  border: 1px solid var(--border);
  cursor: zoom-in;
}

/* ---------- 分隔线 ---------- */

.prose :deep(hr) {
  margin-block: 2.5em;
  border: none;
  border-top: 1px solid var(--border);
}

/* ---------- 强调 ---------- */

.prose :deep(strong) {
  font-weight: 700;
}

.prose :deep(em) {
  font-style: italic;
}

.prose :deep(del) {
  color: var(--muted-foreground);
}

/* ---------- 键盘按键 ---------- */

.prose :deep(kbd) {
  font-family: var(--font-mono);
  font-size: 0.8em;
  padding: 0.1em 0.4em;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 3px;
  background-color: var(--muted);
}

/* ---------- 脚注 ---------- */

.prose :deep(.footnotes) {
  margin-top: var(--space-block);
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

/* ---------- 移动端 ---------- */

@media (max-width: 767px) {
  .prose :deep(h2) {
    margin-top: 2em;
  }

  .prose :deep(pre) {
    margin-inline: calc(var(--space-gutter) * -1);
    border-inline: none;
  }
}
</style>
