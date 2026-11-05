/**
 * 页面级配置的类型安全访问层。
 */

export interface HomePageConfig {
  pinnedCount: number
  latestCount: number
  showExcerpt: boolean
  cta: { label: string; to: string }
}

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
}

export interface AboutPageConfig {
  blocks: readonly string[]
  timeline: Array<{ year: number; title: string; detail?: string }>
}

export interface PostPageConfig {
  showToc: boolean
  showPrevNext: boolean
  showRelated: boolean
  relatedCount: number
  showCopyButton: boolean
  showImageViewer: boolean
}

export interface PagesConfig {
  home: HomePageConfig
  archive: ArchivePageConfig
  categories: CategoriesPageConfig
  tags: TagsPageConfig
  links: LinksPageConfig
  about: AboutPageConfig
  post: PostPageConfig
}

export function usePageConfig<K extends keyof PagesConfig>(key: K): PagesConfig[K] {
  const appConfig = useAppConfig()
  return (appConfig.pages as PagesConfig)[key]
}
