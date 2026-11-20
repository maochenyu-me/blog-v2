<script setup lang="ts">
/**
 * 代码块组件（覆盖 @nuxtjs/mdc 默认 ProsePre）。
 *
 * props 契约（来自 node_modules/@nuxtjs/mdc/.../parser/handlers/code.js）：
 *   code: string       —— 原始代码文本（构建时 shiki 高亮后，slot 内含 spans）
 *   language: string   —— 代码语言（默认 "text"）
 *   filename?: string  —— 文件名（从 ```lang {filename=xxx} 解析）
 *   highlights: number[] —— 高亮行号
 *   meta?: string      —— meta 字符串（wrap / expand / indent=N 等）
 *   class?: string     —— 包含 language-xxx 的 className
 *
 * 与 blog-v3 的关键差异：
 *   - blog-v3 关闭构建时高亮，运行时调 shiki；blog-v2 构建时已高亮，slot 内容
 *     直接渲染，不做运行时高亮；
 *   - 行数统计用 code prop 的文本；复制也用 code prop；
 *   - 无 useAppConfig().component.codeblock，折叠阈值/行数写为本地常量；
 *   - 禁用 box-shadow（blog-v2 暗色模式全局禁用），focused 效果改用
 *     color-mix 半透明背景替代。
 */

interface CodeblockMeta {
  wrap?: boolean
  expand?: boolean
  indent?: string
  icon?: string
  [key: string]: string | boolean | undefined
}

const props = withDefaults(defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
  class?: string
}>(), {
  code: '',
  language: 'text',
  meta: '',
})

/** 折叠阈值：超过此行数自动折叠 */
const TRIGGER_ROWS = 22
/** 折叠后显示行数 */
const COLLAPSED_ROWS = 10

const parsedMeta = computed<CodeblockMeta>(() => {
  if (!props.meta) return {}
  return props.meta.split(/\s+/).reduce((acc: CodeblockMeta, item) => {
    const eqIdx = item.indexOf('=')
    if (eqIdx === -1) {
      acc[item] = true
    } else {
      const key = item.slice(0, eqIdx)
      const value = item.slice(eqIdx + 1)
      acc[key] = value
    }
    return acc
  }, {})
})

/** 行数统计 */
const rows = computed(() => {
  const text = props.code.trimEnd()
  if (!text) return 0
  return text.split('\n').length
})

const collapsible = computed(() => !parsedMeta.value.expand && rows.value > TRIGGER_ROWS)
const isCollapsed = ref(collapsible.value)

/** 文件名图标 */
const icon = computed(() =>
  parsedMeta.value.icon || getFileIcon(props.filename) || getLangIcon(props.language),
)

/** 换行状态 */
const isWrap = ref(!!parsedMeta.value.wrap)

/** 复制 */
const { ui } = useUi()
const { copied, copy } = useCopyText()
function copyCode() {
  copy(props.code)
}

/** 代码块字节大小 */
const byteSize = computed(() => {
  const bytes = new TextEncoder().encode(props.code).length
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
})
</script>

<template>
  <figure
    class="code-block"
    :class="{ collapsed: collapsible && isCollapsed, collapsible }"
    :style="{
      '--collapsed-rows': COLLAPSED_ROWS,
    }"
  >
    <!-- 头部：文件名 + 语言标签 + 操作按钮 -->
    <figcaption>
      <span v-if="filename" class="filename">
        <Icon :name="icon" /> {{ filename }}
      </span>
      <span v-else />
      <span v-if="language && language !== 'text'" class="language">{{ language }}</span>
      <div class="operations">
        <button type="button" @click="isWrap = !isWrap">
          {{ isWrap ? ui.content.codeblock.scrollX : ui.content.codeblock.wrap }}
        </button>
        <button type="button" @click="copyCode()">
          {{ copied ? ui.code.copied : ui.code.copy }}
        </button>
      </div>
    </figcaption>

    <!--
      代码区：优先渲染 slot（构建时 shiki 高亮后的 spans）；
      Demo 的「语法」Tab 没有 slot，只有 code prop，此时用纯文本 fallback
      （配合下方 .fallback-code 样式），保证语法面板不再空白。
      codeblock-pre 这个 class 是给 ProseBody 的全局 pre 规则做排除用的：
      那套 2.25rem 头部带 + 双层边框只服务原生 pre，不能渗进本组件。
    -->
    <pre
      class="shiki scrollcheck-x codeblock-pre"
      :class="[props.class, { wrap: isWrap }]"
    ><slot><span class="fallback-code">{{ props.code }}</span></slot></pre>

    <!-- 折叠/展开按钮 -->
    <button
      v-if="collapsible"
      type="button"
      class="toggle-btn"
      :aria-label="isCollapsed ? ui.content.codeblock.expandAria : ui.content.codeblock.collapseAria"
      @click="isCollapsed = !isCollapsed"
    >
      <Icon
        class="toggle-icon"
        :class="{ 'is-collapsed': isCollapsed }"
        name="tabler:chevrons-up"
      />
      <span>{{ rows }} lines, {{ props.code.length }} chars, {{ byteSize }}</span>
    </button>
  </figure>
