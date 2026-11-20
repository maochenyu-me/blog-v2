<script lang="tsx" setup>
const { ui } = useUi()

const slots = defineSlots<{
  default: () => VNode[]
}>()

const chatRegex = /^\{(?<control>\.|:)?(?<caption>.*)\}$/

function getControlClass(control?: string) {
  if (control === '.')
    return 'chat-myself'
  if (control === ':')
    return 'chat-system'
  return ''
}

function render() {
  const slotContent = slots.default()
  if (!slotContent)
    return <span>{ui.content.chatEmpty}</span>

  return slotContent.map((node: VNode) => {
    const textContent = (node.children as any)?.default?.()[0].children
    const matchGroups = typeof textContent === 'string'
      ? textContent.match(chatRegex)?.groups
      : undefined
    return matchGroups
      ? <dt class={`chat-caption ${getControlClass(matchGroups.control)}`}>{matchGroups.caption}</dt>
      : <dd class="chat-body">{node}</dd>
  })
}
</script>

<template>
<dl class="chat">
  <render />
</dl>
</template>

<style scoped>
.chat {
  margin-inline: 2vw;
  font-size: 0.9em;
}

:deep() {
  > .chat-caption {
    opacity: 0.8;
    font-size: 0.9em;
  }

  > .chat-body {
    overflow: hidden; /* BFC */
    width: fit-content;
    max-width: 90%;
    margin-bottom: 1em;
    padding: 0.5em 1em;
    border-radius: var(--radius-card);
    border-start-start-radius: 0.2em;
    background-color: var(--muted);
  }

  > .chat-system {
    margin-bottom: 1em;
    text-align: center;
  }

  > .chat-myself {
    text-align: end;

    & + .chat-body {
      margin-inline-start: auto;
      border-radius: var(--radius-card);
      border-start-end-radius: 0.2em;
      background-color: color-mix(in srgb, var(--accent) 15%, var(--card));
    }
  }
}
</style>
