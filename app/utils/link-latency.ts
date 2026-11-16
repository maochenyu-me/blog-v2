/**
 * 友链延迟 —— 数据源是 FCLite / fcircle 的 link.json（友链爬虫的最近一次探测结果）。
 *
 * 这份文件只做三件事：把远端 JSON 归一成「链接键 → 探测结果」的 Map、
 * 把秒换算成展示口径、按阈值给状态分档。取数、缓存、渲染都在别处。
 *
 * 为什么按链接键匹配而不是按名字：名字是友链站长自己起的，改一次名就对不上了；
 * 域名才是稳定标识。归一化规则见 linkKey()。
 */

/** 延迟档位：快 / 正常 / 慢 / 不可达（颜色与文案都由调用方按档位决定） */
export type LinkLatencyTone = 'fast' | 'ok' | 'slow' | 'down'

/** 单个站点的探测结果 */
export interface LinkLatency {
  /** 是否可达。不可达时 latency 可能仍是上次的值，所以档位判定优先看它 */
  reachable: boolean
  /** 响应耗时，单位秒（link.json 原样，如 0.03 / 0.96 / 2.22） */
  latency: number
}

/** link.json 的字段形态（只声明用得到的部分，其余忽略） */
export interface LinkLatencyPayload {
  link_data?: Array<{
    link?: string
    reachable?: boolean
    latency?: number
  }>
}

/**
 * 归一化链接键：主机名小写、去 www 前缀、路径去尾斜杠。
 *
 * 同一站点在 JSON 里常写成 `https://blog.zhilu.site/`，本地友链写 `https://blog.zhilu.site`，
 * 尾斜杠与 www 是两边最常见的差异，必须抹平才不会漏配。
 */
export function linkKey(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const path = parsed.pathname.replace(/\/+$/, '')
    return `${host}${path}${parsed.search}`
  } catch {
    // 不是合法 URL（缺协议等）时退化成去尾斜杠的字符串比较
    return url.trim().toLowerCase().replace(/\/+$/, '')
  }
}

/** 把远端 JSON 解析成 Map；结构不符时返回空 Map（调用方据此不渲染徽标） */
export function parseLinkLatency(payload: unknown): Map<string, LinkLatency> {
  const map = new Map<string, LinkLatency>()
  const rows = (payload as LinkLatencyPayload | null)?.link_data
  if (!Array.isArray(rows)) return map

  for (const row of rows) {
    if (!row?.link) continue
    const latency = Number(row.latency)
    // 缺失、NaN 或负值都不代表一次有效探测；跳过而不是伪造 0 MS。
    if (!Number.isFinite(latency) || latency < 0) continue
    map.set(linkKey(row.link), {
      reachable: row.reachable !== false,
      latency,
    })
  }
  return map
}

/**
 * 展示口径（与参考站一致）：不足 1 秒按整数毫秒，≥1 秒按秒并保留一位小数。
 * 返回数值与单位，文案由 ui.links.latencyMs / latencySec 拼。
 */
export function linkLatencyValue(status: LinkLatency): { value: number; unit: 'ms' | 's' } {
  const ms = Math.round(status.latency * 1000)
  if (ms < 1000) return { value: ms, unit: 'ms' }
  return { value: Math.round(ms / 100) / 10, unit: 's' }
}

/** 按阈值分档：≤ fastMs 快，≤ slowMs 正常，再高为慢；不可达优先 */
export function linkLatencyTone(status: LinkLatency, fastMs: number, slowMs: number): LinkLatencyTone {
  if (!status.reachable) return 'down'
  const ms = status.latency * 1000
  if (ms <= fastMs) return 'fast'
  return ms <= slowMs ? 'ok' : 'slow'
}
