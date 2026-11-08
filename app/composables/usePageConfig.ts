/**
 * 页面级配置的类型安全访问层。
 */

export interface HomePageConfig {
  pinnedCount: number
  latestCount: number
  showExcerpt: boolean
  cta: { label: string; to: string }
  /** 文章卡片流配置 */
  cards: {
    pageSize: number
    fallbackCover: string
    excerptLength: number
    showReadingTime: boolean
  }
  /** 顶部推荐轮播配置 */
  carousel: {
    enabled: boolean
    /** 自动轮播间隔（毫秒），0 表示不自动播放 */
    interval: number
    showArrows: boolean
    showDots: boolean
    maxFeatured: number
    hideWhenEmpty: boolean
    badge: string
  }
  /** 说说轮播条配置（数据与 /shuoshuo 共享） */
  shuoshuoBar: {
    enabled: boolean
    count: number
    interval: number
    hideWhenEmpty: boolean
  }
  /** 分类筛选栏配置（轮播下方、文章列表上方的横向分类条） */
  categoryBar: {
    enabled: boolean
    maxCount: number
    showMore: boolean
  }
  /** 右侧侧栏配置 */
  sidebar: {
    enabled: boolean
    /** 组件渲染顺序，成员见 SidebarWidgetKey */
    order: SidebarWidgetKey[]
    profile: {
      enabled: boolean
      avatar: string
      name: string
      bio: string
      social: Array<{ label: string; url: string; icon: string }>
      greeting: string
    }
    announcement: {
      enabled: boolean
      text: string
      moreLabel: string
      moreTo: string
    }
    motto: {
      enabled: boolean
      mottos: Array<{ text: string; from: string }>
    }
    stats: {
      enabled: boolean
      siteStartDate: string
      showRunDays: boolean
      showPostCount: boolean
      showCategoryCount: boolean
      showTagCount: boolean
    }
    categories: {
      enabled: boolean
      maxCount: number
    }
    tags: {
      enabled: boolean
      maxCount: number
    }
    recent: {
      enabled: boolean
      count: number
      showThumb: boolean
    }
  }
}

/** 侧栏组件的可用键，与 sidebar.order 的合法成员一致 */
export type SidebarWidgetKey =
  | 'profile'
  | 'announcement'
  | 'motto'
  | 'stats'
  | 'categories'
  | 'tags'
  | 'recent'

export interface ArchivePageConfig {
  groupBy: 'year' | 'month'
  showCount: boolean
  order: 'desc' | 'asc'
}

export interface CategoriesPageConfig {
  layout: 'list' | 'grid'
}

export interface TagsPageConfig {
  cloudMinSize: 'sm' | 'md' | 'lg' | 'xl'
  cloudMaxSize: 'sm' | 'md' | 'lg' | 'xl'
}

export interface LinksPageConfig {
  columns: { mobile: number; tablet: number; desktop: number }
  showAvatar: boolean
  applyRules: string[]
  disclaimerOpen: boolean
  /** 本站「网站截图」字段指向的图片路径 */
  screenshot: string
  /** 友链申请议题表单的直达链接 */
  applyIssueUrl: string
  /** 信息卡默认展开的字段数，其余折进「更多本站字段」 */
  expandedFields: number
  showLegend: boolean
  randomVisit: boolean
}

export interface FcirclePageConfig {
  /** 每页卡片数量 */
  pageSize: number
  /** 展示层摘要截断长度（爬虫端已截 120，这里再截兜底） */
  excerptLength: number
  /** 桌面端（≥1280px）列数 */
  desktopColumns: number
  /** 搜索防抖毫秒数 */
  debounceMs: number
}

export interface PostPageConfig {
  showToc: boolean
  showPrevNext: boolean
  showRelated: boolean
  relatedCount: number
  showCopyButton: boolean
  showImageViewer: boolean
}

export interface ShuoshuoPageConfig {
  /** Ech0 实例地址（不带尾斜杠） */
  apiBase: string
  pageSize: number
  /** 卡片显示名称，空串回落到 site.author.name */
  displayName: string
  /** 卡片头像路径，空串回落到 site.author.avatar */
  avatar: string
  desktopColumns: number
  reactionsEnabled: boolean
  commentsEnabled: boolean
}

export interface PagesConfig {
  home: HomePageConfig
  archive: ArchivePageConfig
  categories: CategoriesPageConfig
  tags: TagsPageConfig
  links: LinksPageConfig
  fcircle: FcirclePageConfig
  post: PostPageConfig
  shuoshuo: ShuoshuoPageConfig
}

export function usePageConfig<K extends keyof PagesConfig>(key: K): PagesConfig[K] {
  const appConfig = useAppConfig()
  return (appConfig.pages as PagesConfig)[key]
}
