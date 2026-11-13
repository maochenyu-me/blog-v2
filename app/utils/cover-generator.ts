export const COVER_RATIOS = {
  '4:3': [4 / 3, 1],
  '16:9': [16 / 9, 1],
  '2:3': [2 / 3, 1],
  '1:1': [1, 1],
  '3:2': [3 / 2, 1],
  '9:16': [9 / 16, 1],
} as const

export type CoverRatio = keyof typeof COVER_RATIOS

export const COVER_ICON_PRESETS = [
  { id: 'sparkles', label: '灵感', glyph: '✦' },
  { id: 'book', label: '书本', glyph: '▤' },
  { id: 'code', label: '代码', glyph: '</>' },
  { id: 'camera', label: '相机', glyph: '◉' },
  { id: 'music', label: '音乐', glyph: '♫' },
  { id: 'leaf', label: '自然', glyph: '❋' },
] as const

export function dimensionsForRatio(ratio: CoverRatio | string, scale: number) {
  const dimensions = COVER_RATIOS[ratio as CoverRatio]
  if (!dimensions) throw new Error(`Unsupported aspect ratio: ${ratio}`)
  const safeScale = Number.isFinite(scale) && scale > 0 ? Math.min(scale, 4) : 1
  const [widthRatio, heightRatio] = dimensions
  const height = Math.round(600 * safeScale)
  return { width: Math.round(height * widthRatio / heightRatio), height }
}

export interface CoverRenderOptions {
  width: number
  height: number
  leftText: string
  rightText: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
  backgroundTransparent: boolean
  backgroundImage?: HTMLImageElement | null
  iconImage?: HTMLImageElement | null
  iconVisible: boolean
  iconSize: number
  iconRadius: number
  iconBackground: string
  iconBackgroundEnabled: boolean
  gap: number
  originalIconColor: boolean
  iconColor: string
  shadowColor: string
  shadowBlur: number
  shadowX: number
  shadowY: number
  shadowOpacity: number
}

function colorWithOpacity(color: string, opacity: number) {
  const value = Math.max(0, Math.min(1, opacity))
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${value})`
  }
  return color
}

export function drawCover(ctx: CanvasRenderingContext2D, options: CoverRenderOptions) {
  const { width, height } = options
  ctx.clearRect(0, 0, width, height)

  const backgroundOpacity = Math.max(0, Math.min(1, options.backgroundOpacity))
  const baseAlpha = options.backgroundTransparent ? 0 : 1
  if (options.backgroundImage) {
    const image = options.backgroundImage
    const imageScale = Math.max(width / image.width, height / image.height)
    const drawWidth = image.width * imageScale
    const drawHeight = image.height * imageScale
    ctx.save()
    ctx.globalAlpha = baseAlpha * backgroundOpacity
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = baseAlpha * backgroundOpacity
  ctx.fillStyle = options.backgroundColor
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  const unit = height / 600
  const hasIcon = options.iconVisible && !!options.iconImage
  const baseIconSize = hasIcon ? options.iconSize * unit : 0
  const baseFontSize = options.fontSize * unit
  const baseGap = baseIconSize ? options.gap * unit : 0
  const texts = [options.leftText.trim(), options.rightText.trim()].filter(Boolean)
  ctx.save()
  const baseFont = `${options.fontWeight} ${baseFontSize}px "${options.fontFamily}", sans-serif`
  ctx.font = baseFont
  const baseWidths = texts.map(text => ctx.measureText(text).width)
  const baseTextWidth = baseWidths.reduce((sum, value) => sum + value, 0)
  const contentWidth = baseTextWidth + baseIconSize + baseGap * texts.length
  const contentScale = contentWidth > 0 ? Math.min(1, Math.max(0.2, (width - 48 * unit) / contentWidth)) : 1
  const iconSize = baseIconSize * contentScale
  const fontSize = baseFontSize * contentScale
  const gap = baseGap * contentScale
  ctx.font = `${options.fontWeight} ${fontSize}px "${options.fontFamily}", sans-serif`
  const widths = texts.map(text => ctx.measureText(text).width)
  const scaledContentWidth = widths.reduce((sum, value) => sum + value, 0) + iconSize + gap * texts.length
  let x = (width - scaledContentWidth) / 2
  let iconDrawn = false
  const centerY = height / 2

  ctx.shadowColor = colorWithOpacity(options.shadowColor, options.shadowOpacity)
  ctx.shadowBlur = options.shadowBlur * unit
  ctx.shadowOffsetX = options.shadowX * unit
  ctx.shadowOffsetY = options.shadowY * unit

  for (let index = 0; index < texts.length; index++) {
    ctx.fillStyle = options.textColor
    ctx.textBaseline = 'middle'
    ctx.fillText(texts[index]!, x, centerY)
    x += widths[index]!
    if (index === 0 && iconSize) {
      x += gap
      drawIcon(ctx, options.iconImage!, x, centerY - iconSize / 2, iconSize, options.iconRadius, options.originalIconColor, options.iconBackground, options.iconBackgroundEnabled, options.iconColor)
      x += iconSize + gap
      iconDrawn = true
    }
  }

  if (hasIcon && !iconDrawn) {
    drawIcon(ctx, options.iconImage!, (width - iconSize) / 2, centerY - iconSize / 2, iconSize, options.iconRadius, options.originalIconColor, options.iconBackground, options.iconBackgroundEnabled, options.iconColor)
  }
  ctx.restore()
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  size: number,
  radiusPercent: number,
  originalColor: boolean,
  background: string,
  backgroundEnabled: boolean,
  iconColor: string,
) {
  const radius = size * Math.max(0, Math.min(50, radiusPercent)) / 100
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, radius)
  ctx.clip()
  if (backgroundEnabled) {
    ctx.fillStyle = background
    ctx.fillRect(x, y, size, size)
  }
  ctx.drawImage(image, x, y, size, size)
  if (!originalColor) {
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = iconColor
    ctx.fillRect(x, y, size, size)
  }
  ctx.restore()
}
