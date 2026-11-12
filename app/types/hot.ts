/**
 * 热搜聚合 API（pages.config.ts hot.apiBase）的类型定义。
 * 对齐 https://hot-api.liiiu.cn 实测返回结构。
 */
export interface HotItem {
  id: string
  title: string
  desc: string
  cover: string
  author: string
  timestamp: null | number
  /** 热度值，各平台口径不同，仅作展示 */
  hot: number
  url: string
  mobileUrl: string
}

export interface HotApiResponse {
  code: number
  name: string
  title: string
  type: string
  description: string
  total: number
  updateTime: string
  data: HotItem[]
}
