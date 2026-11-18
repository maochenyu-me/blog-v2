import tailwindcss from '@tailwindcss/vite'
import { buildThemeInitScript } from './app/utils/theme-storage'
import { umamiConfig } from './app/utils/umami-config'

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
    // ui 目录是 shadcn-vue 预留位，.keep/index.ts 仅占位，忽略之避免注册幽灵组件
    { path: '~/components/ui', pathPrefix: false, ignore: ['**/.keep/**'] },
    { path: '~/components/home', pathPrefix: false },
    { path: '~/components/about', pathPrefix: false },
    { path: '~/components/post', pathPrefix: false },
    { path: '~/components/gallery', pathPrefix: false },
    { path: '~/components/hot', pathPrefix: false },
    { path: '~/components/links', pathPrefix: false },
  ],

  // ---------- 渲染模式：纯 SSG ----------
  ssr: true,

  nitro: {
    /**
     * 不在此写死 preset。
     *
     * ── 为什么原来写了 「cloudflare_pages」，现在去掉 ──────────
     * 写死 preset 会让**每次本地构建**都走 @nuxt/content 的 cloudflare 分支：
     *   findPreset() 里 preset.includes('cloudflare') → 返回 cloudflare preset
     * 而该 preset 发现 content.database 是默认的 sqlite 就会输出
     * "Deploying to Cloudflare requires using D1 database..." 警告。
     *
     * 本地构建本来就不需要 Cloudflare preset —— 我们要的只是
     * `nuxt generate` 产出一份纯静态 dist/。preset 只影响产物形态
     * （_worker.js / _routes.json 等），纯 SSG 不需要服务端部分。
     *
     * ── 部署时怎么让 Cloudflare 识别 ───────────────────────
     * 由部署平台自动决定，不必写死：
     *   - Cloudflare Pages 的构建环境会设置 CLOUDFLARE_PAGES=true，
     *     Nuxt 会自动选用 cloudflare_pages preset；
     *   - 或在 CI / 本地手动指定环境变量 NITRO_PRESET=cloudflare_pages。
     * 这也与 blog-v3（L33Z22L11/blog-v3）的做法一致：
     * 它的 nuxt.config 里 preset 出现 0 次、content.database 出现 0 次。
     *
     * ── 与数据库无关 ────────────────────────────────────
     * 本项目纯 SSG，构建完成后不存在任何运行时 queryCollection() 调用，
     * content.database 只是 @nuxt/content 的配置项，无需触碰。
     * 构建期索引默认落在 .data/content/contents.sqlite（Nuxt Content
     * 内部的本地构建产物），与 Cloudflare D1 没有关系。
     *
     * ── 已知：CF Pages 构建环境下仍会打印一次该警告 ──────────
     * 实测（设 CF_PAGES=1 模拟）：
     *   Nitro preset: cloudflare-pages-static
     *   [warn] [@nuxt/content] Deploying to Cloudflare requires using D1 database...
     * 原因同上：只要 preset 含 cloudflare 且 content.database 是默认
     * sqlite，内容模块就会打印。这是它假定 SSR 的误报，与产物无关。
     *
     * 产物本身完全正常（已实测）：56 个 HTML、_headers 正常生成、
     * 无 _worker.js、无 .sqlite。也就是说警告纯属噪音，不影响部署。
     *
     * 因此**不做处理**：本地构建干净，CI 里那一条读过即可。
     * 如果确实不想在 CI 日志里看到它，两种做法：
     *   a) 构建命令加环境变量过滤日志（推荐，不改配置）；
     *   b) 在 CF_PAGES 为真时显式声明 content.database 为
     *      { type: 'd1', bindingName: 'DB' } —— 即 preset 本就会
     *      切换成的值，只是提前声明以跳过警告分支。
     * 两者都属于「压掉一条误报」，不改变任何运行行为，
     * 故默认都不做，保持配置最小。
     */
    prerender: {
      crawlLinks: true,
      routes: ['/', '/rss.xml', '/atom.xml', '/api/search-index.json'],
      failOnError: false,
    },

    /**
     * 固定静态产物目录为 dist/。
     *
     * 不写 preset 时，默认 preset 是 node-server，`nuxt generate` 会把
     * 静态产物输出到 .output/public。而本项目的验收脚本
     * （scripts/verify.mjs、scripts/fix-contrast.mjs）以及部署说明
     * 都以 dist/ 为约定路径，这里显式指回去，保持单一事实来源。
     *
     * 注意 output.publicDir 只影响静态文件落盘位置，
     * 不会引入任何服务端产物（纯 SSG 依然不生成 _worker.js）。
     */
    output: {
      publicDir: 'dist',
    },

    /**
     * 本地 dev 代理 /api/umami/* → 自建 Umami 的 /api/*。
     *
     * 线上由 functions/api/umami/[[path]].js（Cloudflare Pages Function）承担；
     * 但 dev server 没有 Functions 运行时，该路径会落进 Vue Router，
     * 每次访问关于页都刷一对 "No match found for location with path" 警告。
     * routeRules.proxy 只在服务端运行时生效，纯 SSG 产物（静态托管）
     * 不含服务端，线上依旧走 Functions；映射与 Functions 保持一致。
     */
    routeRules: {
      '/api/umami/share/**': { proxy: 'https://um.081531.xyz/api/share/**' },
      '/api/umami/websites/**': { proxy: 'https://um.081531.xyz/api/websites/**' },
    },
  },

  // ---------- 无加载体验 ----------
  experimental: {
    viewTransition: true,
    payloadExtraction: true,
  },

  app: {
    /**
     * 不配置 pageTransition —— 与参考站 blog-v3 一致，路由切换硬切。
     *
     * 实测数据（本地预览，同一口径：点击 → 新页 DOM 就绪且无过渡类，三页均值）：
     *   200ms 交叉淡入   410ms
     *   100ms 过渡       314ms
     *   无过渡           206ms   ← 采用
     *
     * 为什么 200ms 的过渡会吃掉 204ms：Vue 的 page transition 是**串行**的 ——
     * push 完成后先播完旧页的 page-leave（约 200ms），新页内容才被替换进 main，
     * 再播新的 page-enter。逐帧抓取可验证：leave-active 期间 main 的文本长度
     * 一直不变，说明用户看着旧页面在等。所谓「交叉」在单页切换里并不成立。
     *
     * 视觉补偿：页面内容自带入场（各组件有 animation），且本站强调
     * 「无加载体验」，硬切反而符合原设计意图。真要做共享元素过渡，
     * 应走 View Transitions API（浏览器层合成，不占 JS 主线程），
     * 而不是 Vue 的 JS 过渡 —— blog-v3 就是这么做的，但仅用于文章封面。
     *
     * 对应样式已从 app/assets/css/main.css 移除。
     */
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
        // 中文字体不再 preload。
        //
        // 原先这里 preload 两个 LXGW WenKai Lite 子集（400 / 700 各约 310 KB）。
        // 但 fonts.css 里的 @font-face 已移除，中文改走系统楷体栈 ——
        // 继续 preload 只会让浏览器下载两个「无人使用」的 310 KB 文件，
        // 而且 preload 的优先级高于轮播封面图，等于亲手给 LCP 制造拥堵。
        //
        // 拉丁字体（Inter / JetBrains Mono）的 preload 由 scripts/font-preload.mjs
        // 在构建后自动注入，不需要在这里写死。
      ],
      // 防 FOUC：首帧前同步读取主题偏好。
      // 放在 app.head 而不是布局里，因为 404 / error 页不渲染布局，
      // 若只在布局注入，这些页面在暗色模式下会闪白。
      script: [
        { innerHTML: THEME_INIT_SCRIPT, tagPriority: 'critical' },
        // Umami 统计埋点：defer 不阻塞渲染，上报走同源代理以外的自建域名。
        {
          src: `${umamiConfig.baseUrl}/script.js`,
          defer: true,
          'data-website-id': umamiConfig.websiteId,
        },
      ],
    },
  },

  // ---------- 图标 ----------
  icon: {
    mode: 'css',
    class: 'icon',
    size: '1em',
    serverBundle: {
      collections: ['tabler', 'ph'],
    },
    /**
     * scan —— 构建期扫描源码里出现过的 tabler 图标名，打包进客户端 bundle。
     * 不开这项时，抽屉等「客户端才挂载」的图标不在 SSR 输出里，
     * 浏览器会现场向 api.iconify.design 请求 JSON 才拿到 mask，
     * 表现为首屏图标空白一下、断网或被墙时永久空白。
     *
     * globInclude 必须补上 ts：@nuxt/icon 默认只扫
     * `**​/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}`，而本站的导航图标
     * 全部声明在 app/blog.config.ts 里，默认值一个都扫不到。
     */
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,ts,mdc,md}'],
      },
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

  // ---------- 图片优化 ----------
  /**
   * 封面图统一走 @nuxt/image。
   *
   * 为什么开：全站原本只有 links.vue 一处用 NuxtImg，首页 16 张封面全是
   * 原生 <img> 直出 PNG。实测首页图片合计约 110KB，其中 charset.png 单张 83KB。
   * 轮播首图是 LCP 元素，这些字节直接压在关键路径上。
   *
   * 转换后（AVIF 质量 50 / WebP 兜底）预计降到约 35KB，LCP 受益明显。
   *
   * densities 说明：站内图片多为固定栅格（轮播 21:8、卡片 16:9），
   * 用户给的 1 / 1.5 / 2 三档密度足以覆盖 1x/1.5x/2x 屏，不生成多余的
   * 中间尺寸档，避免构建产物膨胀。
   *
   * provider 保持默认 ipx：本项目部署在 Cloudflare Pages 纯静态，
   * 图片在**构建期**就转好落盘（dist/_ipx），运行时不依赖任何图片服务。
   */
  image: {
    // 尽量以这些密度点对点显示
    densities: [1, 1.5, 2],
    format: ['avif', 'webp'],
    /**
     * 质量档：AVIF 50 在中低细节的封面上几乎看不出差别（实测
     * charset.png 83KB → 约 25KB），而 75 会大出近一倍。
     */
    quality: 50,
  },

  // ---------- Link Checker ----------
  /**
   * 关闭两条规则：no-non-ascii-chars 与 no-uppercase-chars。
   *
   * 理由（不是「懒得改」，是规则本身与中文站不兼容）：
   *   - no-non-ascii-chars 建议 encodeURI 中文路径，但中文 URL 是现代浏览器
   *     的标准显示形态，编码后反而不可读；而且 /categories/工程 这类路径
   *     本来就不该被编码成 %E5%B7%A5%E7%A8%8B。
   *   - no-uppercase-chars 的正则是 /[A-Z]/，只匹配 ASCII 大写字母，
   *     却对中文路径也报同一条警告——说明它把这些中文链接误判成了含大写。
   *
   * 更关键的是：这两条警告掩盖了真正需要修的问题——标签与分类直接用
   * 原始名拼 URL（/tags/CSS 与 /tags/css 会是两份页面）。该问题已在
   * app/utils/taxonomy.ts 用 slug 根治，链接本身已全部转为小写 slug。
   * 所以这里关的只是规则，不是问题。
   */
  linkChecker: {
    skipInspections: ['no-non-ascii-chars', 'no-uppercase-chars'],
  },

  seo: {
    /**
     * nuxt-seo-utils 会对 app.head 做校验，而 charset / viewport 两条
     * 已经由 Nuxt 默认注入，这里再声明一次就会被判为重复。
     * 本站的 head 声明是有意的（显式声明便于审计），所以关掉这条校验。
     */
    validateAppHead: false,
  },

  // ---------- Content ----------
  content: {
    experimental: {
      // 用 Node 内置的 node:sqlite，而不是 better-sqlite3。
      //
      // 这个数据库只是「构建期的内容索引」：把 markdown 解析结果灌进 SQLite，
      // queryCollection() 用 SQL 查它，预渲染时把结果烘进 HTML / payload，
      // 最终 dist/ 里没有任何数据库文件。它仅在 dev 与 build 阶段存在。
      //
      // 换掉的理由：better-sqlite3 是按 Node ABI 编译的原生模块，机器上装了两个
      // Node（系统 24 / 工具链 22）就会报 NODE_MODULE_VERSION 127 vs 137。
      // node:sqlite 是 Node 自带的，不绑定版本，无需编译。
      // Node < 22.5 或 node:sqlite 不可用时会自动回退到 better-sqlite3，
      // 所以依赖仍保留在 devDependencies 里做兜底。
      sqliteConnector: 'native',
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
        remarkPlugins: {
          'remark-math': {},
        },
        rehypePlugins: {
          // 选项必须嵌在 options 里：@nuxt/content 的 importPlugins 只读
          // `{ instance, options }` 这两个键，直接摊平写会被当成空对象丢掉。
          //
          // errorColor 直接给 CSS 变量：KaTeX 会把它写进内联 style（style="color:var(--accent)"），
          // 这样写错的公式能跟着明暗主题走。用固定色值做不到——KaTeX 只有一个 errorColor，
          // 而明暗两套背景需要的红不一样（默认 #cc0000 在暗色底上只有 3.38:1）。
          'rehype-katex': {
            options: {
              errorColor: 'var(--accent)',
            },
          },
        },
      },
    },
  },
})
