/**
 * 构建期信息类型 —— modules/build-info.ts（node 侧）与组件（app 侧）共用。
 * 放 shared/ 是因为 Nuxt 的 app / node 两套 tsconfig 都会包含这里，
 * 模块从 app/ 反向 import 类型会把文件拖进 node 项目，那里没有自动导入。
 */

export interface BuildMeta {
  /** 展示用的构建平台名（CI 环境名，本地构建为 Local） */
  platform: string
  /** package.json 的 version */
  siteVersion: string
  nuxtVersion: string
  vueVersion: string
  nodeVersion: string
  pnpmVersion: string
  /** 已按配置时区格式化的构建时间字符串 */
  buildTime: string
  /** 构建机平台 / 架构 */
  system: string
}