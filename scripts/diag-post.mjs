import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const pending = new Map()
page.on('request', (r) => pending.set(r.url(), Date.now()))
page.on('requestfinished', (r) => pending.delete(r.url()))
page.on('requestfailed', (r) => pending.delete(r.url()))

try {
  await page.goto('http://localhost:3100/posts/typography-over-color', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  })
} catch (e) {
  console.log('goto err', e.message)
}

await new Promise((r) => setTimeout(r, 5000))
console.log('5s 后仍未完成的请求数:', pending.size)
let i = 0
for (const [url, t] of pending) {
  if (i++ >= 15) break
  console.log(`  ${Date.now() - t}ms  ${url.slice(0, 110)}`)
}

const fonts = await page.evaluate(() => ({
  loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
  total: document.fonts.size,
})).catch((e) => ({ err: String(e) }))
console.log('字体:', JSON.stringify(fonts).slice(0, 300))

await browser.close()
