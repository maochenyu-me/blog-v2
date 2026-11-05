import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://127.0.0.1:3201'

// 有代码块 vs 无代码块 的文章对比
const CASES = [
  ['含代码块', '/posts/typography-over-color'],
  ['含代码块', '/posts/xml-escaping-stress-test'],
  ['无代码块', '/posts/slow-writing'],
  ['无代码块', '/posts/stop-using-cards'],
  ['列表页', '/'],
  ['归档页', '/archive'],
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

for (const [label, path] of CASES) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const hits = []
  page.on('console', (m) => {
    if (/hydrat|mismatch/i.test(m.text())) hits.push(m.text())
  })
  await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 40000 })
  await new Promise((r) => setTimeout(r, 1800))
  console.log(
    `${label.padEnd(8)} ${path.padEnd(38)} ${hits.length ? '★ 失配 ' + hits.length : 'clean'}`,
  )
  await page.close()
}

await browser.close()
