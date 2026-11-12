<script setup lang="ts">
/**
 * 块级公式的「复制 LaTeX」按钮。
 *
 * 与 CodeCopyButton 同一套做法：ContentRenderer 渲染出的公式节点属于 Vue 的
 * vnode 树，往里 appendChild 会让水合校验判定 mismatch。所以按钮用 Teleport
 * 送到 body，靠绝对定位浮在公式右上角，完全不动 Vue 管理的 DOM。
 *
 * 内容来源是 KaTeX 自己输出的 <annotation encoding="application/x-tex">——
 * 那里存的就是作者原本写的 LaTeX，比从 katex-html 的 span 堆里还原可靠得多。
 *
 * 显示时机：桌面端 hover 公式时淡入（监听公式元素的 mouseenter，只挂事件、
 * 不改结构）；触屏设备没有 hover，用 @media (hover: none) 让它常驻半透明。
 */
const props = defineProps<{
  enabled: boolean
}>()

interface Target {
  id: number
  tex: string
  top: number
  left: number
  width: number
}

const { ui } = useUi()

const targets = ref<Target[]>([])
const hoveredId = ref<number | null>(null)
const copiedId = ref<number | null>(null)
const mounted = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

/** 公式元素 → 绑定过的监听器，卸载时逐个摘掉 */
const bound = new Map<HTMLElement, { enter: () => void; leave: () => void }>()

function unbind() {
  for (const [el, h] of bound) {
    el.removeEventListener('mouseenter', h.enter)
    el.removeEventListener('mouseleave', h.leave)
  }
  bound.clear()
}

function collect() {
  if (!import.meta.client || !props.enabled) return

  unbind()

  const displays = [...document.querySelectorAll<HTMLElement>('.prose .katex-display')]
  const scrollY = window.scrollY || document.documentElement.scrollTop
  const scrollX = window.scrollX || document.documentElement.scrollLeft

  const list: Target[] = []
  displays.forEach((el, i) => {
    const tex = el
      .querySelector('annotation[encoding="application/x-tex"]')
      ?.textContent?.trim()
    if (!tex) return

    const rect = el.getBoundingClientRect()
    list.push({
      id: i,
      tex,
      top: rect.top + scrollY,
      left: rect.left + scrollX,
      width: rect.width,
    })

    const enter = () => (hoveredId.value = i)
    const leave = () => {
      if (hoveredId.value === i) hoveredId.value = null
    }
    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    bound.set(el, { enter, leave })
  })

  targets.value = list
}

async function copy(id: number) {
  const t = targets.value.find((x) => x.id === id)
  if (!t) return
  try {
    await navigator.clipboard.writeText(t.tex)
    copiedId.value = id
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copiedId.value = null), 1500)
  } catch {
    /* 剪贴板不可用时静默失败，不打断阅读 */
  }
}

onMounted(() => {
  mounted.value = true
  // 等水合结束再定位与绑定，避免干扰校验过程
  nextTick(() => {
    collect()
    window.addEventListener('resize', collect, { passive: true })
  })
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  if (import.meta.client) {
    window.removeEventListener('resize', collect)
    unbind()
  }
})
</script>

<template>
  <Teleport v-for="t in enabled && mounted ? targets : []" :key="t.id" to="body">
    <div
      class="math-bar"
      :style="{ top: t.top + 'px', left: t.left + 'px', width: t.width + 'px' }"
    >
      <button
        type="button"
        class="math-copy"
        :class="{ 'is-visible': hoveredId === t.id || copiedId === t.id }"
        :aria-label="ui.math.copyAria"
        @click="copy(t.id)"
      >
        {{ copiedId === t.id ? ui.math.copied : ui.math.copy }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/*
 * 只占公式右上角那一小块：公式本身居中，右上方通常是空白，
 * 按钮浮在那里不会盖住任何符号。整条 bar 不吃指针事件，
 * 否则会挡住公式文字的划选；只有按钮自己接收点击。
 */
.math-bar {
  position: absolute;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  pointer-events: none;
}

.math-copy {
  pointer-events: auto;
  opacity: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  padding: 0.25rem 0.5rem;
  border: 1px solid transparent;
  border-radius: calc(var(--radius) / 2);
  background-color: transparent;
  cursor: pointer;
  transition:
    opacity var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

/* hover 公式或复制成功时显形；成功后保持可见，否则按钮会在闪烁中消失 */
.math-copy.is-visible {
  opacity: 1;
  border-color: var(--border);
  background-color: var(--card);
}

.math-copy:hover {
  color: var(--foreground);
  border-color: var(--foreground);
}

/* 触屏没有 hover，常驻但压低存在感 */
@media (hover: none) {
  .math-copy {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .math-copy {
    transition: none;
  }
}
</style>
