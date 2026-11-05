/**
 * 直接跑一遍 mdc 的解析链路，看 style 到底落进 body 的哪里。
 * 这是唯一能确定答案的方式，不再靠推断。
 */
import { readFileSync } from 'node:fs'

const file = 'dist/posts/stop-using-cards/index.html'
const h = readFileSync(file, 'utf8')

// 1. 该 style 是否在 __NUXT_DATA__ 里？
const m = h.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
const data = JSON.parse(m[1])

const flat = JSON.stringify(data)
console.log('payload 含 "html pre.shiki":', flat.includes('html pre.shiki'))
console.log('payload 含 "--shiki-default":', flat.includes('--shiki-default'))
console.log('payload 含 "sScJk":', flat.includes('sScJk'))

// 2. 该 style 在 HTML 中的确切位置（是否在 main 内）
const mainStart = h.indexOf('<main')
const mainEnd = h.indexOf('</main>')
const stylePos = h.indexOf('html pre.shiki code')
console.log('\nstyle 位置:', stylePos, ' main:', mainStart, '-', mainEnd)

// 3. 它前面紧邻的字符
console.log('前 60 字符:', JSON.stringify(h.slice(stylePos - 60, stylePos)))
console.log('后 60 字符:', JSON.stringify(h.slice(stylePos, stylePos + 60)))

// 4. 是否有多个 style
const allStyle = [...h.matchAll(/<style>/g)].map((x) => x.index)
console.log('\n<style> 总数:', allStyle.length)
console.log('其中 shiki 相关:', allStyle.filter((i) => h.slice(i, i + 200).includes('shiki')).length)

// 5. nuxt payload 里 body 的键名
function findKeys(node, depth = 0, acc = new Set()) {
  if (depth > 8 || !node) return acc
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const k of Object.keys(node)) {
      if (['body', 'data', 'value', 'toc', 'title'].includes(k)) acc.add(k)
      findKeys(node[k], depth + 1, acc)
    }
  } else if (Array.isArray(node)) {
    for (const c of node) findKeys(c, depth + 1, acc)
  }
  return acc
}
console.log('\npayload 中出现的关键键:', [...findKeys(data)].join(', '))
