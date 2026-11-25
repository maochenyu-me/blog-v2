import { createResolver, defineNuxtModule, updateAppConfig } from '@nuxt/kit'
import { createJiti } from 'jiti'
import { Marked } from 'marked'

/**
 * 公告和欢迎语支持旧版 `text` Markdown 配置。
 * 在构建期转成 HTML，避免把 Markdown 解析器打进客户端配置包。
 */
export default defineNuxtModule({
  meta: { name: 'page-config-html' },

  async setup() {
    const { resolve } = createResolver(import.meta.url)
    const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })
    ;(globalThis as any).defineAppConfig ??= (config: unknown) => config

    const pagesModule = await jiti.import<any>(resolve('../app/pages.config.ts'))
    const sidebar = pagesModule.default?.pages?.home?.sidebar
    const announcement = sidebar?.announcement
    const visitor = sidebar?.visitor
    const markdown = new Marked({ breaks: true, gfm: true })

    const announcementHtml = announcement?.html
      ?? (announcement?.text
        ? markdown.parse(announcement.text, { async: false })
        : undefined)
    const visitorHtml = visitor?.welcomeHtml
      ?? (visitor?.text
        ? markdown.parse(visitor.text, { async: false })
        : undefined)

    updateAppConfig({
      pages: {
        home: {
          sidebar: {
            announcement: announcementHtml ? { html: announcementHtml } : {},
            visitor: visitorHtml ? { welcomeHtml: visitorHtml } : {},
          },
        },
      },
    })
  },
})
