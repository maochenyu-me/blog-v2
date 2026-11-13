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

    /** 建站起始日（ISO 日期）—— 页脚「小站已存活」计时的起点 */
    siteStartDate: '2024-11-01',

    /**
     * 源码仓库地址（不带结尾斜杠）。
     * 更新日志的 commit hash 链接拼在此地址后面；留空则 hash 退化为纯文本。
     */
    repoUrl: 'https://github.com/maochenyu-me/blog-v2',

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

    /**
     * 主导航 —— 单一层级树，桌面与移动端共用。
     *
     * 带 children 的项是「分组」：桌面端按叶子节点平铺展开（视觉与
     * 单层导航完全一致），移动端抽屉里渲染成可展开的多级列表。
     * 这样同一份配置能喂两个断点，不必维护两套菜单定义。
     *
     * 叶子项上的 external: true 表示站外链接，抽屉里加外链图标。
     */
    nav: [
      { label: '首页', to: '/', icon: 'tabler:home' },
      {
        label: '归档',
        to: '/archive',
        icon: 'tabler:archive',
        children: [
          { label: '归档', to: '/archive', icon: 'tabler:archive' },
          { label: '分类', to: '/categories', icon: 'tabler:folder' },
          { label: '标签', to: '/tags', icon: 'tabler:tag' },
        ],
      },
      {
        label: '友链',
        to: '/links',
        icon: 'tabler:link',
        children: [
          { label: '友链', to: '/links', icon: 'tabler:link' },
          { label: '朋友圈', to: '/fcircle', icon: 'tabler:rss' },
          { label: '留言板', to: '/message', icon: 'tabler:message-2' },
        ],
      },
      {
        label: '功能集合',
        to: '/shuoshuo',
        icon: 'ph:function-bold',
        children: [
          { label: '说说', to: '/shuoshuo', icon: 'tabler:messages' },
          { label: '相册', to: '/gallery', icon: 'tabler:photo' },
          { label: '热搜', to: '/hot', icon: 'tabler:flame' },
        ],
      },
      {
        label: '工具',
        to: '/tools/cover-generator',
        icon: 'tabler:tool',
        children: [
          { label: '封面生成器', to: '/tools/cover-generator', icon: 'tabler:photo-edit' },
          { label: '从夯到拉', to: '/tools/tier-list', icon: 'tabler:chart-bar' },
        ],
      },
      {
        label: '关于',
        to: '/about',
        icon: 'tabler:user',
        children: [
          { label: '关于', to: '/about', icon: 'tabler:user' },
          { label: '更新日志', to: '/changelog', icon: 'tabler:history' },
        ],
      },
    ],

    footer: {
      copyright: '克喵:)',
      startYear: 2024,
      legalLinks: [
        { label: '隐私政策', to: '/legal/privacy' },
        { label: 'Cookie', to: '/legal/cookie' },
        { label: '版权协议', to: '/legal/copyright-agreement' },
      ],
      extraLinks: [
        { label: 'RSS', to: '/rss.xml' },
        { label: 'Atom', to: '/atom.xml' },
      ],
    },
  },

  /**
   * 文章底部版权信息卡（PostFooterCard）。
   * 协议名与链接全站唯一来源，改这里即可。
   */
  copyright: {
    license: '署名-非商业性使用-相同方式共享 4.0 国际',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans',
  },

  /**
   * 打赏弹窗（PostRewardModal）。
   * 收款码图片放 public/images/reward/ 下，文件缺失时组件显示占位框。
   * 赞赏者名单锚点跳转关于页底部名单（app/data/sponsors.json，issue 工作流维护）。
   */
  reward: {
    enabled: true,
    wechatQr: '/images/reward/wechat.png',
    alipayQr: '/images/reward/alipay.png',
    sponsorsUrl: '/about#reward',
  },

  /**
   * AI 智能摘要卡片（PostAiSummary，文章头卡下方）。
   * 摘要文本由 scripts/ai-summary.mjs 生成后写入文章 frontmatter 的 aisummary 字段；
   * badge 需与脚本里的 MODEL 保持一致，换模型两处一起改。
   */
  ai: {
    label: '智能摘要',
    badge: 'Qwen·3-8B',
    /** 打字机动画开关（组件内还有 prefers-reduced-motion 降级） */
    animation: true,
  },

  feed: {
    fullText: true,
    limit: 20,
    rss: { enabled: true, path: '/rss.xml' },
    atom: { enabled: true, path: '/atom.xml' },
  },

  /**
   * 左下角悬浮音乐播放器。
   * 解析服务是自建/第三方的 Netease_url（网易云解析），接口见其 使用文档.md：
   *   POST /playlist  取歌单曲目
   *   GET  /stream    取音频流（支持 Range，可直接当 <audio src>）
   *
   * 为什么只走 /stream 而不用 /song 返回的直链：直链是 http://m*.music.126.net，
   * https 站点播放会被混合内容策略拦掉；/stream 是 https 且边下边发。
   */
  music: {
    enabled: true,
    /** 解析服务地址，末尾不要带斜杠 */
    api: 'https://netease.518339.xyz',
    /** 歌单 ID：从 https://music.163.com/playlist?id=xxx 里取纯数字部分 */
    playlist: '2607560262',
    /**
     * 预热曲目 ID（可选，建议填歌单第一首）。
     *
     * 歌单接口实测要 3~5 秒，这段时间里前端不知道该预载哪首歌。填了它就能
     * 在进站瞬间先把这首的音频元数据拉下来，等歌单回来对上了，用户点播放
     * 几乎立刻出声。
     *
     * 从歌曲详情页地址 https://music.163.com/song?id=xxx 取数字部分。
     * 留空也能正常用，只是首次访问点播放要多等 2 秒左右。
     */
    warmup: '2603290364',
    /** 音质：standard(128k) / exhigh(320k) / lossless */
    level: 'exhigh' as const,
    /** 初始音量 0~1（用户拖动过则优先用本地记忆值） */
    volume: 0.6,
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
