#!/usr/bin/env node
/**
 * 将 friend-links.json 转换为 Friend-Circle-Lite 兼容的 friends JSON。
 * 用法：node scripts/build-fcircle.mjs
 * 输出：public/fcircle.json
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_FILE = resolve(ROOT, 'app/data/friend-links.json')
const OUTPUT_FILE = resolve(ROOT, 'public/fcircle.json')

function requiredString(value, field, index) {
  const result = String(value ?? '').trim()
  if (!result) throw new Error(`第 ${index + 1} 条友链缺少 ${field}`)
  return result
}

const links = JSON.parse(await readFile(INPUT_FILE, 'utf8'))
if (!Array.isArray(links)) throw new Error('friend-links.json 必须是数组')

const friends = links
  .filter((link) => !link.lost)
  .map((link, index) => [
    requiredString(link.name, 'name', index),
    requiredString(link.url, 'url', index),
    String(link.friendPage ?? '').trim() || null,
    requiredString(link.avatar, 'avatar', index),
  ])

const output = `${JSON.stringify({ friends }, null, 2)}\n`
let previous = null
try {
  previous = await readFile(OUTPUT_FILE, 'utf8')
} catch {}

if (previous === output) {
  console.log(`fcircle.json 未变化：${friends.length} 条友链`)
  process.exit(0)
}

await writeFile(OUTPUT_FILE, output, 'utf8')
console.log(`已生成 public/fcircle.json：${friends.length} 条友链`)
