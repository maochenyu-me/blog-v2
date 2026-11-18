<script setup lang="ts">
import type { SiteConfig } from '~/composables/useBlogConfig'

const { site, feed } = useBlogConfig()
const { ui, t } = useUi()

/**
 * 年份在服务端与客户端都要算出同一个值，否则跨年瞬间会 hydration 失配。
 * 用 useState 把服务端算出的年份带到客户端，保证两端一致。
 */
const year = useState('footer-current-year', () => new Date().getFullYear())

const copyrightYears = computed(() => {
  const { startYear } = site.footer
  const y = year.value
  return y > startYear ? `${startYear}-${y}` : `${y}`
})

/**
 * feed 关闭时不能留下指向 404 的死链（提示词 §10.3：用户配置了才显示）。
 * footer.extraLinks 是通用配置，这里按 feed.enabled 做二次过滤。
 */
const feedLinks = computed(() =>
  site.footer.extraLinks.filter((link) => {
    const path = link.to.split('?')[0]
    if (path === feed.rss.path) return feed.rss.enabled
    if (path === feed.atom.path) return feed.atom.enabled
    return true
  }),
)

const legalLinks = computed(() => (site.footer as SiteConfig['footer']).legalLinks ?? [])

const beianItems = computed(() => {
  const b = site.beian ?? {}
  return [
    b.icp ? { key: 'icp', text: b.icp, href: 'https://beian.miit.gov.cn/' } : null,
    b.police ? { key: 'police', text: b.police, href: 'https://beian.mps.gov.cn/' } : null,
  ].filter(Boolean) as Array<{ key: string; text: string; href: string }>
})

/** GitHub 主页链接取自 social 配置，取不到则退回仓库地址 */
const githubUrl = computed(
  () => site.social.find((s) => /github/i.test(s.url))?.url ?? site.repoUrl,
)

/* ---- 「本站已运行」秒级计时 ----
 * SSR 端只渲染前缀（时间两端不一致，避免 hydration 失配），
 * onMounted 后每秒更新。起点用配置里的固定日期 + 显式 UTC+8，
 * 不受构建时间影响。数值串在 JS 里拼接，避免模板空白压缩吃掉空格。 */
const uptime = ref<{ d: number; h: number; m: number; s: number } | null>(null)

const uptimeText = computed(() =>
  uptime.value ? ` ${t(ui.footer.runtimeValue, uptime.value)}` : '',
)

let uptimeTimer: number | undefined

function tickUptime() {
  const start = new Date(`${site.siteStartDate}T00:00:00+08:00`).getTime()
  const diff = Math.max(0, Date.now() - start)
  uptime.value = {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor(diff / 3_600_000) % 24,
    m: Math.floor(diff / 60_000) % 60,
    s: Math.floor(diff / 1_000) % 60,
  }
}

/* ---- 访问统计（Umami）----
 * loading 阶段显示「加载中...」，失败/未配置退回「暂不可用」。 */
const traffic = ref<Awaited<ReturnType<typeof fetchVisitStats>>>(null)
const trafficState = ref<'loading' | 'ok' | 'error'>('loading')

onMounted(() => {
  tickUptime()
  uptimeTimer = window.setInterval(tickUptime, 1000)

  fetchVisitStats().then(async (data) => {
    if (data) {
      traffic.value = data
      trafficState.value = 'ok'
      return
    }
    /* Umami 不可用 → 退回自建 busuanzi 的站点计数。
     * busuanzi 没有「今日」口径，只能兜底本站访客/访问两项。 */
    const bsz = useBusuanzi()
    await bsz.track()
    if (bsz.siteUv.value || bsz.sitePv.value) {
      traffic.value = {
        todayUv: '',
        todayPv: '',
        yesterdayUv: '',
        yesterdayPv: '',
        lastMonthPv: '',
        totalUv: bsz.siteUv.value ?? '',
        totalPv: bsz.sitePv.value ?? '',
      }
      trafficState.value = 'ok'
    } else {
      trafficState.value = 'error'
    }
  })
})

