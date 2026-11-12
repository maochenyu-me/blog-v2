<script setup lang="ts">
/**
 * 打赏弹窗：感谢语 + 微信/支付宝收款码 + 赞赏者名单入口。
 * 移植自 wxuyu.top 的 popover/reward + DonateCard。
 * 收款码路径来自 blog.config.reward，图片缺失时显示占位框。
 */
const props = defineProps<{
  open: boolean
  /** 隐藏「赞赏者名单」入口（关于页弹窗紧挨名单卡，无需重复跳转） */
  hideSponsors?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const { reward, site } = useBlogConfig()
const { ui, t } = useUi()

/** 议题模板链接：仓库开了 reward.yml 模板即可直达提单页 */
const joinUrl = computed(() =>
  site.repoUrl ? `${site.repoUrl}/issues/new?template=reward.yml` : '',
)

const qrs = computed(() => [
  { name: t(ui.post.rewardWechat), src: reward.wechatQr },
  { name: t(ui.post.rewardAlipay), src: reward.alipayQr },
])

/** 加载失败的收款码降级为占位框，不出现破图 */
const errored = reactive<Record<string, boolean>>({})

watch(() => props.open, (open) => {
  if (open) Object.keys(errored).forEach((key) => delete errored[key])
})

useModalBehavior(
  () => props.open,
  () => emit('close'),
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-pop">
      <div v-if="open" class="modal-overlay" @click.self="emit('close')">
        <div class="reward-card" role="dialog" aria-modal="true" :aria-label="t(ui.post.rewardTitle)">
          <header class="reward-head">
            <h3 class="reward-title">{{ t(ui.post.rewardTitle) }}</h3>
            <button class="modal-close" :aria-label="t(ui.common.close)" @click="emit('close')">
              <Icon name="ph:x-bold" />
            </button>
          </header>

          <div class="reward-panel">
            <p class="reward-thanks">{{ t(ui.post.rewardThanks) }}</p>

            <ul class="reward-qrs">
              <li v-for="qr in qrs" :key="qr.name" class="reward-qr">
                <img
                  v-if="!errored[qr.name]"
                  :src="qr.src"
                  :alt="t(ui.post.rewardQrAlt, { name: qr.name })"
                  @error="errored[qr.name] = true"
                >
                <span v-else class="qr-missing">
                  <Icon name="ph:qr-code-bold" />
                  <small>{{ t(ui.post.rewardQrMissing) }}</small>
                </span>
                <span class="qr-name">{{ qr.name }}</span>
              </li>
            </ul>

            <a
              v-if="joinUrl"
              :href="joinUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="reward-join"
              :aria-label="t(ui.post.rewardJoinAria)"
            >
              <Icon name="tabler:bolt-filled" aria-hidden="true" />
              {{ t(ui.post.rewardJoin) }}
            </a>

            <a
              v-if="!props.hideSponsors"
              :href="reward.sponsorsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="reward-sponsors"
              :aria-label="t(ui.post.rewardLinkAria)"
            >
              <span class="sponsors-title">{{ t(ui.post.rewardSponsors) }}</span>
              <span class="sponsors-desc">{{ t(ui.post.rewardSponsorsDesc) }} <Icon name="ph:arrow-square-out-bold" /></span>
            </a>
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

.reward-card {
  width: min(26rem, 100%);
  max-height: min(85dvh, 100%);
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background-color: var(--card);
}

.reward-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
}

.reward-title {
  font-size: var(--fs-body-h);
  font-weight: var(--fw-body-h);
}

.modal-close {
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

.reward-panel {
  margin: 0 1.25rem 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--background);
}

.reward-thanks {
  font-size: var(--fs-meta);
  font-weight: 500;
  color: var(--accent);
  text-align: center;
}

.reward-qrs {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin-top: 1rem;
}

.reward-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.reward-qr img {
  width: 8.5rem;
  height: 8.5rem;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: #ffffff;
}

.qr-missing {
  display: grid;
  place-items: center;
  gap: 0.35rem;
  width: 8.5rem;
  height: 8.5rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--muted-foreground);
}

.qr-missing :deep(.icon) {
  font-size: 1.75rem;
}

.qr-missing small {
  font-size: var(--fs-meta);
}

.qr-name {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.reward-join {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  margin-top: 1.25rem;
  padding: 0.65rem 1rem;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 62%, white));
  color: #fff;
  font-size: var(--fs-meta);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
  transition: transform var(--duration-base) var(--easing-base),
    box-shadow var(--duration-base) var(--easing-base);
}

.reward-join:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 55%, transparent);
}

.reward-join :deep(.icon) {
  font-size: 1.05rem;
}

.reward-sponsors {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  margin-top: 1.25rem;
  padding: 0.9rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--muted);
  transition: border-color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.reward-sponsors:hover {
  border-color: var(--accent);
  background-color: var(--card);
}

.sponsors-title {
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--foreground);
}

.sponsors-desc {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  text-align: center;
}

/* 弹窗出入场：轻微上浮 + 淡入淡出 */
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity var(--duration-base) var(--easing-base);
}

.modal-pop-enter-active .reward-card,
.modal-pop-leave-active .reward-card {
  transition: transform var(--duration-base) var(--easing-base);
}

.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
}

.modal-pop-enter-from .reward-card,
.modal-pop-leave-to .reward-card {
  transform: translateY(1rem);
}

@media (prefers-reduced-motion: reduce) {
  .modal-pop-enter-active,
  .modal-pop-leave-active,
  .modal-pop-enter-active .reward-card,
  .modal-pop-leave-active .reward-card {
    transition: none;
  }

  .reward-join {
    transition: none;
  }
}
</style>
