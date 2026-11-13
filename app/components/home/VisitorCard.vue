<script setup lang="ts">
/**
 * 侧栏访客信息卡：欢迎语 + 访客 IP 地理信息 + 可展开的 IP 信息卡。
 * 所有外部数据均为客户端拉取（onMounted），SSG 预渲染输出加载占位文案，
 * 与水合后的首帧一致，不会产生 hydration mismatch。
 */
import { marked } from 'marked'
import {
  fetchVisitorGeo,
  getBrowserFromUA,
  getOSFromUA,
  haversineKm,
  detectCdn,
  type CdnKind,
} from '~/utils/visitor'

marked.use({ breaks: true, gfm: true })

interface VisitorConfig {
  text: string
  bloggerLat: number
  bloggerLon: number
  showIpCard: boolean
  ipCardUrl: string
}

const props = defineProps<{
  cfg: VisitorConfig
}>()

const { ui, t } = useUi()

const v = ui.pages.home.sidebar.visitor

const welcomeHtml = computed(() => marked.parse(props.cfg.text, { async: false }) as string)

/* ---- 客户端信息状态（初值 = SSG 占位文案；显式 string，避免 ui.ts as const 字面量锁死类型） ---- */
const ipText = ref<string>(v.loading)
const locationText = ref<string>(v.loading)
const ispText = ref<string>(v.loading)
const distanceText = ref<string>(v.calculating)
const osText = ref<string>(v.loading)
const browserText = ref<string>(v.loading)
const cdnKind = ref<CdnKind>(null)

const cdnLogo = computed(() => {
  switch (cdnKind.value) {
    case 'cloudflare':
      return { src: '/cdn/cloudflare.svg', alt: 'Cloudflare' }
    case 'edgeone':
      return { src: '/cdn/edgeone.png', alt: 'EdgeOne' }
    case 'vercel':
      return { src: '/cdn/vercel.png', alt: 'Vercel' }
    default:
      return null
  }
})

/* ---- 信息行：图标 + 标签 + 值（CDN 行因值可能是图片而单独渲染） ---- */
const rows = computed(() => [
  { key: 'ip', icon: 'tabler:user-circle', hue: 'violet', label: v.ip, value: ipText.value },
  { key: 'location', icon: 'tabler:map-pin', hue: 'pink', label: v.location, value: locationText.value },
  { key: 'distance', icon: 'tabler:route', hue: 'cyan', label: v.distance, value: distanceText.value },
  { key: 'isp', icon: 'tabler:shield', hue: 'emerald', label: v.isp, value: ispText.value },
  { key: 'os', icon: 'tabler:device-desktop', hue: 'amber', label: v.os, value: osText.value },
  { key: 'browser', icon: 'tabler:circle-dot', hue: 'sky', label: v.browser, value: browserText.value },
])

onMounted(async () => {
  osText.value = getOSFromUA(navigator.userAgent)
  browserText.value = getBrowserFromUA(navigator.userAgent)

  // CDN 识别：对当前页面发 HEAD 读响应头，不阻塞地理信息
  detectCdnAsync()

  const geo = await fetchVisitorGeo()
  ipText.value = geo.ip || v.failed
  locationText.value = geo.location || v.na
  ispText.value = geo.isp || v.na
  if (geo.lat !== undefined && geo.lon !== undefined && !Number.isNaN(geo.lat) && !Number.isNaN(geo.lon)) {
    const km = haversineKm(props.cfg.bloggerLat, props.cfg.bloggerLon, geo.lat, geo.lon)
    distanceText.value = t(v.distanceValue, { n: km })
  } else {
    distanceText.value = v.distanceFailed
  }
})

