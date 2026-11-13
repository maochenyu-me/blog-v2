export const TIER_ROWS = [
  { id: 'hang', label: '夯', color: '#e5484d' },
  { id: 'top', label: '顶级', color: '#f08a3c' },
  { id: 'elite', label: '人上人', color: '#f2c94c' },
  { id: 'npc', label: 'NPC', color: '#f5cfa8' },
  { id: 'la', label: '拉', color: '#ffffff' },
] as const

export type TierId = typeof TIER_ROWS[number]['id']
export type TierZone = TierId | 'pool'

export interface TierItem {
  id: string
  name: string
  src: string
  ratio: number
}

export type TierState = Record<TierId, TierItem[]> & { pool: TierItem[] }

export function createTierState(): TierState {
  return {
    pool: [],
    hang: [],
    top: [],
    elite: [],
    npc: [],
    la: [],
  }
}

export function distributeTierItems(state: TierState, items: TierItem[]): TierState {
  return { ...state, pool: [...state.pool, ...items] }
}

export function tierCounts(state: TierState) {
  const total = TIER_ROWS.reduce((count, tier) => count + state[tier.id].length, state.pool.length)
  const ranked = TIER_ROWS.reduce((count, tier) => count + state[tier.id].length, 0)
  return { total, pending: state.pool.length, ranked }
}

export function moveTierItem(state: TierState, itemId: string, from: TierZone, to: TierZone, index: number): TierState {
  if (!(from === 'pool' || TIER_ROWS.some(tier => tier.id === from)) || !(to === 'pool' || TIER_ROWS.some(tier => tier.id === to))) return state
  const source = state[from]
  const sourceIndex = source.findIndex(item => item.id === itemId)
  if (sourceIndex < 0) return state
  const item = source[sourceIndex]!
  const nextSource = [...source]
  nextSource.splice(sourceIndex, 1)
  if (from === to) {
    const insertionIndex = Math.max(0, Math.min(index, nextSource.length))
    nextSource.splice(insertionIndex, 0, item)
    return { ...state, [from]: nextSource }
  }
  const nextTarget = [...state[to]]
  nextTarget.splice(Math.max(0, Math.min(index, nextTarget.length)), 0, item)
  return { ...state, [from]: nextSource, [to]: nextTarget }
}

export function removeTierItem(state: TierState, itemId: string): TierState {
  for (const zone of ['pool', ...TIER_ROWS.map(tier => tier.id)] as TierZone[]) {
    if (state[zone].some(item => item.id === itemId)) return { ...state, [zone]: state[zone].filter(item => item.id !== itemId) }
  }
  return state
}

export async function exportTierList(state: TierState, title: string): Promise<Blob> {
  const images = new Map<string, HTMLImageElement>()
  for (const item of TIER_ROWS.flatMap(tier => state[tier.id])) {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('有图片无法载入，暂时不能导出'))
      image.src = item.src
    })
    images.set(item.id, image)
  }

  const width = 900
  const padding = 6
  const labelWidth = 100
  const rowGap = 2
  const titleHeight = title.trim() ? 78 : 0
  const rowLayouts = TIER_ROWS.map(tier => {
    const cards = state[tier.id].map(item => {
      const image = images.get(item.id)!
      const aspectRatio = image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1
      const cardWidth = Math.max(1, Math.min(Math.round(100 * aspectRatio), width - 2 * padding))
      const cardHeight = Math.min(100, cardWidth / aspectRatio)
      return { item, image, width: cardWidth, height: cardHeight, line: 0, x: padding }
    })
    let line = 0
    let x = padding
    for (const card of cards) {
      if (x > padding && x + card.width + padding > width - labelWidth) {
        line++
        x = padding
      }
      card.line = line
      card.x = x
      x += card.width + padding
    }
    const lines = cards.length ? line + 1 : 1
    return { tier, cards, height: lines * 100 + (lines + 1) * padding }
  })
  const height = titleHeight + rowLayouts.reduce((sum, row) => sum + row.height + rowGap, 0) + padding
  const canvas = document.createElement('canvas')
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持图片导出')
  ctx.scale(2, 2)
  ctx.fillStyle = '#171717'
  ctx.fillRect(0, 0, width, height)

  if (titleHeight) {
    ctx.fillStyle = '#ededed'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let fontSize = 46
    while (fontSize > 16) {
      ctx.font = `bold ${fontSize}px sans-serif`
      if (ctx.measureText(title).width <= width - 32) break
      fontSize -= 2
    }
    ctx.fillText(title, width / 2, titleHeight / 2)
  }

  let y = titleHeight + rowGap
  for (const row of rowLayouts) {
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(labelWidth, y, width - labelWidth, row.height)
    ctx.fillStyle = row.tier.color
    ctx.fillRect(0, y, labelWidth, row.height)
    ctx.fillStyle = row.tier.id === 'hang' ? '#ffffff' : '#171717'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const labelSize = row.tier.label.length >= 3 ? 14 : row.tier.label.length === 2 ? 22 : 28
    ctx.font = `bold ${labelSize}px sans-serif`
    ctx.fillText(row.tier.label, labelWidth / 2, y + row.height / 2)
    for (const card of row.cards) {
      const cardY = y + padding + card.line * (100 + padding) + (100 - card.height) / 2
      const cardX = labelWidth + card.x
      ctx.drawImage(card.image, cardX, cardY, card.width, card.height)
    }
    y += row.height + rowGap
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('排名图导出失败，请重试')), 'image/png')
  })
}
