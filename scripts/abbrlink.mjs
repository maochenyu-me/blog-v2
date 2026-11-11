/**
 * abbrlink —— 为文章生成永久短链接（参考 ohroy/hexo-abbrlink 的思路）。
 *
 * 规则：
 *   1. frontmatter 已有 abbrlink 的文章**永不重算**（改标题/正文链接不变）
 *   2. 缺失的用 crc32-hex（8 位，零填充）对 `${title}|${date}` 计算，写回 frontmatter
 *   3. 碰撞时加盐重算，结果同样一次性固化
 *   4. 顺带产出两份兼容产物：
 *      - public/_redirects  Cloudflare Pages 301（旧文件名 slug → /posts/<abbrlink>）
 *      - app/utils/abbrlink-map.generated.ts  站内兜底映射（dev / SPA 导航用）
 *
 * 幂等：重复执行不产生任何变更。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const POSTS_DIR = join(ROOT, 'content', 'posts')
const REDIRECTS = join(ROOT, 'public', '_redirects')
const MAP_TS = join(ROOT, 'app', 'utils', 'abbrlink-map.generated.ts')

/* ---------- crc32（IEEE，无依赖） ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32Hex(str) {
  let c = 0xffffffff
  for (let i = 0; i < str.length; i++) c = CRC_TABLE[(c ^ str.charCodeAt(i)) & 0xff] ^ (c >>> 8)
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

/* ---------- frontmatter 简易解析（只取本脚本关心的字段，不引 YAML 依赖） ---------- */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return null
  return { raw: m[1], end: m.index + m[0].length }
}

function getField(raw, key) {
  const m = raw.match(new RegExp(`^${key}:[ \\t]*([^\\n]*)$`, 'm'))
  if (!m) return undefined
  return m[1].trim().replace(/^['"]|['"]$/g, '')
}

/* ---------- 主流程 ---------- */
const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
const usedIds = new Map() // abbrlink → filename，防碰撞
const posts = [] // { filename, slug, abbrlink, changed }

for (const filename of files) {
  const full = join(POSTS_DIR, filename)
  const text = readFileSync(full, 'utf8')
  const fm = parseFrontmatter(text)
  if (!fm) {
    console.warn(`SKIP（无 frontmatter）: ${filename}`)
    continue
  }

  const slug = filename.replace(/\.md$/, '')
  const existing = getField(fm.raw, 'abbrlink')
  let abbrlink = existing && /^[0-9a-f]{8}$/.test(existing) ? existing : null

  if (!abbrlink) {
    const title = getField(fm.raw, 'title') ?? slug
    const date = getField(fm.raw, 'date') ?? ''
    let salt = 0
    do {
      abbrlink = crc32Hex(`${title}|${date}${salt ? `|${salt}` : ''}`)
      salt++
    } while (usedIds.has(abbrlink))
    console.log(`ASSIGN ${filename} → ${abbrlink}`)
  }

  if (usedIds.has(abbrlink) && usedIds.get(abbrlink) !== filename) {
    throw new Error(`abbrlink 冲突：${filename} 与 ${usedIds.get(abbrlink)} 同为 ${abbrlink}`)
  }
  usedIds.set(abbrlink, filename)

  let changed = false
  if (!existing) {
    // 写回：插在 date 行之后（语义相邻）；没有 date 行就放 frontmatter 末尾
    const dateLine = fm.raw.match(/^date:[^\n]*$/m)
    const insertAfter = dateLine ? dateLine[0] : null
    const nextRaw = insertAfter
      ? fm.raw.replace(dateLine[0], `${dateLine[0]}\nabbrlink: ${abbrlink}`)
      : `${fm.raw}\nabbrlink: ${abbrlink}`
    writeFileSync(
      full,
      text.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${nextRaw}\n---`),
      'utf8',
    )
    changed = true
  }

  posts.push({ filename, slug, abbrlink, changed })
}

const assigned = posts.filter((p) => p.changed)
console.log(`abbrlink: ${posts.length} 篇，本次新写入 ${assigned.length} 篇`)

/* ---------- public/_redirects（Cloudflare Pages 301） ---------- */
const MARK_START = '# abbrlink:start'
const MARK_END = '# abbrlink:end'
const block = [
  MARK_START,
  '# 由 scripts/abbrlink.mjs 自动生成 —— 旧文件名 slug → /posts/<abbrlink>，勿手改',
  ...posts.flatMap((p) =>
    p.slug === p.abbrlink
      ? []
      : [
          `/posts/${p.slug} /posts/${p.abbrlink} 301`,
          `/posts/${p.slug}/ /posts/${p.abbrlink} 301`,
        ],
  ),
  MARK_END,
].join('\n')

let out = existsSync(REDIRECTS) ? readFileSync(REDIRECTS, 'utf8') : '# Cloudflare Pages redirects\n'
if (out.includes(MARK_START)) {
  out = out.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`), block)
} else {
  out = `${out.trimEnd()}\n\n${block}\n`
}
writeFileSync(REDIRECTS, out, 'utf8')

/* ---------- app/utils/abbrlink-map.generated.ts（站内兜底） ---------- */
const entries = posts
  .filter((p) => p.slug !== p.abbrlink)
  .map((p) => `  '${p.slug}': '${p.abbrlink}',`)
writeFileSync(
  MAP_TS,
  `/**
 * 自动生成，勿手改。唯一来源：scripts/abbrlink.mjs
 * 旧文件名 slug → /posts/<abbrlink>，供文章页做旧链接兜底跳转。
 */
export const LEGACY_POST_SLUGS: Record<string, string> = {
${entries.join('\n')}
}
`,
  'utf8',
)

console.log(`_redirects + abbrlink-map.generated.ts 已更新（${entries.length} 条映射）`)
