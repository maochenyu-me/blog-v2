export interface SiteStatsPost {
  date: string | Date
  updated?: string | Date
  description?: string
  draft?: boolean
  body?: unknown
}

export function countPostWords(post: SiteStatsPost): number {
  const text = post.body
    ? JSON.stringify(post.body).replace(/"[^"]*":/g, '')
    : post.description ?? ''
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length
  const words = (text.match(/[a-zA-Z0-9]+/g) ?? []).length
  return cjk + words
}

export function getLatestPostDate(posts: SiteStatsPost[]): string | null {
  if (!posts.length) return null
  const timestamps = posts.map((post) => {
    const value = post.updated ?? post.date
    return value instanceof Date ? value.getTime() : new Date(value).getTime()
  }).filter(Number.isFinite)
  if (!timestamps.length) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

export function aggregateSiteStats(posts: SiteStatsPost[]) {
  const published = posts.filter((post) => !post.draft)
  return {
    postCount: published.length,
    wordCount: published.reduce((sum, post) => sum + countPostWords(post), 0),
    latestUpdate: getLatestPostDate(published),
  }
}

export function getRelativeDateParts(date: string | Date, now: number) {
  const timestamp = date instanceof Date ? date.getTime() : new Date(date).getTime()
  if (!Number.isFinite(timestamp)) return null
  const days = Math.max(0, Math.floor((now - timestamp) / 86_400_000))
  if (days === 0) return { key: 'today' as const, amount: 0 }
  if (days < 30) return { key: 'days' as const, amount: days }
  const months = Math.floor(days / 30)
  if (months < 12) return { key: 'months' as const, amount: months }
  return { key: 'years' as const, amount: Math.floor(days / 365) }
}