</template>

<style scoped>
.code-block {
  --line-height: 1.7;
  --start-offset: 3.5em;

  contain: paint;
  margin-block: var(--paragraph-spacing);
  border-radius: var(--radius-base);
  background-color: var(--muted);
  border: 1px solid var(--border);
  font-size: var(--fs-code);
  line-height: var(--lh-code);
  tab-size: 2;
}

/* 折叠态 */
.code-block.collapsed > pre {
  overflow: hidden;
  max-height: calc(var(--line-height) * var(--collapsed-rows) * 1em + 1.5rem);
  mask-image: linear-gradient(to top, transparent -2em, var(--muted) 4em);
}

/* 头部 */
figcaption {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  position: sticky;
  top: 0;
  padding: 0 0.75em;
  z-index: 2;
  background-color: var(--muted);
  min-height: 2rem;
}

.filename {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.2em 0.6em;
  border-radius: 0 0 var(--radius-base) var(--radius-base);
  background-color: var(--border);
  color: var(--foreground);
  font-size: 0.85em;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* 超长文件名羽化 */
  mask-image: linear-gradient(to right, #000 calc(100% - 2em), transparent);
}

.language {
  opacity: 0.4;
  font-size: 0.8em;
  font-family: var(--font-mono);
}

/* 操作按钮组：悬浮显示 */
.operations {
  position: absolute;
  opacity: 0;
  inset-inline-end: 0;
  top: 0;
  display: flex;
  gap: 0.2em;
  padding: 0.2em 0.5em;
  border-end-start-radius: var(--radius-base);
  background-color: var(--muted);
  transition: opacity var(--duration-base) var(--easing-base);

  .code-block:hover &,
  .code-block:focus-within & {
    opacity: 1;
  }

  > button {
    opacity: 0.5;
    padding: 0.15em 0.4em;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--muted-foreground);
    font-family: var(--font-mono);
    font-size: 0.75em;
    cursor: pointer;
    transition:
      opacity var(--duration-base) var(--easing-base),
      color var(--duration-base) var(--easing-base);

    &:hover {
      opacity: 1;
      color: var(--foreground);
    }
  }
}

/* 代码区 */
pre {
  padding: 0.75rem 1rem;
  padding-inline-start: var(--start-offset);
  margin: 0;
  overflow-x: auto;
  background: transparent !important;
  overscroll-behavior-x: contain;
}

pre.wrap {
  white-space: pre-wrap;
}

pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

/* Demo「语法」Tab 的纯文本 fallback：保留源码里的换行与空白 */
.fallback-code {
  white-space: pre;
  font-family: var(--font-mono);
}

/* 行样式 */
:deep(.line) {
  display: block;

  /* diff 增删行 */
  &.diff {
    background-color: color-mix(in srgb, var(--accent) 10%, transparent);

    &.add {
      --line-indicator: "+ ";
      --line-indicator-color: #2a9d2a;
      background-color: color-mix(in srgb, #2a9d2a 10%, transparent);
    }

    &.remove {
      --line-indicator: "- ";
      --line-indicator-color: #d63030;
      background-color: color-mix(in srgb, #d63030 10%, transparent);
    }
  }

  /* 高亮行 */
  &.highlighted {
    --line-indicator-color: var(--foreground);
    background-color: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  /* 聚光行（替代 box-shadow） */
  &.focused {
    --line-indicator: "→ ";
    --line-indicator-color: var(--foreground);
    display: inline-block;
    position: relative;
    background-color: color-mix(in srgb, var(--muted) 85%, transparent);
    transition: background-color var(--duration-base) var(--easing-base);
  }

  pre:hover > &.focused {
    background-color: transparent;
  }

  /* 行号 */
  &::before {
    content: var(--line-indicator, "") attr(data-line);
    position: fixed;
    inset-inline-start: 0;
    width: var(--start-offset);
    padding-inline-end: 0.75em;
    background-color: var(--muted);
    text-align: end;
    color: var(--line-indicator-color, var(--muted-foreground));
    font-size: 0.8em;
    z-index: 1;
    pointer-events: none;
  }
}

/* 折叠/展开按钮 */
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3em;
  width: 100%;
  padding: 0.3em;
  border: none;
  border-top: 1px solid var(--border);
  background-color: color-mix(in srgb, var(--muted) 60%, var(--background));
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  font-size: 0.75em;
  cursor: pointer;
  opacity: 0.5;
  transition:
    opacity var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);

  &:hover {
    opacity: 1;
    color: var(--foreground);
  }
}

.toggle-icon {
  transition: transform var(--duration-base) var(--easing-base);

  &.is-collapsed {
    transform: rotate(180deg);
  }
}

/* 移动端 */
@media (max-width: 767px) {
  pre {
    padding-inline-start: 2.5em;
    font-size: 0.8125rem;
  }

  :deep(.line)::before {
    width: 2.5em;
    padding-inline-end: 0.5em;
  }
}
</style>
