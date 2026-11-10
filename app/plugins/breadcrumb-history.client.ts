/**
 * 面包屑「返回上一页」的来源记录。
 *
 * 为什么放在 plugin 而不是组件里：面包屑组件只在内容页挂载，
 * 而「从首页点进文章」这一步的来路（/）需要在**首页也**被记下 ——
 * 组件内的 watch 只在挂载期间生效，覆盖不到。
 *
 * 契约：始终把「上一次的 fullPath」写进 sessionStorage，只存同源站内路径。
 * 直接打开页面（无来路）时该键为空，面包屑回退到首页。
 */
const BACK_KEY = 'breadcrumb-back'

/** 只接受站内绝对路径：挡掉协议、协议相对 //、以及空值 */
function isLocalPath(value: string | null): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//')
}

export default defineNuxtPlugin(() => {
  const route = useRoute()

  watch(
    () => route.fullPath,
    (to, from) => {
      if (!from || from === to) return
      if (!isLocalPath(from)) return
      try {
        sessionStorage.setItem(BACK_KEY, from)
      } catch {
        // 隐私模式下 sessionStorage 不可写：静默降级为「回首页」
      }
    },
  )
})
