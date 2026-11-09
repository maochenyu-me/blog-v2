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
        tags: z.array(z.string()).default([]),
        category: z.string(),
        cover: z.string().optional(),
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
