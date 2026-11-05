/**
 * 站点级配置 —— 唯一全局源。
 * 组件内禁止硬编码站名 / 链接 / 文案 / 数字，一律经 useBlogConfig() 读取本文件。
 *
 * 注意：这里导出普通对象，defineAppConfig 只出现在 app/app.config.ts。
 * （defineAppConfig 是 auto-import，只对 app.config.ts 本身生效，
 *   被导入的文件里调用会在 SSR 阶段拿到 undefined。）
 */
export default {
  site: {
    name: '喵洛阁',
    shortName: '喵洛阁',
    description: '克喵的博客，记录前端工程、设计与日常折腾。',
    url: 'https://www.kemiaosw.top',
    locale: 'zh-CN' as const,

    author: {
      name: '克喵:)',
      avatar: '/images/avatar.png',
      bio: '写前端，也写字。偶尔折腾点没用的东西。',
      email: 'hi@kemiaosw.top',
    },

    keywords: ['前端', '设计', '博客', '克喵', '喵洛阁'],

    analytics: {
      provider: 'none' as const,
      siteId: '',
      scriptUrl: '',
    },

    beian: {} as { icp?: string; police?: string; moe?: string },

    social: [
      { label: 'GitHub', url: 'https://github.com/kemiaosw', icon: 'tabler:brand-github' },
      { label: 'X', url: 'https://x.com/kemiaosw', icon: 'tabler:brand-x' },
      { label: 'Email', url: 'mailto:hi@kemiaosw.top', icon: 'tabler:mail' },
    ],

    nav: [
      { label: '首页', to: '/', icon: 'tabler:home' },
      { label: '归档', to: '/archive', icon: 'tabler:archive' },
      { label: '分类', to: '/categories', icon: 'tabler:folder' },
      { label: '标签', to: '/tags', icon: 'tabler:tag' },
      { label: '友链', to: '/links', icon: 'tabler:link' },
      { label: '关于', to: '/about', icon: 'tabler:user' },
    ],

    footer: {
      copyright: '克喵:)',
      startYear: 2024,
      extraLinks: [
        { label: 'RSS', to: '/rss.xml' },
        { label: 'Atom', to: '/atom.xml' },
      ],
    },
  },

  feed: {
    fullText: true,
    limit: 20,
    rss: { enabled: true, path: '/rss.xml' },
    atom: { enabled: true, path: '/atom.xml' },
  },

  search: {
    enabled: true,
    shortcut: 'mod+k',
    debounceMs: 200,
    maxResults: 20,
    history: true,
    includeDrafts: false,
    boost: {
      title: 8,
      description: 4,
      tags: 3,
      category: 2,
      text: 1,
    },
    hit: {
      enabled: true,
      snippetLength: 60,
    },
    index: {
      path: '/api/search-index.json',
      /** true 时从正文剔除代码块再建索引（避免 useState/div 之类标识符造成噪音命中） */
      stripCodeBlocks: true,
    },
  },
}
