import { defineNuxtModule } from '@nuxt/kit'

/**
 * post-abbrlink —— 把有 abbrlink 的文章 path 覆盖为 /posts/<abbrlink>。
 *
 * 背景：@nuxt/content 的 path-meta 用**文件名**派生 path，URL 暴露原名且长。
 * 本模块在 content:file:afterParse（path-meta 之后执行）改写 path，
 * 全站消费方（RSS/Atom、搜索索引、列表卡片、prevNext、sitemap、canonical）
 * 都透传文档 path，单点覆盖即可全站生效。
 *
 * abbrlink 的唯一来源是 frontmatter（scripts/abbrlink.mjs 构建前写回并固化），
 * 这里只做忠实覆盖，不参与计算——保证「一次赋号永不改变」。
 */
export default defineNuxtModule({
  meta: { name: 'post-abbrlink' },
  setup(_options, nuxt) {
    nuxt.hook('content:file:afterParse', ({ content }) => {
      const id = (content as { abbrlink?: unknown }).abbrlink
      if (typeof id === 'string' && /^[0-9a-f]{8}$/.test(id)) {
        content.path = `/posts/${id}`
      }
    })
  },
})
