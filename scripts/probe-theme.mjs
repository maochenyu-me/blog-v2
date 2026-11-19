/**
 * 主题切换性能探针（回归门禁）。
 *
 * 用法：
 *   node scripts/probe-theme.mjs <mode> [baseUrl]
 *
 * mode:
 *   attribution   多组变体对比（current / notrans+allblur / prewarm / pure）
 *   timeline      颜色时间线（验证 dark 类挂上同帧即目标色）
 *   swap          冷/热缓存两切对比（背景图换档成本）
 *   repeat        四连切一致性（判定长帧是「首次画暗色」还是每次）
 *
 * 门禁（attribution）：current 组 p95 ≤ 20ms，max ≤ 40ms，三次重复一致
 */
import puppeteer from 'puppeteer-core'

// ─── 共享 ────────────────────────────────────────────────────────────────────

const BASE = process.argv[3] || 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
  })
}

/** 启动帧记录 */
async function arm(page) {
  await page.evaluate(() => {
    window.__f = { frames: [], t0: performance.now(), recording: true }
    const tick = (t) => {
      if (!window.__f.recording) return
      window.__f.frames.push(t)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** 读取帧间隔统计 */
async function readFrames(page, win = 450) {
  const raw = await page.evaluate(() => {
    window.__f.recording = false
    return { frames: window.__f.frames, t0: window.__f.t0 }
  })
  const d = []
  for (let i = 1; i < raw.frames.length; i++) {
    if (raw.frames[i] - raw.t0 <= win) d.push(raw.frames[i] - raw.frames[i - 1])
  }
  const sorted = [...d].sort((a, b) => a - b)
  return {
    frames: d.length,
    p95: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 10) / 10,
    max: Math.round(Math.max(...d, 0) * 10) / 10,
    over32: d.filter((x) => x > 32).length,
    over60: d.filter((x) => x > 60).length,
  }
}

/** 初始化页面到浅色态 */
async function initLight(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' })
  await page.evaluate(() => {
    localStorage.setItem('theme-mode', 'light')
    document.documentElement.classList.remove('dark')
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1500)
}

/** 点击主题按钮 */
async function clickToggle(page) {
  await page.click('.theme-toggle').catch(async () => {
    await page.evaluate(() => document.querySelector('.theme-toggle')?.click())
  })
}

// ─── attribution ─────────────────────────────────────────────────────────────

const KILL_TRANSITIONS = '*,*::before,*::after{transition:none!important}'
const KILL_ALL_FILTER = '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'
const KILL_BACKDROP_FILTER = '.site-backdrop{filter:none!important}'

const VARIANTS = {
  current: [],
  'notrans+allblur': [KILL_TRANSITIONS, KILL_ALL_FILTER],
  'notrans+allblur+prewarm': ['prewarm', KILL_TRANSITIONS, KILL_ALL_FILTER],
  'notrans+allblur+pure': ['prewarm', KILL_TRANSITIONS, KILL_ALL_FILTER, KILL_BACKDROP_FILTER],
}

async function runAttribution() {
  const browser = await launchBrowser()
  const REPS = 3

  for (const variant of Object.keys(VARIANTS)) {
    const runs = []
    for (let i = 0; i < REPS; i++) {
      const ctx = await browser.createBrowserContext()
      const page = await ctx.newPage()
      await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
      try {
        await initLight(page)

        for (const step of VARIANTS[variant]) {
          if (step === 'prewarm') {
            await page.evaluate(
              () =>
                new Promise((resolve) => {
                  const probe = new Image()
                  probe.onload = () => probe.decode().then(resolve, resolve)
                  probe.onerror = resolve
                  probe.src = new URL('/images/backdrop-dark-1280.webp', location.origin).href
                }),
            )
          } else {
            await page.evaluate((css) => {
              const s = document.createElement('style')
              s.textContent = css
              document.head.append(s)
            }, step)
          }
        }

        await arm(page)
        await clickToggle(page)
        await sleep(900)
        runs.push(await readFrames(page))
      } finally {
        await page.close()
        await ctx.close()
      }
    }

    const avg = (k) => Math.round((runs.reduce((s, r) => s + r[k], 0) / runs.length) * 10) / 10
    const maxOf = (k) => Math.round(Math.max(...runs.map((r) => r[k])) * 10) / 10
    const result = { p95: avg('p95'), max: maxOf('max'), over32: runs.reduce((s, r) => s + r.over32, 0) }
    console.log(
      `${variant.padEnd(24)} p95 ${String(result.p95).padStart(6)}ms  max ${String(result.max).padStart(6)}ms  >32ms 帧合计 ${result.over32}  ${JSON.stringify(runs.map((r) => r.max))}`,
    )
  }

  await browser.close()
}

// ─── timeline ────────────────────────────────────────────────────────────────

async function runTimeline() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 })
  await initLight(page)

  // 颜色采样
  await page.evaluate(() => {
    window.__colors = []
    window.__rec = true
    window.__t0 = performance.now()
    const tick = () => {
      if (!window.__rec) return
      const bg = getComputedStyle(document.body).backgroundColor
      window.__colors.push({
        t: Math.round(performance.now() - window.__t0),
        bg,
        dark: document.documentElement.classList.contains('dark'),
      })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  await clickToggle(page)
  await sleep(700)

  const data = await page.evaluate(() => {
    window.__rec = false
    return { colors: window.__colors }
  })

  console.log('\nt(ms)  dark  body 计算色')
  let last = ''
  for (const c of data.colors) {
    if (c.bg === last && c.t > 260) continue
    last = c.bg
    console.log(`${String(c.t).padStart(4)}   ${String(c.dark).padEnd(5)} ${c.bg}`)
  }

  await browser.close()
}

// ─── swap ────────────────────────────────────────────────────────────────────

async function runSwap() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })

  const requests = []
  page.on('request', (r) => requests.push(r.url()))

  await initLight(page)

  const mark = requests.length
  await arm(page)
  await clickToggle(page)
  await sleep(900)
  const t1 = await readFrames(page)
  const newReqs = requests.slice(mark).filter((u) => /backdrop|\.webp/.test(u))

  await arm(page)
  await clickToggle(page)
  await sleep(900)
  const t2 = await readFrames(page)

  console.log('第一次切换（浅→暗，需换背景图）:', t1)
  console.log('第二次切换（暗→system/浅，背景图已缓存）:', t2)
  console.log('第一次切换期间请求到的背景图资源:', newReqs.length ? newReqs : '（无 / 已在缓存）')

  const darkLoaded = requests.filter((u) => /backdrop-dark/.test(u)).length
  console.log('整段过程里 backdrop-dark 请求次数:', darkLoaded)

  await browser.close()
}

// ─── repeat ──────────────────────────────────────────────────────────────────

async function runRepeat() {
  const browser = await launchBrowser()
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
  await initLight(page)
  await sleep(500) // 给 idle 预取留时间

  const label = ['#1 浅→暗(首次画暗色)', '#2 暗→system/浅', '#3 浅→暗(暗色已画过)', '#4 暗→system/浅']
  for (let i = 0; i < 4; i++) {
    await arm(page)
    await clickToggle(page)
    await sleep(900)
    console.log(label[i].padEnd(22), await readFrames(page))
  }

  await browser.close()
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

const mode = process.argv[2]
const modes = { attribution: runAttribution, timeline: runTimeline, swap: runSwap, repeat: runRepeat }

if (!mode || !modes[mode]) {
  console.log(`用法: node scripts/probe-theme.mjs <mode> [baseUrl]`)
  console.log(`mode: ${Object.keys(modes).join(' | ')}`)
  process.exit(1)
}

await modes[mode]()
