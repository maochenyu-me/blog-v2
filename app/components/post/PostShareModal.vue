<script setup lang="ts">
/**
 * 分享弹窗：左侧文章二维码 + 右侧 微博/QQ/邮件/复制链接。
 * 移植自 wxuyu.top 的 popover/Share，二维码用 qrcode 库前端生成。
 */
import QRCode from 'qrcode'

const props = defineProps<{
  open: boolean
  url: string
  title: string
  description?: string
}>()

const emit = defineEmits<{ close: [] }>()

const { site } = useBlogConfig()
const { ui, t } = useUi()

const qrDataUrl = ref('')

watch(() => props.open, async (open) => {
  if (!open) return
  qrDataUrl.value = ''
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.url, {
      margin: 1,
      width: 320,
      // 二维码必须深底浅底高对比才可扫，与主题无关，固定深墨色
      color: { dark: '#111827', light: '#0000' },
    })
  } catch { /* 生成失败保持空态，列表分享仍可用 */ }
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.url)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = props.url
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  copied.value = true
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => (copied.value = false), 2000)
}

const copied = ref(false)
let copyTimer: number | undefined

const shareTitle = computed(() => `【${site.name}】${props.title}`)

function openTarget(type: 'weibo' | 'qq' | 'mail') {
  const url = encodeURIComponent(props.url)
  const title = encodeURIComponent(shareTitle.value)
  const summary = encodeURIComponent(props.description ?? '')

  const target = type === 'weibo'
    ? `https://service.weibo.com/share/share.php?url=${url}&title=${title}`
    : type === 'qq'
      ? `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=${summary}&source=${encodeURIComponent(site.name)}`
      : `mailto:?subject=${title}&body=${encodeURIComponent(`${props.description ? `${props.description}\n\n` : ''}${props.url}`)}`

  window.open(target, '_blank', 'noopener,noreferrer')
}

useModalBehavior(
  () => props.open,
  () => emit('close'),
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-pop">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="share-card" role="dialog" aria-modal="true" :aria-label="t(ui.post.shareDialogAria)">
          <button class="modal-close" :aria-label="t(ui.common.close)" @click="emit('close')">
            <Icon name="ph:x-bold" />
          </button>

          <div class="share-qr">
            <div class="qr-frame">
              <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t(ui.post.shareQrAlt)">
              <span v-else class="qr-loading"><Icon name="ph:qr-code-bold" /></span>
            </div>
            <span class="qr-tip">{{ t(ui.post.shareQrTip) }}</span>
          </div>

          <div class="share-menu">
            <h3 class="menu-title">{{ t(ui.post.shareMethod) }}</h3>

            <button class="share-item" @click="openTarget('weibo')">
              <Icon name="tabler:brand-weibo" />
              {{ t(ui.post.shareWeibo) }}
            </button>

            <button class="share-item" @click="openTarget('qq')">
              <Icon name="tabler:brand-qq" />
              {{ t(ui.post.shareQq) }}
            </button>

            <button class="share-item" @click="openTarget('mail')">
              <Icon name="tabler:mail" />
              {{ t(ui.post.shareMail) }}
            </button>

            <button class="share-item" @click="copyLink">
              <Icon :name="copied ? 'ph:check-bold' : 'ph:link'" />
              {{ copied ? t(ui.post.shareCopied) : t(ui.post.shareCopy) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-gutter);
  background-color: color-mix(in srgb, var(--foreground) 32%, transparent);
}

.share-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  width: min(32rem, 100%);
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background-color: var(--card);
}

.modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border: none;
  border-radius: var(--radius);
  background-color: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.modal-close:hover {
  color: var(--foreground);
  background-color: var(--muted);
}

.share-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius);
  background-color: var(--muted);
}

.qr-frame {
  display: grid;
  place-items: center;
  width: min(13rem, 100%);
  aspect-ratio: 1;
  padding: 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  /* 二维码底必须纯白才稳扫，不随主题 */
  background-color: #ffffff;
}

.qr-frame img {
  width: 100%;
  height: auto;
}

.qr-loading {
  font-size: 2rem;
  color: var(--muted-foreground);
}

.qr-tip {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.share-menu {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 1.5rem;
}

.menu-title {
  margin-bottom: 0.25rem;
  font-size: var(--fs-body);
  font-weight: var(--fw-body-h);
}

.share-item {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--background);
  font-size: var(--fs-meta);
  color: var(--foreground);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.share-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.share-item :deep(.icon) {
  font-size: 1.15em;
}

@media (max-width: 600px) {
  .share-card {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .qr-frame {
    width: min(11rem, 100%);
  }

  .share-menu {
    padding-right: 0;
  }
}

/* 弹窗出入场：轻微上浮 + 淡入淡出 */
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity var(--duration-base) var(--easing-base);
}

.modal-pop-enter-active .share-card,
.modal-pop-leave-active .share-card {
  transition: transform var(--duration-base) var(--easing-base);
}

.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}

.modal-pop-enter-from .share-card,
.modal-pop-leave-to .share-card {
  transform: translateY(1rem);
}

@media (prefers-reduced-motion: reduce) {
  .modal-pop-enter-active,
  .modal-pop-leave-active,
  .modal-pop-enter-active .share-card,
  .modal-pop-leave-active .share-card {
    transition: none;
  }
}
</style>
