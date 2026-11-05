/**
 * RSS 2.0 —— /rss.xml
 *
 * 提示词 §10.4：nitro.prerender.routes 里已声明该路由，构建时产出纯静态文件，
 * Cloudflare Pages 托管下读者请求不会触发任何服务端计算。
 *
 * 关于 feed.rss.enabled === false「路由不注册」：
 *   Nuxt/Nitro 的路由表在构建期由文件系统扫描决定，运行时无法动态注销一条已生成的路由，
 *   要在文件层面不注册就只能靠一个在 nuxt.config 阶段读取 blog.config 的模块来条件化
 *   （Lead 的 feature-flag 模块计划）。在模块落地前，这里采用双重兜底：
 *     1. handler 顶部判断 enabled，直接 404；
 *     2. 404 时同时清空 prerender 产物——因为 nitro prerender 拿到 404 仍可能写出文件，
 *        所以配合 nuxt.config 的 prerender 配置（Lead 侧按配置裁剪 routes）才是完整方案。
 *   也就是说：模块上线后此处逻辑自动退化为「永远为 true」，不会冲突。
 */
import {
  buildRssFeed,
  fetchFeedPosts,
} from '../utils/feed-data'
import { getServerFeedConfig, getServerSiteConfig } from '../utils/site-config'

export default defineEventHandler(async (event) => {
  const feedConfig = getServerFeedConfig(event)

  if (!feedConfig.rss.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'RSS feed is disabled' })
  }

  const site = getServerSiteConfig(event)
  const posts = await fetchFeedPosts(event, feedConfig.limit)

  const xml = buildRssFeed(
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
    'content-type': 'application/rss+xml; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  })

  return xml
})
