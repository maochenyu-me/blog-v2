/**
 * 全站 UI 文案。组件与页面禁止硬编码任何中文（提示词 §4.5 / §16）。
 *
 * 约定：
 * - 带 {name} 的字符串是模板，用 useUi() 的 t() 插值
 * - aria-label 也属于文案，一并收在这里，保证无障碍文本同样可配置
 */
export const ui = {
  /** 通用 */
  common: {
    close: '关闭',
    count: '{n} 篇',
  },

  /** 导航与页头 */
  nav: {
    main: '主导航',
    mobile: '移动端导航',
    menuOpen: '打开菜单',
    menuDialog: '导航菜单',
    menuClose: '关闭菜单',
    themeLabel: '主题：{label}，点击切换',
    themeTitle: '主题：{label}',
  },

  /** 页面标题与区块标签 */
  pages: {
    archive: '归档',
    categories: '分类',
    tags: '标签',
    links: '友链',
    about: '关于',
    home: {
      pinned: '置顶',
      latest: '最新',
    },
  },

  /** 归档 / 分类 / 标签详情页 */
  collection: {
    notFoundCategory: '分类不存在',
    notFoundTag: '标签不存在',
    backToCategories: '分类',
    backToTags: '标签',
    categoryTitle: '分类：{name}',
    tagTitle: '标签：{name}',
  },

  /** 文章详情 */
  post: {
    notFound: '文章不存在',
    updatedAt: '更新于 {date}',
    readingTime: '{n} 分钟',
    navAria: '文章导航',
    prev: '上一篇',
    next: '下一篇',
    related: '相关',
    toc: '目录',
    tocAria: '目录',
  },

  /** 代码块 */
  code: {
    copy: '复制',
    copied: '已复制',
    failed: '失败',
    copyAria: '复制代码',
  },

  /** 图片灯箱 */
  lightbox: {
    close: '关闭',
  },

  /** 评论占位 */
  comment: {
    aria: '评论',
    closed: '评论暂未开放',
  },

  /** 搜索 */
  search: {
    trigger: '搜索',
    triggerTitle: '搜索（{shortcut}）',
    dialogAria: '站内搜索',
    placeholder: '搜索文章标题、标签、正文…',
    inputAria: '搜索关键词',
    closeAria: '关闭搜索',
    errorTitle: '搜索索引没加载出来',
    retry: '重试',
    emptyTitle: '输入关键词开始搜索',
    emptyDesc: '支持中文与英文，中文按词组与单字同时匹配。',
    historyLabel: '最近搜索',
    clearHistory: '清空',
    noResultTitle: '没有匹配的文章',
    noResultDesc: '换个关键词试试，或者只输入其中两个字。',
    hintSelect: '选择',
    hintOpen: '打开',
    hintClose: '关闭',
    hintTrigger: '唤起',
    hintKeys: {
      select: '↑↓',
      open: 'Enter',
      close: 'Esc',
    },
  },

  /** 友链 */
  links: {
    apply: '申请友链',
    applyTitle: '申请友链',
    avatarAlt: '{name} 的头像',
    self: '本站',
  },

  /** 关于页区块 */
  about: {
    now: '现在',
    skills: '技能',
    timeline: '时间线',
    contact: '联系',
  },
} as const
