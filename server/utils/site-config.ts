/**
 * 服务端配置读取层。
 *
 * 为什么不在 route 里直接 useAppConfig()：
 *   1. app config 里的 url 可能带尾斜杠，feed 里要拼路径，必须先归一化；
 *   2. feed / search 两段配置在 4 个 route 里都要用，归一化与兜底只写一次；
 *   3. 缺字段时的默认值集中在此，避免每条 route 各写一遍魔法值。
 *
 * 读的是 app/app.config.ts 合并后的结果（= blog.config.ts + theme + pages），
 * 与前端 useBlogConfig() 同源，「改一处全站生效」在服务端同样成立。
 */

/**
 * useAppConfig 的入参类型与服务端调用的兼容层。
 *
 * 服务端（nitro 上下文）签名是 useAppConfig(event)，而 app 侧类型声明是 useAppConfig()（零参）。
 * Nuxt 4 的 tsconfig.app.json 会连带检查 server/ 下的文件；两种签名同时在场时，
 * 直接用 Parameters<typeof useAppConfig>[0] 会退化成「空 tuple 的第 0 项」而报 TS2493。
 * 这里用条件类型取出「第一个参数」，无参时收敛成宽松对象，使同一份代码在两个 project 下都过检查。
 */
type FirstParam<F> = F extends (first: infer A, ...rest: never[]) => unknown ? A : never
type ConfigEvent = [FirstParam<typeof useAppConfig>] extends [never]
  ? Record<string, unknown>
  : FirstParam<typeof useAppConfig>

/** 统一的 app config 读取入口，屏蔽上面说的签名差异 */
const readAppConfig = useAppConfig as unknown as (event?: ConfigEvent) => any

export interface ServerSiteConfig {
  name: string
  description: string
  /** 已去掉尾部斜杠，可直接拼 `${url}/posts/xxx` */
  url: string
  locale: string
  author: { name: string; email?: string }
}

export interface ServerFeedConfig {
  fullText: boolean
  limit: number
  rss: { enabled: boolean; path: string }
  atom: { enabled: boolean; path: string }
}

export interface ServerSearchConfig {
  enabled: boolean
  includeDrafts: boolean
  index: { path: string; stripCodeBlocks: boolean }
}

/** 去掉尾部斜杠，避免 "https://x/" + "/posts" 拼成双斜杠 */
export function normalizeSiteUrl(url: string): string {
  return (url || '').replace(/\/+$/, '')
}

export function getServerSiteConfig(event: ConfigEvent): ServerSiteConfig {
  const appConfig = readAppConfig(event)
  const site = appConfig?.site ?? {}

  return {
    name: site.name ?? '',
    description: site.description ?? '',
    url: normalizeSiteUrl(site.url ?? ''),
    locale: site.locale ?? 'zh-CN',
    author: {
      name: site.author?.name ?? '',
      email: site.author?.email || undefined,
    },
  }
}

export function getServerFeedConfig(event: ConfigEvent): ServerFeedConfig {
  const appConfig = readAppConfig(event)
  const feed = appConfig?.feed ?? {}

  return {
    fullText: feed.fullText === true,
    limit: Number(feed.limit) > 0 ? Number(feed.limit) : 20,
    rss: {
      enabled: feed.rss?.enabled !== false,
      path: feed.rss?.path || '/rss.xml',
    },
    atom: {
      enabled: feed.atom?.enabled !== false,
      path: feed.atom?.path || '/atom.xml',
    },
  }
}

export function getServerSearchConfig(event: ConfigEvent): ServerSearchConfig {
  const appConfig = readAppConfig(event)
  const search = appConfig?.search ?? {}

  return {
    enabled: search.enabled !== false,
    includeDrafts: search.includeDrafts === true,
    index: {
      path: search.index?.path || '/api/search-index.json',
      stripCodeBlocks: search.index?.stripCodeBlocks !== false,
    },
  }
}
