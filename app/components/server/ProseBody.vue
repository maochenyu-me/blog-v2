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
  /* 锚点跳转时避开吸顶导航：与目录贴顶位置用同一组 token，避免三处硬编码漂移 */
  scroll-margin-top: calc(var(--header-height) + var(--toc-sticky-offset));
}

/* h3 用 400 + 次级色：文楷只有 400/700 两档，同字号下必须靠色阶区分 */
.prose :deep(h3) {
  font-size: var(--fs-body-h-minor);
  line-height: var(--lh-body-h-minor);
  font-weight: var(--fw-body-h-minor);
  color: var(--muted-foreground);
  margin-top: 2em;
  margin-bottom: 0.5em;
  scroll-margin-top: calc(var(--header-height) + var(--toc-sticky-offset));
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

/*
 * padding-top 让出一条 2.25rem 的头部带，供 CodeCopyButton 的语言标签与
 * 复制按钮落脚（那个组件用 Teleport 把按钮浮在代码块上方，尺寸与这里对应）。
 * 不留这条带子，按钮就会压在首行代码上。
 *
 * `:not(.codeblock-pre)` 是必须的：ProsePre 已经接管了全部 fenced code，
 * 自带 figure 外壳、头部条与 padding。让这条规则渗进去，会在每个代码块顶部
 * 多垫 2.25rem 空白带，并叠上第二层 border/底色（表现为「代码块上下分裂成
 * 两个」）。这里只服务当年没有 ProsePre 的原生 pre。
 */
.prose :deep(pre:not(.codeblock-pre)) {
  margin-block: var(--paragraph-spacing);
  padding: 2.25rem 1rem 1rem;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0;
  overflow-x: auto;
  font-size: var(--fs-code);
  line-height: var(--lh-code);
  tab-size: 2;
  overscroll-behavior-x: contain;
}

.prose :deep(pre code) {
  background: none;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}

/*
 * 代码块配色：shiki 用 CSS 变量输出，这里统一映射到明暗两套主题。
 * 同样排除 ProsePre 的代码区 —— 那边的底色由 figure 自己提供，
 * pre 必须保持透明，否则会在圆角内再糊一层方角色块。
 */
.prose :deep(.shiki:not(.codeblock-pre)) {
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

/*
 * 只接管「正文里的裸图片」。带 class 的图片（.badge-icon / .pic-image /
 * LinkCard 图标 ……）都是组件自己排版的对象，必须让位：
 * 这条规则的特异性 (0,2,1) 高于组件 scoped 的 (0,2,0)，一渗进去就会把
 * `height: 1.6em` 覆盖成 auto、并强塞 margin-block 与边框，徽章头像于是
 * 涨成整行高的大方图。
 */
.prose :deep(img:not([class])) {
  max-width: 100%;
  height: auto;
  margin-block: var(--paragraph-spacing);
  border: 1px solid var(--border);
  cursor: zoom-in;

  &[height] {
    width: auto;
  }
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

.prose :deep(.footnotes sup) {
  font-size: 0.75em;
  line-height: 1;
  vertical-align: super;
}

.prose :deep(.footnotes a) {
  text-decoration: none;
  color: var(--accent);
}

.prose :deep(.footnotes a:hover) {
  text-decoration: underline;
}

/* ---------- 标题锚点高亮 ---------- */

.prose :deep(h2:target),
.prose :deep(h3:target),
.prose :deep(h4:target) {
  border-radius: 0.2rem;
  animation: highlight 3s ease-out;
}

@keyframes highlight {
  0% { background-color: transparent; }
  15% { background-color: color-mix(in srgb, var(--accent) 20%, transparent); }
  100% { background-color: transparent; }
}

/* ---------- 示例页专用类 ---------- */

/* .icon：小尺寸内联图片（如 emoji 图标） */
.prose :deep(img.icon) {
  height: 1.4em;
  width: auto;
  vertical-align: middle;
  transform: translateY(-0.1em);
  margin: 0;
  border: none;
  cursor: default;
  display: inline;
}

/* .title-like：标题感文字 */
.prose :deep(.title-like) {
  font-weight: 700;
  text-align: center;
  font-size: 1.25em;
  letter-spacing: 0.05em;
}

/* .text-story：故事感斜体 */
.prose :deep(.text-story) {
  font-style: italic;
  color: var(--muted-foreground);
}

/* .text-repeat：阴影回声效果（字间距 + 左右重影） */
.prose :deep(.text-repeat) {
  text-shadow:
    0.1em 0 var(--muted),
    0.2em 0 var(--muted),
    0.3em 0 var(--muted),
    0.4em 0 var(--muted),
    0.5em 0 var(--muted);
  letter-spacing: 0.15em;
}

/* .text-zoom：滚动驱动动画（变大变高） */
.prose :deep(.text-zoom) {
  display: inline-block;
  transform-origin: left bottom;
}

@supports (animation-timeline: view()) {
  .prose :deep(.text-zoom) {
    animation: text-zoom 1s ease-out both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }
}

@keyframes text-zoom {
  from {
    transform: scale(0.8);
    opacity: 0.6;
  }
  to {
    transform: scale(1.25);
    opacity: 1;
  }
}

/* .example-info：示例说明绿字 */
.prose :deep(.example-info) {
  color: #2e7d32;
  font-size: var(--fs-meta);
}

.dark .prose :deep(.example-info) {
  color: #66bb6a;
}

/* ---------- 数学公式（KaTeX） ---------- */

/*
 * 行内公式与正文同号。
 * KaTeX 默认 .katex { font-size: 1.21em }，那是给纯数学排版留的余量；
 * 放进 17px 的中文正文里会大出 21%（实测 20.57px vs 17px），
 * 字形比汉字重一截，还会把行距顶开。
 */
.prose :deep(.katex) {
  font-size: 1em;
}

/*
 * 块级公式：上下留白对齐段落间距（.prose p 的 1.2em），超宽时在公式内部滚动。
 * 不处理 overflow 的后果实测过：长公式把文档撑到 547px，
 * 390px 的视口整页横向滚动，正文跟着一起漂。
 * padding-block 给滚动条和 \sum 的上下限留余量，否则会被裁掉。
 */
.prose :deep(.katex-display) {
  margin-block: 1.2em;
  padding-block: 0.25em;
  overflow-x: auto;
  overflow-y: hidden;
}

/*
 * 公式写错时的标红。KaTeX 默认 #cc0000 在暗色底上只有 3.35:1，
 * 达不到正文级的 4.5:1；改用强调色（实测 5.45 / 6.07），
 * 也避免在「只有一处强调色」的体系里再引入第二种红。
 */
.prose :deep(.katex-error) {
  color: var(--accent);
}

/* ---------- 移动端 ---------- */

@media (max-width: 767px) {
  .prose :deep(h2) {
    margin-top: 2em;
  }

  /*
   * 代码块留在正文栏内，不再用负 margin 撑到屏幕边缘：
   * 满屏宽度换来的是「一条横穿屏幕的长条」，左右边线消失后
   * 代码块与正文失去边界，反而更难扫读。窄屏下宽度本来也吃不满，
   * 把 24px 的沟槽留给呼吸感更划算。
   *
   * padding-top 让出 CodeCopyButton 的头部条高度（2.25rem），
   * 使语言与复制按钮落在代码上方的空白带里，而不是压在首行代码上。
   */
  .prose :deep(pre:not(.codeblock-pre)) {
    padding: 2.25rem 0.75rem 0.75rem;
    font-size: 0.8125rem;
    overscroll-behavior-x: contain;
  }
}
</style>
