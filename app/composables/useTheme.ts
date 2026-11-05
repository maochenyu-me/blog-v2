/**
 * 三态主题：light / dark / system（提示词 §12）
 * - localStorage 持久化用户选择
 * - system 模式跟随 prefers-color-scheme 实时变化
 * - 切换时用 View Transitions API 做圆形扩散（theme.darkMode.enableCircularReveal）
 */

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = THEME_STORAGE_KEY

export function useTheme() {
  const appConfig = useAppConfig()
  const themeCfg = (appConfig.theme as any).darkMode as {
    defaultMode: ThemeMode
    enableCircularReveal: boolean
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

  /** 带圆形扩散的切换 */
  async function setMode(next: ThemeMode, origin?: { x: number; y: number }) {
    if (!import.meta.client) return

    const nextDark = resolve(next)

    // 不支持 View Transitions 或用户偏好减少动效 → 瞬时切换
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supportsVT = typeof (document as any).startViewTransition === 'function'

    if (!themeCfg.enableCircularReveal || !supportsVT || reduceMotion) {
      mode.value = next
      localStorage.setItem(STORAGE_KEY, next)
      applyClass(nextDark)
      return
    }

    // 从点击位置向外扩散，半径覆盖到最远角
    const x = origin?.x ?? window.innerWidth / 2
    const y = origin?.y ?? window.innerHeight / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const transition = (document as any).startViewTransition(() => {
      mode.value = next
      localStorage.setItem(STORAGE_KEY, next)
      applyClass(nextDark)
    })

    try {
      await transition.ready
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: Number.parseInt(appConfig.theme.animation.duration as any) || 200,
          easing: appConfig.theme.animation.easing as string,
          pseudoElement: '::view-transition-new(root)',
        },
      )
      await transition.finished
    } catch {
      // View Transition 被中断时静默降级，类已经切换好了
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
