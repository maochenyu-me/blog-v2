/**
 * 生成极简几何封面图 + 头像 + 友链头像。
 * 纯 SVG 转 PNG（用 sharp，nuxt-og-image 的依赖里已有，或直接装）。
 * 设计语言：zinc 灰阶底 + 单一陶土强调色，无渐变、无插画。
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const OUT = resolve(process.cwd(), 'public/images')

const INK = '#18181b'
const PAPER = '#fafafa'
const BORDER = '#e4e4e7'
const ACCENT = '#a94f33'

/** 封面：1200x630，与 OG 尺寸一致 */
function coverSvg(kind, seed) {
  const W = 1200
  const H = 630
  const rnd = (n) => {
    let x = seed * 9301 + 49297
    return Math.floor(((x % 233280) / 233280) * n)
  }

  let art = ''

  if (kind === 'zigzag') {
    // 斜线阵列：等距 45° 线，粗细交替
    const lines = []
    for (let i = -H; i < W + H; i += 28) {
      const bold = (i / 28) % 3 === 0
      lines.push(
        `<line x1="${i}" y1="0" x2="${i + H}" y2="${H}" stroke="${bold ? ACCENT : BORDER}" stroke-width="${bold ? 3 : 1}" />`,
      )
    }
    art = lines.join('')
  } else if (kind === 'halftone') {
    // 半调网点：半径随位置梯度变化
    const dots = []
    const step = 34
    for (let y = step / 2; y < H; y += step) {
      for (let x = step / 2; x < W; x += step) {
        const d = Math.hypot(x - W * 0.72, y - H * 0.42) / (W * 0.75)
        const r = Math.max(0.6, (1 - d) * 9)
        const isAccent = d < 0.16
        dots.push(
          `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${isAccent ? ACCENT : INK}" opacity="${(1 - d * 0.72).toFixed(2)}" />`,
        )
      }
    }
    art = dots.join('')
  } else if (kind === 'grid') {
    // 网格 + 一个偏移的实心方块
    const cells = []
    const step = 40
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if ((x / step + y / step) % 2 === 0) {
          cells.push(
            `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="${INK}" opacity="0.05" />`,
          )
        }
      }
    }
    const bx = rnd(400) + 120
    const by = rnd(200) + 80
    cells.push(`<rect x="${bx}" y="${by}" width="200" height="200" fill="${ACCENT}" />`)
    cells.push(
      `<rect x="${bx + 14}" y="${by + 14}" width="200" height="200" fill="none" stroke="${INK}" stroke-width="2" />`,
    )
    art = cells.join('')
  } else if (kind === 'bars') {
    // 不等长横条（垂直居中，粗条=标题的隐喻）
    const bars = []
    const heights = [18, 6, 6, 34, 6, 6, 6, 52, 6, 6, 24, 6]
    const gap = 14
    const totalH = heights.reduce((a, b) => a + b, 0) + gap * (heights.length - 1)
    let y = (H - totalH) / 2
    for (const h of heights) {
      const w = 360 + rnd(520)
      const isAccent = h > 30
      bars.push(
        `<rect x="${(W - w) / 2}" y="${y}" width="${w}" height="${h}" fill="${isAccent ? ACCENT : INK}" opacity="${isAccent ? 1 : 0.16}" />`,
      )
      y += h + gap
    }
    art = bars.join('')
  } else {
    // cross：大十字 + 对角短线
    const parts = []
    parts.push(
      `<rect x="${W / 2 - 3}" y="0" width="6" height="${H}" fill="${BORDER}" />`,
    )
    parts.push(
      `<rect x="0" y="${H / 2 - 3}" width="${W}" height="6" fill="${BORDER}" />`,
    )
    parts.push(
      `<rect x="${W / 2 - 90}" y="${H / 2 - 90}" width="180" height="180" fill="${ACCENT}" />`,
    )
    art = parts.join('')
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}" />
  <g>${art}</g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${BORDER}" stroke-width="1" />
</svg>`
}

/** 头像：zinc 底 + 陶土方块 + 猫耳剪影（极简几何，不画插画） */
function avatarSvg(size) {
  const s = size
  const u = s / 100
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${INK}" />
  <path d="M28 44 L28 26 L42 36 Z" fill="${ACCENT}" />
  <path d="M72 44 L72 26 L58 36 Z" fill="${ACCENT}" />
  <circle cx="50" cy="58" r="22" fill="${ACCENT}" />
  <circle cx="42" cy="55" r="2.6" fill="${INK}" />
  <circle cx="58" cy="55" r="2.6" fill="${INK}" />
  <path d="M46 65 Q50 68 54 65" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round" />
  <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="${PAPER}" stroke-opacity="0.12" stroke-width="1" />
</svg>`
}

/** 友链头像：姓名首字母方块 */
function letterSvg(letter, bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${bg}" />
  <text x="100" y="100" font-family="Inter, sans-serif" font-size="88" font-weight="700"
        fill="${fg}" text-anchor="middle" dominant-baseline="central">${letter}</text>
</svg>`
}

const covers = [
  ['typography', 'bars', 7],
  ['charset', 'halftone', 13],
  ['view-transition', 'zigzag', 23],
]

const friends = [
  ['2xnz', '2', INK, PAPER],
  ['antfu', 'A', ACCENT, PAPER],
  ['leerob', 'L', INK, PAPER],
  ['paco', 'P', ACCENT, PAPER],
  ['rauno', 'R', INK, PAPER],
]

async function main() {
  await mkdir(resolve(OUT, 'covers'), { recursive: true })
  await mkdir(resolve(OUT, 'links'), { recursive: true })

  // 文章封面
  for (const [name, kind, seed] of covers) {
    const svg = Buffer.from(coverSvg(kind, seed))
    await sharp(svg).png({ compressionLevel: 9 }).toFile(resolve(OUT, 'covers', `${name}.png`))
    console.log('cover:', name)
  }

  // 头像 32 / 180 / 512 三档（提示词 §13 favicon）
  for (const size of [32, 180, 512]) {
    const svg = Buffer.from(avatarSvg(size))
    await sharp(svg).png({ compressionLevel: 9 }).toFile(resolve(OUT, `avatar-${size}.png`))
    console.log('avatar:', size)
  }

  // 主头像（页面用）
  await sharp(Buffer.from(avatarSvg(400)))
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, 'avatar.png'))

  // 友链头像
  for (const [name, letter, bg, fg] of friends) {
    await sharp(Buffer.from(letterSvg(letter, bg, fg)))
      .png({ compressionLevel: 9 })
      .toFile(resolve(OUT, 'links', `${name}.png`))
    console.log('link:', name)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
