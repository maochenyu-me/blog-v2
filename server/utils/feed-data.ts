/**
 * Feed 数据装配：查库 → 过滤 → 渲染 → 生成 RSS 2.0 / Atom 1.0 字符串。
 *
 * 两条 feed 共用这一份实现，差异只在最终序列化格式。
 * 提示词 §10.2 的四条硬要求都在这里落地：
 *   - draft 过滤 + date DESC + feed.limit
 *   - fullText 时输出渲染后 HTML 全文（renderBodyToHtml），不是 markdown 源码
 *   - 相对链接用 site.url 绝对化
 *   - 所有动态文本做 XML 转义
 */

import { queryCollection } from '@nuxt/content/server'
import { renderBodyToHtml } from './content-render'
import type { MinimarkBody } from './content-render'

/**
 * queryCollection 的服务端签名收窄。
 *
 * @nuxt/content 的 auto-import 在 app 与 nitro 两个 tsconfig project 下解析到不同声明：
 *   - 客户端：queryCollection(collection) —— 只有 1 个参数
 *   - 服务端：queryCollection(event, collection)
 * Nuxt 4 的 tsconfig.app.json 会连带检查 server/，两种声明同时在场时直接调用会报
 * "Expected 1 arguments, but got 2"。这里统一按服务端签名声明，只在本文件里用。
 *
 * 注意：这里是静态 import 而不是依赖 auto-import —— server/utils 下的模块
 * 在 nitro 构建中先于 auto-import 注入被求值，用裸标识符会在模块初始化时抛
 * "queryCollection is not defined"。
 */
type QueryCollectionServer = (event: unknown, collection: 'posts') => any
const queryCollectionServer = queryCollection as unknown as QueryCollectionServer

export interface FeedPost {
  path: string
  title: string
  description: string
  date: string
  body?: MinimarkBody
}

/**
 * XML 转义。
 * 注意控制字符：XML 1.0 合法字符集不含 0x00–0x08、0x0B、0x0C、0x0E–0x1F，
 * 这些字符即使转义也无法被解析器接受，必须直接剔除，否则整份 feed 报废。
 */
