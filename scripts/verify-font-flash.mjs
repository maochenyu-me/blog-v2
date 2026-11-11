/**
 * 字体闪烁回归检测。
 *
 * 用 CDP 逐帧录屏 + 帧间像素差，量化「刷新页面时字形是否整页跳变」。
 * 帧差峰值 > 0.3 即判失败 —— 实测噪声地板在 0.01~0.11，肉眼可见的整页字形
 * 替换是 2.2~4.8，阈值取中间留足余量。
 *
 * 为什么需要它：这个 bug 修好后不会自然保持。任何人改动 fonts.css、
 * 换回 fontsource 分片、或删掉 preload，闪烁都会悄悄回来，而肉眼在快机器上
 * 未必看得出来。必须有量化门禁。
 *
 * 用法：
 *   pnpm build && npx serve dist -l 4173
 *   node scripts/verify-font-flash.mjs [baseUrl]
 *
 * 退出码 1 表示检测到闪烁。
 */
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'

const BASE = process.argv[2] || 'http://localhost:4173'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

/** 帧差阈值：噪声 ≤0.11，真实闪烁 ≥2.2 */
const THRESHOLD = 0.3

const ROUTES = ['/', '/posts/cac47918', '/archive', '/about', '/links', '/categories', '/tags']
const THEMES = ['light', 'dark']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 静态校验：在放量测之前先确认字体声明本身没退化。
 *
 * 为什么需要：逐帧回归只能测「刷新」（字体已缓存），测不出首次访问的
 * font-display 行为 —— 而把 optional 改回 swap 恰恰只在首次访问暴露。
 * 实测 swap 在 3G 下会在 9.4s 整页换字形，肉眼极难受，但刷新场景完全正常，
 * 回归脚本永远抓不到。所以这一层必须靠读 CSS 本身来守。
 */
async function staticCheck() {
  const problems = []
  const html = await (await fetch(BASE + '/')).text()

  const cssPath = html.match(/\/_nuxt\/entry[^"']*\.css/)?.[0]
  if (!cssPath) problems.push('首页找不到 entry CSS 引用')
  else {
    const css = await (await fetch(BASE + cssPath)).text()
    // LXGW 的两个 face 必须是 optional（swap / fallback 都会在弱网晚换字形）
    const lxgwBlocks = [...css.matchAll(/@font-face\{[^}]*LXGW[^}]*\}/g)].map((m) => m[0])
    if (!lxgwBlocks.length) problems.push('entry CSS 里没有找到 LXGW 的 @font-face')
    for (const block of lxgwBlocks) {
      if (!block.includes('font-display:optional')) {
        const w = block.match(/font-weight:(\d+)/)?.[1] ?? '?'
        problems.push(`LXGW 字重 ${w} 的 font-display 不是 optional（弱网会晚换字形）`)
      }
    }
    // 回退栈里必须有楷体，否则「放弃换字」等于丢掉手写体身份
    if (!/font-sans:[^;]*KaiTi[^;]*;/i.test(css)) problems.push('--font-sans 回退栈里没有系统楷体')
  }

  // preload 四个字体：中文两个 + 拉丁两个（拉丁的文件名带构建哈希，由 postbuild 注入）
  for (const f of ['/fonts/lxgw-wenkai-lite-400.woff2', '/fonts/lxgw-wenkai-lite-700.woff2']) {
    if (!html.includes(`href="${f}"`)) problems.push(`首页缺少 ${f} 的 preload`)
  }
  if (!/rel="preload"[^>]*inter-latin[^>]*\.woff2/.test(html)) problems.push('首页缺少 Inter 的 preload')
  if (!/rel="preload"[^>]*jetbrains-mono[^>]*\.woff2/.test(html)) problems.push('首页缺少 JetBrains Mono 的 preload')

  return problems
}

const staticProblems = await staticCheck()
if (staticProblems.length) {
  console.error('字体声明静态校验失败：')
  for (const p of staticProblems) console.error('  ✗ ' + p)
  console.error('\n调整 fonts.css（font-display: optional）、theme.config.ts（楷体回退）、nuxt.config.ts（preload）后重跑')
  process.exit(1)
}
console.log('✓ 静态校验：font-display / 楷体回退 / preload 均正常\n')

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--disable-extensions'],
  defaultViewport: { width: 1280, height: 900 },
})

/**
 * 录一段 reload 的帧，返回帧间平均像素差序列。
 *
 * 帧直接留在内存里解码：早先版本把每帧写成 png 临时文件，跑到四十多个文件后
 * 写盘会被系统拒掉（EPERM），整个门禁中途崩掉、只跑完前几页。内存里处理没有
 * 这个上限，也省掉一次编码解码。
 *
 * 每段录屏的前两帧固定丢弃：reload 起始时排空旧画面会先出一帧白板，
 * 白板→首个真实画面的差值在浅色页是 1.1~1.4、暗色页是 3.3~3.6，
 * 而且是否被截到纯属运气 —— 同一份产物连跑两次，一次报 dark /、一次报 light /。
 * 真正的字形跳变发生在页面已经画出来之后，从第 3 帧起比对不影响判定。
 */
async function measure(page) {
  const client = await page.createCDPSession()
  const frames = []

  await client.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
  client.on('Page.screencastFrame', (f) => {
    frames.push(Buffer.from(f.data, 'base64'))
    client.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(2200)
  await client.send('Page.stopScreencast')

  const diffs = []
  let prev = null
  for (const f of frames.slice(2)) {
    const { data } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    if (prev) {
      let acc = 0
      for (let i = 0; i < data.length; i += 4) {
        acc +=
          Math.abs(data[i] - prev[i]) +
          Math.abs(data[i + 1] - prev[i + 1]) +
          Math.abs(data[i + 2] - prev[i + 2])
      }
      diffs.push(+(acc / (data.length / 4) / 3).toFixed(2))
    }
    prev = data
  }
  return diffs
}

const failures = []

for (const theme of THEMES) {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((t) => localStorage.setItem('theme-mode', t), theme)

  for (const route of ROUTES) {
    // 先访问一次建立缓存 —— 要测的是「刷新」，不是首次下载
    await page.goto(BASE + route, { waitUntil: 'networkidle0' })
    await page.evaluate(() => document.fonts.ready)
    await sleep(800)

    const diffs = await measure(page)
    const peak = Math.max(...diffs, 0)
    const ok = peak <= THRESHOLD

    console.log(
      `${ok ? '✓' : '✗'} ${theme.padEnd(5)} ${route.padEnd(26)} peak ${String(peak).padEnd(5)} ${JSON.stringify(diffs)}`,
    )
    if (!ok) failures.push({ theme, route, peak, diffs })
  }
  await page.close()
}

await browser.close()

if (failures.length) {
  console.error(`\n字体闪烁检测失败：${failures.length}/${THEMES.length * ROUTES.length} 个组合超过阈值 ${THRESHOLD}`)
  for (const f of failures) console.error(`  ${f.theme} ${f.route}  peak=${f.peak}`)
  console.error('\n排查方向：fonts.css 是否退回了 fontsource 分片 / preload 是否还在 / 字体子集是否过期')
  process.exit(1)
}

console.log(`\n字体闪烁检测通过：${THEMES.length * ROUTES.length} 个组合峰值均 ≤ ${THRESHOLD}`)
