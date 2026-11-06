/**
 * 图标渲染实测：@nuxt/icon 在 css 模式下不是字体字形，而是
 * mask-image + background-color: currentColor。
 * 因此判断"图标是否显示"必须看 mask-image / -webkit-mask-image，
 * 不能看 content 或 fontFamily（那两条在 mask 模式下永远是 normal / 正文衬线）。
 *
 * 用法：node scripts/check-icons.mjs http://127.0.0.1:3451
 */
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] || 'http://127.0.0.1:3451'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--proxy-server=direct://',
    '--proxy-bypass-list=*',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 })

const report = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.iconify, [class*="i-tabler"]')]
  return els.map((el) => {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    // 隐藏的图标（例如 ≥1024px 时 display:none 的抽屉触发按钮）不该被算作失败，
    // 否则桌面视口下检查结果永远差一项。
    const hidden = cs.display === 'none' || el.offsetParent === null
    return {
      cls: el.className,
      hidden,
      maskImage: (cs.maskImage || cs.webkitMaskImage || 'none').slice(0, 90),
      w: Math.round(r.width),
      h: Math.round(r.height),
    }
  })
})

const visible = report.filter((it) => !it.hidden)
console.log('图标元素总数:', report.length, '（可见', visible.length, '，当前断点隐藏', report.length - visible.length, '）')
let good = 0
for (const it of visible) {
  const hasMask = it.maskImage !== 'none' && it.maskImage.length > 10
  if (hasMask && it.w > 0 && it.h > 0) good++
  console.log(
    hasMask && it.w > 0 && it.h > 0 ? 'OK  ' : 'FAIL',
    `w=${it.w} h=${it.h}`,
    `mask=${hasMask ? 'yes' : 'none'}`,
    it.cls,
  )
}
console.log(`\n可渲染 ${good} / ${visible.length}`)

await browser.close()
process.exit(good === visible.length && visible.length > 0 ? 0 : 1)
