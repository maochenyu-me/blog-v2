<script setup lang="ts">
const { ui } = useUi()

const props = withDefaults(defineProps<{
  type?: 'tip' | 'info' | 'question' | 'warning' | 'error'
  card?: boolean
  flat?: boolean
  icon?: string
  color?: string
  title?: string
  text?: string
}>(), {
  type: 'tip',
})

const typeMap = {
  tip: { icon: 'tabler:note', color: '#3A7', titleKey: 'tip' as const },
  info: { icon: 'tabler:info-circle', color: 'var(--foreground)', titleKey: 'info' as const },
  question: { icon: 'tabler:help-circle', color: '#3AF', titleKey: 'question' as const },
  warning: { icon: 'tabler:alert-triangle', color: '#F80', titleKey: 'warning' as const },
  error: { icon: 'tabler:circle-x', color: '#F33', titleKey: 'error' as const },
}

const useCard = computed(() => props.card ?? !props.flat)
const icon = computed(() => props.icon || typeMap[props.type].icon)
const color = computed(() => props.color || typeMap[props.type].color)
const title = computed(() => props.title || ui.content.alert[typeMap[props.type].titleKey])
</script>

<template>
  <div class="alert" :class="{ card: useCard }" :style="{ '--primary': color }">
    <div class="alert-title">
      <Icon :name="icon" />
      <slot name="title">{{ title }}</slot>
    </div>
    <slot><p>{{ text }}</p></slot>
  </div>
</template>

<style scoped>
.alert {
  margin: var(--paragraph-spacing) 0;
  padding: 0.2em 0.8em;
  border-radius: var(--radius-base);
  background-color: color-mix(in srgb, var(--primary) 8%, var(--card));
  font-size: 0.9em;

  &.card {
    background-color: var(--card);
    background-image:
      radial-gradient(circle at 4em -25em, var(--primary), transparent 30em),
      linear-gradient(var(--primary) -2000%, transparent);
  }

  .alert-title {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin: 0.5em 0;
    font-weight: bold;
    color: var(--primary);

    :deep(p) {
      margin: 0;
    }
  }
}
</style>
