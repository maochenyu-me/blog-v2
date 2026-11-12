<script setup lang="ts">
/**
 * 代码块复制按钮（提示词 §7.2）。
 *
 * 为什么不用「手动 appendChild 往 <pre> 里塞按钮」：
 * ContentRenderer 渲染出的 <pre> 属于 Vue 的 vnode 树。
 * 在 onMounted 里往其中注入 DOM 节点，会让水合校验把多出来的节点
 * 判定为 mismatch（实测报 "Hydration completed but contains mismatches"）。
 * 这里改为：用 Teleport 把按钮送到 body，靠绝对定位浮在每个代码块右上角，
 * 完全不动 Vue 管理的 DOM。
 */
const props = defineProps<{
  enabled: boolean
}>()

interface Target {
  id: number
  lang: string
  text: string
  top: number
  left: number
  width: number
}

const { ui } = useUi()

const targets = ref<Target[]>([])
const copiedId = ref<number | null>(null)
const mounted = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function collect() {
  if (!import.meta.client || !props.enabled) return

  const pres = [...document.querySelectorAll<HTMLPreElement>('.prose pre')]
  const scrollY = window.scrollY || document.documentElement.scrollTop
  const scrollX = window.scrollX || document.documentElement.scrollLeft

  targets.value = pres.map((pre, i) => {
    const code = pre.querySelector('code')
    // Shiki 把 language-xxx 挂在 <pre> 上，普通 markdown 代码块可能在 <code> 上，两处都查
    const langClass = [...pre.classList, ...(code?.classList ?? [])].find((c) =>
      c.startsWith('language-'),
    )
    const rect = pre.getBoundingClientRect()
    return {
      id: i,
      lang: langClass?.replace('language-', '') ?? '',
      text: code?.textContent ?? '',
      top: rect.top + scrollY,
      left: rect.left + scrollX,
      width: rect.width,
    }
  })
}

async function copy(id: number) {
  const t = targets.value.find((x) => x.id === id)
  if (!t) return
  try {
    await navigator.clipboard.writeText(t.text)
    copiedId.value = id
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copiedId.value = null), 1500)
  } catch {
    /* 剪贴板不可用时静默失败，不打断阅读 */
  }
}

onMounted(() => {
  mounted.value = true
  // 等水合完全结束再定位，避免干扰校验过程
  nextTick(() => {
    collect()
    window.addEventListener('resize', collect, { passive: true })
  })
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  if (import.meta.client) window.removeEventListener('resize', collect)
})
</script>

<template>
  <Teleport v-for="t in enabled && mounted ? targets : []" :key="t.id" to="body">
    <div
      class="code-bar"
      :style="{ top: t.top + 'px', left: t.left + 'px', width: t.width + 'px' }"
    >
      <span v-if="t.lang" class="code-lang">{{ t.lang }}</span>
      <button
        type="button"
        class="code-copy"
        :aria-label="ui.code.copyAria"
        @click="copy(t.id)"
      >
        {{ copiedId === t.id ? ui.code.copied : ui.code.copy }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/*
 * 头部条与代码块同宽同左缘（由 collect() 量出的 left/width 决定），
 * 所以按钮永远贴在代码块自己的右上角，而不是视口右上角。
 * 高度 2.25rem 与 ProseBody 里 pre 的 padding-top 对应：
 * 移动端让出一条头部带，按钮不压首行代码。
 */
.code-bar {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  /* 与 ProseBody 里 pre 的 padding-inline 对齐，按钮不会比代码缩进多出一截 */
  padding-inline: 1rem;
  box-sizing: border-box;
  pointer-events: none;
}

/* 移动端 pre 的内边距是 0.75rem，头部条跟着收，标签与代码左缘对齐 */
@media (max-width: 767px) {
  .code-bar {
    padding-inline: 0.75rem;
  }
}

.code-lang {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-copy {
  flex: none;
  /* 无语言标签时（纯文本块）靠这条把按钮推到右侧，而不是贴在左边 */
  margin-inline-start: auto;
  pointer-events: auto;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  background-color: var(--card);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.code-copy:hover {
  color: var(--foreground);
  border-color: var(--foreground);
}
</style>