onBeforeUnmount(() => {
  if (uptimeTimer !== undefined) clearInterval(uptimeTimer)
})

const trafficItems = computed(() => [
  { key: 'todayUv', label: ui.footer.trafficTodayUv, value: traffic.value?.todayUv },
  { key: 'todayPv', label: ui.footer.trafficTodayPv, value: traffic.value?.todayPv },
  { key: 'totalUv', label: ui.footer.trafficTotalUv, value: traffic.value?.totalUv },
  { key: 'totalPv', label: ui.footer.trafficTotalPv, value: traffic.value?.totalPv },
])

function trafficText(value?: string) {
  if (trafficState.value === 'loading') return ui.footer.trafficLoading
  /* 空串（busuanzi 兜底时缺失的「今日」口径）与 undefined 一样按不可用处理 */
  return value || ui.footer.trafficUnavailable
}

/** 站内路由 vs 静态文件（/rss.xml 等）：静态文件直出 <a>，避免路由 404 警告 */
function isDirectLink(to: string) {
  if (/^(https?:)?\/\//.test(to) || to.startsWith('mailto:')) return true
  const lastSegment = (to.split(/[?#]/)[0] ?? '').split('/').pop() ?? ''
  return lastSegment.includes('.')
}
</script>

<template>
  <footer class="footer-stage">
    <!-- 舞台上层：动物横图 + 技术徽章 -->
    <div class="footer-kept">
      <div class="footer-animals">
        <img
          src="/images/footer-animals.webp"
          :alt="ui.footer.animalsAlt"
          width="2170"
          height="305"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div class="footer-stack" :aria-label="ui.footer.stackAria">
        <span class="stack-badge stack-badge--violet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" /></svg>
          <span>Nuxt</span>
        </span>
        <span class="stack-badge stack-badge--cyan">
          <span class="stack-letters" aria-hidden="true">TS</span>
          <span>TypeScript</span>
        </span>
        <span class="stack-badge stack-badge--orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /></svg>
          <span>Ecoku</span>
        </span>
        <span class="stack-badge stack-badge--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
          <span>CDN</span>
        </span>
        <span class="stack-badge stack-badge--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
          <span>Umami</span>
        </span>
        <span class="stack-badge stack-badge--quiet">© {{ year }} / BY-NC-SA</span>
      </div>
    </div>

    <!-- 玻璃卡主体 -->
    <div class="footer-card">
      <div class="footer-card-border" aria-hidden="true" />

      <div class="footer-decor" aria-hidden="true">
        <div class="footer-planet footer-planet--left"><span /></div>
        <div class="footer-planet footer-planet--right" />

        <svg class="footer-waves" viewBox="0 0 2048 430" preserveAspectRatio="none">
          <defs>
            <linearGradient id="footer-wave-left" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#ffffff" stop-opacity="0.88" />
              <stop offset="0.58" stop-color="#8bbcff" stop-opacity="0.64" />
              <stop offset="1" stop-color="#2c86f5" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="footer-wave-right" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
              <stop offset="0.58" stop-color="#8bbcff" stop-opacity="0.62" />
              <stop offset="1" stop-color="#2c86f5" stop-opacity="0" />
            </linearGradient>
            <radialGradient id="footer-wave-node" cx="50%" cy="50%" r="50%">
              <stop offset="0" stop-color="#ffffff" />
              <stop offset="0.35" stop-color="#9fd3ff" />
              <stop offset="1" stop-color="#2f8df7" stop-opacity="0" />
            </radialGradient>
          </defs>
          <g fill="none" stroke="url(#footer-wave-left)" stroke-width="1.6">
            <path d="M-30 170 C 154 170, 190 316, 356 321 C 500 326, 545 230, 684 245 C 776 255, 817 320, 938 338" />
            <path d="M-28 202 C 126 205, 192 347, 355 351 C 500 356, 563 264, 702 279 C 790 288, 836 340, 944 354" />
            <path d="M-22 237 C 122 242, 201 374, 360 378 C 514 382, 584 303, 718 315 C 805 323, 852 360, 952 370" />
            <path d="M-14 274 C 121 279, 217 399, 375 403 C 526 406, 601 342, 735 349 C 824 354, 870 378, 960 385" />
            <path d="M-4 310 C 136 314, 236 416, 393 420 C 545 423, 617 377, 752 381 C 839 383, 888 392, 972 397" />
          </g>
          <g fill="none" stroke="url(#footer-wave-right)" stroke-width="1.6">
            <path d="M2078 126 C 1882 128, 1818 305, 1655 318 C 1507 330, 1456 246, 1314 258 C 1214 266, 1170 329, 1062 342" />
            <path d="M2075 160 C 1889 166, 1826 337, 1654 346 C 1502 354, 1439 277, 1303 291 C 1210 301, 1157 345, 1055 358" />
            <path d="M2070 197 C 1893 204, 1828 365, 1651 372 C 1500 378, 1421 312, 1287 326 C 1195 336, 1144 364, 1048 373" />
            <path d="M2064 237 C 1890 244, 1823 390, 1644 396 C 1491 401, 1406 349, 1275 359 C 1182 366, 1129 381, 1038 387" />
            <path d="M2058 280 C 1882 286, 1806 413, 1627 419 C 1475 423, 1394 382, 1260 389 C 1171 394, 1118 398, 1028 402" />
          </g>
          <g opacity="0.96">
            <circle cx="164" cy="315" r="4.5" fill="url(#footer-wave-node)" />
            <circle cx="428" cy="383" r="6" fill="url(#footer-wave-node)" />
            <circle cx="548" cy="352" r="3.5" fill="url(#footer-wave-node)" />
            <circle cx="1588" cy="364" r="5.5" fill="url(#footer-wave-node)" />
            <circle cx="1838" cy="307" r="4" fill="url(#footer-wave-node)" />
            <circle cx="1944" cy="260" r="3" fill="url(#footer-wave-node)" />
          </g>
        </svg>

        <span class="footer-star footer-star--one" />
        <span class="footer-star footer-star--two" />
        <span class="footer-star footer-star--three" />
        <span class="footer-star footer-star--four" />
        <span class="footer-star footer-star--five" />
      </div>

      <div class="footer-content">
        <nav class="footer-nav" :aria-label="ui.footer.navAria">
          <NuxtLink to="/" class="footer-nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            <span>{{ ui.footer.navHome }}</span>
          </NuxtLink>
          <a :href="githubUrl" class="footer-nav-link" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
            <span>GitHub</span>
          </a>
          <NuxtLink to="/links" class="footer-nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>
            <span>{{ ui.footer.navFriends }}</span>
          </NuxtLink>
        </nav>

        <div class="footer-runtime" :aria-label="ui.footer.runtimeAria">
          <div class="footer-clock" aria-hidden="true">
            <span class="footer-clock-orbit" />
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="39" />
              <path d="M50 27v25l17 10" />
              <circle cx="50" cy="52" r="4.5" />
            </svg>
          </div>
          <time :datetime="site.siteStartDate">{{ ui.footer.runtimeLabel }}{{ uptimeText }}</time>
          <span class="footer-runtime-sparkle" aria-hidden="true">✦</span>
        </div>

        <div class="footer-traffic" :aria-label="ui.footer.trafficAria" :data-state="trafficState">
          <template v-for="(item, i) in trafficItems" :key="item.key">
            <i v-if="i > 0" aria-hidden="true">|</i>
            <span class="footer-traffic-item">
              <span>{{ item.label }}</span><strong aria-live="polite">{{ trafficText(item.value) }}</strong>
            </span>
          </template>
        </div>

        <div class="footer-divider" aria-hidden="true"><span /><i>✦</i><span /></div>

        <div class="footer-meta">
          <span>© {{ copyrightYears }} {{ site.footer.copyright }}</span>
          <template v-for="link in feedLinks" :key="link.to">
            <span class="footer-meta-separator" aria-hidden="true" />
            <a
              v-if="isDirectLink(link.to)"
              :href="link.to"
              :target="link.to.startsWith('http') ? '_blank' : undefined"
              :rel="link.to.startsWith('http') ? 'noopener noreferrer' : undefined"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
              <span>{{ link.label }}</span>
            </a>
            <NuxtLink v-else :to="link.to" no-prefetch>
              <span>{{ link.label }}</span>
            </NuxtLink>
          </template>
          <template v-for="link in site.social" :key="link.label">
            <span v-if="!/github/i.test(link.url)" class="footer-meta-separator" aria-hidden="true" />
            <a
              v-if="!/github/i.test(link.url)"
              :href="link.url"
              class="footer-social-link"
              :aria-label="link.label"
              :title="link.label"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon :name="link.icon" aria-hidden="true" />
            </a>
          </template>
        </div>

        <nav v-if="legalLinks.length || beianItems.length" class="footer-legal" :aria-label="ui.footer.legalNavAria">
          <template v-for="link in legalLinks" :key="link.to">
            <NuxtLink :to="link.to" no-prefetch>{{ link.label }}</NuxtLink>
          </template>
          <a
            v-for="item in beianItems"
            :key="item.key"
            :href="item.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ item.text }}
          </a>
        </nav>

        <div class="footer-powered">
          <span class="footer-powered-dots" aria-hidden="true">· · ·</span>
          <span class="footer-powered-star" aria-hidden="true">✦</span>
          <span>{{ ui.footer.poweredBy }}</span>
          <a href="https://nuxt.com" target="_blank" rel="noreferrer">Nuxt</a>
          <span>&</span>
          <NuxtLink to="/">{{ site.name }}</NuxtLink>
          <span class="footer-powered-star" aria-hidden="true">✦</span>
          <span class="footer-powered-dots" aria-hidden="true">· · ·</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ===================================================================
 * 页脚舞台 —— 复刻 blog.demius.tech 的「夜幕收尾」式页脚：
 * 深色星空（暗色模式）/ 浅蓝灰（亮色模式）舞台上，一排动物横图、
 * 技术徽章，下面是一张浅蓝玻璃卡。蓝色系为页脚专用色，不占用
 * 全局主题 token（页脚是独立的「收尾幕」，配色刻意与正文区分离）。
 * =================================================================== */
.footer-stage {
  --footer-blue: #0874ef;
  --footer-blue-deep: #1767bb;
  --footer-blue-soft: #65b3f4;

  position: relative;
  z-index: 2;
  width: 100%;
  margin-top: 0;
  padding: clamp(3rem, 5vw, 4.5rem) var(--space-gutter) 2.25rem;
  color: var(--footer-blue-deep);
  font-family: inherit;
  text-align: center;
  /* 完全透明：直接与页面背景接轨，不留任何底色与分隔线 */
  background: transparent;
}

.footer-stage :deep(a) {
  color: inherit;
  text-decoration: none;
}

/* ---- 上层：动物横图 + 徽章 ---- */
.footer-kept {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.72rem;
  width: min(100%, 54rem);
  margin: 0 auto 1.55rem;
}

.footer-animals {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: min(100%, 53.25rem);
  min-height: 4.85rem;
  overflow: hidden;
}

.footer-animals img {
  display: block;
  width: min(100%, 53.25rem);
  height: auto;
  max-height: 6.8rem;
  object-fit: contain;
  object-position: center bottom;
  filter: drop-shadow(0 0.55rem 0.8rem #235c9b21);
}

.footer-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
}

.stack-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.6rem;
  padding: 0.18rem 0.58rem;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 0.42rem;
  background: color-mix(in srgb, var(--footer-blue) 6%, transparent);
  box-shadow: 0 1px 2px #1f67b014;
  font-size: 0.67rem;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.stack-badge svg {
  width: 0.82rem;
  height: 0.82rem;
}

.stack-letters {
  font-size: 0.61rem;
  font-weight: 850;
  line-height: 1;
}

.stack-badge--violet { color: #9369df; }
.stack-badge--cyan { color: #2899b3; }
.stack-badge--orange { color: #dc8346; }
.stack-badge--blue { color: #4788dc; }
.stack-badge--green { color: #499d72; }
.stack-badge--quiet { color: #7890aa; font-weight: 520; }

/* ---- 玻璃卡 ---- */
.footer-card {
  position: relative;
  display: flex;
  overflow: hidden;
  isolation: isolate;
  width: min(100%, 46rem);
  min-height: 13.55rem;
  margin: 0 auto;
  border: 1.5px solid #fffffff0;
  border-radius: 1.1rem;
  background:
    radial-gradient(circle at 50% 14%, #fffffffa, transparent 38%),
    radial-gradient(circle at 10% 78%, #75b4f933, transparent 35%),
    radial-gradient(circle at 91% 77%, #6cacf73d, transparent 37%),
    linear-gradient(112deg, #e0f1ffd6, #fcfeffeb 50%, #dceeffdb);
  box-shadow:
    0 0.65rem 1.5rem #2575ce1f,
    0 0 1.35rem #61aaf824,
    inset 0 0 1.5rem #ffffffc7,
    inset 0 -1.2rem 2.1rem #64a8f51a;
}

/* 卡面细碎星点（静态） */
.footer-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.85;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 8% 18%, #fff 0 1px, transparent 1.8px),
    radial-gradient(circle at 22% 31%, #ffffffeb 0 0.8px, transparent 1.6px),
    radial-gradient(circle at 35% 13%, #ffffffe6 0 1px, transparent 1.8px),
    radial-gradient(circle at 67% 20%, #ffffffe6 0 0.8px, transparent 1.5px),
    radial-gradient(circle at 82% 13%, #fff 0 1px, transparent 1.8px),
    radial-gradient(circle at 94% 37%, #ffffffeb 0 0.9px, transparent 1.7px);
}

/* 右上角大圆弧高光 */
.footer-card::after {
  content: '';
  position: absolute;
  top: -18%;
  right: -2%;
  width: 27%;
  height: 80%;
  opacity: 0.8;
  pointer-events: none;
  border-top: 1px solid #ffffff8c;
  border-right: 1px solid #ffffff7a;
  border-radius: 50%;
}

.footer-card-border {
  position: absolute;
  inset: 0.4rem;
  z-index: 4;
  pointer-events: none;
  border: 1px solid #ffffffd1;
  border-radius: 0.82rem;
  box-shadow: inset 0 0 0.85rem #ffffff6b;
}

/* ---- 卡内装饰：行星 / 波浪 / 闪烁星 ---- */
.footer-decor {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.footer-waves {
  position: absolute;
  bottom: -0.15rem;
  left: 0;
  width: 100%;
  height: 72%;
  opacity: 0.62;
}

.footer-planet {
  position: absolute;
  border-radius: 50%;
}

.footer-planet--left {
  top: 38%;
  left: 1.3%;
  width: 2.8rem;
  aspect-ratio: 1;
  opacity: 0.65;
  background:
    radial-gradient(circle at 35% 28%, #fff 0 8%, transparent 25%),
    radial-gradient(circle, #f8fbff, #b8d9ff 61%, #78ace8);
  box-shadow:
    inset -0.5rem -0.4rem 0.8rem #3772c22e,
    0 0 0.9rem #5099ea2e;
}

.footer-planet--left::before,
.footer-planet--left::after {
  content: '';
  position: absolute;
  top: 43%;
  left: -31%;
  width: 162%;
  height: 27%;
  border: 1px solid #ffffffb8;
  border-radius: 50%;
  transform: rotate(11deg);
}

.footer-planet--left::after {
  top: 49%;
  left: -25%;
  width: 150%;
  height: 13%;
  border-color: #51a0f166;
}

.footer-planet--right {
  right: -5%;
  bottom: -45%;
  width: 8rem;
  aspect-ratio: 1;
  opacity: 0.45;
  background:
    radial-gradient(circle at 36% 28%, #ffffffc2, transparent 18%),
    linear-gradient(155deg, #cfe6ffa3, #6aa6ef6b);
  box-shadow: inset 1rem 0.7rem 1.7rem #ffffff73;
}

.footer-star {
  position: absolute;
  width: 1px;
  height: 1.35rem;
  filter: drop-shadow(0 0 0.3rem #fff);
  opacity: 0.86;
  background: linear-gradient(transparent, #fff 43% 57%, transparent);
  animation: footer-star 3.2s ease-in-out infinite alternate;
}

.footer-star::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.35rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, #fff 43% 57%, transparent);
  transform: translate(-50%, -50%);
}

.footer-star--one { top: 15%; left: 89%; }
.footer-star--two { top: 31%; left: 18%; transform: scale(0.55); animation-delay: -1.1s; }
.footer-star--three { top: 42%; left: 79%; transform: scale(0.65); animation-delay: -2s; }
.footer-star--five { top: 20%; left: 11%; transform: scale(0.72); animation-delay: -2.5s; }

.footer-star--four {
  top: 62%;
  left: 49.5%;
  transform: scale(0.9);
  filter: drop-shadow(0 0 0.35rem #307ee68c);
  background: linear-gradient(transparent, #5c9cef 43%, #fff 57%, transparent);
  animation-delay: -0.6s;
}

.footer-star--four::after {
  background: linear-gradient(90deg, transparent, #5c9cef 43%, #fff 57%, transparent);
}

@keyframes footer-star {
  0% { opacity: 0.4; }
  to { opacity: 1; }
}

/* ---- 卡内内容 ---- */
.footer-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 0.78rem 1.2rem 0.68rem;
}

.footer-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(1.1rem, 2.2vw, 1.9rem);
  margin-bottom: 0.48rem;
}

.footer-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  color: #4696d4;
  font-size: 0.72rem;
  font-weight: 500;
  transition:
    color 0.18s ease-out,
    transform 0.18s ease-out;
}

.footer-nav-link svg {
  width: 0.86rem;
  height: 0.86rem;
}

.footer-nav-link:hover {
  color: var(--footer-blue);
  transform: translateY(-1px);
}

/* ---- 运行时间胶囊 ---- */
.footer-runtime {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(21rem, 76%);
  min-height: 2.18rem;
  padding: 0.35rem 1.1rem 0.35rem 3.65rem;
  border: 1px solid #fffffff0;
  border-radius: 999px;
  background: #ffffff7a;
  box-shadow:
    0 0.36rem 0.75rem #2370d026,
    inset 0 0 0 0.2rem #ffffff2e;
  -webkit-backdrop-filter: blur(0.65rem) saturate(135%);
  backdrop-filter: blur(0.65rem) saturate(135%);
}

.footer-runtime time {
  color: var(--footer-blue);
  font-size: 0.73rem;
  font-weight: 690;
  line-height: 1.2;
  letter-spacing: 0.025em;
  text-align: center;
  white-space: nowrap;
}

.footer-runtime strong {
  color: inherit;
  font-variant-numeric: tabular-nums;
  font-weight: 780;
}

.footer-clock {
  position: absolute;
  left: 0.33rem;
  display: grid;
  place-items: center;
  width: 2.75rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #f9fdff 0 43%, #a3ceff 45% 55%, #2789f6 57% 66%, #ffffffd6 68%);
  box-shadow:
    0 0 0.55rem #1b80f461,
    inset 0 0 0.45rem #ffffffeb;
}

.footer-clock svg {
  width: 68%;
  height: 68%;
  overflow: visible;
}

.footer-clock circle:first-child {
  fill: #ffffffdb;
  stroke: #0d7bec;
  stroke-width: 4.2px;
}

.footer-clock path {
  fill: none;
  stroke: #0d7bec;
  stroke-width: 5px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.footer-clock circle:last-child {
  fill: #0d7bec;
}

/* 时钟外的椭圆轨道 + 轨道上的小卫星 */
.footer-clock-orbit {
  position: absolute;
  top: 43%;
  left: -18%;
  width: 137%;
  height: 34%;
  border: 1px solid #4ba1fac2;
  border-radius: 50%;
  box-shadow: 0 0 0.3rem #ffffffd1;
  transform: rotate(-22deg);
  animation: footer-orbit 7s linear infinite;
}

.footer-clock-orbit::after {
  content: '';
  position: absolute;
  top: -2px;
  right: 7%;
  width: 0.28rem;
  aspect-ratio: 1;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0.35rem #0d7bec;
}

@keyframes footer-orbit {
  to { transform: rotate(338deg); }
}

.footer-runtime-sparkle {
  position: absolute;
  right: 3%;
  color: #fff;
  filter: drop-shadow(0 0 0.3rem #0a79ee);
  font-size: 1rem;
}

/* ---- 访问统计 ---- */
.footer-traffic {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  min-height: 1.05rem;
  margin-top: 0.52rem;
  color: #6281aa;
  font-size: 0.62rem;
  font-weight: 470;
  white-space: nowrap;
}

.footer-traffic-item {
  display: inline-flex;
  align-items: center;
}

.footer-traffic strong {
  color: var(--footer-blue);
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.footer-traffic[data-state='error'] strong,
.footer-traffic[data-state='loading'] strong {
  color: #7890aa;
  font-weight: 540;
}

.footer-traffic > i {
  color: #4084db61;
  font-style: normal;
}

/* ---- 分隔线 ---- */
.footer-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(31rem, 78%);
  height: 0.62rem;
  margin-top: 0.38rem;
}

.footer-divider span {
  position: relative;
  width: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #5ba7ec 14% 88%, transparent);
  box-shadow: 0 0 0.25rem #4b9dec4d;
}

.footer-divider span:first-child::before,
.footer-divider span:last-child::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 0.25rem;
  aspect-ratio: 1;
  background: #fff;
  border: 1px solid #62b7ef;
  border-radius: 50%;
  transform: translateY(-50%);
}

.footer-divider span:first-child::before { left: 0; }
.footer-divider span:last-child::after { right: 0; }

.footer-divider i {
  display: grid;
  place-items: center;
  width: 1.55rem;
  color: #6ba4ef;
  filter: drop-shadow(0 0 0.3rem #4985e780);
  font-size: 1.45rem;
  font-style: normal;
  line-height: 1;
}

/* ---- 版权 / 订阅 / 社交 ---- */
.footer-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.55rem, 1.1vw, 0.9rem);
  min-height: 1.1rem;
  margin-top: 0.2rem;
  color: #5677a6;
  font-size: 0.67rem;
  font-weight: 430;
}

.footer-meta a {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  color: var(--footer-blue);
  font-weight: 560;
  transition:
    color 0.18s ease-out,
    transform 0.18s ease-out;
}

.footer-meta a:hover,
.footer-powered a:hover {
  color: #064c9f;
  transform: translateY(-1px);
}

.footer-meta svg,
.footer-social-link {
  width: 0.82rem;
  height: 0.82rem;
}

.footer-social-link {
  display: inline-flex;
  font-size: 0.9rem;
}

.footer-meta-separator {
  width: 1px;
  height: 0.9rem;
  background: #3584e457;
}

/* ---- 法务 / 备案 ---- */
.footer-legal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.35rem 0.9rem;
  min-height: 1rem;
  margin-top: 0.28rem;
  color: #7994ba;
  font-size: 0.62rem;
  font-weight: 430;
}

.footer-legal a {
  transition:
    color 0.18s ease-out,
    transform 0.18s ease-out;
}

.footer-legal a:hover {
  color: #064c9f;
  transform: translateY(-1px);
}

/* ---- Powered by ---- */
.footer-powered {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  min-height: 1rem;
  margin-top: 0.22rem;
  color: #7994ba;
  font-size: 0.64rem;
  font-weight: 450;
}

.footer-powered a {
  color: var(--footer-blue);
  font-weight: 590;
  transition:
    color 0.18s ease-out,
    transform 0.18s ease-out;
}

.footer-powered-star {
  margin: 0 0.12rem;
  color: #0780ed;
  font-size: 1.2em;
}

.footer-powered-dots {
  color: #6baaf4;
  font-weight: 700;
  letter-spacing: 0.16em;
}

/* ---- 焦点可见性 ---- */
.footer-nav-link:focus-visible,
.footer-meta a:focus-visible,
.footer-legal a:focus-visible,
.footer-powered a:focus-visible {
  outline: 2px solid #075cbf;
  outline-offset: 0.18rem;
}

/* ===================================================================
 * 移动端（≤672px）：时钟竖排到文字上方、统计改两列网格、
 * 版权换行、行星收进卡内。
 * =================================================================== */
@media (max-width: 42rem) {
  .footer-stage {
    padding: 3.25rem 0.25rem 5.5rem;
  }

  .footer-kept {
    gap: 0.62rem;
    width: min(100%, 35rem);
    margin-bottom: 1.2rem;
  }

  .footer-animals {
    min-height: 3.8rem;
  }

  .footer-stack {
    gap: 0.32rem;
    padding-inline: 0.5rem;
  }

  .stack-badge {
    min-height: 1.5rem;
    padding-inline: 0.48rem;
    font-size: 0.63rem;
  }

  .footer-nav {
    gap: 1.1rem;
  }

  .footer-card {
    width: calc(100% - 0.5rem);
    min-height: 26.5rem;
    border-radius: 1rem;
  }

  .footer-card-border {
    inset: 0.32rem;
    border-radius: 0.72rem;
  }

  .footer-content {
    padding: 1rem 0.65rem 1.15rem;
  }

  .footer-runtime {
    flex-direction: column;
    gap: 0.55rem;
    width: min(94%, 22rem);
    min-height: 7.3rem;
    padding: 0.85rem 1rem;
  }

  .footer-clock {
    position: relative;
    left: auto;
    width: 3.25rem;
  }

  .footer-runtime time {
    max-width: 18rem;
    font-size: 0.74rem;
    line-height: 1.5;
    white-space: normal;
  }

  .footer-runtime-sparkle {
    right: 8%;
    bottom: 19%;
  }

  .footer-traffic {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem 0.8rem;
    width: min(94%, 20rem);
    margin-top: 0.85rem;
    font-size: 0.66rem;
    white-space: normal;
  }

  .footer-traffic-item {
    justify-content: center;
  }

  .footer-traffic > i {
    display: none;
  }

  .footer-divider {
    width: 88%;
    margin-top: 0.75rem;
  }

  .footer-meta {
    flex-wrap: wrap;
    gap: 0.5rem 0.7rem;
    max-width: 94%;
    margin-top: 0.65rem;
  }

  .footer-meta > span:first-child {
    width: 100%;
  }

  .footer-meta-separator:first-of-type {
    display: none;
  }

  .footer-powered {
    flex-wrap: wrap;
    row-gap: 0.12rem;
    max-width: 96%;
    margin-top: 0.65rem;
  }

  .footer-powered-dots {
    display: none;
  }

  .footer-planet--left {
    top: 42%;
    left: -1%;
    opacity: 0.45;
  }

  .footer-planet--right {
    right: -18%;
    bottom: -12%;
    opacity: 0.34;
  }
}

/* ---- 减少动态效果 ---- */
@media (prefers-reduced-motion: reduce) {
  .footer-star,
  .footer-clock-orbit {
    animation: none;
  }

  .footer-nav-link,
  .footer-meta a,
  .footer-legal a,
  .footer-powered a {
    transition: none;
  }
}
</style>
