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
    /**
     * 显式声明 D1 数据库配置，消除构建时的警告。
     *
     * ── 为什么会有那条警告 ────────────────────────────
     * @nuxt/content 的 cloudflare preset 在 nitro:config 里判断：
     *   if (runtimeConfig.content.database.type === 'sqlite') {
     *     logger.warn('Deploying to Cloudflare requires using D1 database, ...')
     *     runtimeConfig.content.database = { type: 'd1', bindingName: 'DB' }
     *   }
     * 我们的配置原本是默认的 sqlite，于是命中警告分支。
     *
     * ── 为什么这里直接写 d1 是安全的 ─────────────────
     * 上面那段代码在警告之后做的**正是**把配置改成
     * { type: 'd1', bindingName: 'DB' }。这里提前写成同一个值，
     * 等于跳过「检测 → 改写」这一步，最终生效的配置与自动切换完全相同，
     * 只是不再打印警告。
     *
     * 本项目是纯 SSG：所有页面在构建期渲染完成，产物里没有
     * dist/_worker.js、也没有 .sqlite 文件，运行时不存在任何
     * queryCollection() 调用，因此 D1 绑定只是配置占位，
     * 不需要在 Cloudflare 控制台真的创建数据库或绑定。
     *
     * ── 注意 ───────────────────────────────────────
     * 构建期内容查询走的是 options._localDatabase（仍是本地 sqlite），
     * 不受这里影响，所以 pnpm generate 的渲染结果不变。
     *
     * 若将来改成 SSR 并真的要在运行时查库，才需要在 Cloudflare
     * 创建 D1 数据库、把 binding 命名为 DB 并挂到 Pages 项目上。
     */
    database: {
      type: 'd1',
      bindingName: 'DB',
    },
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
