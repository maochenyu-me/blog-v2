/**
 * 友链朋友圈爬虫 —— 抓取 friend-links.json 里各友链 RSS 的近期文章。
 *
 * 用法：node scripts/crawl-fcircle.mjs
 * 输出：app/data/fcircle.json（内容无变化时不写入，避免空 commit）
 *
 * 设计约束：
 *   - 零依赖：手写 atom / rss2 / json feed 的字段提取
 *   - 单源失败不阻塞（每天跑，第二天会补上；全部失败才退出非零）
 *   - 只保留最近 180 天，每源上限 50 条
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const ROOT = process.cwd()
const LINKS_FILE = join(ROOT, 'app/data/friend-links.json')
const OUT_FILE = join(ROOT, 'app/data/fcircle.json')

const WINDOW_DAYS = 180
const PER_SOURCE_CAP = 50
const SUMMARY_MAX = 120
const FETCH_TIMEOUT_MS = 20_000
const UA = 'Mozilla/5.0 (compatible; kemiaosw-fcircle/1.0; +https://www.kemiaosw.top)'

const now = Date.now()
const windowStart = now - WINDOW_DAYS * 86_400_000

/** ── 文本处理 ─────────────────────────────────────────────── */

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** HTML → 纯文本摘要：去标签、实体解码、压空白、截断 */
function toSummary(html) {
  const text = decodeEntities(String(html ?? ''))
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX)}…` : text
}

/** 正文 HTML 里抠第一张图的地址 */
function firstImg(html) {
  const m = String(html ?? '').match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? decodeEntities(m[1]) : null
}

/** ── XML 字段提取（喂给友链场景够用，不追求完整 XML 语义） ── */

function stripCdata(raw) {
  const m = raw?.match(/<!\[CDATA\[([\s\S]*)\]\]>/)
  return (m ? m[1] : raw ?? '').trim()
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? stripCdata(m[1]) : ''
}

/** 取标签属性值，如 <enclosure url="…" /> → pickAttr(block, 'enclosure', 'url') */
function pickAttr(block, tag, attr) {
  const m = block.match(new RegExp(`<${tag}[^>]*?\\b${attr}=["']([^"']+)["']`, 'i'))
  return m ? decodeEntities(m[1]) : null
}

/** atom 的 link 是属性、rss 的 link 是文本，两套都试 */
function extractLink(block) {
  const rel = [...block.matchAll(/<link[^>]*>/gi)]
    .map((t) => t[0])
    .filter((t) => !/rel=["'](?:self|hub)/i.test(t))
  for (const tag of rel) {
    const href = pickAttr(tag, 'link', 'href')
    if (href) return href
  }
  const text = pick(block, 'link')
  return text || null
}

function extractDate(block) {
  for (const tag of ['published', 'pubDate', 'updated', 'dc:date']) {
    const v = pick(block, tag)
    if (v) {
      const t = Date.parse(v)
      if (!Number.isNaN(t)) return t
    }
  }
  return null
}

/** ── Feed 解析：json feed / atom / rss2 统一成 article ─────── */

function parseJsonFeed(raw, link) {
  const feed = JSON.parse(raw)
  const items = Array.isArray(feed.items) ? feed.items : []
  return items.map((it) => {
    const html = it.content_html || it.content_text || ''
    const t = Date.parse(it.date_published || it.date_modified || '')
    return {
      title: (it.title || '').trim() || '(无标题)',
      url: it.url || it.external_url || null,
      published: Number.isNaN(t) ? null : t,
      summary: toSummary(html),
      cover: it.image || it.banner_image || firstImg(html),
    }
  })
}

/** atom 的 enclosure 是 <link rel="enclosure" type="image/…" href="…">，rss2 才是 <enclosure url="…"> */
function extractEnclosure(block) {
  const linkM = block.match(/<link[^>]*rel=["']enclosure["'][^>]*>/i)
  if (linkM) {
    const href = pickAttr(linkM[0], 'link', 'href')
    const type = pickAttr(linkM[0], 'link', 'type') ?? ''
    if (href && (/^image\//i.test(type) || /\.(webp|png|jpe?g|gif|avif|svg)(\?|#|$)/i.test(href))) {
      return href
    }
  }
  const enc = pickAttr(block, 'enclosure', 'url')
  if (enc && (/^image\//i.test(pickAttr(block, 'enclosure', 'type') ?? '') || /\.(webp|png|jpe?g|gif|avif|svg)(\?|#|$)/i.test(enc))) {
    return enc
  }
  return null
}

function parseXmlFeed(raw) {
  const isAtom = /<feed[\s>]/i.test(raw)
  const itemRe = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi
  const blocks = raw.match(itemRe) ?? []

  return blocks.map((block) => {
    // feed 常把整段 HTML 实体转义后塞进 content（&lt;img src=&quot;…&quot;&gt;），
    // 抠首图前必须先还原，否则在转义串里找不到 <img
    const rawHtml = pick(block, 'content:encoded') || pick(block, 'content') || pick(block, 'description') || pick(block, 'summary')
    const decodedHtml = decodeEntities(rawHtml)
    const cover =
      extractEnclosure(block) ??
      pickAttr(block, 'media:content', 'url') ??
      pickAttr(block, 'media:thumbnail', 'url') ??
      firstImg(decodedHtml)
    return {
      title: decodeEntities(pick(block, 'title')).trim() || '(无标题)',
      url: extractLink(block),
      published: extractDate(block),
      summary: toSummary(rawHtml),
      cover,
    }
  })
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/json, application/xml, text/xml, */*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function fetchWithRetry(url) {
  try {
    return await fetchText(url)
  } catch (e) {
    await new Promise((r) => setTimeout(r, 3000))
    return fetchText(url)
  }
}

async function crawlOne(source) {
  const raw = await fetchWithRetry(source.rss)
  const trimmed = raw.trim()
  let items
  if (trimmed.startsWith('{')) {
    items = parseJsonFeed(trimmed, source.rss)
  } else {
    items = parseXmlFeed(trimmed)
  }

  const seen = new Set()
  const fresh = []
  for (const it of items) {
    if (!it.url || !it.published) continue
    if (it.published < windowStart || it.published > now + 86_400_000) continue
    if (seen.has(it.url)) continue
    seen.add(it.url)
    fresh.push(it)
    if (fresh.length >= PER_SOURCE_CAP) break
  }

  return {
    source: { name: source.name, url: source.url, avatar: source.avatar },
    articles: fresh.map((it) => ({
      id: createHash('sha1').update(it.url).digest('hex').slice(0, 16),
      title: it.title,
      url: it.url,
      author: source.name,
      avatar: source.avatar,
      home: source.url,
      published: new Date(it.published).toISOString(),
      summary: it.summary,
      cover: it.cover,
    })),
  }
}

/** ── 主流程 ───────────────────────────────────────────────── */

const links = JSON.parse(await readFile(LINKS_FILE, 'utf8'))
const sources = links.filter((l) => !l.lost && l.rss)

const settled = await Promise.allSettled(sources.map(crawlOne))
const ok = []
for (let i = 0; i < settled.length; i++) {
  const s = settled[i]
  if (s.status === 'fulfilled') {
    ok.push(s.value)
    console.log(`[ok] ${sources[i].name}: ${s.value.articles.length} 篇`)
  } else {
    console.warn(`[skip] ${sources[i].name}: ${s.value ?? ''}${s.reason?.message ?? s.reason}`)
  }
}

if (ok.length === 0 && sources.length > 0) {
  console.error('全部友链源抓取失败，保留旧数据不写入')
  process.exit(1)
}

const articles = ok
  .flatMap((r) => r.articles)
  .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))

const next = { generatedAt: new Date().toISOString(), articles }

// 内容 diff 忽略 generatedAt：RSS 没更新就不产生空 commit / 空部署
let changed = true
try {
  const prev = JSON.parse(await readFile(OUT_FILE, 'utf8'))
  changed = JSON.stringify(prev.articles) !== JSON.stringify(next.articles)
} catch {}

if (!changed) {
  console.log(`数据无变化（${articles.length} 篇），不写入`)
  process.exit(0)
}

await writeFile(OUT_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
console.log(`已写入 ${OUT_FILE}：${articles.length} 篇（${ok.length}/${sources.length} 源成功）`)
