/**
 * 搜索索引 —— /api/search-index.json
 *
 * 提示词 §11.2：构建期预渲染成静态 JSON，客户端按需 fetch，服务端零搜索开销。
 *
 * 体积控制（要求 gzip 后 ≤ 300KB）的三个来源：
 *   1. text 只存「剥离标签后的纯文本」，不存 HTML——这是最容易被写成 500KB 的坑；
 *   2. stripCodeBlocks 打开时剔除代码块，代码是高熵文本，压缩率最差；
 *   3. 每篇正文截断到 MAX_TEXT_LENGTH，超出部分不进索引。
 *      博客文章真正被搜到的往往是标题/标签/前几段，尾部长尾的边际收益远低于体积成本。
 */
import { queryCollection } from '@nuxt/content/server'
import { bodyToPlainText } from '../../utils/content-render'
import { getServerSearchConfig } from '../../utils/site-config'

/**
 * queryCollection 的服务端签名收窄（原因见 server/utils/feed-data.ts 顶部注释）：
 * app 侧声明是 1 参，nitro 侧是 2 参，Nuxt 4 会同时检查两边。
 */
const queryCollectionServer = queryCollection as unknown as (event: unknown, collection: 'posts') => any

/** 单篇正文进索引的最大字符数。中文约 60 万字/篇的量级才会触发，正常文章不会截断。 */
const MAX_TEXT_LENGTH = 12000

interface SearchDoc {
  id: string
  title: string
  description: string
  tags: string[]
  category: string
  text: string
  path: string
  date: string
}

/** slug 取自 path 末段，作为 MiniSearch 主键（path 本身也保留，跳转用） */
function slugFromPath(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

/** date 统一成 ISO；无效值返回空串，由前端兜底排序 */
function toIsoDate(value: unknown): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

export default defineEventHandler(async (event) => {
  const searchConfig = getServerSearchConfig(event)

  if (!searchConfig.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Search is disabled' })
  }

  // draft 规则（提示词 §11.2）：默认过滤；只有 search.includeDrafts 且处于开发环境时才放行。
  // 生产环境即使把 includeDrafts 配成 true 也不放行——草稿不该随构建暴露给搜索引擎。
  const includeDrafts = searchConfig.includeDrafts && import.meta.dev

  let query = queryCollectionServer(event, 'posts')
  if (!includeDrafts) {
    query = query.where('draft', '=', false)
  }

  const rows = await query
    .order('date', 'DESC')
    .select('path', 'title', 'description', 'date', 'category', 'tags', 'body')
    .all()

  const docs: SearchDoc[] = (rows ?? []).map((row: any) => {
    const path = String(row.path ?? '')
    const text = bodyToPlainText(row.body, {
      stripCodeBlocks: searchConfig.index.stripCodeBlocks,
    }).slice(0, MAX_TEXT_LENGTH)

    return {
      id: slugFromPath(path),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      category: String(row.category ?? ''),
      text,
      path,
      date: toIsoDate(row.date),
    }
  })

  // 索引内容随文章变化，但文件名固定，因此用较短的缓存窗口让 CDN 及时刷新；
  // 构建期预渲染产物本身是静态文件，这个头只在回源时起作用。
  setResponseHeaders(event, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=300',
  })

  return docs
})
