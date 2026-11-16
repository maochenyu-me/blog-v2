/**
 * 友链延迟取数 —— 客户端拉一次 fcircle 的 link.json，供友链卡片显示「可达 + 响应耗时」。
 *
 * 为什么不在构建期抓：这是别人家的探针数据，会随检测周期变化，
 * 预渲染进 HTML 就成了一具标本；也要避免构建时依赖第三方可用性。
 *
 * 缓存三层：module 级单例（同一次会话切页面不重拉）→ sessionStorage（刷新后仍有效，
 * 按 refreshMinutes 过期）→ 都没有才发请求。失败就静默，卡片退回原样，不显示假数据。
 */
import { linkKey, parseLinkLatency, type LinkLatency } from '~/utils/link-latency'

/** 取数状态：idle 未开始 / loading 请求中 / ready 有数据 / failed 失败（失败时整块不渲染） */
export type LinkLatencyState = 'idle' | 'loading' | 'ready' | 'failed'

const STORAGE_KEY = 'kemiao:link-latency'

const statuses = shallowRef<Map<string, LinkLatency>>(new Map())
const state = ref<LinkLatencyState>('idle')
const fetchedAt = ref(0)

let inflight: Promise<void> | null = null

interface CachedRow extends LinkLatency {
  key: string
}

interface CachedPayload {
  at: number
  rows: CachedRow[]
}

function readCache(ttlMinutes: number): Map<string, LinkLatency> | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedPayload
    if (!cached?.at || !Array.isArray(cached.rows) || !cached.rows.length) return null
    if (Date.now() - cached.at > ttlMinutes * 60_000) return null
    fetchedAt.value = cached.at
    return new Map(cached.rows.map(row => [row.key, { reachable: row.reachable, latency: row.latency }]))
  } catch {
    // 隐私模式 / 配额满 / 脏数据：当作没有缓存，继续走网络
    return null
  }
}

function writeCache(map: Map<string, LinkLatency>): void {
  if (!import.meta.client) return
  try {
    const rows: CachedRow[] = [...map].map(([key, value]) => ({ key, ...value }))
    const payload: CachedPayload = { at: Date.now(), rows }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 写不进去不影响本次渲染
  }
}

export function useLinkLatency() {
  const config = usePageConfig('links').latency
  const enabled = config?.enabled !== false
  const endpoint = config?.endpoint ?? ''
  const ttlMinutes = config?.refreshMinutes ?? 30

  /** 拉取探测结果。已有数据 / 正在请求 / 关闭时不重复发请求。 */
  async function load(): Promise<void> {
    if (!enabled || !endpoint) return
    if (state.value === 'ready' || inflight) return

    const cached = readCache(ttlMinutes)
    if (cached) {
      statuses.value = cached
      state.value = 'ready'
      return
    }

    state.value = 'loading'
    inflight = $fetch<unknown>(endpoint, { headers: { Accept: 'application/json' }, timeout: 8000 })
      .then((payload) => {
        const map = parseLinkLatency(payload)
        if (!map.size) {
          state.value = 'failed'
          return
        }
        statuses.value = map
        fetchedAt.value = Date.now()
        writeCache(map)
        state.value = 'ready'
      })
      .catch(() => {
        state.value = 'failed'
      })
      .finally(() => {
        inflight = null
      })
    await inflight
  }

  /** 按友链 URL 取探测结果；未命中返回 undefined，调用方据此不渲染延迟 */
  function statusOf(url: string): LinkLatency | undefined {
    return statuses.value.get(linkKey(url))
  }

  return { statuses, state, fetchedAt, load, statusOf }
}
