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
    /** 站外链接的无障碍说明，紧跟外链图标之后朗读 */
    externalLink: '（站外链接，新窗口打开）',
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
      /** 推荐轮播 */
      carousel: {
        regionLabel: '推荐文章',
        prevAria: '上一篇推荐',
        nextAria: '下一篇推荐',
        dotsAria: '推荐文章切换指示点',
        dotAria: '查看第 {n} 篇推荐',
        badgeAria: '推荐标记',
        pauseAria: '轮播已暂停',
      },
      /** 文章卡片 */
      card: {
        coverAlt: '{title} 的封面',
        pinnedBadge: '置顶',
        readingTime: '{n} 分钟',
        noExcerpt: '这篇文章还没有摘要。',
      },
      /** 侧栏模块标题 */
      sidebar: {
        asideLabel: '站点信息',
        announcement: '公告',
        motto: '一言',
        stats: '站点统计',
        categories: '分类',
        tags: '标签云',
        recent: '最新文章',
        profileAlt: '{name} 的头像',
        runDays: '运行天数',
        runDaysUnit: '天',
        postCount: '文章',
        categoryCount: '分类',
        tagCount: '标签',
        viewAll: '查看全部',
        socialNav: '社交链接',
      },
      /** 资料卡问候语（按访问时间插值 {word}） */
      greeting: '{word}，来逛逛',
      /** 时段问候词 */
      greetingWords: {
        dawn: '夜深了',
        morning: '早上好',
        noon: '中午好',
        afternoon: '下午好',
        evening: '晚上好',
      },
      /** 分类筛选栏（轮播下方） */
      categoryBar: {
        navLabel: '分类筛选',
        all: '全部',
        more: '更多',
      },
      /** 首页区块无障碍标签 */
      sections: {
        postList: '文章列表',
        pager: '分页',
      },
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
    tocOpen: '打开目录',
    tocClose: '关闭目录',
    tocDialog: '文章目录',
  },

  /** 代码块 */
  code: {
    copy: '复制',
    copied: '已复制',
    failed: '失败',
    copyAria: '复制代码',
  },

  math: {
    copy: '复制公式',
    copied: '已复制',
    copyAria: '复制公式源码',
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
    /** 页头副题 */
    subtitle: '共 {n} 位朋友 · 排名不分先后',
    /** 本站信息卡 */
    infoTitle: '本站信息',
    fieldLabels: {
      avatar: '头像',
      name: '名称',
      desc: '介绍',
      url: '链接',
      rss: 'RSS',
      screenshot: '网站截图',
    },
    moreFields: '更多本站字段',
    copyAria: '复制{name}',
    copiedAria: '已复制{name}',
    /** 申请须知 */
    rulesTitle: '友链申请须知',
    applyChannel: '申请方式',
    emailLabel: '邮箱',
    emailSubject: '友链申请',
    sendEmail: '发送申请邮件',
    rulesNote: '申请格式：名称 · 链接 · 头像 · 描述',
    /** 免责声明 */
    disclaimerTitle: '友情链接页免责声明',
    disclaimerIntro: '本页友链均指向第三方站点。收录时我会检查站点内容，但无法持续追踪每个站点之后的变动，包括但不限于：',
    disclaimerItems: [
      '作者更换了超链接的指向，替换成了其他内容',
      '作者的服务器被恶意攻击、劫持、被注入恶意内容',
      '作者的域名到期，被不法分子用作他用',
      '作者修改了文章内容，增加钓鱼网站、广告等无效信息',
    ],
    disclaimerOutro: '如果从本页跳转使你遭受损失，深表歉意。发现问题欢迎留言反馈，通常会很快处理。',
    /** 友链列表 */
    friendsTitle: '朋友们',
    friendsCount: '{n} 位',
    randomVisit: '随机拜访',
    randomAria: '随机拜访一位朋友',
    legendTitle: '友链等级 · 印记图例',
    legendDaysRange: '{min}-{max} 天',
    legendDaysPlus: '{min} 天+',
    legendLost: '失联',
    daysBadge: '{n} DAYS',
    daysLost: 'LOST',
    recommendedAria: '推荐标记',
    /** 随机拜访模态 */
    modalHeading: '随机拜访',
    modalVisit: '前往',
    modalCancel: '取消',
    modalCloseAria: '关闭随机拜访',
    modalDescAria: '待拜访站点描述',
  },

  /** 关于页区块 */
  about: {
    now: '现在',
    skills: '技能',
    timeline: '时间线',
    contact: '联系',
  },
} as const
