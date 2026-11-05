import tailwindcss from '@tailwindcss/vite'
import { buildThemeInitScript } from './app/utils/theme-storage'

const THEME_INIT_SCRIPT = buildThemeInitScript()

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // ---------- 模块 ----------
  modules: [
    '@nuxt/content',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxtjs/seo',
    'shadcn-nuxt',
  ],

  // 本地模块 modules/design-tokens.ts 由 Nuxt 自动扫描 modules/ 目录注册

  // ---------- 全局样式 ----------
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // ---------- TypeScript strict ----------
  typescript: {
    strict: true,
    typeCheck: false, // 由 pnpm typecheck 单独跑，避免拖慢 dev
  },

  // ---------- 组件目录 ----------
  // 一旦显式声明 components 数组，Nuxt 就不再自动扫描 app/components 下的子目录，
  // 必须逐个列出。漏掉 server/ 会导致 ProseBody / ProseToc 未注册，
  // 文章正文渲染为空且控制台不报错（只在 SSR 里表现为内容消失）。
  components: [
    { path: '~/components/common', pathPrefix: false },
    { path: '~/components/server', pathPrefix: false },
    { path: '~/components/ui', pathPrefix: false },
  ],

  // ---------- 渲染模式：纯 SSG ----------
  ssr: true,

  nitro: {
    preset: 'cloudflare_pages',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/rss.xml', '/atom.xml', '/api/search-index.json'],
      failOnError: false,
    },
  },

  // ---------- 无加载体验 ----------
  experimental: {
    viewTransition: true,
    payloadExtraction: true,
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/images/avatar-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '180x180', href: '/images/avatar-180.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/avatar-180.png' },
      ],
      // 防 FOUC：首帧前同步读取主题偏好。
      // 放在 app.head 而不是布局里，因为 404 / error 页不渲染布局，
      // 若只在布局注入，这些页面在暗色模式下会闪白。
      script: [{ innerHTML: THEME_INIT_SCRIPT, tagPriority: 'critical' }],
    },
  },

  // ---------- 图标 ----------
  icon: {
    mode: 'css',
    class: 'icon',
    size: '1em',
    serverBundle: {
      collections: ['tabler'],
    },
  },

  // ---------- shadcn-vue ----------
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  // ---------- SEO ----------
  site: {
    url: 'https://www.kemiaosw.top',
    name: '喵洛阁',
    description: '克喵的博客，记录前端工程、设计与日常折腾。',
    defaultLocale: 'zh-CN',
  },

  ogImage: {
    enabled: false,
  },

  // ---------- Content ----------
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
          langs: [
            'js', 'jsx', 'ts', 'tsx', 'vue', 'json', 'bash', 'shell',
            'css', 'html', 'md', 'yaml', 'diff', 'xml', 'sql', 'go', 'rust', 'python',
          ],
        },
      },
    },
  },
})
