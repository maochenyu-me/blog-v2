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
})
