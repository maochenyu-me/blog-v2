/**
 * 相册相关类型定义
 */

/** 一张照片：纯 URL 字符串，或带标题的对象 */
export type GalleryImage = string | {
  url: string
  title?: string
}

export interface GalleryFolder {
  id: string
  name: string
  images: GalleryImage[]
  /** 封面图 URL，由 useGallery 从 images 里稳定选取，配置里不用写 */
  cover?: string
}