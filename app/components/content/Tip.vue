<script setup lang="ts">
const { ui } = useUi()

const props = withDefaults(defineProps<{
  text?: string
  tip?: string
  icon?: string | boolean
  copy?: boolean
}>(), {
  icon: undefined,
})

const tipText = ref<HTMLElement | null>(null)
const copied = ref(false)

const icon = computed(() => {
  if (typeof props.icon === 'string') return props.icon
  if (props.icon === false) return ''
  return copied.value ? 'tabler:check' : props.copy ? 'tabler:copy' : ''
})

const tooltip = computed(() => props.tip || (props.copy ? ui.content.tipClickToCopy : ''))

async function handleCopy() {
  if (!props.copy || !tipText.value) return
  try {
    await navigator.clipboard.writeText(tipText.value.textContent || '')
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* 剪贴板不可用时静默失败 */
  }
}
</script>

<template>
  <span
    ref="tipText"
    class="tip"
    :title="tooltip"
    tabindex="0"
    @click="handleCopy"
    @keypress.enter="handleCopy"
  >
    <slot>{{ text }}</slot>
    <Icon v-if="icon" :name="icon" class="tip-icon" />
  </span>
</template>

<style scoped>
.tip {
  position: relative;
  text-decoration: underline dashed var(--muted-foreground);
  cursor: pointer;
  text-underline-offset: 4px;
}

.tip-icon {
  display: inline-block;
  font-size: 1em;
  vertical-align: top;
}
</style>
