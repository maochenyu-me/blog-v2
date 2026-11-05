/**
 * 用 SSR 原始 HTML vs 水合后 DOM 直接做文本 diff，
 * 找出到底是哪一段文本/结构在两端不一致。
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2] || 'dist/posts/typography-over-color/index.html'
const html = readFileSync(file, 'utf8')

// 提取 <main> 内部，粗略去掉属性，只留标签名与文本
const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)
if (!mainMatch) {
  console.log('未找到 <main>')
  process.exit(1)
}

const body = mainMatch[1]
  // 去掉 payload script
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '')

// 统计结构性元素
const counts = {}
for (const tag of ['h1', 'h2', 'h3', 'p', 'pre', 'code', 'li', 'table', 'img', 'blockquote', 'details', 'summary']) {
  counts[tag] = (body.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length
}
console.log('=== SSR HTML 结构统计 ===')
console.log(JSON.stringify(counts, null, 1))

// 关键文本
const texts = {
  readingTime: /(\d+)\s*分钟/.exec(body)?.[0] ?? null,
  updated: /更新于[^<]*/.exec(body)?.[0] ?? null,
  tocLabel: /class="toc-label"[^>]*>([^<]*)/.exec(body)?.[1] ?? null,
  commentNote: /class="comment-note"[^>]*>([^<]*)/.exec(body)?.[1] ?? null,
  prevDir: /class="nav-dir"[^>]*>([^<]*)/.exec(body)?.[1] ?? null,
}
console.log('\n=== SSR 关键文本 ===')
console.log(JSON.stringify(texts, null, 1))

// 是否含 details[open] 之类会因客户端改变结构的属性
console.log('\n=== details 元素原文 ===')
const d = body.match(/<details[^>]*>/g) || []
console.log(d.join('\n') || '(none)')
