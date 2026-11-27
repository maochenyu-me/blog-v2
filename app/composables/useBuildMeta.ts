/**
 * 构建期信息（modules/build-info.ts 在构建时写入 appConfig.build）。
 *
 * 为什么不在 app.config.ts 里声明默认空值：Nuxt 的合并顺序里
 * app.config.ts 的显式字段优先级高于模块的 updateAppConfig，
 * 声明了空串就会把构建期采集的真值盖回去（实测 HTML 里是空的）。
 * 所以这里只做「类型 + 读取」，不提供默认值。
 */
import type { BuildMeta } from '#shared/types/build'

export type { BuildMeta }

export function useBuildMeta(): BuildMeta {
  const appConfig = useAppConfig()
  return (appConfig as unknown as { build?: BuildMeta }).build ?? ({} as BuildMeta)
}