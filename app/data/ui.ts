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
    panelTitle: '站点快捷导航',
    panelOpen: '打开站点导航面板',
    panelClose: '关闭站点导航面板',
    menuOpen: '打开菜单',
    menuDialog: '站点导航',
    menuClose: '关闭菜单',
    /** 站外链接的无障碍说明，紧跟外链图标之后朗读 */
    externalLink: '（站外链接，新窗口打开）',
    sidePanelOpen: '打开站点导航面板',
    sidePanelClose: '关闭面板',
    sidePanelAria: '站点导航面板',
    themeLabel: '主题：{label}，点击切换',
    themeTitle: '主题：{label}',
  },

  /** 页脚 */
  footer: {
    uptimeLabel: '小站已存活：',
    uptimeValue: '{d} 天 {h} 时 {m} 分 {s} 秒',
    legalNavAria: '站点法务页面',
  },

  /** 法务页（隐私政策 / Cookie / 版权协议） */
  legal: {
    navAria: '其他法务页面',
    notFound: '页面不存在',
  },

  /** 页面标题与区块标签 */
  pages: {
    archive: '归档',
    categories: '分类',
    tags: '标签',
    links: '友链',
    fcircle: '朋友圈',
    hot: '热搜',
    message: '留言板',
    shuoshuo: '说说',
    about: '关于',
    changelog: '更新日志',
    /** 相册页 */
    gallery: {
      title: '相册',
      description: '用镜头记录生活，随手拍下的那些瞬间。',
      pageMeta: '{folders} 个分类 · 共 {photos} 张照片',
      photosCount: '{n} 张',
      coverAlt: '{name} 分类封面',
      backToFolders: '返回相册',
      empty: '这个分类还没有照片。',
      notFound: '相册分类不存在',
      viewPhotoAria: '查看第 {index} 张照片',
      lightboxAria: '照片查看器',
    },
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
      /** 说说轮播条 */
      shuoshuoBar: {
        navLabel: '说说轮播条',
        linkAria: '最新说说，点击查看全部',
        photoAria: '该说说包含图片',
        empty: '还没有说说',
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
        /** 访客信息卡（客户端拉取 IP 地理信息） */
        visitor: {
          title: '访客信息',
          ip: 'IP 地址',
          location: '地理位置',
          distance: '与博主距离',
          isp: '运营商',
          os: '操作系统',
          browser: '浏览器',
          cdn: 'CDN 节点',
          loading: '正在加载…',
          calculating: '正在计算…',
          failed: '获取失败',
          na: 'N/A',
          distanceValue: '约 {n} 公里',
          distanceFailed: '无法计算',
          localDev: '本地开发',
          cardBtn: '查看 IP 信息卡',
          cardBtnCollapse: '收起 IP 信息卡',
          cardQuerying: '查询中…',
          cardFailed: '加载失败，点击重试',
          cardAlt: 'IP 信息卡片',
          cdnAlt: '{name} CDN',
        },
        motto: '一言',
        stats: '网站信息',
        sponsors: '赞赏者',
        sponsorsLink: '能量榜',
        sponsorsLinkAria: '查看完整赞赏名单',
        categories: '分类',
        tags: '标签云',
        profileAlt: '{name} 的头像',
        postCount: '文章数目',
        wordCount: '本站总字数',
        visitorCount: '本站访客数',
        viewCount: '本站访问量',
        latestUpdate: '最后更新时间',
        relativeToday: '今天',
        relativeDays: '{n}天前',
        relativeMonths: '{n}个月前',
        relativeYears: '{n}年前',
        viewAll: '查看全部',
        socialNav: '社交链接',
      },
      /** 侧栏日历卡（Dusklight 式日历 + 当日文章） */
      calendar: {
        months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        weekdays: ['一', '二', '三', '四', '五', '六', '日'],
        weekRanges: ['1–7日', '8–14日', '15–21日', '22–28日', '29日至月底'],
        gridLabel: '月历',
        heatLabel: '{year}年文章活跃度',
        backToToday: '回到今天',
        prevMonth: '上一个月',
        nextMonth: '下一个月',
        titlePlaceholder: '—',
        dayTitle: '{year}年 {month}',
        monthTitle: '{year}年',
        yearTitle: '选择年份',
        selectMonth: '选择月份',
        selectYear: '选择年份',
        backToDay: '返回日视图',
        pickMonthAria: '选择{year}年{month}',
        pickYearAria: '选择{year}年',
        dayAria: '{year}年{month}月{day}日{posts}',
        withPosts: '，{count}篇文章',
        heatAria: '{year}年{month}月{range}，{count}篇文章',
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
      /** 发文热力图（文章列表底部） */
      heatmap: {
        regionLabel: '发文热力图',
        summary: '过去一年共 {n} 篇文章',
        dayTooltip: '{date}：{n} 篇',
        dayEmpty: '{date}：暂无发文',
        weekdays: ['', '一', '', '三', '', '五', ''],
      },
      /** 首页区块无障碍标签 */
      sections: {
        postList: '文章列表',
        pager: '分页',
      },
    },
  },

  /** 留言板（/message） */
  message: {
    /** 页头副题与 chips（h1 复用 ui.pages.message） */
    heroSubtitle: '一张贴在门口的便签纸，写给喵洛阁，也写给路过的你。留一句问候、一条建议、一个报错，或者只是告诉我你来过。',
    heroChip: { start: '来都来了', talk: '有话直说', apply: '申请友链' },
    heroChipApplyAria: '前往友链页申请友链',
    /** 引言区 */
    kicker: 'GUESTBOOK',
    introTitle: '慢一点，这里不赶时间',
    introLead: '这里不是工单系统，没有必须回复的时限。你可以聊文章里没写全的细节，聊聊前端和设计，也可以只是留下一句无关紧要的闲话。',
    introFollow: '每一条我都会看。善意的文字会留在这个小站里，和页面上的其他字一起，等下一位访客翻到这里。',
    introQuote: '山河湖海，素未谋面，也可以在一行字里相逢。',
    /** 规范折叠块 */
    rulesSummary: '留言板规范 — 文明留言，共建一个干净的角落',
    rulesWarn: '违反规范可能导致警告、禁言或永久封禁。站长保留对本站规范的解释权与调整权，有异议请私下邮件联系。',
  },

  /** 面包屑导航 */
  breadcrumb: {
    aria: '面包屑导航',
    /** 根节点显示为 ~（Unix 家目录双关），读屏读「首页」 */
    home: '首页',
    homeGlyph: '~',
    /** 文章页的返回上一页：Unix 式 cd .. */
    back: 'cd ..',
    backLabel: '返回上一页',
    backAria: '返回上一页。当前位置：{where}',
    /** 路由段到中文名的映射（不含详情页的动态段） */
    routes: {
      archive: '归档',
      categories: '分类',
      tags: '标签',
      links: '友链',
      fcircle: '朋友圈',
      hot: '热搜',
      message: '留言板',
      shuoshuo: '说说',
      gallery: '相册',
      about: '关于',
      changelog: '更新日志',
      legal: '法务',
      posts: '文章',
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
    /** busuanzi 计数后缀（数值由 bsz 脚本填充到前置 span，容器默认隐藏） */
    pageViews: '次浏览',
    pageVisitors: '位访客',
    navAria: '文章导航',
    prev: '上一篇',
    next: '下一篇',
    navEmptyPrev: '已是最早一篇',
    navEmptyNext: '已是最新一篇',
    related: '相关',
    commentsJumpAria: '跳转到评论',
    /** 无目录时旁栏/顶栏的直达评论入口文案 */
    jumpComments: '直达评论',
    toc: '目录',
    tocAria: '目录',
    tocOpen: '打开目录',
    tocClose: '关闭目录',
    tocDialog: '文章目录',
    /** 头卡字数 */
    wordCount: '{n} 字',
    /** 头卡创建日期 tooltip */
    createdAt: '创建于 {date}',
    /** 头卡分享按钮 + 分享弹窗 */
    shareArticle: '分享文章',
    shareDialogAria: '文章分享',
    shareMethod: '分享方式',
    shareWeibo: '微博',
    shareQq: 'QQ',
    shareMail: '邮件',
    shareCopy: '复制链接',
    shareCopied: '已复制链接',
    shareQrAlt: '文章二维码',
    shareQrTip: '扫码阅读本文',
    /** 版权信息卡 */
    copyrightAuthor: '文章作者',
    copyrightPublished: '发布时间',
    copyrightUpdated: '更新时间',
    copyrightLicense: '版权信息',
    copyrightAria: '文章版权信息',
    /** 打赏弹窗 */
    rewardButton: '打赏',
    rewardTitle: '打赏中心',
    rewardThanks: '感谢你赐予我前进的力量',
    rewardSponsors: '赞赏者名单',
    rewardSponsorsDesc: '因为你们的支持让我意识到写文章的价值',
    rewardQrAlt: '{name}收款码',
    rewardQrMissing: '收款码待配置',
    rewardLinkAria: '打开赞赏者名单',
    rewardWechat: '微信',
    rewardAlipay: '支付宝',
    /** 打赏弹窗「加入名单」按钮（跳 GitHub 议题模板） */
    rewardJoin: '加入名单',
    rewardJoinAria: '前往 GitHub 提交打赏收录申请',
    /** AI 智能摘要卡片 */
    aiSummaryRegionAria: 'AI 智能摘要',
    aiSummaryExpand: '展开全部',
    aiSummaryCollapse: '收起',
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
    loading: '正在加载图片…',
    prev: '上一张',
    next: '下一张',
  },

  /** 评论占位 */
  comment: {
    aria: '评论',
    closed: '评论暂未开放',
  },

  /** 浮动操作按钮 */
  fab: {
    backTopAria: '回到顶部',
    backTopTitle: '回到顶部',
  },

  /** 左下角音乐播放器 */
  music: {
    regionLabel: '音乐播放器',
    openAria: '展开音乐播放器',
    closeAria: '收起音乐播放器',
    playAria: '播放',
    pauseAria: '暂停',
    prevAria: '上一首',
    nextAria: '下一首',
    progressAria: '播放进度',
    volumeAria: '音量',
    modeAria: '播放模式：{label}，点击切换',
    modes: {
      list: '列表循环',
      one: '单曲循环',
      shuffle: '随机播放',
    },
    loading: '正在取歌单…',
    loadFailed: '歌单没取回来',
    retry: '重试',
    unavailable: '这首暂时听不了，已跳过',
    empty: '歌单里没有歌',
    coverAlt: '《{name}》封面',
    unknownTrack: '未选择曲目',
    unknownArtist: '网易云音乐',
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
    avatarAlt: '{name} 的头像',
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
    applyIssue: '前往 GitHub 提交申请议题',
    applyEmailNote: '也可以发送邮件至 {email} 联系我',
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

  /** 友链朋友圈（数据源：fcircle.json，构建期爬取） */
  fcircle: {
    /** 页头副题 */
    subtitle: '{n} 位朋友 · 近半年 {m} 篇文章',
    searchPlaceholder: '搜索标题、摘要或作者…',
    searchAria: '搜索朋友圈文章',
    filterLabel: '按作者筛选',
    filterAll: '全部',
    avatarAlt: '{name} 的头像',
    coverAlt: '{title} 的封面',
    pagerAria: '朋友圈分页',
    prevPage: '上一页',
    nextPage: '下一页',
    pageAria: '第 {n} 页',
    status: '共 {total} 篇 · 第 {page} / {pages} 页',
    /** 空态 */
    empty: '朋友们最近半年还没有更新',
    emptyFiltered: '没有匹配的文章，换个关键词或作者试试',
    /** 数据说明 */
    dataSourceNote: '数据每天自动聚合自朋友们的 RSS 订阅源',
  },

  /** 热搜（数据源：hot-api.liiiu.cn，客户端拉取） */
  hot: {
    /** 页头副题：{platform} 平台名，{time} 更新时间 */
    subtitle: '{platform} · 更新于 {time}',
    tabsAria: '选择热榜平台',
    platformIconAlt: '{name} 图标',
    status: '共 {total} 条 · 第 {page} / {pages} 页',
    /** 热度展示 */
    hotValue: '热度 {value}',
    hotUnitWan: '万',
    hotUnitM: 'M',
    /** 状态 */
    loading: '正在加载热搜…',
    loadError: '热搜数据获取失败，请稍后再试',
    retry: '重试',
    empty: '暂无热搜数据',
    /** 分页 */
    pagerAria: '热搜分页',
    prevPage: '上一页',
    nextPage: '下一页',
    pageAria: '第 {n} 页',
    /** 卡片无障碍 */
    rankAria: '第 {n} 名',
    titleLinkAria: '查看「{title}」',
    noDesc: '暂无描述',
    dataSourceNote: '数据聚合自各平台公开热榜，每 5 分钟更新',
  },

  /** 说说（数据源：Ech0） */
  shuoshuo: {
    /** 页头副题 */
    subtitle: '共 {n} 条碎碎念 · 来自 Ech0',
    loading: '正在加载说说…',
    loadError: '说说加载失败，请稍后重试',
    retry: '重试',
    empty: '还没有说说',
    avatarAlt: '{name} 的头像',
    /** 相对时间 */
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    hoursAgo: '{n} 小时前',
    daysAgo: '{n} 天前',
    /** 标签筛选 */
    filterAll: '全部',
    filterAria: '按标签筛选说说',
    /** 表情反应 */
    reactionToggleAria: '添加表情回应',
    reactionAria: '{emoji} {n} 次，点击回应',
    reactionAriaPlain: '{emoji} {n} 次',
    reactionsTitle: '表情',
    /** 评论区 */
    commentsToggle: '评论',
    commentsAria: '展开 {n} 条评论',
    commentsTitle: '评论 · {n}',
    commentsEmpty: '还没有评论，来说一句吧',
    commentsOff: '评论区已关闭',
    formTitle: '发表评论',
    replyTo: '回复 {name}',
    cancelReply: '取消回复',
    replyAria: '回复{name}的评论',
    nicknameLabel: '昵称',
    emailLabel: '邮箱',
    websiteLabel: '网站（选填）',
    contentLabel: '说点什么…',
    contentCount: '{n}/200',
    contentTooLong: '评论最长 200 字',
    submit: '发送',
    submitting: '发送中…',
    commentApproved: '评论已发布',
    commentPending: '评论已提交，等待审核',
    commentFailed: '评论发送失败，请重试',
    captchaLoading: '正在准备人机验证…',
    captchaSolving: '验证中…',
    captchaFailed: '人机验证未通过，请重试',
    guestNotice: '评论以访客身份提交，昵称必填',
    /** 扩展卡片 */
    extGithub: 'GitHub 项目',
    extGithubCta: '查看仓库',
    extWebsite: '网站',
    extLocation: '位置',
    extLocationAria: '在地图中查看位置',
    extVideo: '视频',
    extVideoCta: '前往观看',
    extAudio: '音乐',
    extAudioAria: '音频播放器',
    extTweet: '推文',
    extTweetCta: '查看原推',
    /** 分页 */
    paginationAria: '说说分页导航',
    prevPage: '上一页',
    nextPage: '下一页',
    pageLabel: '第 {n} 页',
    pageStatus: '第 {n} / {total} 页 · 共 {count} 条',
  },

  /** 工具页（封面生成器 / 从夯到拉 / 图片格式转换） */
  tools: {
    /** /tools/cover-generator */
    cover: {
      title: '封面生成器',
      intro: '把标题、图标和背景排成一张封面。所有素材只在本机浏览器处理。',
      localBadge: '本地处理',
      defaultLeftText: '喵洛阁',
      defaultRightText: '记录灵感与生活',
      materialRailAria: '内容素材设置',
      contentSection: '内容',
      leftTextLabel: '左侧文字',
      leftTextPlaceholder: '输入标题',
      rightTextLabel: '右侧文字',
      rightTextPlaceholder: '输入副标题',
      fontLabel: '字体',
      uploadedFont: '已上传字体',
      fontWeightLabel: '字体粗细',
      fontSizeLabel: '字体大小',
      customFont: '自定义字体',
      upload: '上传',
      iconSection: '图标',
      searchIconLibrary: '搜索图标库',
      iconSearchPlaceholder: '搜索图标库…',
      iconSearchHelp: '输入名称或关键词，搜索 Iconify 图标库',
      searchingIcons: '正在搜索图标…',
      noIconResults: '没有找到图标，试试更短的关键词。',
      iconResultsAria: '图标搜索结果',
      quickPick: '快速选择',
      iconPresetsAria: '预设图标',
      currentIconPrefix: '当前：',
      localPresetPrefix: '本地预设：{label}',
      customImageIcon: '自定义图片图标',
      showIcon: '显示图标',
      keepIconColor: '保留原色',
      iconColorLabel: '图标颜色',
      iconBackgroundLabel: '图标底色',
      enableIconBackground: '启用图标底色',
      restorePresetIcon: '恢复预设图标',
      backgroundSection: '背景图片',
      dropzoneTitle: '点击或拖拽选择图片',
      dropzoneNote: '图片只在浏览器本地载入',
      removeBackground: '移除背景图片',
      previewAria: '实时封面画布',
      livePreview: '实时预览',
      canvasAria: '实时封面预览',
      exportSection: '画布与导出',
      exportAria: '画布与导出设置',
      ratioLabel: '画板比例',
      ratioAria: '画板比例',
      scaleLabel: '缩放倍率',
      filenameLabel: '文件名',
      outputNote: '输出 {width} × {height} px',
      transparentBackground: '透明背景',
      exportButton: '导出 PNG',
      appearanceSection: '外观样式',
      appearanceAria: '外观样式设置',
      colorLabel: '颜色',
      textColorLabel: '文字',
      iconColorShort: '图标',
      backgroundColorShort: '底色',
      backgroundOpacityLabel: '背景不透明度',
      iconSizeLabel: '图标大小',
      iconRadiusLabel: '图标圆角',
      gapLabel: '内容间距',
      shadowSection: '阴影设置',
      opacityLabel: '不透明度',
      shadowColorLabel: '阴影颜色',
      blurLabel: '模糊',
      shadowXLabel: '水平偏移',
      shadowYLabel: '垂直偏移',
      invalidImageFile: '请选择有效的图片文件。',
      imageLoadFailed: '图片读取失败，请换一个文件再试。',
      fontLoadFailed: '字体加载失败，请使用有效的 TTF、OTF 或 WOFF 文件。',
      exportFailed: '导出失败，请调整画布后重试。',
      exported: '已导出 {width} × {height} px PNG。',
      iconSearchFailed: '图标库暂时无法连接，请检查网络后重试。',
      iconLoadFailed: '该图标载入失败，请选择其他图标。',
    },

    /** /tools/tier-list */
    tier: {
      title: '从夯到拉',
      intro: '把图片拖进对应档位，排出你的专属榜单。素材只在浏览器本地处理。',
      localBadge: '本地制作',
      boardAria: '从夯到拉制作器',
      boardTitle: '排名画布',
      exportTitleLabel: '导出标题',
      tierZoneAria: '{label} 档位',
      tierZoneImagesAria: '{label} 图片区',
      deleteItemAria: '删除 {name}',
      deleteItemTitle: '删除图片',
      emptyTier: '拖到此处排名',
      addImages: '添加图片',
      uploadAria: '上传待分级图片',
      saving: '正在保存…',
      saveRanking: '保存排名图',
      clearAll: '清空',
      counts: '{total} 张图片 · {pending} 张待排 · {ranked} 张已分级',
      poolAria: '待排图片',
      poolTitle: '待排图片',
      poolCount: '{n} 张',
      poolZoneAria: '待排图片区',
      poolEmptyLine1: '这里会放置还没有排名的图片。',
      poolEmptyLine2: '可点击添加，或将图片拖到此处。',
      invalidImageFile: '请选择有效的图片文件。',
      saved: '排名图已保存为 PNG。',
      exportFailed: '排名图导出失败，请稍后重试。',
    },

    /** /tools/image-converter */
    converter: {
      title: '图片格式转换',
      intro: '选择图片和目标格式，转换过程全部在当前浏览器完成，不上传原图。',
      localBadge: '本地处理',
      workspaceAria: '图片格式转换工具',
      convertTo: '转换为',
      dropAriaWithFiles: '拖放图片到此处添加',
      dropAriaEmpty: '选择或拖放图片',
      dropTitle: '选择图片或拖放到此处',
      dropFormats: '支持 PNG、JPEG、WebP、BMP、AVIF、GIF 等常见格式，可多选',
      browse: '选择图片',
      filesCount: '{n} 张图片',
      convertedCount: '{n} 张已转换',
      clear: '清空选择图片',
      statusReady: '待转换',
      statusConverting: '转换中…',
      statusDone: '已完成',
      statusError: '失败',
      downloadAria: '下载 {name}',
      removeAria: '移除 {name}',
      addMore: '添加更多图片',
      privacyNote: '图片仅在本地浏览器处理，不会上传',
      downloadAll: '下载全部',
      convert: '开始转换',
      converting: '正在转换…',
      rejectedFiles: '已忽略 {n} 个非图片文件。',
      alreadyAdded: '所选图片已在列表中。',
      noValidImages: '没有找到可转换的图片文件。',
      invalidSize: '图片尺寸无效',
      canvasUnavailable: '当前浏览器无法创建画布',
      avifUnsupported: '当前浏览器不支持 AVIF 编码',
      formatUnsupported: '当前浏览器不支持 {label} 编码',
      noBlob: '转换未生成有效文件',
      convertFailed: '转换失败，请尝试其他图片。',
      convertSummaryFailed: '转换完成：{ok} 张成功，{failed} 张失败。',
      convertSummaryOk: '已完成 {n} 张图片转换。',
    },
  },

  /** 更新日志（数据源：构建期 git log） */
  changelog: {    /** 页头副题 */
    subtitle: '博客开发日志 · 共 {n} 次提交',
    /** 类型筛选 */
    filterLabel: '按提交类型筛选',
    filterAll: '全部',
    /** 月份标题：年份单独成元素，这里只拼「年 + 月」 */
    monthUnit: '年',
    monthLabel: '{n} 月',
    monthCount: '{n} 条',
    /** 月份被分页切开时的续页标记 */
    continued: '续',
    /** 条目 */
    commitLinkAria: '在 GitHub 查看提交 {hash}',
    /** 类型标签文案（与 conventional commits 前缀一一对应） */
    types: {
      feat: '新功能',
      fix: '修复',
      refactor: '重构',
      perf: '性能',
      style: '样式',
      docs: '文档',
      test: '测试',
      chore: '杂务',
      ci: '构建',
      build: '构建',
      revert: '回滚',
      other: '其他',
    },
    /** 空态 */
    empty: '还没有提交记录',
    emptyFiltered: '该类型下没有提交',
    /** 分页 */
    pagerAria: '更新日志分页',
    prevPage: '上一页',
    nextPage: '下一页',
    pageAria: '第 {n} 页',
    pageStatus: '第 {n} / {pages} 页 · 共 {total} 条',
  },
} as const
