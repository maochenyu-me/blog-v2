/**
 * 决定性实验：同一页面分别禁用/启用 JS，
 * 对比 .prose 与整体 DOM 的结构差异，定位 hydration 失配点。
 */
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://127.0.0.1:3201/posts/typography-over-color'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

/** 取指定选择器的规范化结构签名 */
const SIG = `(sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const sig = [];
  const walk = (n, depth) => {
    if (n.nodeType === 1) {
      const attrs = [...n.attributes]
        .filter(a => !a.name.startsWith('data-v-'))
        .map(a => a.name + '=' + a.value)
        .sort().join(' ');
      sig.push('  '.repeat(depth) + '<' + n.nodeName.toLowerCase() + ' ' + attrs + '>');
      for (const c of n.childNodes) walk(c, depth + 1);
    } else if (n.nodeType === 3) {
      const t = n.data.replace(/\\s+/g, ' ').trim();
      if (t) sig.push('  '.repeat(depth) + '#text ' + t.slice(0, 60));
    }
  };
  walk(root, 0);
  return sig;
}`

async function grab(jsEnabled, sel) {
  const page = await browser.newPage()
  await page.setJavaScriptEnabled(jsEnabled)
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(URL, { waitUntil: jsEnabled ? 'networkidle2' : 'domcontentloaded', timeout: 40000 })
  if (jsEnabled) await new Promise((r) => setTimeout(r, 2500))
  const out = await page.evaluate(`(${SIG})(${JSON.stringify(sel)})`)
  await page.close()
  return out || []
}

for (const sel of ['.post-meta', '.prose', '.toc-mobile']) {
  const a = await grab(false, sel)
  const b = await grab(true, sel)
  const same = JSON.stringify(a) === JSON.stringify(b)
  console.log(`\n=== ${sel} ===  SSR ${a.length} 行 / 水合后 ${b.length} 行  ${same ? '一致' : '★ 不一致'}`)
  if (!same) {
    const max = Math.max(a.length, b.length)
    let shown = 0
    for (let i = 0; i < max && shown < 12; i++) {
      if (a[i] !== b[i]) {
        console.log(`  [${i}] SSR : ${a[i] ?? '(无)'}`)
        console.log(`  [${i}] CLNT: ${b[i] ?? '(无)'}`)
        shown++
      }
    }
  }
}

await browser.close()
