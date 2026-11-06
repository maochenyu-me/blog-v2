/**
 * 站点配置的类型安全访问层。
 * 组件禁止直接 useAppConfig()，一律走这里，好处：
 *   1. 类型完整（不用在每个组件里重复 as）
 *   2. 配置字段改名时只有这一处要改
 *
 * ⚠ 函数名是 useBlogConfig，不是 useSiteConfig。
 * @nuxtjs/seo 依赖的 nuxt-site-config 已全局注册了 useSiteConfig
 * （见 .nuxt/types/imports.d.ts:269）。同名时我们的函数会被它覆盖，
 * 组件拿到的是 nuxt-site-config 的空 reactive 对象，`site.name` 直接抛
 * "Cannot read properties of undefined (reading 'name')"。
 */

export interface SocialLink {
  label: string
  url: string
  icon: string
}

export interface NavItem {
  label: string
  to: string
  icon?: string
  /** 站外链接：抽屉里加外链图标，新标签页打开 */
  external?: boolean
  /** 子项：有 children 的项是分组，桌面端平铺其叶子，移动端渲染多级列表 */
  children?: NavItem[]
}

export interface SiteConfig {
  name: string
  shortName: string
  description: string
  url: string
  locale: 'zh-CN' | 'en'
  author: {
    name: string
    avatar: string
    bio: string
    email: string
  }
  keywords: string[]
  analytics: {
    provider: 'umami' | 'plausible' | 'cloudflare' | 'none'
    siteId?: string
    scriptUrl?: string
  }
  beian?: { icp?: string; police?: string; moe?: string }
  social: SocialLink[]
  nav: NavItem[]
  footer: {
    copyright: string
    startYear: number
    extraLinks: Array<{ label: string; to: string }>
  }
}

export interface FeedConfig {
  fullText: boolean
  limit: number
  rss: { enabled: boolean; path: string }
  atom: { enabled: boolean; path: string }
}

export interface SearchConfig {
  enabled: boolean
  shortcut: string
  debounceMs: number
  maxResults: number
  history: boolean
  includeDrafts: boolean
  boost: { title: number; description: number; tags: number; category: number; text: number }
  hit: { enabled: boolean; snippetLength: number }
  index: { path: string; stripCodeBlocks: boolean }
}

export function useBlogConfig() {
  const appConfig = useAppConfig()
  return {
    site: appConfig.site as SiteConfig,
    feed: appConfig.feed as FeedConfig,
    search: appConfig.search as SearchConfig,
  }
}
