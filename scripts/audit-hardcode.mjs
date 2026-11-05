/**
 * 验收检查：硬编码审计（提示词 §16）
 * 检查 app/components 与 app/pages 下 .vue 文件中，
 * 模板/脚本区里直接出现的中文字符串（排除注释与 <style> 块）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DIRS = ['app/components', 'app/pages']
const CJK = /[\u4e00-\u9fa5]/

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.vue')) out.push(p)
  }
  return out
}

/** 去掉 HTML 注释、JS 行注释/块注释、<style> 整块 */
function strip(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const hits = []

for (const dir of DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const raw = readFileSync(file, 'utf8')
    const cleaned = strip(raw)
    cleaned.split('\n').forEach((line, i) => {
      if (!CJK.test(line)) return
      // 排除纯类型/接口里的中文（不太可能，但保险）
      hits.push({ file: relative(ROOT, file), line: i + 1, text: line.trim() })
    })
  }
}

if (hits.length === 0) {
  console.log('PASS: 0 处硬编码中文字符串')
} else {
  console.log(`FOUND ${hits.length} 处：`)
  for (const h of hits) console.log(`  ${h.file}:${h.line}  ${h.text}`)
}
process.exit(hits.length ? 1 : 0)
