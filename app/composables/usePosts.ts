/**
 * 文章查询的单一入口。
 *
 * 存在的理由：draft 过滤、排序规则（pinned DESC, date DESC）、
 * 以及"生产环境跳过草稿、本地 ?draft=1 可预览"这套逻辑，
 * 如果散落在 8 个页面里，必然有地方漏。
 */

import { toSlug } from '~/utils/taxonomy'

export interface PostSummary {
  path: string
  title: string
  description: string
  date: string
  updated?: string
  tags: string[]
  category: string
  cover?: string
  draft: boolean
  pinned: boolean
}

export function usePosts() {
  /**
   * 是否包含草稿。
   * 生产构建永远 false；开发环境允许 ?draft=1 预览（提示词 §8）。
   */
  function includeDrafts(): boolean {
    if (import.meta.dev) {
      if (import.meta.client) {
        return new URLSearchParams(window.location.search).get('draft') === '1'
      }
      return false
    }
    return false
  }

  /** 拉取全部文章（已按 pinned DESC, date DESC 排序） */
  async function list(): Promise<PostSummary[]> {
    const query = queryCollection('posts')
      .select(
        'path',
        'title',
        'description',
        'date',
        'updated',
        'tags',
        'category',
        'cover',
        'draft',
        'pinned',
      )
      .order('pinned', 'DESC')
      .order('date', 'DESC')

    const rows = (await query.all()) as unknown as PostSummary[]

    const withDrafts = includeDrafts()
    return rows.filter((r) => withDrafts || !r.draft)
  }

  /** 置顶文章 */
  async function pinned(limit: number): Promise<PostSummary[]> {
    const all = await list()
    return all.filter((p) => p.pinned).slice(0, limit)
  }

  /** 最新文章（排除置顶） */
  async function latest(limit: number): Promise<PostSummary[]> {
    const all = await list()
    return all.filter((p) => !p.pinned).slice(0, limit)
  }

  /** 按分类 */
  async function byCategory(category: string): Promise<PostSummary[]> {
    const all = await list()
    return all.filter((p) => p.category === category)
  }

  /** 按标签 */
  async function byTag(tag: string): Promise<PostSummary[]> {
    const all = await list()
    return all.filter((p) => p.tags.includes(tag))
  }

  /**
   * 用 URL slug 反查分类原名。
   * slug 转换是有损的（去掉了标点），不能直接 decode 反推，
   * 必须拿 slug 和已知分类列表比对。
   */
  async function categoryBySlug(slug: string): Promise<string | null> {
    const all = await categories()
    return all.find((c) => toSlug(c.name) === slug)?.name ?? null
  }

  /** 用 URL slug 反查标签原名 */
  async function tagBySlug(slug: string): Promise<string | null> {
    const all = await tags()
    return all.find((t) => toSlug(t.name) === slug)?.name ?? null
  }

  /** 全部分类 + 篇数 */
  async function categories(): Promise<Array<{ name: string; count: number; slug: string }>> {
    const all = await list()
    const map = new Map<string, number>()
    for (const p of all) map.set(p.category, (map.get(p.category) ?? 0) + 1)
    return [...map.entries()]
      .map(([name, count]) => ({ name, count, slug: toSlug(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }

  /** 全部标签 + 篇数 */
  async function tags(): Promise<Array<{ name: string; count: number; slug: string }>> {
    const all = await list()
    const map = new Map<string, number>()
    for (const p of all) {
      for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1)
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count, slug: toSlug(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }

  /** 按年分组（归档页） */
  async function byYear(): Promise<Array<{ year: number; posts: PostSummary[] }>> {
    const all = await list()
    const map = new Map<number, PostSummary[]>()
    for (const p of all) {
      const y = new Date(p.date).getFullYear()
      if (!map.has(y)) map.set(y, [])
      map.get(y)!.push(p)
    }
    return [...map.entries()]
      .map(([year, posts]) => ({ year, posts }))
      .sort((a, b) => b.year - a.year)
  }

  /** 上一篇 / 下一篇：同分类优先，否则按时间相邻 */
  async function prevNext(path: string): Promise<{
    prev: PostSummary | null
    next: PostSummary | null
  }> {
    const all = await list()
    const idx = all.findIndex((p) => p.path === path)
    if (idx === -1) return { prev: null, next: null }

    const current = all[idx]!

    // all 已按 date DESC，所以 idx-1 是更新的，idx+1 是更旧的
    const newer = all.slice(0, idx)
    const older = all.slice(idx + 1)

    const pick = (pool: PostSummary[]) => {
      if (!pool.length) return null
      // 同分类优先
      const sameCat = pool.find((p) => p.category === current.category)
      return sameCat ?? pool[0]!
    }

    return {
      prev: pick(newer),
      next: pick(older),
    }
  }

  /** 相关文章：同分类或共享标签，按共享度排序 */
  async function related(path: string, limit: number): Promise<PostSummary[]> {
    const all = await list()
    const current = all.find((p) => p.path === path)
    if (!current) return []

    const scored = all
      .filter((p) => p.path !== path)
      .map((p) => {
        let score = 0
        if (p.category === current.category) score += 3
        const shared = p.tags.filter((t) => current.tags.includes(t)).length
        score += shared * 2
        return { post: p, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime())

    return scored.slice(0, limit).map((x) => x.post)
  }

  return {
    list,
    pinned,
    latest,
    byCategory,
    byTag,
    categoryBySlug,
    tagBySlug,
    categories,
    tags,
    byYear,
    prevNext,
    related,
  }
}
