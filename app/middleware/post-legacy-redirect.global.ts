import { LEGACY_POST_SLUGS } from '~/utils/abbrlink-map.generated'

/**
 * 旧文章链接兜底：文章 path 已改为 /posts/<abbrlink>（modules/abbrlink.ts），
 * 旧文件名 slug（如 /posts/typography-over-color）在站内已不存在。
 * 生产环境由 CF Pages 的 public/_redirects 做 301（abbrlink.mjs 生成）；
 * 这里覆盖 dev / SPA 导航场景——命中映射表就 302 跳新路径，否则放行给 404。
 *
 * 放全局而非 [slug].vue 内联：definePageMeta 宏提取对导入引用有限制，
 * 全局中间件里 early-return navigateTo 是受支持的标准用法。
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/posts/')) return
  const slug = to.params.slug as string | undefined
  if (!slug) return
  const target = LEGACY_POST_SLUGS[slug]
  if (target) return navigateTo(`/posts/${target}`, { redirectCode: 302 })
})
