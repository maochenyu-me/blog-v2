<script lang="tsx" setup>
const { ui } = useUi()

const slots = defineSlots<{
  default: () => VNode[]
}>()

const timelineRegex = /^\{(?<caption>.*)\}$/

function render() {
  const slotContent = slots.default()
  if (!slotContent)
    return <span>{ui.content.timelineEmpty}</span>

  return slotContent.map((node: VNode) => {
    const textContent = (node.children as any)?.default?.()[0].children
    const matchGroups = typeof textContent === 'string'
      ? textContent.match(timelineRegex)?.groups
      : undefined
    return matchGroups
      ? <dt class="timeline-caption">{matchGroups.caption}</dt>
      : <dd class="timeline-body">{node}</dd>
  })
}
</script>

<template>
<dl class="timeline">
  <render />
</dl>
</template>

<style scoped>
.timeline {
  position: relative;
  padding-inline-start: 1.5em;
  font-size: 0.9em;

  &::before {
    content: "";
    position: absolute;
    inset: 0.5em auto 0;
    inset-inline-start: 0.5em;
    width: 0.3em;
    background-color: var(--muted);
    border-radius: var(--radius-base);
  }
}

:deep() {
  > .timeline-caption {
    opacity: 0.8;
    font-size: 0.9em;

    &::before {
      content: "";
      position: absolute;
      inset-inline-start: 0.3em;
      width: 0.8em;
      height: 0.8em;
      margin-top: 0.5em;
      border-radius: 1em;
      background-color: var(--muted-foreground);
    }
  }

  > .timeline-body {
    width: fit-content;
    max-width: 100%;
    margin-bottom: 1em;
    padding: 0.5em 1em;
    border-radius: var(--radius-card);
    background-color: var(--card);
    border: 1px solid var(--border);
  }
}
</style>
