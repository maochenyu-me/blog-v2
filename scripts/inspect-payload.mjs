import { readFileSync } from 'node:fs'

// 从构建产物反推：先看 useAsyncData 的 payload 里 body 长什么样
const h = readFileSync('dist/posts/stop-using-cards/index.html', 'utf8')

// Nuxt payload 通常是 <script type="application/json" id="__NUXT_DATA__">
const m = h.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
if (!m) {
  console.log('未找到 __NUXT_DATA__')
  process.exit(1)
}

const data = JSON.parse(m[1])
console.log('payload 顶层类型:', Array.isArray(data) ? `数组(${data.length})` : typeof data)

// 在 payload 里找包含 'shiki' 的元素，打印其上下文结构
function findShiki(node, path = '$', hits = [], depth = 0) {
  if (depth > 30 || hits.length > 3) return hits
  if (typeof node === 'string') {
    if (node.includes('html pre.shiki') || node.includes('--shiki-default')) {
      hits.push({ path, preview: node.slice(0, 100) })
    }
    return hits
  }
  if (Array.isArray(node)) {
    node.forEach((c, i) => findShiki(c, `${path}[${i}]`, hits, depth + 1))
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) findShiki(node[k], `${path}.${k}`, hits, depth + 1)
  }
  return hits
}

const hits = findShiki(data)
console.log('\n=== payload 中的 shiki 样式命中 ===')
if (!hits.length) console.log('(none)')
for (const x of hits) console.log(x.path, '→', JSON.stringify(x.preview))

// 再看 payload 里 body 用的表示法：找含 'p' / 'style' tag 的数组
function findBodyShape(node, path = '$', depth = 0, out = []) {
  if (depth > 20 || out.length > 2) return out
  if (Array.isArray(node) && node.length >= 2 && typeof node[0] === 'string' && /^[a-z][a-z0-9]*$/i.test(node[0])) {
    if (node[0] === 'p' || node[0] === 'style' || node[0] === 'pre') {
      out.push({ path, tag: node[0], shape: JSON.stringify(node).slice(0, 160) })
    }
  }
  if (Array.isArray(node)) node.forEach((c, i) => findBodyShape(c, `${path}[${i}]`, depth + 1, out))
  else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) findBodyShape(node[k], `${path}.${k}`, depth + 1, out)
  }
  return out
}

console.log('\n=== body 节点表示法样本 ===')
for (const x of findBodyShape(data)) console.log(x.path, `tag=${x.tag}`, x.shape)
