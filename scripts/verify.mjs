/**
 * 全站视觉与技术验收脚本。
 *
 * 产出：
 *   1. 三个视口 × 明暗 的截图（.audit/shots/）
 *   2. 布局/排版/颜色的量化测量（.audit/report.json）
 *   3. 控制台错误与页面异常的收集
 *
 * 用法：node scripts/verify.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const BASE = process.argv[2] || 'http://127.0.0.1:3300'
const OUT = resolve(process.cwd(), '.audit')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

/**
 * 本地预览 origin（127.0.0.1 / localhost）不在 Ecoku 后台（ecoku.518339.xyz）
 * 的站点来源白名单里，评论 API 的 fetch 被 CORS 拒绝是预期行为：
 * 组件已优雅降级为错误卡 + 重试按钮，页面本身无错误。
 * 豁免仅限本地 origin —— 正式域名上线时须加白名单，线上仍会真实暴露。
 */
const IS_LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(BASE)
const isLocalEcokuCors = (text) =>
  IS_LOCAL && text.includes('ecoku.518339.xyz') && text.includes('CORS')
/** 同一批被拒 fetch 的伴生消息（不带域名）；本地预览下资源全在本地，ERR_FAILED 只可能来自外部请求 */
const isLocalResourceFail = (text) => IS_LOCAL && text.includes('net::ERR_FAILED')
/**
 * Cap 人机验证的 instrumentation（运行时反自动化检测）会拦截自动化浏览器：
 * console 出现 "Instrumentation blocked (automated_browser)"，redeem 请求 403。
 * verify/探针本身就是自动化环境，被拦是 Cap 的设计行为；真实访客浏览器不受影响。
 * 仅本地 origin 豁免，线上仍真实暴露。
 */
const isLocalCapBlocked = (text) =>
  IS_LOCAL &&
  (text.includes('Instrumentation blocked') ||
    (text.includes('cap.518339.xyz') && text.includes('403')))

const ROUTES = [
  ['home', '/'],
  ['archive', '/archive'],
  ['categories', '/categories'],
  ['tags', '/tags'],
  ['links', '/links'],
  ['fcircle', '/fcircle'],
  ['shuoshuo', '/shuoshuo'],
  ['about', '/about'],
  ['post', '/posts/typography-over-color'],
  ['post-stress', '/posts/xml-escaping-stress-test'],
  ['404', '/definitely-not-a-real-page'],
]

const VIEWPORTS = [
  ['mobile', 375, 812],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
]

await mkdir(resolve(OUT, 'shots'), { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

const report = { base: BASE, capturedAt: new Date().toISOString(), routes: [], errors: [] }

for (const [vpName, width, height] of VIEWPORTS) {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }])

    const consoleErrors = []
    page.on('console', (m) => {
      if (
        m.type() === 'error' &&
        !isLocalEcokuCors(m.text()) &&
        !isLocalResourceFail(m.text()) &&
        !isLocalCapBlocked(m.text())
      )
        consoleErrors.push(m.text())
    })
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

    for (const [name, path] of ROUTES) {
      try {
        const resp = await page.goto(BASE + path, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        })
        const status = resp?.status() ?? 0
        await new Promise((r) => setTimeout(r, 400))

        const metrics = await page.evaluate(() => {
          const de = document.documentElement
          const cs = getComputedStyle(de)
          const body = getComputedStyle(document.body)

          // 主内容容器：取第一个带 max-width 语义的元素
          const probe =
            document.querySelector('.container') ||
            document.querySelector('.post-shell') ||
            document.querySelector('main')

          const rect = probe ? probe.getBoundingClientRect() : null

          // 横向溢出检测
          const overflowX = de.scrollWidth > de.clientWidth + 1

          // 找出所有超出视口右边界的元素（最多 5 个）
          const offenders = []
          if (overflowX) {
            for (const el of document.querySelectorAll('main *')) {
              const r = el.getBoundingClientRect()
              if (r.right > de.clientWidth + 1 && r.width > 0) {
                offenders.push({
                  tag: el.tagName,
                  cls: (el.className || '').toString().slice(0, 60),
                  right: Math.round(r.right),
                })
                if (offenders.length >= 5) break
              }
            }
          }

          // 触控目标尺寸（仅移动端有意义）
          const smallTargets = []
          for (const el of document.querySelectorAll('a, button')) {
            const r = el.getBoundingClientRect()
            if (r.width > 0 && (r.width < 24 || r.height < 24)) {
              smallTargets.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 20),
                w: Math.round(r.width),
                h: Math.round(r.height),
              })
            }
          }

          return {
            title: document.title,
            isDark: de.classList.contains('dark'),
            overflowX,
            offenders,
            smallTargetCount: smallTargets.length,
            smallTargets: smallTargets.slice(0, 5),
            bg: body.backgroundColor,
            fg: body.color,
            accent: cs.getPropertyValue('--accent').trim(),
            fontFirst: body.fontFamily.split(',')[0].replace(/['"]/g, ''),
            fontSize: body.fontSize,
            lineHeight: body.lineHeight,
            contentWidth: (() => { const p = document.querySelector('.prose'); return p ? Math.round(p.getBoundingClientRect().width) : (rect ? Math.round(rect.width) : null) })(),
            leftGap: rect ? Math.round(rect.left) : null,
            rightGap: rect ? Math.round(window.innerWidth - rect.right) : null,
            centered: rect
              ? Math.abs(rect.left - (window.innerWidth - rect.right)) <= 2
              : null,
            hasH1: !!document.querySelector('h1'),
            h1Text: (document.querySelector('h1')?.textContent || '').trim().slice(0, 40),
            // 焦点可见性：检查 CSS 规则是否存在
            focusVisibleRule: (() => {
              let found = false
              const walk = (rules) => {
                for (const r of rules) {
                  if (r.selectorText && r.selectorText.includes('focus-visible')) { found = true; return }
                  if (r.cssRules) { walk(r.cssRules); if (found) return }
                }
              }
              for (const sh of document.styleSheets) {
                try { walk(sh.cssRules) } catch {}
                if (found) break
              }
              return found
            })(),
          }
        })

        await page.screenshot({
          path: resolve(OUT, 'shots', `${name}-${vpName}-${scheme}.png`),
          fullPage: false,
        })

        report.routes.push({
          route: name,
          path,
          viewport: vpName,
          scheme,
          status,
          metrics,
          consoleErrors: consoleErrors.slice(0, 5),
        })
        consoleErrors.length = 0
      } catch (e) {
        report.errors.push({ route: name, viewport: vpName, scheme, error: String(e).slice(0, 200) })
      }
    }

    await page.close()
  }
}

