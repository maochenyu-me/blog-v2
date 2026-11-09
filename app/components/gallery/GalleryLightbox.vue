<script setup lang="ts">
import type { GalleryImage } from '~/types/gallery'

/**
 * 相册灯箱。
 *
 * - 键盘：← / → 切换，Esc 关闭
 * - 点击遮罩关闭，点击图片本身不关
 * - 预加载前后各一张，切换无白屏
 * - 打开期间锁定 body 滚动，关闭时归还焦点
 */
const props = defineProps<{
  images: GalleryImage[]
  initialIndex: number
}>()

const emit = defineEmits<{ close: [] }>()

const { ui, t } = useUi()

const index = ref(props.initialIndex)
const count = computed(() => props.images.length)

function urlOf(image?: GalleryImage): string {
  if (!image) return ''
  return typeof image === 'string' ? image : image.url
}

function titleOf(image?: GalleryImage): string {
  if (!image || typeof image === 'string') return ''
  return image.title ?? ''
}

const currentUrl = computed(() => urlOf(props.images[index.value]))
const currentTitle = computed(() => titleOf(props.images[index.value]))

/* ---- 预加载相邻图 ---- */
const loaded = new Set<string>()
function preload(offset: number) {
  if (count.value <= 1) return
  const target = props.images[(index.value + offset + count.value) % count.value]
  const url = urlOf(target)
  if (!url || loaded.has(url)) return
  loaded.add(url)
  const img = new Image()
  img.src = url
}

watch(index, () => {
  preload(1)
  preload(-1)
}, { immediate: true })

/* ---- 翻页 ---- */
function prev() {
  index.value = (index.value - 1 + count.value) % count.value
}

function next() {
  index.value = (index.value + 1) % count.value
}

/* ---- 焦点管理 ---- */
const closeBtn = ref<HTMLButtonElement | null>(null)

let lastActive: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
  else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  }
  else if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  }
}

onMounted(() => {
  lastActive = document.activeElement as HTMLElement | null
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  closeBtn.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
  lastActive?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div
      class="lb"
      role="dialog"
      aria-modal="true"
      :aria-label="ui.pages.gallery.lightboxAria"
    >
      <div class="lb-backdrop" @click="emit('close')" />

      <figure class="lb-stage">
        <img
          :key="currentUrl"
          :src="currentUrl"
          :alt="currentTitle || t(ui.pages.gallery.viewPhotoAria, { index: index + 1 })"
          class="lb-img"
          draggable="false"
        >
        <figcaption v-if="currentTitle" class="lb-caption">{{ currentTitle }}</figcaption>
      </figure>

      <button ref="closeBtn" type="button" class="lb-close" :aria-label="ui.lightbox.close" @click="emit('close')">
        <Icon name="tabler:x" aria-hidden="true" />
      </button>

      <template v-if="count > 1">
        <button type="button" class="lb-nav lb-nav--prev" :aria-label="ui.lightbox.prev" @click="prev">
          <Icon name="tabler:chevron-left" aria-hidden="true" />
        </button>
        <button type="button" class="lb-nav lb-nav--next" :aria-label="ui.lightbox.next" @click="next">
          <Icon name="tabler:chevron-right" aria-hidden="true" />
        </button>

        <div class="lb-counter" aria-hidden="true">
          {{ index + 1 }} / {{ count }}
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-item);
}

.lb-backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--background) 94%, transparent);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: lb-fade var(--duration-base) var(--easing-base);
}

@keyframes lb-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lb-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-item);
  max-width: 100%;
  max-height: 100%;
  margin: 0;
}

.lb-img {
  max-width: min(92vw, 1400px);
  max-height: 82dvh;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--muted);
  animation: lb-in var(--duration-base) var(--easing-base);
}

@keyframes lb-in {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.lb-caption {
  max-width: 60ch;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  text-align: center;
}

/* ---- 关闭按钮 ---- */
.lb-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.25rem;
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  background: var(--surface-float);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.lb-close:hover {
  color: var(--foreground);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
}

/* ---- 左右翻页 ---- */
.lb-nav {
  position: absolute;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.5rem;
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  background: var(--surface-float);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.lb-nav:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
}

.lb-nav--prev {
  left: 1rem;
}

.lb-nav--next {
  right: 1rem;
}

/* ---- 计数 ---- */
.lb-counter {
  position: absolute;
  bottom: 1.25rem;
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* 窄屏：按钮收到图片内侧，计数上移避免压住图 */
@media (max-width: 640px) {
  .lb {
    padding: var(--space-gutter) 0.5rem;
  }

  .lb-nav {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.125rem;
  }

  .lb-nav--prev {
    left: 0.5rem;
  }

  .lb-nav--next {
    right: 0.5rem;
  }

  .lb-close {
    top: 0.5rem;
    right: 0.5rem;
    width: 2.25rem;
    height: 2.25rem;
  }

  .lb-img {
    max-height: 76dvh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lb-backdrop,
  .lb-img {
    animation: none;
  }

  .lb-close,
  .lb-nav {
    transition: none;
  }
}
</style>