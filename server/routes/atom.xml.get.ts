/**
 * Atom 1.0 —— /atom.xml
 * 与 RSS 共用 server/utils/feed-data.ts 的数据装配与转义逻辑，只在序列化格式上分叉。
 * 路由注册 / 404 兜底的取舍说明见 rss.xml.get.ts 顶部注释。
 */
import {
  buildAtomFeed,
  fetchFeedPosts,
} from '../utils/feed-data'
import { getServerFeedConfig, getServerSiteConfig } from '../utils/site-config'

export default defineEventHandler(async (event) => {
  const feedConfig = getServerFeedConfig(event)

  if (!feedConfig.atom.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Atom feed is disabled' })
  }

  const site = getServerSiteConfig(event)
  const posts = await fetchFeedPosts(event, feedConfig.limit)

  const xml = buildAtomFeed(
    {
      siteName: site.name,
      siteDescription: site.description,
      siteUrl: site.url,
      locale: site.locale,
      authorName: site.author.name,
      authorEmail: site.author.email,
    },
    posts,
    feedConfig.fullText,
  )

  setResponseHeaders(event, {
    'content-type': 'application/atom+xml; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  })

  return xml
})
