<script setup lang="ts">
/**
 * Emoji 时钟：根据时间显示对应的时钟 emoji。
 * 支持静态模式和旋转模式。
 *
 * SSR 注意：未指定 datetime 时，时间仅在客户端计算，避免水合失配。
 */
const props = defineProps<{
  datetime?: string
  rotate?: boolean
}>()

/** 静态模式：24 个 emoji 覆盖每个半小时刻度 */
const emojiStatic = [
  '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞',
  '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢',
  '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦',
] as const

/** 旋转模式：12 个整点 emoji，通过 CSS 旋转模拟分针 */
const emojiRotate = [
  '🕛', '🕐', '🕑', '🕒', '🕓', '🕔',
  '🕕', '🕖', '🕗', '🕘', '🕙', '🕚',
] as const

/** 客户端时间：仅在 onMounted 后设置，避免 SSR 水合失配 */
const clientNow = ref<Date | null>(null)

onMounted(() => {
  clientNow.value = new Date()
})

/** 目标时间：优先使用 datetime prop，否则使用客户端时间 */
const targetDate = computed<Date | null>(() => {
  if (props.datetime) {
    const d = new Date(props.datetime)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return clientNow.value
})

/** 计算 emoji 和旋转角度（统一返回形状，便于模板类型收窄） */
const status = computed(() => {
  const date = targetDate.value
  if (!date) return null

  const hour = date.getHours()
  const minute = date.getMinutes()

  if (!props.rotate) {
    // 静态模式：根据小时和分钟选择最接近的半小时刻度
    const emojiIndex = (hour * 2 + Math.round(minute / 30)) % emojiStatic.length
    return { emoji: emojiStatic[emojiIndex]!, rotate: undefined }
  }

  // 旋转模式：选择整点 emoji，通过 CSS 旋转模拟分针位置
  const minuteAt = Math.round(minute / 5)
  const emojiIndex = (hour % 12 - minuteAt + emojiRotate.length) % emojiRotate.length
  return { emoji: emojiRotate[emojiIndex]!, rotate: minuteAt * 30 }
})
</script>

<template>
  <span
    v-if="status"
    class="emoji-clock"
    :class="{ rotate }"
    :style="{ '--deg': rotate ? `${status.rotate}deg` : undefined }"
    v-text="status.emoji"
  />
</template>

<style scoped>
.emoji-clock.rotate {
  display: inline-block;
  transform: rotate(var(--deg, 0deg));
}
</style>
