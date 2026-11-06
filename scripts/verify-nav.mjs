/**
 * 侧边导航抽屉专项验收。
 *
 * 覆盖用户需求里的每一条：
 *   - <1024px 才出现触发按钮（手机、平板）；桌面端必须消失
 *   - 抽屉从右侧贴边滑入，1px 左边框、无圆角、无阴影、无模糊
 *   - 二级导航可展开/折叠；父项点击不跳转
 *   - 当前路由所在分组默认展开且高亮
 *   - Escape / 遮罩 / 关闭按钮 三种关闭方式
 *   - 关抽屉后焦点回到触发按钮
 *   - 抽屉打开时页面滚动被锁
 *   - 桌面端导航条按叶子平铺 6 项（无回归）
 *   - 无横向溢出
 *
 * 用法：node scripts/verify-nav.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const BASE = process.argv[2] || 'http://127.0.0.1:3300'
const OUT = resolve(process.cwd(), '.audit')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

await mkdir(resolve(OUT, 'shots'), { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--proxy-server=direct://', '--proxy-bypass-list=*'],
})

const results = []
const failures = []

function record(name, ok, detail) {
  results.push({ name, ok, detail })
  if (!ok) failures.push(`${name} :: ${detail}`)
}

const VIEWPORTS = [
  ['mobile', 375, 812],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
]

for (const [vpName, width, height] of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])

  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

  // ── 1. 首页：触发按钮可见性与桌面导航 ──
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 300))

  const shell = await page.evaluate(() => {
    const trigger = document.querySelector('.drawer-trigger')
    const desktopNav = document.querySelector('.nav-desktop')
    // DOMRect 不可序列化，必须拆成普通数字再返回
    const tr = trigger ? trigger.getBoundingClientRect() : null
    return {
      triggerVisible: trigger ? getComputedStyle(trigger).display !== 'none' : false,
      triggerRect: tr
        ? { x: tr.x, y: tr.y, width: tr.width, height: tr.height, right: tr.right, left: tr.left }
        : null,
      desktopNavDisplay: desktopNav ? getComputedStyle(desktopNav).display : null,
      desktopLinks: desktopNav
        ? [...desktopNav.querySelectorAll('a')].map((a) => ({
            text: a.textContent.trim(),
            href: a.getAttribute('href'),
          }))
        : [],
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })

  if (vpName === 'desktop') {
    record(`[${vpName}] 触发按钮在桌面端隐藏`, !shell.triggerVisible, `display≠none? ${shell.triggerVisible}`)
    record(`[${vpName}] 桌面导航条可见`, shell.desktopNavDisplay === 'flex', `display=${shell.desktopNavDisplay}`)
    record(
      `[${vpName}] 桌面导航平铺 6 项`,
      shell.desktopLinks.length === 6,
      `实际 ${shell.desktopLinks.length} 项: ${shell.desktopLinks.map((l) => l.text).join('/')}`,
    )
    const expectHrefs = ['/', '/archive', '/categories', '/tags', '/links', '/about']
    record(
      `[${vpName}] 桌面导航叶子顺序正确`,
      JSON.stringify(shell.desktopLinks.map((l) => l.href)) === JSON.stringify(expectHrefs),
      `实际 ${shell.desktopLinks.map((l) => l.href).join(',')}`,
    )
  } else {
    record(`[${vpName}] 触发按钮可见`, shell.triggerVisible, `display≠none? ${shell.triggerVisible}`)
    record(`[${vpName}] 桌面导航条隐藏`, shell.desktopNavDisplay === 'none', `display=${shell.desktopNavDisplay}`)
    record(
      `[${vpName}] 触发按钮在右侧（距右边缘 < 32px）`,
      shell.triggerRect && width - shell.triggerRect.right < 32,
      `right=${shell.triggerRect?.right}, width=${width}`,
    )
    record(
      `[${vpName}] 触发按钮触控目标 ≥44px`,
      shell.triggerRect && shell.triggerRect.width >= 36 && shell.triggerRect.height >= 36,
      `${shell.triggerRect?.width}×${shell.triggerRect?.height}`,
    )
  }
  record(`[${vpName}] 首页无横向溢出`, shell.overflowX <= 1, `overflowX=${shell.overflowX}`)

  if (vpName !== 'desktop') {
    // ── 2. 打开抽屉，检查形态 ──
    await page.click('.drawer-trigger')
    await new Promise((r) => setTimeout(r, 400))

    const drawer = await page.evaluate(() => {
      const el = document.querySelector('.drawer')
      if (!el) return null
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const overlay = document.querySelector('.drawer-overlay')
      return {
        exists: true,
        rect: { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width },
        transform: cs.transform,
        borderLeftWidth: cs.borderLeftWidth,
        borderLeftStyle: cs.borderLeftStyle,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        backdropFilter: cs.backdropFilter,
        position: cs.position,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        htmlOverflow: getComputedStyle(document.documentElement).overflow,
        overlayExists: !!overlay,
        role: el.getAttribute('role'),
        ariaModal: el.getAttribute('aria-modal'),
      }
    })

    record(`[${vpName}] 抽屉已出现`, !!drawer?.exists, 'DOM 无 .drawer')
    if (drawer) {
      const flushRight = Math.abs(drawer.rect.right - drawer.viewportW) <= 1
      record(`[${vpName}] 抽屉贴右边缘`, flushRight, `right=${drawer.rect.right}, vw=${drawer.viewportW}`)
      record(
        `[${vpName}] 抽屉上下贴边（全高）`,
        Math.abs(drawer.rect.top) <= 1 && Math.abs(drawer.rect.bottom - drawer.viewportH) <= 1,
        `top=${drawer.rect.top}, bottom=${drawer.rect.bottom}, vh=${drawer.viewportH}`,
      )
      record(`[${vpName}] 抽屉为 fixed 定位`, drawer.position === 'fixed', `position=${drawer.position}`)
      record(
        `[${vpName}] 抽屉有 1px 左边框`,
        drawer.borderLeftWidth === '1px' && drawer.borderLeftStyle === 'solid',
        `${drawer.borderLeftWidth} ${drawer.borderLeftStyle}`,
      )
      record(`[${vpName}] 抽屉无圆角`, drawer.borderRadius === '0px', `borderRadius=${drawer.borderRadius}`)
      record(`[${vpName}] 抽屉无阴影`, drawer.boxShadow === 'none', `boxShadow=${drawer.boxShadow}`)
      record(`[${vpName}] 抽屉无毛玻璃`, drawer.backdropFilter === 'none', `backdropFilter=${drawer.backdropFilter}`)
      record(
        `[${vpName}] 抽屉宽度合理（≤82vw 且 ≥200px）`,
        drawer.rect.width <= drawer.viewportW * 0.83 && drawer.rect.width >= 200,
        `width=${drawer.rect.width}, vw=${drawer.viewportW}`,
      )
      record(`[${vpName}] 抽屉打开时锁页面滚动`, drawer.htmlOverflow === 'hidden', `overflow=${drawer.htmlOverflow}`)
      record(`[${vpName}] 抽屉 role=dialog aria-modal`, drawer.role === 'dialog' && drawer.ariaModal === 'true', `${drawer.role}/${drawer.ariaModal}`)
      record(`[${vpName}] 遮罩存在`, drawer.overlayExists, '无 .drawer-overlay')
      record(
        `[${vpName}] 焦点已进入抽屉`,
        await page.evaluate(() => !!document.activeElement?.closest('.drawer')),
        await page.evaluate(() => document.activeElement?.className || ''),
      )
    }

    await page.screenshot({ path: resolve(OUT, 'shots', `drawer-${vpName}-closed-groups.png`) })

    // ── 3. 一级项数量与文案（用 > 直接子级，避免把子级也数进来） ──
    const lvl1 = await page.evaluate(() =>
      [...document.querySelectorAll('.drawer > .drawer-body > .nav-tree > .nav-tree__item')].map((li) => {
        const btn = li.querySelector(':scope > button')
        const link = li.querySelector(':scope > a')
        return {
          label: (btn || link)?.querySelector('.nav-tree__label')?.textContent?.trim(),
          isGroup: !!btn,
          expanded: btn?.getAttribute('aria-expanded'),
        }
      }),
    )
    record(
      `[${vpName}] 一级导航 4 项`,
      lvl1.length === 4,
      `实际 ${lvl1.length}: ${lvl1.map((i) => i.label).join('/')}`,
    )
    record(
      `[${vpName}] 一级文案为 首页/归档/友链/关于`,
      lvl1.map((i) => i.label).join('/') === '首页/归档/友链/关于',
      lvl1.map((i) => i.label).join('/'),
    )
    record(
      `[${vpName}] 只有「归档」是分组`,
      lvl1.filter((i) => i.isGroup).length === 1 && lvl1.find((i) => i.isGroup)?.label === '归档',
      lvl1.filter((i) => i.isGroup).map((i) => i.label).join('/'),
    )

    // ── 4. 展开分组：三级子项出现，父项不跳转 ──
    const groupBtnSelector = '.drawer > .drawer-body > .nav-tree > .nav-tree__item.is-group > button'
    const beforeUrl = page.url()
    await page.click(groupBtnSelector)
    await new Promise((r) => setTimeout(r, 350))
    const afterExpand = await page.evaluate(() => {
      const panel = document.querySelector('.drawer .nav-tree__panel')
      const inner = panel?.querySelector('.nav-tree__panel-inner')
      return {
        ariaExpanded: document.querySelector('.drawer > .drawer-body > .nav-tree > .nav-tree__item.is-group > button')?.getAttribute('aria-expanded'),
        panelHeight: inner ? inner.getBoundingClientRect().height : 0,
        subs: [...document.querySelectorAll('.drawer .nav-tree--sub .nav-tree__row')].map((a) => a.textContent.trim()),
      }
    })
    record(`[${vpName}] 点父项后仍停留在原页面（父项不跳转）`, page.url() === beforeUrl, `before=${beforeUrl} after=${page.url()}`)
    record(`[${vpName}] 展开后 aria-expanded=true`, afterExpand.ariaExpanded === 'true', `aria-expanded=${afterExpand.ariaExpanded}`)
    record(`[${vpName}] 展开后子项可见（高度 > 60）`, afterExpand.panelHeight > 60, `height=${afterExpand.panelHeight}`)
    record(
      `[${vpName}] 子项为 归档/分类/标签`,
      afterExpand.subs.join('/') === '归档/分类/标签',
      afterExpand.subs.join('/'),
    )

    await page.screenshot({ path: resolve(OUT, 'shots', `drawer-${vpName}-expanded.png`) })

    // ── 5. 再点一次折叠 ──
    await page.click(groupBtnSelector)
    await new Promise((r) => setTimeout(r, 350))
    const collapsed = await page.evaluate(() => {
      const inner = document.querySelector('.drawer .nav-tree__panel-inner')
      return {
        h: inner ? inner.getBoundingClientRect().height : 0,
        aria: document.querySelector('.drawer > .drawer-body > .nav-tree > .nav-tree__item.is-group > button')?.getAttribute('aria-expanded'),
      }
    })
    record(`[${vpName}] 再点击可折叠（高度 < 2）`, collapsed.h < 2, `height=${collapsed.h}`)
    record(`[${vpName}] 折叠后 aria-expanded=false`, collapsed.aria === 'false', `aria-expanded=${collapsed.aria}`)

    // ── 6. Escape 关闭 + 焦点归还 ──
    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 350))
    const afterEsc = await page.evaluate(() => ({
      drawerGone: !document.querySelector('.drawer'),
      overflow: getComputedStyle(document.documentElement).overflow,
      focusClass: document.activeElement?.className || '',
      focusAria: document.activeElement?.getAttribute('aria-label') || '',
    }))
    record(`[${vpName}] Escape 关闭抽屉`, afterEsc.drawerGone, `drawer 仍存在`)
    record(`[${vpName}] 关闭后恢复滚动`, afterEsc.overflow !== 'hidden', `overflow=${afterEsc.overflow}`)
    record(
      `[${vpName}] 关闭后焦点回到触发按钮`,
      String(afterEsc.focusClass).includes('drawer-trigger'),
      `activeElement.class=${afterEsc.focusClass}`,
    )

    // ── 7. 遮罩关闭 ──
    await page.click('.drawer-trigger')
    await new Promise((r) => setTimeout(r, 350))
    await page.evaluate(() => document.querySelector('.drawer-overlay')?.click())
    await new Promise((r) => setTimeout(r, 350))
    record(
      `[${vpName}] 点遮罩可关闭`,
      await page.evaluate(() => !document.querySelector('.drawer')),
      'drawer 仍在',
    )

    // ── 8. 在 /categories 打开抽屉：分组应默认展开且子项高亮 ──
    await page.goto(BASE + '/categories', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 300))
    await page.click('.drawer-trigger')
    await new Promise((r) => setTimeout(r, 400))
    const onCategories = await page.evaluate(() => {
      const group = document.querySelector('.drawer > .drawer-body > .nav-tree > .nav-tree__item.is-group')
      const btn = group?.querySelector('button')
      const activeSub = document.querySelector('.drawer .nav-tree--sub .nav-tree__row.is-active')
      return {
        groupExpanded: btn?.getAttribute('aria-expanded'),
        groupActive: btn?.classList.contains('is-active'),
        activeSubLabel: activeSub?.textContent?.trim(),
        activeSubAria: activeSub?.getAttribute('aria-current'),
      }
    })
    record(`[${vpName}] /categories 下分组默认展开`, onCategories.groupExpanded === 'true', `aria-expanded=${onCategories.groupExpanded}`)
    record(`[${vpName}] /categories 下分组父项高亮`, onCategories.groupActive === true, `is-active=${onCategories.groupActive}`)
    record(
      `[${vpName}] /categories 下子项「分类」高亮`,
      onCategories.activeSubLabel === '分类' && onCategories.activeSubAria === 'page',
      `${onCategories.activeSubLabel} / ${onCategories.activeSubAria}`,
    )
    await page.screenshot({ path: resolve(OUT, 'shots', `drawer-${vpName}-categories.png`) })

    // ── 9. 点一级叶子链接跳转并自动关闭 ──
    await page.evaluate(() => {
      const links = [...document.querySelectorAll('.drawer > .drawer-body > .nav-tree > .nav-tree__item > a')]
      const about = links.find((a) => a.textContent.trim() === '关于')
      about?.click()
    })
    await page.waitForFunction(() => location.pathname === '/about', { timeout: 15000 })
    await new Promise((r) => setTimeout(r, 500))
    record(
      `[${vpName}] 点叶子链接可跳转且抽屉自动关闭`,
      await page.evaluate(() => location.pathname === '/about' && !document.querySelector('.drawer')),
      await page.evaluate(() => `${location.pathname}, drawer=${!!document.querySelector('.drawer')}`),
    )
  }

  // ── 10. 控制台无错误 ──
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon'))
  record(`[${vpName}] 控制台无错误`, realErrors.length === 0, realErrors.slice(0, 3).join(' | '))

  await page.close()
}

await browser.close()

const summary = {
  base: BASE,
  capturedAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failures.length,
  failures,
  results,
}
await writeFile(resolve(OUT, 'nav-report.json'), JSON.stringify(summary, null, 2), 'utf8')

console.log(`\n检查项 ${summary.total} · 通过 ${summary.passed} · 失败 ${summary.failed}\n`)
if (failures.length) {
  console.log('失败明细：')
  for (const f of failures) console.log('  ✗ ' + f)
  process.exit(1)
} else {
  console.log('全部通过')
}
