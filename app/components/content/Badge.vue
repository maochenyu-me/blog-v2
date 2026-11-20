<script setup lang="ts">
const props = defineProps<{
  img?: string
  text?: string
  link?: string
  round?: boolean
  square?: boolean
}>()

const imgSrc = computed(() => {
  if (props.img) return props.img
  // 外部链接自动获取 favicon
  if (props.link && /^https?:\/\//.test(props.link)) {
    try {
      const domain = new URL(props.link).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return ''
    }
  }
  return ''
})

// 有图时默认为圆形，除非指定方形；无图时默认为方形，除非指定圆形
const isRound = computed(() => imgSrc.value ? !props.square : props.round)

/** favicon 取不到（被墙 / 站点无 favicon）时退回纯文字徽章，不留破图 */
const iconBroken = ref(false)

const tip = computed(() => {
  if (!props.link) return ''
  if (/^https?:\/\//.test(props.link)) {
    try {
      return new URL(props.link).hostname
    } catch {
      return props.link
    }
  }
  return props.link
})

const isExternal = computed(() => props.link && /^https?:\/\//.test(props.link))
</script>

<template>
  <component
    :is="link ? (isExternal ? 'a' : 'NuxtLink') : 'span'"
    :to="link && !isExternal ? link : undefined"
    :href="link && isExternal ? link : undefined"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener noreferrer' : undefined"
    :title="tip"
    class="badge"
    :class="{ round: isRound }"
  >
    <img
      v-if="imgSrc && !iconBroken"
      class="badge-icon"
      :src="imgSrc"
      alt=""
      @error="iconBroken = true"
    />
    <span class="badge-text">
      <slot>{{ text }}</slot>
    </span>
  </component>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: baseline;
  margin: 0.1em;
  border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 4px;
  box-sizing: content-box;
  background-color: color-mix(in srgb, currentColor 5%, transparent);
  color: color-mix(in srgb, currentColor 80%, transparent);
  font-size: 0.875em;
  text-decoration: none;
  transition: color var(--duration-base) var(--easing-base);

  &[href]:hover {
    color: var(--foreground);
  }

  &.round,
  &.round > .badge-icon {
    border-radius: 0.8em;
  }
}

/*
 * 提高特异性到 (0,3,0) 并显式重置：正文里那套 img 规则虽然已用
 * `:not([class])` 排除带 class 的图片，这里再兜一层，确保头像永远
 * 是 1.6em 的行内小图，不被撑成整行高的大方块。
 */
.badge .badge-icon {
  align-self: center;
  display: inline-block;
  width: auto;
  height: 1.6em;
  max-width: none;
  margin: 0;
  border: 0;
  border-radius: 3.5px;
  vertical-align: middle;
  object-fit: contain;

  + .badge-text {
    margin-inline-start: -0.1em;
  }
}

.badge-text {
  padding: 0.2em 0.4em;
  line-height: 1.2;

  &:empty {
    display: none;
  }
}
</style>
