<script setup lang="ts">
/**
 * 图片灯箱（提示词 §7.2：图片点击放大）。
 * 事件委托：监听正文容器内的 img 点击，避免给每个 img 绑定。
 */
const props = defineProps<{
  enabled: boolean
}>()

const { ui } = useUi()

const active = ref<{ src: string; alt: string } | null>(null)

function onClick(e: MouseEvent) {
  if (!props.enabled) return
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') return

  const img = target as HTMLImageElement
  // 头像、图标不放大
  if (img.closest('.no-lightbox')) return

  e.preventDefault()
  active.value = { src: img.currentSrc || img.src, alt: img.alt || '' }
}

function close() {
  active.value = null
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(active, (v) => {
  if (!import.meta.client) return
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})

defineExpose({ close })
</script>

<template>
  <div v-if="enabled" class="lightbox-host" @click="onClick">
    <slot />
  </div>
  <slot v-else />

  <Teleport to="body">
    <div v-if="active" class="lightbox" role="dialog" aria-modal="true" @click="close">
      <button type="button" class="lightbox-close" :aria-label="ui.lightbox.close" @click="close">
        <Icon name="tabler:x" aria-hidden="true" />
      </button>
      <img :src="active.src" :alt="active.alt" class="lightbox-img" @click.stop />
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox-host {
  display: contents;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-gutter);
  background-color: color-mix(in srgb, var(--background) 92%, transparent);
  cursor: zoom-out;
}

.lightbox-img {
  max-width: 100%;
  max-height: 90dvh;
  object-fit: contain;
  border: 1px solid var(--border);
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  background-color: var(--background);
  cursor: pointer;
}

.lightbox-close:hover {
  color: var(--foreground);
}
</style>