async function detectCdnAsync() {
  try {
    const res = await fetch(window.location.href, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    cdnKind.value = detectCdn(window.location.hostname, res.headers)
  } catch {
    cdnKind.value = null
  }
}

/* ---- IP 信息卡展开/收起（图源可配，失败后点击直接重试） ---- */
const cardOpen = ref(false)
const cardLoading = ref(false)
const cardFailed = ref(false)
const cardBtnText = computed(() => {
  if (cardFailed.value) return v.cardFailed
  if (cardLoading.value) return v.cardQuerying
  return cardOpen.value ? v.cardBtnCollapse : v.cardBtn
})
const cardSrc = ref('')

function loadCard() {
  cardFailed.value = false
  cardLoading.value = true
  // 时间戳防缓存：IP 信息卡每次展开都要拿到最新状态
  cardSrc.value = `${props.cfg.ipCardUrl}?t=${Date.now()}`
}

function toggleCard() {
  if (cardLoading.value) return
  if (cardFailed.value) {
    loadCard()
    return
  }
  if (cardOpen.value) {
    cardOpen.value = false
    cardFailed.value = false
    cardSrc.value = ''
    return
  }
  cardOpen.value = true
  loadCard()
}

function onCardLoad() {
  cardLoading.value = false
}

function onCardError() {
  cardLoading.value = false
  cardFailed.value = true
}
</script>

<template>
  <SidebarCard :title="v.title" icon="tabler:radar">
    <div class="visitor-body">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="welcome" v-html="welcomeHtml"></div>

      <dl class="info-list">
        <div v-for="row in rows" :key="row.key" class="info-row">
          <span class="info-icon" :class="`hue-${row.hue}`">
            <Icon :name="row.icon" aria-hidden="true" />
          </span>
          <dt class="info-label">{{ row.label }}</dt>
          <dd class="info-value">{{ row.value }}</dd>
        </div>
        <div class="info-row">
          <span class="info-icon hue-lavender">
            <Icon name="tabler:world" aria-hidden="true" />
          </span>
          <dt class="info-label">{{ v.cdn }}</dt>
          <dd v-if="cdnKind === 'local'" class="info-value">{{ v.localDev }}</dd>
          <dd v-else-if="cdnLogo" class="info-value">
            <img class="cdn-logo" :src="cdnLogo.src" :alt="cdnLogo.alt" width="96" height="24" />
          </dd>
          <dd v-else class="info-value">{{ v.na }}</dd>
        </div>
      </dl>

      <div v-if="cfg.showIpCard" class="ip-card">
        <button
          type="button"
          class="ip-card-btn"
          :class="{ expanded: cardOpen, loading: cardLoading }"
          :aria-expanded="cardOpen"
          @click="toggleCard"
        >
          <Icon name="tabler:shield-check" aria-hidden="true" />
          <span>{{ cardBtnText }}</span>
        </button>
        <div v-if="cardOpen" class="ip-card-result">
          <a
            href="https://ippure.com"
            target="_blank"
            rel="noopener noreferrer"
            class="ip-card-link"
          >
            <img
              v-if="cardSrc && !cardFailed"
              class="ip-card-img"
              :src="cardSrc"
              :alt="v.cardAlt"
              loading="lazy"
              decoding="async"
              @load="onCardLoad"
              @error="onCardError"
            />
          </a>
        </div>
      </div>
    </div>
  </SidebarCard>
</template>

<style scoped>
.welcome {
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--foreground) 16%, transparent);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--foreground);
}

.welcome :deep(p) {
  margin: 0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin: 0;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
}

/* 七色图标圆片：色相定身份，底色由 currentColor 派生，明暗主题自动成立 */
.info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 0.8125rem;
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.info-icon :deep(.iconify) {
  color: currentColor;
}

.hue-violet { color: #a78bfa; }
.hue-pink { color: #f472b6; }
.hue-cyan { color: #22d3ee; }
.hue-emerald { color: #34d399; }
.hue-amber { color: #fbbf24; }
.hue-sky { color: #60a5fa; }
.hue-lavender { color: #c4b5fd; }

.info-label {
  min-width: 5em;
  flex-shrink: 0;
  color: var(--muted-foreground);
  font-weight: 500;
}

.info-value {
  margin: 0;
  word-break: break-all;
  overflow-wrap: anywhere;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.cdn-logo {
  height: 22px;
  max-width: 104px;
  width: auto;
  object-fit: contain;
  vertical-align: middle;
}

/* ---- IP 信息卡 ---- */
.ip-card {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 16%, transparent);
}

.ip-card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.4rem 1rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 0.125rem);
  background: color-mix(in srgb, var(--muted) 60%, transparent);
  color: var(--muted-foreground);
  font-size: var(--fs-meta);
  font-weight: 500;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    background var(--duration-base) var(--easing-base);
}

.ip-card-btn:hover:not(.loading) {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}

.ip-card-btn.loading {
  pointer-events: none;
  opacity: 0.7;
}

.ip-card-result {
  overflow: hidden;
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 calc(var(--radius) - 0.125rem) calc(var(--radius) - 0.125rem);
}

.ip-card-link {
  display: block;
}

.ip-card-img {
  width: 100%;
  height: auto;
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .ip-card-btn,
  .cdn-logo {
    transition: none;
  }
}
</style>
