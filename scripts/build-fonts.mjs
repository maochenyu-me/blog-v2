/**
 * 生成中文字体子集。
 *
 * 采集 content/ + app/ 的真实用字 → 交给 font-subset.py 合并 97 个分片 → 输出 public/fonts/。
 *
 * 产物（public/fonts/*.woff2 + coverage.json）需要提交进仓库：
 * CF Pages 构建机没有 python + fonttools，部署时只做文件复制。
 *
 * 依赖 python3 + fonttools + brotli：
 *   pip install fonttools brotli
 *
 * 用法：pnpm fonts
 */
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

const exts = ['.md', '.mdc', '.vue', '.ts', '.json']
const roots = ['content', 'app']
const CJK = /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u2010-\u2027\u00b7]/

const chars = new Set()

async function walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      await walk(p)
      continue
    }
    if (!exts.includes(p.slice(p.lastIndexOf('.')))) continue
    for (const ch of await readFile(p, 'utf8')) {
      if (CJK.test(ch)) chars.add(ch)
    }
  }
}

for (const r of roots) await walk(r)
for (const ch of '0123456789:·—…、。，！？；：（）《》「」【】') chars.add(ch)

await mkdir('.data', { recursive: true })
await writeFile('.data/font-charset.txt', [...chars].sort().join(''), 'utf8')
console.log(`采集到 ${chars.size} 个字符 → .data/font-charset.txt`)

// python 探测：优先 PYTHON 环境变量，再退 python3（Linux/CI）/python（Windows）
let python = process.env.PYTHON || null
if (!python) {
  for (const candidate of ['python3', 'python']) {
    try {
      await exec(candidate, ['--version'])
      python = candidate
      break
    } catch {}
  }
}
if (!python) {
  console.error('找不到 python3/python，请用 PYTHON 环境变量指定（需已安装 fonttools + brotli）')
  process.exit(1)
}
try {
  const { stdout } = await exec(python, ['scripts/font-subset.py', '.data/font-charset.txt', 'public/fonts'], {
    maxBuffer: 8 * 1024 * 1024,
  })
  process.stdout.write(stdout)
} catch (err) {
  console.error('字体子集化失败：', err.message)
  if (err.stdout) process.stdout.write(err.stdout)
  console.error('请确认已安装：pip install fonttools brotli')
  process.exit(1)
}
