/**
 * 判断一张封面图能否交给 @nuxt/image 的构建期优化。
 *
 * 为什么需要这个判断：站内封面有三种来源，只有一种能被 ipx 处理。
 *
 *   1. 本地位图  /images/covers/xxx.png      → 构建期转 AVIF/WebP，收益最大
 *   2. 站外 URL  https://picsum.photos/...   → 构建期抓不到，无法优化
 *   3. 本地 SVG  /images/covers/default.svg  → 矢量图，转位图反而糊，且无收益
 *
 * 前两种若硬塞给 NuxtImg，轻则原样透传（白增加一层 HTTP 重写），重则
 * 生成一堆构造失败的 _ipx 产物。所以统一在这里判定，组件按结果二选一渲染。
 *
 * 只认本地绝对路径 + 位图扩展名，其余一律走原生 <img>。
 */

/** 能被 ipx 实际转换的位图格式 */
const OPTIMIZABLE_EXT = /\.(?:png|jpe?g|webp|avif|gif|tiff?|bmp)$/i

export function canOptimizeImage(src: string | undefined | null): boolean {
  if (!src) return false
  // 站外（含协议相对 //）不归构建期管
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src)) return false
  // 必须是可以被静态托管的站内绝对路径
  if (!src.startsWith('/')) return false
  // 去掉查询串再判扩展名，避免 ?v=1 之类干扰
  const path = src.split(/[?#]/, 1)[0] ?? ''
  return OPTIMIZABLE_EXT.test(path)
}
