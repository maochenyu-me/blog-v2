<script setup lang="ts">
/**
 * 外链中转页（/safego?u=<base64url>）。
 *
 * 非信任域名的外链被 safego 插件拦截后落到这里：
 *  - 倒计时结束自动跳转目标链接（秒数可在 blog.config.ts 的 safego.countdown 配置）
 *  - 「继续访问」手动立即跳转
 *  - 「返回上页」history.back() 回到点击外链的位置（浏览器会恢复滚动位置）
 *
 * 布局与 404 页同一套排版体系（container 覆盖 + 设计令牌），适配多端。
 */
import { decodeTargetUrl } from '~/utils/safego'

const { ui, t } = useUi()
const { safego } = useBlogConfig()

const route = useRoute()
const router = useRouter()

const paramName = safego?.paramName || 'u'
const totalSeconds = Math.max(0, safego?.countdown ?? 5)

/** 解码后的目标链接；null 表示参数缺失或非法 */
const targetUrl = computed<string | null>(() => {
  const raw = route.query[paramName]
  if (typeof raw !== 'string' || !raw) return null
  return decodeTargetUrl(raw)
})

/** 链接协议合法性：只允许 http(s)，阻止 javascript: 等注入 */
const isSafeTarget = computed(() => {
  if (!targetUrl.value) return false
  return /^https?:\/\//i.test(targetUrl.value)
})

/** 展示用 URL：过长截断中段，避免撑破移动端卡片 */
const displayUrl = computed(() => {
  const url = targetUrl.value ?? ''
  if (url.length <= 64) return url
  return url.slice(0, 40) + '…' + url.slice(-20)
})

/** 倒计时文案：用 t() 插值 {n} */
const countdownText = computed(() => t(ui.safego.countdown, { n: remaining.value }))

/** 倒计时剩余秒数 */
const remaining = ref(totalSeconds)
let timer: ReturnType<typeof setInterval> | null = null

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

/** 真正跳转到目标外链 */
function go() {
  if (!isSafeTarget.value) return
  stopTimer()
  // 当前标签页直接跳转，与 hexo-safego 行为一致
  window.location.href = targetUrl.value!
}

/** 返回上页：回到点击外链的页面及滚动位置（浏览器历史自动恢复） */
function goBack() {
  stopTimer()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/')
  }
}

onMounted(() => {
  // 非法链接不启动倒计时；countdown<=0 表示只允许手动跳转
  if (!isSafeTarget.value || totalSeconds <= 0) return
  timer = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) {
      stopTimer()
      go()
    }
  }, 1000)
})

onBeforeUnmount(stopTimer)

useHead({ title: ui.safego.title })
</script>

<template>
  <div class="page-safego">
    <div class="container">
      <div class="card">
        <p class="kicker">SAFEGO</p>
        <h1 class="title">
          <span class="icon" aria-hidden="true"><Icon name="tabler:shield" /></span>
          {{ ui.safego.title }}
        </h1>

        <template v-if="targetUrl && isSafeTarget">
          <p class="desc">{{ ui.safego.subtitle }}</p>
          <p class="url-box" :title="targetUrl">{{ displayUrl }}</p>

          <p v-if="totalSeconds > 0" class="countdown" aria-live="polite">
            <span class="num">{{ remaining }}</span>
            <span>{{ countdownText }}</span>
          </p>

          <p class="safety-tip">{{ ui.safego.safetyTip }}</p>

          <div class="actions">
            <button type="button" class="btn primary" @click="go">
              {{ ui.safego.continueBtn }}
            </button>
            <button type="button" class="btn ghost" @click="goBack">
              {{ ui.safego.backBtn }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="desc">{{ ui.safego.invalid }}</p>
          <div class="actions">
            <button type="button" class="btn ghost" @click="goBack">
              {{ ui.safego.backBtn }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-safego {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72vh;
  padding: var(--space-section) var(--space-gutter);
}

/* 与 404 页同理：覆盖 Tailwind .container 的 1280px，对齐全站正文栏 */
.container {
  width: 100%;
  max-width: var(--content-max-width);
}

.card {
  max-width: 32rem;
  margin: 0 auto;
  padding: clamp(1.5rem, 5vw, 2.5rem);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  text-align: center;
}

.kicker {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  letter-spacing: 0.18em;
  color: var(--accent);
  margin-bottom: 1rem;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.icon {
  display: inline-flex;
  color: var(--accent);
}

.desc {
  margin-top: 1rem;
  color: var(--muted-foreground);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

.url-box {
  margin-top: 0.75rem;
  padding: 0.625rem 0.875rem;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  line-height: 1.6;
  word-break: break-all;
  color: var(--foreground);
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius-card) * 0.5);
}

.countdown {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 1.25rem;
  font-size: var(--fs-body);
  color: var(--muted-foreground);
}

.countdown .num {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  min-width: 1.5em;
}

.safety-tip {
  margin-top: 1rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0 1.5rem;
  font-size: var(--fs-body);
  border-radius: calc(var(--radius-card) * 0.5);
  cursor: pointer;
  transition:
    background var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

/* 触屏端保证按钮可整行点按 */
@media (max-width: 30rem) {
  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}

.btn.primary {
  color: var(--background);
  background: var(--accent);
  border: 1px solid var(--accent);
}

.btn.primary:hover {
  background: color-mix(in srgb, var(--accent) 85%, var(--background));
  border-color: color-mix(in srgb, var(--accent) 85%, var(--background));
}

.btn.ghost {
  color: var(--foreground);
  background: transparent;
  border: 1px solid var(--border);
}

.btn.ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
