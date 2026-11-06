<script setup lang="ts">
const { site, feed } = useBlogConfig()

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
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-row">
        <p class="footer-copy">
          © {{ copyrightYears }} {{ site.footer.copyright }}
        </p>

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

      <ul v-if="beianItems.length" class="footer-beian">
        <li v-for="item in beianItems" :key="item.key">
          <a v-if="item.href" :href="item.href" target="_blank" rel="noopener noreferrer">
            {{ item.text }}
          </a>
          <span v-else>{{ item.text }}</span>
        </li>
      </ul>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid var(--border);
  margin-top: var(--space-section);
}

.footer-inner {
  max-width: var(--wide-max-width);
  margin-inline: auto;
  padding: var(--space-block) var(--space-gutter);
  padding-bottom: calc(var(--space-block) + 4rem);
}

.footer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-item);
}

.footer-copy {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-family: var(--font-mono);
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

.footer-beian {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-top: var(--space-item);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.footer-beian a:hover {
  color: var(--foreground);
}

/* 移动端底部有 Tab 栏，留出空间 */
@media (min-width: 768px) {
  .footer-inner {
    padding-bottom: var(--space-block);
  }
}
</style>
