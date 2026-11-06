/**
 * 抽屉内图标实测：打开 375px 视口的抽屉，逐项读 mask-image / 颜色 / 尺寸。
 */
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] || 'http://127.0.0.1:3451'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

const page = await browser.newPage()
await page.setViewport({ width: 375, height: 812 })
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

await page.click('.drawer-trigger')
await new Promise((r) => setTimeout(r, 600))

const rows = await page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('.drawer .nav-tree__icon')) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const row = el.closest('.nav-tree__row') || el.parentElement
    out.push({
      row: (row?.textContent || '').trim().slice(0, 10),
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.x),
      mask: (cs.maskImage || cs.webkitMaskImage || 'none').slice(0, 40),
      color: cs.color,
      fs: cs.fontSize,
    })
  }
  return out
})

console.log('抽屉内图标数:', rows.length)
for (const r of rows) {
  const ok = r.mask !== 'none' && r.w > 0 && r.h > 0
  console.log(ok ? 'OK  ' : 'FAIL', JSON.stringify(r))
}

await page.screenshot({ path: '.audit/shots/drawer-icons-375.png' })
await browser.close()