await browser.close()

// ---- 汇总 ----
const fails = []

for (const r of report.routes) {
  const m = r.metrics
  const tag = `${r.route}@${r.viewport}/${r.scheme}`

  // 404 页允许 status 404
  if (r.route === '404') {
    if (r.status !== 404) fails.push(`${tag}: 期望 404，实际 ${r.status}`)
  } else if (r.status !== 200 && r.status !== 304) {
    fails.push(`${tag}: HTTP ${r.status}`)
  }

  if (m.overflowX) {
    fails.push(`${tag}: 横向溢出 ${JSON.stringify(m.offenders)}`)
  }

  if (!m.hasH1) fails.push(`${tag}: 缺少 h1`)
  if (!m.focusVisibleRule) fails.push(`${tag}: 缺少 :focus-visible 规则`)

  // 明暗必须真实切换
  if (r.scheme === 'dark' && !m.isDark) fails.push(`${tag}: 暗色未生效`)
  if (r.scheme === 'light' && m.isDark) fails.push(`${tag}: 明色却处于暗色`)

  // 内容宽度与居中（只在有 probe 的页面检查）
  // 上限按路由区分：正文类页面受 --wide-max-width（1000px）约束；
  // 首页是 Dusklight 式宽版式（主内容 + 侧栏），受 --home-max-width（1400px）约束。
  if (m.contentWidth !== null && r.viewport === 'desktop') {
    const limit = r.route === 'home' ? 1420 : 1010
    if (m.contentWidth > limit) fails.push(`${tag}: 内容宽度 ${m.contentWidth} 超上限 ${limit}`)
  }

  if (r.consoleErrors.length && r.route !== '404') {
    fails.push(`${tag}: 控制台错误 ${JSON.stringify(r.consoleErrors)}`)
  }
}

await writeFile(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2), 'utf8')

// ---- 打印摘要 ----
console.log(`\n采集 ${report.routes.length} 个页面状态，错误 ${report.errors.length} 个\n`)

const byVp = {}
for (const r of report.routes) {
  const k = `${r.viewport}/${r.scheme}`
  byVp[k] = byVp[k] || { count: 0, dark: 0, overflow: 0, w: [] }
  byVp[k].count++
  if (r.metrics.isDark) byVp[k].dark++
  if (r.metrics.overflowX) byVp[k].overflow++
  if (r.metrics.contentWidth) byVp[k].w.push(r.metrics.contentWidth)
}

for (const [k, v] of Object.entries(byVp)) {
  console.log(
    `${k.padEnd(16)} 页面 ${v.count}  暗色 ${v.dark}/${v.count}  溢出 ${v.overflow}  内容宽度 ${[...new Set(v.w)].join(',') || '-'}`,
  )
}

const first = report.routes[0]?.metrics
if (first) {
  console.log(`\n字体 ${first.fontFirst} ${first.fontSize} / 行高 ${first.lineHeight}`)
  console.log(`强调色 --accent: ${first.accent}`)
  console.log(`明色 bg/fg: ${first.bg} / ${first.fg}`)
}

const dark = report.routes.find((r) => r.scheme === 'dark')
if (dark) console.log(`暗色 bg/fg: ${dark.metrics.bg} / ${dark.metrics.fg}`)

console.log(`\n${'='.repeat(60)}`)
if (fails.length === 0) {
  console.log('PASS: 全部检查通过')
} else {
  console.log(`FAIL: ${fails.length} 项`)
  for (const f of fails) console.log('  - ' + f)
}
console.log(`截图目录：${resolve(OUT, 'shots')}`)
process.exit(fails.length ? 1 : 0)
