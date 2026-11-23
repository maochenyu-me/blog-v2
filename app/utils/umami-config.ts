/**
 * 自建 Umami 统计接入配置。
 * nuxt.config.ts（埋点脚本注入）与 useUmamiStats（统计卡取数）共用。
 *
 * 实例：ghcr.io/umami-software/umami:postgresql-v2.16.1（v2 线，非 v3）。
 * shareId 取分享链接 /share/<shareId>/<slug> 的第一段（16 位），
 * 第二段 slug 只是给人看的，API 不认（/api/share/<shareId>/<slug> 会 404）。
 */
export const umamiConfig = {
  baseUrl: 'https://um.518339.xyz',
  websiteId: '56a633ea-5663-4e51-9a96-714b7724e039',
  shareId: 'JpUoQVPO8FOzyZyS',
}
