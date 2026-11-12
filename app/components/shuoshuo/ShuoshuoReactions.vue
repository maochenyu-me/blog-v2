<script setup lang="ts">
import { fetchEch0ReactionCatalog, setEch0Reaction, type Ech0Echo, type Ech0Reaction } from '~/utils/ech0'

const props = defineProps<{
  echo: Pick<Ech0Echo, 'id' | 'reactions'>
  apiBase: string
  enabled: boolean
}>()

const { ui, t } = useUi()

const FALLBACK_CATALOG = [
  { key: 'like', emoji: '👍' },
  { key: 'heart', emoji: '❤️' },
  { key: 'haha', emoji: '😂' },
  { key: 'wow', emoji: '😮' },
  { key: 'sad', emoji: '😢' },
  { key: 'cry', emoji: '😭' },
  { key: 'party', emoji: '🎉' },
]

const reactions = ref<Ech0Reaction[]>([...(props.echo.reactions ?? [])])
const catalog = ref(FALLBACK_CATALOG)
const pickerOpen = ref(false)
const busy = ref(false)
const rootEl = ref<HTMLElement | null>(null)

watch(
  () => props.echo.reactions,
  (v) => (reactions.value = [...(v ?? [])]),
  { deep: true },
)

onMounted(async () => {
  if (!props.enabled) return
  try {
    const remote = await fetchEch0ReactionCatalog(props.apiBase)
    if (Array.isArray(remote) && remote.length > 0) catalog.value = remote
  } catch {
    /* 目录拉取失败时用内置全集 */
  }
})

function emojiOf(key: string): string {
  return catalog.value.find((c) => c.key === key)?.emoji ?? '❔'
}

function ariaOf(r: Ech0Reaction): string {
  return r.reacted
    ? t(ui.shuoshuo.reactionAria, { emoji: r.emoji, n: r.count })
    : t(ui.shuoshuo.reactionAriaPlain, { emoji: r.emoji, n: r.count })
}

async function react(key: string) {
  if (!props.enabled || busy.value) return
  const existed = reactions.value.find((r) => r.key === key)
  const add = !existed?.reacted
  busy.value = true
  try {
    reactions.value = await setEch0Reaction(props.apiBase, props.echo.id, key, add)
  } catch {
    /* 失败保持原状，不打断浏览 */
  } finally {
    busy.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (pickerOpen.value && rootEl.value && !rootEl.value.contains(e.target as Node)) {
    pickerOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootEl" class="react-bar">
    <button
      v-for="r in reactions"
      :key="r.key"
      type="button"
      class="react-chip"
      :class="{ 'is-reacted': r.reacted }"
      :disabled="!enabled"
      :aria-label="ariaOf(r)"
      @click="react(r.key)"
    >
      <span class="react-emoji" aria-hidden="true">{{ emojiOf(r.key) }}</span>
      <span class="react-count" aria-hidden="true">{{ r.count }}</span>
    </button>

    <div v-if="enabled" class="react-picker-wrap">
      <button
        type="button"
        class="react-chip react-add"
        :aria-label="ui.shuoshuo.reactionToggleAria"
        :aria-expanded="pickerOpen"
        @click="pickerOpen = !pickerOpen"
      >
        <Icon name="tabler:plus" aria-hidden="true" />
      </button>
      <div v-if="pickerOpen" class="react-picker" role="group" :aria-label="ui.shuoshuo.reactionsTitle">
        <button
          v-for="c in catalog"
          :key="c.key"
          type="button"
          class="react-opt"
          :class="{ 'is-reacted': reactions.find((r) => r.key === c.key)?.reacted }"
          :aria-label="c.emoji"
          @click="react(c.key)"
        >
          {{ c.emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.react-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.react-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  background: var(--card);
  padding: 0.25rem 0.625rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.react-chip:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.react-chip:active:not(:disabled) {
  transform: scale(0.94);
}

.react-chip:disabled {
  cursor: default;
}

.react-chip.is-reacted {
  border-color: var(--accent);
  color: var(--accent);
}

.react-add {
  padding: 0.25rem 0.5rem;
}

.react-picker-wrap {
  position: relative;
  display: inline-flex;
}

.react-picker {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  display: flex;
  gap: 0.125rem;
  padding: 0.375rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 5;
  white-space: nowrap;
}

.react-opt {
  border: 0;
  background: none;
  border-radius: var(--radius);
  padding: 0.25rem 0.375rem;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--duration-base) var(--easing-base);
}

.react-opt:hover {
  background: var(--muted);
}

.react-opt.is-reacted {
  background: var(--muted);
}
</style>
