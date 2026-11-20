<script setup lang="ts">
/**
 * Key 组件 —— 复刻参考站 blog-v3 的完整交互：
 *   - 全局 keydown/keyup 监听：按下与 code 一致的物理键时点亮
 *   - 鼠标点击键帽触发 press 事件
 *   - @press 由使用者配置触发回调
 *   - 修饰键状态跟踪（Ctrl/Shift/Alt/Meta 组合键匹配）
 *   - 保留 macOS 符号 / 修饰键 / displayMap 逻辑
 */
const props = withDefaults(defineProps<{
  text?: string
  /** KeyboardEvent.key，见 MDN */
  code?: string
  /** 仅 macOS 默认显示图标 */
  icon?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  win?: boolean
  /** 智能适配：Windows 用 Ctrl，macOS 用 Cmd */
  cmd?: boolean
  /** 按下匹配键时阻止默认行为 */
  prevent?: boolean
}>(), {
  icon: undefined,
})

const emit = defineEmits<{
  press: []
}>()

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const isMac = computed(() => mounted.value && /mac\s?os/i.test(navigator?.userAgent ?? ""))
const useSymbol = computed(() => (isMac.value ? props.icon !== false : props.icon))
const keyJoiner = computed(() => (useSymbol.value ? "" : "+"))

const displayMap: Record<string, string | (() => string)> = {
  " ": "Space",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  Control: "Ctrl",
  Delete: "Del",
  Escape: "Esc",
  Meta() {
    return isMac.value ? "Cmd" : "Win"
  },
}

const symbolMap: Record<string, string | (() => string)> = {
  " ": "␣",
  Alt: "⌥",
  Backspace: "⌫",
  Control: "⌃",
  Delete: "⌦",
  Enter: "↵",
  Escape: "⎋",
  Meta() {
    return isMac.value ? "⌘" : "⊞"
  },
  Shift: "⇧",
  Tab: "⇥",
  Win: "⊞",
}

function resolve(value: string | (() => string) | undefined): string {
  if (value === undefined) return ""
  return typeof value === "function" ? value() : value
}

function normalize(code?: string): string {
  if (!code) return ""
  if (useSymbol.value && code in symbolMap) return resolve(symbolMap[code])
  if (code in displayMap) return resolve(displayMap[code])
  return code
}

const codeDisplay = computed(() => {
  if (props.text) return props.text

  const keyConfigs = [
    { condition: props.cmd, code: isMac.value ? "Meta" : "Control" },
    { condition: props.ctrl && !props.cmd, code: "Control" },
    { condition: props.shift, code: "Shift" },
    { condition: props.alt, code: "Alt" },
    { condition: props.meta && !props.cmd, code: "Meta" },
    { condition: props.win && !props.meta, code: "Win" },
    { condition: props.code, code: props.code },
  ]

  return keyConfigs
    .filter(config => config.condition)
    .map(config => normalize(config.code))
    .join(keyJoiner.value)
})

// ── 按键点亮交互 ─────────────────────────────────────────────────
const active = ref(false)

// 修饰键实时状态（等价 @vueuse/core 的 useKeyModifier）
const ctrlState = ref(false)
const shiftState = ref(false)
const altState = ref(false)
const metaState = ref(false)

/** 检查当前修饰键状态是否匹配 props */
function modifiersMatch() {
  const cmdMatch = props.cmd
    ? (isMac.value ? metaState.value : ctrlState.value)
    : true

  return cmdMatch
    && (!props.ctrl || (!props.cmd && ctrlState.value))
    && (!props.shift || shiftState.value)
    && (!props.alt || altState.value)
    && (!props.meta || (!props.cmd && metaState.value))
}

function matchKeyEvent(e: KeyboardEvent, expectedCode?: string) {
  if (expectedCode && e.key?.toLowerCase() !== expectedCode.toLowerCase())
    return false
  return modifiersMatch()
}

function onKeyDown(e: KeyboardEvent) {
  // 维护修饰键状态（任何按键都会刷新，保证组合键判断准确）
  ctrlState.value = e.ctrlKey
  shiftState.value = e.shiftKey
  altState.value = e.altKey
  metaState.value = e.metaKey

  if (matchKeyEvent(e, props.code)) {
    active.value = true
    emit("press")
    if (props.prevent) e.preventDefault()
  }
}

function onKeyUp(e: KeyboardEvent) {
  ctrlState.value = e.ctrlKey
  shiftState.value = e.shiftKey
  altState.value = e.altKey
  metaState.value = e.metaKey

  if (matchKeyEvent(e, props.code) || !modifiersMatch())
    active.value = false
}

function onBlur() {
  active.value = false
  ctrlState.value = false
  shiftState.value = false
  altState.value = false
  metaState.value = false
}

onMounted(() => {
  // passive：监听器不阻塞滚动（preventDefault 在需要时仍可调用——
  // keydown 的 preventDefault 与 passive 不冲突，passive 只影响 touch/wheel 的默认行为）
  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)
  window.addEventListener("blur", onBlur)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeyDown)
  window.removeEventListener("keyup", onKeyUp)
  window.removeEventListener("blur", onBlur)
})

function onClick() {
  emit("press")
}
</script>

<template>
  <kbd class="key" :class="{ active }" @click.stop="onClick">
    <slot>{{ codeDisplay }}</slot>
  </kbd>
</template>

<style scoped>
.key {
  display: inline-block;
  margin: 0 0.125em;
  padding: 0.0625rem 0.375rem 0.125rem;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 0.25rem;
  background-color: var(--card);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--foreground);
  white-space: nowrap;
  user-select: none;
  cursor: pointer;
  transition:
    background-color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.key:active,
.key.active {
  border-bottom-width: 1px;
  background-color: color-mix(in srgb, var(--accent) 12%, var(--card));
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(1px);
}
</style>
