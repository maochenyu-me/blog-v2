<script setup lang="ts">
/**
 * 行内代码组件（覆盖 @nuxtjs/mdc 默认 ProseCode）。
 *
 * props 契约（来自 node_modules/@nuxtjs/mdc/.../parser/handlers/inlineCode.js）：
 *   language?: string —— 当 markdown 写为 {.js}`code` 时，parser 会在元素上
 *                        设置 language 属性，mdc 将其作为 prop 传入组件。
 *   code 不是 prop —— 行内代码的文本通过 slot 传入（parser 生成 text 子节点）。
 *
 * 与 blog-v3 的差异：
 *   - blog-v3 关闭了构建时高亮（highlight: false），运行时用 useShiki 做行内高亮；
 *   - blog-v2 开启了构建时 shiki 高亮，行内代码如果带语言注解，构建时可能已
 *     被高亮（slot 内可能已有 spans）。不再做运行时高亮，只处理样式和复制按钮。
 */
const props = defineProps<{
  language?: string
  code?: string
}>()

const codeRef = useTemplateRef<HTMLElement>('code')

/** 从 slot 文本或 code prop 获取可复制文本 */
const copyText = computed(() => {
  if (props.code) return props.code
  if (import.meta.server) return ''
  return codeRef.value?.textContent ?? ''
})

const { ui } = useUi()
const { copied, copy } = useCopyText()
</script>

<template>
  <code ref="code" class="inline-code" :class="{ 'has-lang': language }">
    <slot />
    <button
      v-if="language"
      type="button"
      class="copy-button"
      :aria-label="ui.code.copy"
      @click.stop="copy(copyText)"
    >
      <Icon :name="copied ? 'tabler:check' : 'tabler:copy'" />
    </button>
  </code>
</template>

<style scoped>
.inline-code {
  position: relative;
  margin: 0 0.1em;
  padding: 0.1rem 0.35em;
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 3px;
  background-color: color-mix(in srgb, currentColor 5%, transparent);
  font-family: var(--font-mono);
  font-size: 0.85em;
  white-space: break-spaces;
  word-break: break-word;
}

/* 有语言注解的行内代码：右侧留空给复制按钮 */
.inline-code.has-lang {
  padding-inline-end: 1.6em;
}

.copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset-inline-end: 0.2em;
  top: 50%;
  transform: translateY(-50%);
  width: 1.2em;
  height: 1.2em;
  padding: 0;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0.5;
  transition:
    opacity var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.copy-button:hover,
.copy-button:focus-visible {
  opacity: 1;
  color: var(--accent);
}
</style>
