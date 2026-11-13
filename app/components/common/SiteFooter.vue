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
  return y > startYear ? `${startYear}–${y}` : `${startYear}`
})

/**
 * feed 关闭时不能留下指向 404 的死链（提示词 §10.3：用户配置了才显示）。
 * footer.extraLinks 是通用配置，这里按 feed.enabled 做二次过滤。
 */
const extraLinks = computed(() =>
  site.footer.extraLinks.filter((link) => {
    const path = link.to.split('?')[0]
    if (path === feed.rss.path) return feed.rss.enabled
    if (path === feed.atom.path) return feed.atom.enabled
    return true
  }),
)

/**
 * extraLinks 既可能指向站内路由（/privacy），也可能指向静态文件（/rss.xml、/atom.xml）。
 * 静态文件不在 Vue Router 的路由表里，用 NuxtLink 渲染会让每次页面渲染都刷一条
 * "No match found for location with path" 警告，且客户端路由会把地址栏推到 404。
 * 因此这里判定类型：静态文件与站外链接直出 <a>，站内路由才用 NuxtLink。
 */
function isDirectLink(to: string) {
  if (/^(https?:)?\/\//.test(to) || to.startsWith('mailto:')) return true
  const path = to.split(/[?#]/)[0] ?? ''
  const lastSegment = path.split('/').pop() ?? ''
  return lastSegment.includes('.')
}

const beianItems = computed(() => {
  const b = site.beian ?? {}
  return [
    b.icp ? { key: 'icp', text: b.icp, href: 'https://beian.miit.gov.cn/' } : null,
    b.police ? { key: 'police', text: b.police, href: 'https://beian.mps.gov.cn/' } : null,
    b.moe ? { key: 'moe', text: b.moe, href: '' } : null,
  ].filter(Boolean) as Array<{ key: string; text: string; href: string }>
})

const legalLinks = computed(() => (site.footer as SiteConfig['footer']).legalLinks ?? [])

/**
 * 「小站已存活」秒级计时。SSR 端渲染占位 '--'（时间两端不一致，避免 hydration 失配），
 * onMounted 后每秒更新一次。起点用配置里的固定日期 + 显式 UTC+8，不受构建时间影响。
 */
const uptime = ref('')

let uptimeTimer: number | undefined

function tickUptime() {
  const start = new Date(`${site.siteStartDate}T00:00:00+08:00`).getTime()
  const diff = Math.max(0, Date.now() - start)
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor(diff / 3_600_000) % 24
  const m = Math.floor(diff / 60_000) % 60
  const s = Math.floor(diff / 1_000) % 60
  uptime.value = t(ui.footer.uptimeValue, { d, h, m, s })
}

onMounted(() => {
  tickUptime()
  uptimeTimer = window.setInterval(tickUptime, 1000)
})

onBeforeUnmount(() => {
  if (uptimeTimer !== undefined) clearInterval(uptimeTimer)
})
</script>

<template>
  <footer class="site-footer">
    <div class="footer-body">
      <div class="footer-bottom">
        <div class="footer-col footer-col--left">
          <NuxtLink to="/" class="footer-brand">
            <img
              :src="site.author.avatar"
              :alt="site.author.name"
              class="footer-avatar"
              width="22"
              height="22"
            />
            <span class="footer-brand-name">{{ site.name }}</span>
          </NuxtLink>

          <p class="footer-copy">© {{ copyrightYears }} {{ site.footer.copyright }}</p>

          <ul v-if="beianItems.length" class="footer-beian">
            <li v-for="item in beianItems" :key="item.key">
              <a v-if="item.href" :href="item.href" target="_blank" rel="noopener noreferrer">
                {{ item.text }}
              </a>
              <span v-else>{{ item.text }}</span>
            </li>
          </ul>
        </div>

        <div class="footer-col footer-col--right">
          <p class="footer-uptime">
            {{ ui.footer.uptimeLabel }}<span class="footer-uptime-value">{{ uptime || '--' }}</span>
          </p>

          <nav v-if="legalLinks.length" class="footer-legal" :aria-label="ui.footer.legalNavAria">
            <NuxtLink
              v-for="link in legalLinks"
              :key="link.to"
              :to="link.to"
              class="footer-legal-link"
              no-prefetch
            >
              {{ link.label }}
            </NuxtLink>
          </nav>

          <div class="footer-links">
            <a
              v-for="link in site.social"
              :key="link.label"
              :href="link.url"
              class="footer-social"
              :aria-label="link.label"
              rel="noopener noreferrer"
              :target="link.url.startsWith('mailto:') ? undefined : '_blank'"
            >
              <Icon :name="link.icon" aria-hidden="true" />
            </a>

            <template v-for="link in extraLinks" :key="link.to">
              <a
                v-if="isDirectLink(link.to)"
                :href="link.to"
                class="footer-extra"
                :target="link.to.startsWith('http') ? '_blank' : undefined"
                :rel="link.to.startsWith('http') ? 'noopener noreferrer' : undefined"
              >
                {{ link.label }}
              </a>
              <NuxtLink v-else :to="link.to" class="footer-extra" no-prefetch>
                {{ link.label }}
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  /* 外边距归零：页脚玻璃面板紧贴内容区（各页面自带 padding-bottom 兜底间距），
   * 分隔感由 border-top + 主体内 padding 承担 */
  margin-top: 0;
}

/* 玻璃主体：半透底 + 磨砂 + 顶部 1px 线（无阴影，暗色禁阴影规则下自洽）
 * 顶 padding 用 item 档；底 padding 用 widget-clearance 档——面板直接贴视口底，
 * 音乐播放器（左下）与回顶键（右下）浮在这段玻璃上，不压文字 */
.footer-body {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  border-top: 1px solid var(--border);
  padding: var(--space-item) var(--space-gutter) var(--space-widget-clearance);
}

.footer-bottom {
  max-width: var(--home-max-width);
  margin-inline: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-item);
}

.footer-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.footer-col--right {
  align-items: flex-end;
}

/* ---- 左栏：品牌 ---- */
.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-avatar {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.footer-brand-name {
  font-size: var(--fs-body);
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* ---- 文本行 ---- */
.footer-copy,
.footer-beian,
.footer-uptime {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-family: var(--font-mono);
}

.footer-uptime-value {
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

.footer-beian {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.footer-beian a:hover {
  color: var(--foreground);
}

/* ---- 右栏：法务 / 社交 / 订阅 ---- */
.footer-legal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.footer-legal-link {
  font-size: var(--fs-meta);
  font-family: var(--font-mono);
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.footer-legal-link:hover {
  color: var(--foreground);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.footer-social {
  display: inline-flex;
  font-size: 1.125rem;
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.footer-social:hover {
  color: var(--foreground);
}

.footer-extra {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  transition: color var(--duration-base) var(--easing-base);
}

.footer-extra:hover {
  color: var(--foreground);
}

/* ---- 窄屏折叠为居中单栏（Dusklight 式） ---- */
@media (max-width: 640px) {
  .footer-bottom {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .footer-col,
  .footer-col--right {
    align-items: center;
  }

  .footer-beian,
  .footer-legal,
  .footer-links {
    justify-content: center;
  }
}
</style>
