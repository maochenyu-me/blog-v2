import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:3200'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const logs = []
const failed = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => failed.push(`${r.url()} :: ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`HTTP ${r.status()} ${r.url()}`)
})

for (const path of ['/posts/typography-over-color', '/no-such-page']) {
  logs.length = 0
  failed.length = 0
  await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 1500))

  console.log(`\n${'='.repeat(70)}\n${path}`)
  console.log('--- 失败请求 ---')
  console.log([...new Set(failed)].slice(0, 8).join('\n') || '(none)')
  console.log('--- 控制台 ---')
  console.log([...new Set(logs)].slice(0, 12).join('\n') || '(none)')

  // 检查 :focus-visible 是否真的存在（递归进入 @layer）
  const focusInfo = await page.evaluate(() => {
    const found = []
    const walk = (rules, depth) => {
      for (const r of rules) {
        if (r.selectorText && r.selectorText.includes('focus-visible')) {
          found.push(r.cssText.slice(0, 120))
        }
        if (r.cssRules) walk(r.cssRules, depth + 1)
      }
    }
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules, 0)
      } catch {
        found.push('CORS-BLOCKED: ' + sheet.href)
      }
    }
    return { count: found.length, sample: found.slice(0, 3), sheets: document.styleSheets.length }
  })
  console.log('--- :focus-visible ---')
  console.log(JSON.stringify(focusInfo).slice(0, 500))

  // 内容宽度：区分 prose 与 grid
  const widths = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      return el ? Math.round(el.getBoundingClientRect().width) : null
    }
    return {
      prose: pick('.prose'),
      postShell: pick('.post-shell'),
      container: pick('.container'),
    }
  })
  console.log('--- 宽度 ---', JSON.stringify(widths))
}

await browser.close()
