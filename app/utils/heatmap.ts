/**
 * 发文热力图的数据构建：把文章列表折叠成「日期 → 当日发文数 → 色阶」。
 * 纯函数，构建期（useAsyncData 内）执行后随 payload 序列化到客户端，
 * 避免两端各自以「今天」为锚点计算造成的 SSG 水合不一致。
 */

export interface HeatDay {
  /** YYYY-MM-DD */
  date: string
  count: number
  /** 0-4 色阶（0 为无发文；1-4 按窗口内最大值四分） */
  level: number
}

export interface HeatData {
  /** 窗口内每一天（连续 totalDays 天，按 UTC 日键） */
  days: HeatDay[]
  /** 网格首列前需要的空占位数（起点未落在周日时补齐，使列按整周对齐） */
  leadingBlanks: number
  /** 窗口内发文总数（汇总文案用） */
  total: number
}

const DAY_MS = 86_400_000

function dayKeyOf(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * 生成过去 weeks*7 天的逐日热力数据。
 * 窗口终点为 end（构建当日）；文章日期早于窗口或晚于终点的不计入。
 */
export function buildHeatmapDays(
  posts: Array<{ date: string }>,
  end: Date,
  weeks = 53,
): HeatData {
  const totalDays = weeks * 7
  const endKey = dayKeyOf(end)
  const startMs = end.getTime() - (totalDays - 1) * DAY_MS
  const startKey = dayKeyOf(new Date(startMs))

  const counts = new Map<string, number>()
  for (const p of posts) {
    const ts = new Date(p.date).getTime()
    if (Number.isNaN(ts)) continue
    const key = dayKeyOf(new Date(ts))
    if (key < startKey || key > endKey) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const max = Math.max(0, ...counts.values())
  const days: HeatDay[] = []
  let total = 0
  for (let i = 0; i < totalDays; i++) {
    const key = dayKeyOf(new Date(startMs + i * DAY_MS))
    const count = counts.get(key) ?? 0
    total += count
    days.push({
      date: key,
      count,
      level: count === 0 || max === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)),
    })
  }

  return {
    days,
    // 起点按 UTC 周日=0 对齐列；文章日期串均按 UTC 午夜解析，两端一致
    leadingBlanks: days.length ? new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay() : 0,
    total,
  }
}
