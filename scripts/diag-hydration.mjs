/**
 * 精确定位 hydration 失配节点。
 * Vue 的 mismatch 警告会把出问题的 vnode 作为 JSHandle 传进 console，
 * 这里把它序列化成可读的节点 + 属性 + 文本，直接看到是哪个元素。
 */
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:3100'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const found = []

page.on('console', async (m) => {
  const t = m.text()
  if (!/hydrat|mismatch/i.test(t)) return

  const detail = { text: t.slice(0, 200), args: [] }
  for (const arg of m.args()) {
    try {
      const v = await arg.evaluate((x) => {
        if (x && x.nodeType === 1) {
          return (
            `<${x.nodeName.toLowerCase()} class="${x.className}"> ` +
            `text="${(x.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)}"`
          )
        }
        if (x && x.nodeType === 3) return `#text "${x.data.slice(0, 80)}"`
        if (x && typeof x === 'object') {
          try { return JSON.stringify(x).slice(0, 300) } catch { return '[object]' }
        }
        return String(x).slice(0, 200)
      })
      if (v) detail.args.push(v)
    } catch {}
  }
  found.push(detail)
})

await page.goto(BASE + '/posts/typography-over-color', { waitUntil: 'networkidle2', timeout: 40000 })
await new Promise((r) => setTimeout(r, 3000))

console.log('=== 失配记录 ===')
if (!found.length) console.log('(none)')
for (const f of found) {
  console.log('-', f.text)
  for (const a of f.args) console.log('    ', a)
}

// 对比：SSR 出来的 HTML 与客户端最终 DOM 的关键区域
const snapshot = await page.evaluate(() => {
  const parts = {}
  const grab = (name, sel) => {
    const el = document.querySelector(sel)
    parts[name] = el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null
  }
  grab('postMeta', '.post-meta')
  grab('toc', '.toc-label')
  grab('comment', '.comment-note')
  return parts
})
console.log('\n=== 客户端渲染结果 ===')
console.log(JSON.stringify(snapshot, null, 1))

await browser.close()
