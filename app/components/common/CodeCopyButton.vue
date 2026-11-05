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
  right: number
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
    const langClass = [...(code?.classList ?? [])].find((c) => c.startsWith('language-'))
    const rect = pre.getBoundingClientRect()
    return {
      id: i,
      lang: langClass?.replace('language-', '') ?? '',
      text: code?.textContent ?? '',
      top: rect.top + scrollY,
      right: rect.right + scrollX,
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
      :style="{ top: t.top + 'px', right: `calc(100vw - ${t.right}px + 0.5rem)` }"
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
.code-bar {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.code-lang {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  user-select: none;
}

.code-copy {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  background-color: var(--background);
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
