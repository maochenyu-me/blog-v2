/**
 * 数学公式渲染门禁。
 *
 * 为什么需要它：KaTeX 的默认样式几乎每一项都与本项目的排版约定冲突 ——
 * 行内字号 1.21em（比正文大 21%）、块级公式不处理横向溢出（窄屏撑破页面）、
 * 错误公式用 #cc0000（暗色下对比度不足）。这些都不会让构建失败，
 * 只会在某天被人发现「公式好丑」，所以必须有量化门禁。
 *
 * 顺带守住两个数据出口：搜索索引与 feed 都从 minimark AST 序列化，
 * 而 KaTeX 会输出「MathML + 视觉 HTML」两套文本，不处理就是三份重复
 * （MathML 文本 + HTML 文本 + annotation 里的原始 LaTeX）。
 *
 * 用法：
 *   pnpm build && pnpm preview:dist
 *   node scripts/verify-math.mjs [baseUrl]
 *
 * 退出码 1 表示有不达标项。
 */
import { readFile } from 'node:fs/promises'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] || 'http://127.0.0.1:4173'
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const POST = '/posts/46a06930'

/** 行内公式字号与正文的允许偏差（px） */
const FONT_TOLERANCE = 0.5
/** 错误提示对背景的最低对比度（公式里的错误文字是正文级小字，按 AA 正文 4.5 要求） */
const MIN_ERROR_CONTRAST = 4.5

const problems = []
const fail = (msg) => problems.push(msg)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function parseRgb(str) {
  const m = str.match(/\d+(\.\d+)?/g)
  return m ? m.slice(0, 3).map(Number) : null
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

async function inspect(viewport, theme) {
  const page = await browser.newPage()
  await page.setViewport({ width: viewport, height: 900 })

  // 剪贴板权限，用于验证「复制 LaTeX」
  const ctx = browser.defaultBrowserContext()
  await ctx.overridePermissions(BASE, ['clipboard-read', 'clipboard-write'])

  await page.goto(BASE + POST, { waitUntil: 'networkidle2', timeout: 30000 })
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, theme)
  await page.evaluate(() => document.fonts.ready)
  await sleep(600)

  const m = await page.evaluate(() => {
    const prose = document.querySelector('.prose')
    const para = prose?.querySelector('p')
    const inline = prose?.querySelector('p .katex')
    const displays = [...(prose?.querySelectorAll('.katex-display') ?? [])]
    const bodyCs = getComputedStyle(document.body)
    const err = prose?.querySelector('.katex-error')

    return {
      bodyFont: para ? getComputedStyle(para).fontSize : null,
      inlineFont: inline ? getComputedStyle(inline).fontSize : null,
      displayCount: displays.length,
      displayAlign: displays[0] ? getComputedStyle(displays[0]).textAlign : null,
      // 有内容溢出容器的那些块级公式
      overflowing: displays
        .filter((d) => d.scrollWidth > d.clientWidth + 1)
        .map((d) => ({
          scroll: Math.round(d.scrollWidth),
          client: Math.round(d.clientWidth),
          overflowX: getComputedStyle(d).overflowX,
        })),
      docScrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      inlineColor: inline ? getComputedStyle(inline).color : null,
      textColor: bodyCs.color,
      errorColor: err ? getComputedStyle(err).color : null,
      bgColor: bodyCs.backgroundColor,
      copyButtons: document.querySelectorAll('.math-copy').length,
      mathAnnotations: displays.map((d) => {
        const a = d.querySelector('annotation')
        return a?.textContent?.trim() ?? ''
      }),
    }
  })

  // 复制能力：点第一个块级公式的按钮，确认交给剪贴板的内容就是原始 LaTeX。
  //
  // headless Chrome 里 clipboard 写入常被直接拒掉（NotAllowedError: Write permission
  // denied），跟组件无关。所以这里拦截 writeText 的入参 —— 验证的是「组件有没有把
  // 正确的内容交给剪贴板 API」这件事，真实浏览器里用户点击带用户手势，权限会给。
  let copied = null
  if (m.copyButtons > 0) {
    await page.evaluate(() => {
      window.__mathCopied = null
      const original = navigator.clipboard.writeText.bind(navigator.clipboard)
      navigator.clipboard.writeText = async (text) => {
        window.__mathCopied = text
        try {
          await original(text)
        } catch {
          /* 无权限时忽略，记录已经拿到 */
        }
      }
    })
    await page.click('.math-copy')
    await sleep(300)
    copied = await page.evaluate(
      () => window.__mathCopied ?? navigator.clipboard.readText().catch(() => ''),
    )
  }

  await page.close()
  return { ...m, copied }
}

