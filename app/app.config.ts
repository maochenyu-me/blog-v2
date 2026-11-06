/**
 * Nuxt app.config 入口 —— 仅做 import + merge + defineAppConfig，不写任何业务数据。
 * 四层配置在此合并，经 useAppConfig() 全局访问。
 *
 * 为什么三个子配置导出的是普通对象而不是 defineAppConfig(...)：
 * defineAppConfig 是 Nuxt 的 auto-import，只对 app.config.ts 自身生效。
 * 在它 import 进来的文件里调用会拿到 undefined，导致 SSR 崩溃。
 */
import blog from './blog.config'
import theme from './theme.config'
import pages from './pages.config'

export default defineAppConfig({
  ...blog,
  ...theme,
  ...pages,
  /**
   * @nuxt/icon 在 css 模式下的字形规则写在 --nuxt-icon 专属的 @layer 里。
   * Tailwind v4 的 @layer 顺序由首次声明决定，不显式指定 cssLayer 时
   * iconify 的字形规则会被 tailwind 的 preflight 与 utilities 压掉，
   * 表现为 span 只剩类名、content 解析为 normal、全站图标空白。
   * 官方文档明确要求 Tailwind v4 + css 模式必须设置此项。
   */
  icon: {
    mode: 'css',
    cssLayer: 'base',
  },
})
