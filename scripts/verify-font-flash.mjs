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
    // 中文已改走系统楷体栈，entry CSS 里不该再有 LXGW 的 @font-face。
    // 若还残留，说明 fonts.css 没清干净 —— 浏览器会照常下载那两个 310KB 文件。
    const lxgwBlocks = [...css.matchAll(/@font-face\{[^}]*LXGW[^}]*\}/g)].map((m) => m[0])
    if (lxgwBlocks.length) {
      problems.push(`entry CSS 里仍有 ${lxgwBlocks.length} 个 LXGW @font-face（中文字体应改走系统楷体栈）`)
    }
    // 回退栈里必须有楷体，否则中文会退成黑体，丢掉手写体身份
    if (!/font-sans:[^;]*KaiTi[^;]*;/i.test(css)) problems.push('--font-sans 回退栈里没有系统楷体')
  }

  // 中文 webfont 已移除，不该再被 preload（否则白下载 620KB 且抢占 LCP 带宽）
  for (const f of ['/fonts/lxgw-wenkai-lite-400.woff2', '/fonts/lxgw-wenkai-lite-700.woff2']) {
    if (html.includes(`href="${f}"`)) problems.push(`首页仍在 preload ${f}（中文字体已移除）`)
  }
  // 拉丁字体：只有 Inter 需要 preload。
  // 文件名带构建哈希，由 scripts/font-preload.mjs 在构建后按实际产物名注入。
  if (!/rel="preload"[^>]*inter-latin[^>]*\.woff2/.test(html)) problems.push('首页缺少 Inter 的 preload')
  // JetBrains Mono 不该 preload（7f35374 的决定）：等宽字体只用于代码块与数字元信息，
  // 首屏正文命中不到，preload 只会跟 LCP 抢带宽。这里反向钉住，防止被顺手加回来。
  if (/rel="preload"[^>]*jetbrains-mono[^>]*\.woff2/.test(html)) {
    problems.push('首页又在 preload JetBrains Mono（等宽字体不参与首屏，应移除）')
  }

  return problems
}

const staticProblems = await staticCheck()
if (staticProblems.length) {
  console.error('字体声明静态校验失败：')
  for (const p of staticProblems) console.error('  ✗ ' + p)
  console.error('\n调整 fonts.css（移除 LXGW @font-face）、theme.config.ts（楷体回退）、nuxt.config.ts（去掉中文 preload）后重跑')
  process.exit(1)
}
console.log('✓ 静态校验：无中文 webfont / 楷体回退 / Inter preload 均正常（JetBrains Mono 不 preload）\n')

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--disable-extensions'],
  defaultViewport: { width: 1280, height: 900 },
})

/**
 * 采集期的「非字体干扰」隔离。
 *
 * 这个门禁测的是「整页像素差」，但整页里会动的远不止字形。实测同一份产物：
 *
 *   home dark   原样 37.61 → 隐藏 img 后 0.78 → 再禁背景图/动效后 0.22
 *   /posts/*    dark 4.24  → 同上 1.85（智能摘要打字机动画还没播完）
 *
 * 也就是说 37.61 那一下是**封面图从占位图换成真实图**、4.24 是**摘要逐字打字**，
 * 跟字体毫无关系。不隔离的话这个门禁会长期红着，最后只能被无视。
 *
 * 隔离手段（按侵入性从低到高，都用 evaluateOnNewDocument 注入，reload 后仍生效）：
 *   1. prefers-reduced-motion: reduce —— 关掉打字机等入场动画（组件遵从该系统偏好）
 *   2. visibility:hidden 位图 —— 保留占位与布局，只让像素不参与比对
 *   3. background-image 置空 —— 背景大图（backdrop-*.webp）同样是异步到达的
 *
 * 保留布局是关键：若用 display:none，文字会重排，反而制造新的假阳性。
 * 文本、颜色、边框、阴影全部保留 —— 真发生字形切换时依然会被这层抓到。
 */
const ISOLATE_CSS = `
  img, picture, video, canvas, iframe, svg.img, object, embed { visibility: hidden !important; }
  *, *::before, *::after {
    background-image: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`

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
  // 关掉打字机等入场动画：这类动画在 reload 后整段重播，帧差动辄 1.8~2.8
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  // 位图与背景图在 reload 后才陆续解码绘制，隔离它们（保留布局）
  await page.evaluateOnNewDocument((css) => {
    const inject = () => {
      const style = document.createElement('style')
      style.textContent = css
      ;(document.head || document.documentElement).appendChild(style)
    }
    if (document.documentElement) inject()
    else document.addEventListener('readystatechange', inject, { once: true })
  }, ISOLATE_CSS)

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
  console.error('注意：本门禁已隔离位图与入场动画（见 ISOLATE_CSS），报错是字形本身的跳变。')
  process.exit(1)
}

console.log(`\n字体闪烁检测通过：${THEMES.length * ROUTES.length} 个组合峰值均 ≤ ${THRESHOLD}`)
