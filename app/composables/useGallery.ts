import type { GalleryFolder, GalleryImage } from '~/types/gallery'
import galleryBase from '~/gallery'

/**
 * 相册数据访问层。
 *
 * 封面选取用「id 字符串哈希取模」而不是随机：同一分类在构建期
 * 与客户端会算出同一张封面，避免 SSG 快照与水合结果不一致。
 *
 * 结果在模块级只算一次：分类与照片是构建期常量，每个页面各算一遍
 * 纯属浪费（首页要算一次、分类页又算一次）。
 */

function imageUrl(image?: GalleryImage): string {
  if (!image) return ''
  return typeof image === 'string' ? image : image.url
}

function imageTitle(image?: GalleryImage): string {
  if (!image || typeof image === 'string') return ''
  return image.title ?? ''
}

function stableIndex(seed: string, length: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % length
}

function pickCover(images: GalleryImage[], seed: string): string {
  if (!images.length) return ''
  return imageUrl(images[stableIndex(seed, images.length)])
}

const folders: GalleryFolder[] = galleryBase.map((folder) => ({
  ...folder,
  cover: pickCover(folder.images, folder.id),
}))

const totalPhotos = folders.reduce((sum, folder) => sum + folder.images.length, 0)

const byIdMap = new Map(folders.map((folder) => [folder.id, folder]))

export function useGallery() {
  function byId(id?: string): GalleryFolder | null {
    return (id && byIdMap.get(id)) || null
  }

  return { folders, byId, imageUrl, imageTitle, totalPhotos }
}