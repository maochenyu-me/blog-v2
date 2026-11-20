<script setup lang="ts">
/**
 * Copy 组件 —— 复刻参考站 blog-v3 的完整功能：
 *   - prompt 前缀 + 语言自动推断（getPromptLanguage）
 *   - shiki 客户端高亮（fine-grained API，仅加载少量语言 + 双主题）
 *   - contenteditable 可编辑
 *   - 撤销按钮（恢复原始 code）
 *   - 复制当前编辑后的内容
 *   - 跟随 .dark 类切换主题
 */
import { getPromptLanguage } from '~/utils/str'

const { ui } = useUi()

const props = withDefaults(defineProps<{
  prompt?: string | boolean
  code?: string
  lang?: string
}>(), {
  prompt: '$',
})

// MDC 里 prompt="" 会被解析成 true：只有显式的非空字符串才显示提示符
const showPrompt = computed(() => typeof props.prompt === 'string' && props.prompt.length > 0)

// 语言推断：显式 lang 优先，否则根据 prompt 前缀推断
const language = computed(() => props.lang ?? getPromptLanguage(props.prompt))

const codeInput = ref<HTMLElement | null>(null)
const showUndo = ref(false)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

// 复制当前编辑后的内容（而非原始 props.code）
async function copy() {
  const text = codeInput.value?.textContent ?? ''
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1500)
  } catch {
    /* 剪贴板不可用时静默失败 */
  }
}

// 撤销：恢复原始 code 并重新高亮
function undo() {
  if (!codeInput.value) return
  codeInput.value.textContent = props.code ?? ''
  codeInput.value.dispatchEvent(new Event('input'))
  showUndo.value = false
}

// 阻止换行（contenteditable 默认 Enter 会插入换行）
function preventLineBreak(event: Event) {
  const e = event as InputEvent
  const { data, inputType } = e
  if (data?.includes('\n') || inputType === 'insertLineBreak') {
    e.preventDefault()
  }
}

// 检测是否可撤销
function checkUndoable(event: Event) {
  const e = event as InputEvent
  showUndo.value = props.code !== (e.target as Element).textContent
}

// ── shiki 客户端高亮 ─────────────────────────────────────────────
// 模块级缓存，所有 Copy 实例共享
let highlighterPromise: Promise<any> | null = null
let currentTheme: 'light' | 'dark' = 'light'

function getInitialTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, langs, themes] = await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript'),
        import('shiki/langs'),
        import('shiki/themes'),
      ])
      const highlighter = await createHighlighterCore({
        themes: [themes.githubLight, themes.githubDark],
        langs: [langs.bash, langs.javascript, langs.typescript, langs.json, langs.powershell, langs.bat],
        engine: createJavaScriptRegexEngine(),
      })
      return highlighter
    })()
  }
  return highlighterPromise
}

function getThemeName(): string {
  return currentTheme === 'dark' ? 'github-dark' : 'github-light'
}

async function applyHighlight() {
  const el = codeInput.value
  if (!el) return
  const lang = language.value
  try {
    const highlighter = await getHighlighter()
    // 确保语言已加载
    const loadedLangs = highlighter.getLoadedLanguages()
    if (!loadedLangs.includes(lang)) {
      try {
        await highlighter.loadLanguage(lang)
      } catch {
        // 未知语言回退为纯文本
        return
      }
    }
    const code = el.textContent ?? ''
    const html = highlighter.codeToHtml(code, {
      lang,
      theme: getThemeName(),
    })
    // shiki 输出 <pre class="shiki ..."><code>...</code></pre>
    // 提取 <code> 内部 HTML 写入 el
    const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)
    if (match) {
      el.innerHTML = match[1]
    }
  } catch {
    // 高亮失败时保留纯文本
  }
}

// 监听暗色模式切换
let themeObserver: MutationObserver | null = null

onMounted(async () => {
  currentTheme = getInitialTheme()
  await applyHighlight()

  // 监听 .dark 类变化
  if (typeof document !== 'undefined') {
    themeObserver = new MutationObserver(() => {
      const newTheme = getInitialTheme()
      if (newTheme !== currentTheme) {
        currentTheme = newTheme
        applyHighlight()
      }
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div class="copy-block">
    <span v-if="showPrompt" class="copy-prompt">{{ prompt }}</span>
    <div
      ref="codeInput"
      contenteditable="plaintext-only"
      class="copy-code scrollcheck-x"
      spellcheck="false"
      @beforeinput="preventLineBreak"
      @input="checkUndoable"
      v-text="code"
    />
    <button
      v-if="showUndo"
      type="button"
      class="copy-button"
      :aria-label="ui.code.undoAria"
      @click="undo"
    >
      <Icon name="tabler:arrow-back-up" />
    </button>
    <Icon v-show="false" name="tabler:check" />
    <button
      type="button"
      class="copy-button"
      :aria-label="ui.code.copyAria"
      @click="copy"
    >
      <Icon :name="copied ? 'tabler:check' : 'tabler:copy'" />
    </button>
  </div>
</template>

<style scoped>
.copy-block {
  contain: paint;
  display: flex;
  overflow: auto; /* prompt 溢出时滚动 */
  margin: 0.75rem 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  background-color: var(--card);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 2.25;
  transition: border-color var(--duration-base) var(--easing-base);
}

.copy-block:focus-within {
  border-color: var(--accent);
}

.copy-prompt {
  flex: none;
  padding: 0 0.875rem;
  border-right: 1px solid var(--border);
  background-color: var(--muted);
  color: var(--muted-foreground);
  user-select: none;
  transition: all var(--duration-base) var(--easing-base);
}

.copy-block:focus-within .copy-prompt {
  border-right-color: var(--accent);
  background-color: color-mix(in srgb, var(--accent) 10%, var(--muted));
  color: var(--accent);
}

.copy-code {
  flex: 1;
  overflow-x: auto;
  padding: 0 0.875rem;
  outline: none;
  white-space: nowrap;
  color: var(--foreground);
  scrollbar-width: thin;
}

.copy-code::-webkit-scrollbar {
  height: 4px;
}

.copy-code::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 2px;
}

/* shiki 高亮样式：移除默认的 pre/code 背景，让内容融入容器 */
.copy-code :deep(pre),
.copy-code :deep(span) {
  background: transparent !important;
}

.copy-button {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-right: 0.25rem;
  border: none;
  border-radius: var(--radius-base);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.copy-button:hover {
  color: var(--accent);
  background-color: var(--muted);
}
</style>
