import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        updated: z.date().optional(),
        /**
         * 永久短链接 id（crc32-hex 8 位），由 scripts/abbrlink.mjs 写回并固化。
         * modules/abbrlink.ts 据此把文章 path 覆盖为 /posts/<abbrlink>；
         * 已赋号的文章改标题/正文/文件名都不会再变。
         */
        abbrlink: z.string().optional(),
        tags: z.array(z.string()).default([]),
        category: z.string(),
        cover: z.string().optional(),
        /** AI 生成的文章摘要（scripts/ai-summary.mjs 写回），文章头卡下方的「智能摘要」卡片数据源 */
        aisummary: z.string().optional(),
        draft: z.boolean().default(false),
        pinned: z.boolean().default(false),
        /** 推荐文章：首页轮播只展示 featured 且带 cover 的文章 */
        featured: z.boolean().default(false),
      }),
    }),

    about: defineCollection({
      type: 'page',
      source: 'about.md',
    }),

    /** 法务页：隐私政策 / Cookie / 版权协议，页脚 legalLinks 指向 /legal/<slug> */
    legal: defineCollection({
      type: 'page',
      source: 'legal/*.md',
      schema: z.object({
        title: z.string(),
      }),
    }),
  },
})