export function escapeXml(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 把文本包进 CDATA。
 * 只用于确定是 HTML 的正文——正文里本来就可能含 `<`、`&`，
 * 逐字符转义会把 HTML 变成不可读的实体串，阅读器显示反而更差。
 * CDATA 里唯一的坑是内容本身含 `]]>`，按 XML 规范拆成 `]]]]><![CDATA[>`。
 */
function wrapCdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/** RFC 822（RSS 2.0 的 pubDate 标准格式）：Tue, 28 Oct 2025 00:00:00 GMT */
export function toRfc822(date: string | Date): string {
  return toValidDate(date).toUTCString()
}

/** RFC 3339 / ISO 8601（Atom 的 updated 标准格式）：2025-10-28T00:00:00.000Z */
export function toRfc3339(date: string | Date): string {
  return toValidDate(date).toISOString()
}

function toValidDate(date: string | Date): Date {
  const d = date instanceof Date ? date : new Date(date)
  // 脏数据兜底：无效日期用 epoch，而不是让整份 feed 抛错
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

/** 站内文章路径 → 绝对 URL */
function postUrl(siteUrl: string, path: string): string {
  return siteUrl + (path.startsWith('/') ? path : `/${path}`)
}

/** 正文渲染成 HTML 全文，并把相对链接绝对化 */
function renderFullText(post: FeedPost, siteUrl: string): string {
  return renderBodyToHtml(post.body, { baseUrl: siteUrl })
}

export interface FeedContext {
  siteName: string
  siteDescription: string
  siteUrl: string
  locale: string
  authorName: string
  authorEmail?: string
}

/**
 * RSS 2.0。
 * 顶层 lastBuildDate 取最新文章的 date（而不是 new Date()），
 * 这样同一批内容重复构建的产物是字节级稳定的，对 CDN/ETag 友好。
 * guid 用 isPermaLink="true"：path 是稳定的站内路径，比标题更适合订阅者去重。
 */
export function buildRssFeed(ctx: FeedContext, posts: FeedPost[], fullText: boolean): string {
  const now = posts[0] ? toRfc822(posts[0].date) : toRfc822(new Date())

  const items = posts.map((post) => {
    const link = postUrl(ctx.siteUrl, post.path)
    const content = fullText
      ? wrapCdata(renderFullText(post, ctx.siteUrl))
      : escapeXml(post.description)

    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${toRfc822(post.date)}</pubDate>`,
      `      <description>${content}</description>`,
      `      <author>${escapeXml(ctx.authorEmail ?? '')} (${escapeXml(ctx.authorName)})</author>`,
      '    </item>',
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(ctx.siteName)}</title>`,
    `    <link>${escapeXml(ctx.siteUrl)}</link>`,
    `    <description>${escapeXml(ctx.siteDescription)}</description>`,
    `    <language>${escapeXml(ctx.locale)}</language>`,
    `    <lastBuildDate>${now}</lastBuildDate>`,
    '    <generator>Nuxt Content</generator>',
    `    <atom:link href="${escapeXml(ctx.siteUrl + '/rss.xml')}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

/**
 * Atom 1.0。
 * 差异点：entry 必须有 updated；id 用 absolute URL（永久标识）；
 * content 用 type="html" + CDATA；summary 保留 description 便于列表预览。
 */
export function buildAtomFeed(ctx: FeedContext, posts: FeedPost[], fullText: boolean): string {
  const updated = posts[0] ? toRfc3339(posts[0].date) : toRfc3339(new Date())

  const entries = posts.map((post) => {
    const link = postUrl(ctx.siteUrl, post.path)
    const content = fullText
      ? `<content type="html">${wrapCdata(renderFullText(post, ctx.siteUrl))}</content>`
      : `<content type="html">${escapeXml(post.description)}</content>`

    return [
      '  <entry>',
      `    <title>${escapeXml(post.title)}</title>`,
      `    <link href="${escapeXml(link)}" />`,
      `    <id>${escapeXml(link)}</id>`,
      `    <updated>${toRfc3339(post.date)}</updated>`,
      `    <published>${toRfc3339(post.date)}</published>`,
      `    <summary>${escapeXml(post.description)}</summary>`,
      `    ${content}`,
      '  </entry>',
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(ctx.locale)}">`,
    `  <id>${escapeXml(ctx.siteUrl + '/')}</id>`,
    `  <title>${escapeXml(ctx.siteName)}</title>`,
    `  <subtitle>${escapeXml(ctx.siteDescription)}</subtitle>`,
    `  <updated>${updated}</updated>`,
    `  <link href="${escapeXml(ctx.siteUrl + '/atom.xml')}" rel="self" type="application/atom+xml" />`,
    `  <link href="${escapeXml(ctx.siteUrl)}" rel="alternate" type="text/html" />`,
    '  <author>',
    `    <name>${escapeXml(ctx.authorName)}</name>`,
    ...(ctx.authorEmail ? [`    <email>${escapeXml(ctx.authorEmail)}</email>`] : []),
    '  </author>',
    '  <generator uri="https://content.nuxt.com" version="3">Nuxt Content</generator>',
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}

/**
 * 查 posts collection：过滤 draft、按 date DESC、取 limit 篇。
 *
 * 排序：date 在库里存成 DATE 字符串（YYYY-MM-DD），字典序即时间序；
 * 同日多篇再用 path 兜底，保证 feed 输出稳定不抖动——订阅端最恨每次构建顺序都变。
 */
export async function fetchFeedPosts(
  event: unknown,
  limit: number,
): Promise<FeedPost[]> {
  const rows = await queryCollectionServer(event, 'posts')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .order('path', 'ASC')
    .limit(limit)
    .select('path', 'title', 'description', 'date', 'body')
    .all()

  return (rows ?? []).map((row: any) => ({
    path: String(row.path ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    date: String(row.date ?? ''),
    body: row.body,
  }))
}
