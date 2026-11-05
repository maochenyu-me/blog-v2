import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://127.0.0.1:3201/posts/stop-using-cards'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

const SIG = `(sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const sig = [];
  const walk = (n, d) => {
    if (n.nodeType === 1) {
      const a = [...n.attributes].filter(x => !x.name.startsWith('data-v-'))
        .map(x => x.name + '=' + x.value).sort().join(' ');
      sig.push('  '.repeat(d) + '<' + n.nodeName.toLowerCase() + ' ' + a + '>');
      for (const c of n.childNodes) walk(c, d + 1);
    } else if (n.nodeType === 3) {
      const t = n.data.replace(/\\s+/g, ' ').trim();
      if (t) sig.push('  '.repeat(d) + '#text ' + t.slice(0, 70));
    }
  };
  walk(root, 0);
  return sig;
}`

async function grab(js, sel) {
  const p = await browser.newPage()
  await p.setJavaScriptEnabled(js)
  await p.setViewport({ width: 1440, height: 900 })
  await p.goto(URL, { waitUntil: js ? 'networkidle2' : 'domcontentloaded', timeout: 40000 })
  if (js) await new Promise((r) => setTimeout(r, 2200))
  const out = await p.evaluate(`(${SIG})(${JSON.stringify(sel)})`)
  await p.close()
  return out || []
}

// 逐个容器比对，定位到底哪个子树在两端不同
const SELECTORS = [
  '.post-head',
  '.post-meta',
  '.post-tags',
  '.toc-mobile',
  '.post-aside',
  '.comment-slot',
  '.post-nav',
  '.post-related',
  '.prose',
  'main',
]

for (const sel of SELECTORS) {
  const a = await grab(false, sel)
  const b = await grab(true, sel)
  const same = JSON.stringify(a) === JSON.stringify(b)
  console.log(`${sel.padEnd(16)} SSR ${String(a.length).padStart(4)} / HYDR ${String(b.length).padStart(4)}  ${same ? 'same' : '★ DIFF'}`)
  if (!same) {
    let shown = 0
    for (let i = 0; i < Math.max(a.length, b.length) && shown < 6; i++) {
      if (a[i] !== b[i]) {
        console.log(`    [${i}] SSR : ${a[i] ?? '(none)'}`)
        console.log(`    [${i}] HYDR: ${b[i] ?? '(none)'}`)
        shown++
      }
    }
  }
}

await browser.close()