// ---------- 1. 视觉与交互 ----------
for (const [vp, label] of [[1280, 'desktop'], [390, 'mobile']]) {
  for (const theme of ['light', 'dark']) {
    const tag = `${label}/${theme}`
    const m = await inspect(vp, theme)

    if (m.displayCount === 0) {
      fail(`${tag}: 页面上没有任何块级公式（检查测试文章的 $$ 与 math 围栏）`)
      continue
    }

    // 行内公式与正文同号
    if (m.bodyFont && m.inlineFont) {
      const diff = Math.abs(parseFloat(m.inlineFont) - parseFloat(m.bodyFont))
      if (diff > FONT_TOLERANCE) {
        fail(`${tag}: 行内公式 ${m.inlineFont} 与正文 ${m.bodyFont} 差 ${diff.toFixed(2)}px（应 ≤ ${FONT_TOLERANCE}）`)
      }
    } else {
      fail(`${tag}: 找不到行内公式，无法校验字号`)
    }

    // 块级居中
    if (m.displayAlign !== 'center') fail(`${tag}: 块级公式 text-align 是 ${m.displayAlign}，应为 center`)

    // 溢出的块级公式必须自己能滚
    for (const o of m.overflowing) {
      if (!['auto', 'scroll'].includes(o.overflowX)) {
        fail(`${tag}: 块级公式内容 ${o.scroll}px 宽于容器 ${o.client}px，但 overflow-x 是 ${o.overflowX}`)
      }
    }

    // 整页不得横向溢出
    if (m.docScrollWidth > m.clientWidth + 1) {
      fail(`${tag}: 页面横向溢出 ${m.docScrollWidth} > ${m.clientWidth}`)
    }

    // 公式与正文同色
    if (m.inlineColor && m.textColor && m.inlineColor !== m.textColor) {
      fail(`${tag}: 公式颜色 ${m.inlineColor} 与正文 ${m.textColor} 不一致`)
    }

    // 错误提示对比度
    if (m.errorColor && m.bgColor) {
      const c = contrast(parseRgb(m.errorColor), parseRgb(m.bgColor))
      if (c < MIN_ERROR_CONTRAST) {
        fail(`${tag}: 错误公式 ${m.errorColor} 对背景对比度 ${c.toFixed(2)}，应 ≥ ${MIN_ERROR_CONTRAST}`)
      }
    }

    // 每个块级公式都要能复制
    if (m.copyButtons !== m.displayCount) {
      fail(`${tag}: 复制按钮 ${m.copyButtons} 个，块级公式 ${m.displayCount} 个，数量不一致`)
    }
    if (m.copyButtons > 0) {
      const expect = m.mathAnnotations[0]
      if (!m.copied?.trim()) fail(`${tag}: 点复制后剪贴板为空`)
      else if (expect && m.copied.trim() !== expect) {
        fail(`${tag}: 复制内容与原始 LaTeX 不符\n      期望：${expect}\n      实际：${m.copied.trim()}`)
      }
    }
  }
}

// ---------- 2. 搜索索引不得有三份重复 ----------
try {
  const raw = await readFile('dist/api/search-index.json', 'utf8')
  const data = JSON.parse(raw)
  const docs = Array.isArray(data) ? data : (data.docs ?? [])
  const doc = docs.find((d) => String(d.path ?? '').includes('math-test'))
  if (!doc) {
    fail('搜索索引里找不到 math-test（检查 search.stripCodeBlocks 或文章是否被排除）')
  } else {
    const text = String(doc.text ?? '')
    // KaTeX 的三种输出叠加会产生 "E=mc2E = mc^2E=mc2" 这种连写
    if (/E=mc2\s*E = mc\^2/.test(text)) {
      fail('搜索索引里公式出现重复：MathML 文本与原始 LaTeX 连写在一起')
    }
    if (!/E = mc\^2/.test(text)) {
      fail('搜索索引里找不到公式的原始 LaTeX（E = mc^2），公式可能被整体丢弃')
    }
  }
} catch (e) {
  fail(`读取搜索索引失败：${e.message}`)
}

// ---------- 3. feed 不得输出视觉层 HTML ----------
try {
  const feed = await readFile('dist/atom.xml', 'utf8')
  // 只取 math-test 自己的 <entry>：整份 feed 里别的文章正文也会出现
  // aria-hidden 这几个字（有一篇就在讲这个属性），按全文搜会误判。
  const entry = feed
    .split('<entry>')
    .find((chunk) => chunk.includes('/posts/46a06930'))
  if (!entry) {
    fail('feed 里找不到 math-test 的条目')
  } else if (entry.includes('aria-hidden')) {
    fail('feed 里出现了 aria-hidden 的 KaTeX 视觉层（会与 MathML 重复显示一遍）')
  }
} catch (e) {
  fail(`读取 feed 失败：${e.message}`)
}

await browser.close()

if (problems.length) {
  console.error(`\nFAIL: ${problems.length} 项\n`)
  for (const p of problems) console.error(`  - ${p}`)
  console.error('\n调整 app/components/server/ProseBody.vue（字号/间距/滚动）、')
  console.error('app/components/common/MathCopyButton.vue（复制）、')
  console.error('server/utils/content-render.ts（索引与 feed 去重）后重跑')
  process.exit(1)
}

console.log('✓ 数学公式：字号、居中、滚动、配色、复制、索引与 feed 全部达标')
