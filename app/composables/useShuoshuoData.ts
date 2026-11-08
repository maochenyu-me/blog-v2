import { fetchEch0All, type Ech0Echo } from '~/utils/ech0'

/**
 * 说说数据的共享访问层：首页轮播条与 /shuoshuo 页共用同一次请求。
 * module 级状态在客户端路由切换间存活，已就绪后不再重复拉取。
 */
type ShuoshuoState = 'idle' | 'loading' | 'ready' | 'failed'

const echos = ref<Ech0Echo[]>([])
const state = ref<ShuoshuoState>('idle')
let inflight: Promise<void> | null = null

export function useShuoshuoData() {
  const pageCfg = usePageConfig('shuoshuo')

  function load(): Promise<void> | undefined {
    if (state.value === 'ready' || inflight) return inflight
    state.value = 'loading'
    inflight = (async () => {
      try {
        echos.value = await fetchEch0All(pageCfg.apiBase)
        state.value = 'ready'
      } catch {
        state.value = 'failed'
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  function reset() {
    state.value = 'idle'
    echos.value = []
  }

  return { echos, state, load, reset }
}
