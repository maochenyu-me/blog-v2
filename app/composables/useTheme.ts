/**
 * 三态主题：light / dark / system（提示词 §12）
 * - localStorage 持久化用户选择
 * - system 模式跟随 prefers-color-scheme 实时变化
 * - 切换是瞬时换类（LiuShen 式）：不跑 View Transition 圆形扩散
 *
 * 为什么不用圆形扩散（实测归因，2026-11-19）：
 * 参考站 blog.liushen.fun 的切换就是 data-theme 瞬时跳变——无 VT、
 * 无全局颜色过渡。本项目此前用 VT 圆形扩散，掉帧来自四笔账：
 *   F1 背景 webp 换档（下载+解码+全屏 fixed 层重栅格）max 90~110ms
 *   F2 18 个 backdrop-filter + 背景 6px blur 重栅格    p95 +40ms
 *   F3 ~290 个颜色过渡同时启动                        p95 +100ms
 *   F4 VT 快照单帧                                    ~18~36ms
 * F3/F4 由「带动画切换」这个决策本身引入，砍掉动画即归零；F1/F2
 * 由 data-theme-switching 瞬时兜底（见 main.css 同名规则）。
 */

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = THEME_STORAGE_KEY

export function useTheme() {
  const appConfig = useAppConfig()
  const themeCfg = (appConfig.theme as any).darkMode as {
    defaultMode: ThemeMode
  }

  const mode = useState<ThemeMode>('theme-mode', () => themeCfg.defaultMode)
  const isDark = useState<boolean>('theme-is-dark', () => false)

  /** 系统偏好 */
  function systemPrefersDark(): boolean {
    if (!import.meta.client) return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function resolve(m: ThemeMode): boolean {
    return m === 'system' ? systemPrefersDark() : m === 'dark'
  }

  function applyClass(dark: boolean) {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('dark', dark)
    isDark.value = dark
  }

  function readStored(): ThemeMode {
    if (!import.meta.client) return themeCfg.defaultMode
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : themeCfg.defaultMode
  }

  /** 初始化：客户端挂载后同步一次 */
  function init() {
    if (!import.meta.client) return
    mode.value = readStored()
    applyClass(resolve(mode.value))

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (mode.value === 'system') applyClass(systemPrefersDark())
    }
    mq.addEventListener('change', onChange)
  }

  // —— 切换冻结（LiuShen 式瞬时切换的兜底）———————————————
  // 挂 data-theme-switching 的一瞬间，main.css 会把全站 transition
  // 与 backdrop-filter 压成 none：换类后 ~290 个颜色过渡不再同时
  // 启动（F3），毛玻璃不再整批重栅格（F2）。属性延后到下一个任
  // 务摘除，避免与最后一帧重栅格同帧叠加。
  let switchingDepth = 0
  let unlockTimer: ReturnType<typeof setTimeout> | undefined

  function lockSwitch() {
    switchingDepth++
    document.documentElement.setAttribute('data-theme-switching', '')
    if (unlockTimer !== undefined) clearTimeout(unlockTimer)
    // 1500ms 兜底：即使 unlock 因异常未执行，玻璃与过渡也能恢复
    unlockTimer = setTimeout(() => {
      switchingDepth = 0
      document.documentElement.removeAttribute('data-theme-switching')
    }, 1500)
  }

  function unlockSwitch() {
    if (--switchingDepth > 0) return
    if (unlockTimer !== undefined) {
      clearTimeout(unlockTimer)
      unlockTimer = undefined
    }
    setTimeout(() => {
      if (switchingDepth === 0) document.documentElement.removeAttribute('data-theme-switching')
    }, 0)
  }

  /** 瞬时切换（无动画）。动画与否是产品决策：参考站即瞬时跳变。 */
  function setMode(next: ThemeMode, _origin?: { x: number; y: number }) {
    if (!import.meta.client) return

    // 广播切换意图：重动画区块（友链魔方）监听后暂停 1.2s。切主题
    // 仍会整批重绘全站毛玻璃，与魔方 27 个 cubie 的 3D 动画同帧叠
    // 加会打穿帧率（实测 /links 掉到 ~80fps，弱机更差）。
    window.dispatchEvent(new CustomEvent(THEME_TRANSITION_EVENT))

    const nextDark = resolve(next)

    lockSwitch()
    try {
      mode.value = next
      localStorage.setItem(STORAGE_KEY, next)
      applyClass(nextDark)
    } finally {
      unlockSwitch()
    }
  }

  /** light → dark → system → light 循环 */
  function cycle(origin?: { x: number; y: number }) {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const idx = order.indexOf(mode.value)
    return setMode(order[(idx + 1) % order.length]!, origin)
  }

  const label = computed(() =>
    mode.value === 'light' ? '浅色' : mode.value === 'dark' ? '深色' : '跟随系统',
  )

  const icon = computed(() =>
    mode.value === 'light'
      ? 'tabler:sun'
      : mode.value === 'dark'
        ? 'tabler:moon'
        : 'tabler:device-desktop',
  )

  return { mode, isDark, setMode, cycle, init, label, icon }
}
