/**
 * 给产物 HTML 补拉丁字体的 preload。
 *
 * ── 为什么需要这一步 ─────────────────────────────
 * 中文字体（LXGW WenKai Lite）的文件名是固定的，已在 nuxt.config 的 app.head 里 preload。
 * 但 Inter 与 JetBrains Mono 来自 @fontsource，经 Vite 处理后文件名带构建哈希：
 *
 *   inter-latin-wght-normal.Dx4kXJAl.woff2
 *   jetbrains-mono-latin-400-normal.V6pRDFza.woff2
 *
 * 配置阶段无法预知这个哈希，只能等产物落盘后按实际文件名注入。
 *
 * ── 为什么值得做（冷启动实测帧差）────────────────
 *   基线            [12.29, 11.54, 2.29, 3.85, 0]
 *   阻断 inter      [11.11, 0]            ← 跳变消失
 *   阻断 mono       [11.05, 2.53, 0]      ← 只剩 inter 那一次
 *   阻断全部字体    [11.54, 0, 3.52, 0]
 *
 * 即：中文字体靠 preload 已赶在首帧前到达，剩下的两次跳变全部来自这两个后到的拉丁字体。
 * 两者合计 69 KB，preload 成本远低于收益。
 *
 * 只取 latin 子集：latin-ext / cyrillic / greek 等首屏用不到，preload 反而抢带宽。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const NUXT_DIR = join(DIST, '_nuxt')

const PATTERNS = [
  /^inter-latin-wght-normal\.[\w-]+\.woff2$/,
  /^jetbrains-mono-latin-400-normal\.[\w-]+\.woff2$/,
]

const assets = await readdir(NUXT_DIR).catch(() => [])
const targets = PATTERNS.map((re) => assets.find((f) => re.test(f))).filter(Boolean)

if (!targets.length) {
  console.warn('[font-preload] 未在 dist/_nuxt 找到拉丁字体，跳过')
  process.exit(0)
}

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const files = await walk(DIST)
let patched = 0

for (const file of files) {
  const raw = await readFile(file, 'utf8')

  // 幂等：已经注入过就跳过（重复执行本脚本不应叠加标签）
  if (targets.every((f) => raw.includes(`/${f}"`))) continue

  const tags = targets
    .filter((f) => !raw.includes(`/${f}"`))
    .map((f) => `<link rel="preload" as="font" type="font/woff2" href="/_nuxt/${f}" crossorigin>`)
    .join('')

  await writeFile(file, raw.replace('</head>', `${tags}</head>`), 'utf8')
  patched++
}

console.log(`[font-preload] 注入 ${targets.length} 个拉丁字体 preload，覆盖 ${patched}/${files.length} 个 HTML`)
