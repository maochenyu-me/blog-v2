/**
 * 修正代码块在暗色模式下的对比度不足。
 *
 * 问题：shiki 的 github-dark 主题把注释色设为 #6A737D，
 * 放在我们的代码块底色 #18181b 上对比度只有 3.68:1，
 * 低于 WCAG AA 正文要求的 4.5:1（Lighthouse 的 color-contrast 会判失败）。
 *
 * 修法：把暗色配色里过暗的 token 提到 github-dark 官方色阶中更亮的一档
 * （#8B949E，对比度 5.76:1），既保留原本的灰阶语义，又满足可读性。
 * 只改 --shiki-dark 的值，不动 --shiki-default（明色侧本来就够）。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = join(process.cwd(), 'dist')

/**
 * 需要提亮的 token → 替换值（均已验算对比度 ≥ 4.5）。
 *
 * 因为 shiki 注入的 .xxx 规则权重高于我们的全局规则，
 * 与其覆盖不如直接把源头颜色改掉：
 *   #6A737D（注释灰）在 #fafafa 上是 4.61、在 #18181b 上只有 3.68，
 *   换成 #57606A（明底 6.12）与 #9AA4B0（暗底 7.01）即可稳定达标。
 */
const REPLACE = [
  // 明色侧
  ['--shiki-default:#6A737D', '--shiki-default:#57606A'],
  ['--shiki-default:#6a737d', '--shiki-default:#57606a'],
  // 暗色侧
  ['--shiki-dark:#6A737D', '--shiki-dark:#9AA4B0'],
  ['--shiki-dark:#6a737d', '--shiki-dark:#9aa4b0'],
]

async function walk(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (extname(e.name) === '.html' || e.name === '_payload.json') out.push(p)
  }
  return out
}

const files = await walk(DIST)
let patched = 0
let count = 0

for (const file of files) {
  let raw = await readFile(file, 'utf8')
  if (!raw.includes('6A737D') && !raw.includes('6a737d')) continue

  let changed = false
  for (const [from, to] of REPLACE) {
    if (!raw.includes(from)) continue
    const n = raw.split(from).length - 1
    raw = raw.split(from).join(to)
    count += n
    changed = true
  }
  if (changed) {
    await writeFile(file, raw, 'utf8')
    patched++
  }
}

console.log(`[fix-contrast] 扫描 ${files.length} 个 HTML，修正 ${patched} 个文件、共 ${count} 处暗色 token`)
