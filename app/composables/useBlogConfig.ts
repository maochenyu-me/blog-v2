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
  /** 建站起始日（ISO 日期字符串，如 '2024-11-01'），页脚存活计时起点 */
  siteStartDate: string
  /** 源码仓库地址（不带结尾斜杠），更新日志的 commit 链接前缀 */
  repoUrl: string
  keywords: string[]
  analytics: {
    provider: 'umami' | 'plausible' | 'cloudflare' | 'none'
    siteId?: string
    scriptUrl?: string
  }
  beian?: { icp?: string; police?: string; moe?: string }
  social: SocialLink[]
  nav: NavItem[]
  /**
   * 左侧导航面板（SiteSidePanel）的独立数据 —— 与 nav 刻意分开：
   * 面板定位是「站点链接总览」，分组平铺全部入口。
   */
  panel: {
    groups: Array<{ label: string; items: NavItem[] }>
  }
  footer: {
    copyright: string
    startYear: number
    legalLinks: Array<{ label: string; to: string }>
    extraLinks: Array<{ label: string; to: string }>
  }
}

export interface FeedConfig {
  fullText: boolean
  limit: number
  rss: { enabled: boolean; path: string }
  atom: { enabled: boolean; path: string }
}

export interface MusicConfig {
  enabled: boolean
  source: import('../utils/music').MusicSource
  api: string
  playlist: string
  warmup: string
  level: 'standard' | 'exhigh' | 'lossless'
  volume: number
  tracks: import('../utils/music').LibraryTrack[]
  meting: import('../utils/music').MetingConfig
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

/** 文章底部版权信息卡（PostFooterCard） */
export interface CopyrightConfig {
  license: string
  licenseUrl: string
}

/** 打赏弹窗（PostRewardModal） */
export interface RewardConfig {
  enabled: boolean
  wechatQr: string
  alipayQr: string
  sponsorsUrl: string
}

/** AI 智能摘要卡片（PostAiSummary） */
export interface AiConfig {
  label: string
  badge: string
  animation: boolean
}

export function useBlogConfig() {
  const appConfig = useAppConfig()
  return {
    site: appConfig.site as SiteConfig,
    feed: appConfig.feed as FeedConfig,
    search: appConfig.search as SearchConfig,
    music: appConfig.music as MusicConfig,
    copyright: appConfig.copyright as CopyrightConfig,
    reward: appConfig.reward as RewardConfig,
    ai: appConfig.ai as AiConfig,
  }
}
