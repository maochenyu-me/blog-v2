/**
 * 页面级配置 —— 每个路由的独立业务参数，避免散落在页面组件里。
 * definePageMeta 只放 transition / layout / keepalive 这类路由行为。
 */
export default {
  pages: {
    home: {
      pinnedCount: 2,
      latestCount: 10,
      showExcerpt: false,
      cta: { label: '查看全部', to: '/archive' },

      // ---- 文章卡片流 ----
      cards: {
        /** 每页卡片数量（沿用原 latestCount 的分页口径） */
        pageSize: 10,
        /** 无封面文章卡片使用的默认占位图（位于 public/） */
        fallbackCover: '/images/covers/default.svg',
        /** 摘要截断长度（字符数，超出部分截断加省略号） */
        excerptLength: 64,
        /** 卡片上是否显示阅读时长 */
        showReadingTime: true,
      },

      // ---- 顶部推荐轮播 ----
      carousel: {
        /** 是否启用轮播区（false 时整区不渲染） */
        enabled: true,
        /** 自动轮播间隔（毫秒）；interval 设 0 表示不自动播放 */
        interval: 5000,
        /** 是否显示左右箭头（移动端始终隐藏箭头，改用滑动） */
        showArrows: true,
        /** 是否显示底部指示点 */
        showDots: true,
        /** 参与轮播的推荐文章数量上限（取 featured + 有封面 的前 N 篇） */
        maxFeatured: 5,
        /** 没有任何可用推荐文章时是否隐藏整个轮播区（false 时显示占位提示） */
        hideWhenEmpty: true,
        /** 左上角徽标文案（空字符串则不显示徽标） */
        badge: '全站推荐',
      },

      // ---- 分类筛选栏（轮播下方、文章列表上方的横向分类条，Dusklight 风格） ----
      categoryBar: {
        /** 是否启用分类筛选栏 */
        enabled: true,
        /** 最多展示的分类数量（按文章数降序取前 N 个，超出部分点「更多」查看） */
        maxCount: 6,
        /** 是否显示右侧「更多」链接（跳转 /categories 页） */
        showMore: true,
      },

      // ---- 右侧侧栏 ----
      sidebar: {
        /** 是否启用侧栏（false 时首页只有主内容单栏） */
        enabled: true,
        /**
         * 侧栏组件排列顺序，从上到下。
         * 可选项：profile / announcement / motto / stats / categories / tags / recent
         * 想隐藏某个组件：把它的 enabled 设为 false，或从数组中移除。
         * 注意：分类已默认由顶部 categoryBar 承担，此处默认不再重复展示。
         */
        order: ['profile', 'announcement', 'motto', 'stats', 'tags', 'recent'],

        profile: {
          /** 是否显示资料卡 */
          enabled: true,
          /** 头像图片路径（留空则回退 site.author.avatar） */
          avatar: '',
          /** 昵称（留空则回退 site.author.name） */
          name: '',
          /** 一句话简介（留空则回退 site.author.bio） */
          bio: '',
          /** 社交链接组：留空数组则回退 site.social */
          social: [],
          /** 徽标问候语（显示在头像上方，空字符串不显示） */
          greeting: '下午好，来逛逛',
        },

        announcement: {
          /** 是否显示公告栏 */
          enabled: true,
          /** 公告正文（纯文本，支持 \n 换行） */
          text: '博客正在持续改版中，首页焕然一新。遇到问题欢迎通过社交链接反馈！',
          /** 「了解更多」链接（空字符串则不显示链接） */
          moreLabel: '了解更多',
          moreTo: '/about',
        },

        motto: {
          /** 是否显示一言卡 */
          enabled: true,
          /** 格言列表，每次页面加载随机展示一条 */
          mottos: [
            { text: '有志者，事竟成。', from: '后汉书' },
            { text: '不积跬步，无以至千里。', from: '荀子' },
            { text: '纸上得来终觉浅，绝知此事要躬行。', from: '陆游' },
            { text: 'Simple is better than complex.', from: 'The Zen of Python' },
            { text: '代码是写给人看的，顺便让机器执行。', from: '佚名' },
          ],
        },

        stats: {
          /** 是否显示站点统计 */
          enabled: true,
          /** 建站日期（ISO 格式），运行天数以此为起点计算 */
          siteStartDate: '2024-01-01',
          /** 是否显示运行天数（ClientOnly 渲染，避免 SSG 水合不一致） */
          showRunDays: true,
          /** 是否显示文章数 */
          showPostCount: true,
          /** 是否显示分类数 */
          showCategoryCount: true,
          /** 是否显示标签数 */
          showTagCount: true,
        },

        categories: {
          /** 是否显示分类列表 */
          enabled: true,
          /** 最多显示的分类数量 */
          maxCount: 6,
        },

        tags: {
          /** 是否显示标签云 */
          enabled: true,
          /** 最多显示的标签数量 */
          maxCount: 16,
        },

        recent: {
          /** 是否显示最新文章 */
          enabled: true,
          /** 最新文章数量 */
          count: 5,
          /** 是否显示小缩略图（无封面文章用占位图） */
          showThumb: true,
        },
      },
    },

    archive: {
      groupBy: 'year' as const,
      showCount: true,
      order: 'desc' as const,
    },

    categories: {
      layout: 'list' as const,
    },

    tags: {
      cloudMinSize: 'sm' as const,
      cloudMaxSize: 'xl' as const,
    },

    links: {
      columns: { mobile: 1, tablet: 3, desktop: 4 },
      showAvatar: true,
      applyRules: [
        '站点需为原创个人博客，内容健康、持续更新',
        '已在自己站点添加本站友链',
        '请提供站点名称、简介、头像与链接',
        '本站保留拒绝或随时移除友链的权利',
      ],
      /** 免责声明是否默认展开（details 的 open 初始值） */
      disclaimerOpen: false,
      /**
       * 友链申请议题的表单直达链接（申请方式按钮的跳转目标）。
       * template 参数预选 .github/ISSUE_TEMPLATE/friend-link.yml。
       */
      applyIssueUrl: 'https://github.com/maochenyu-me/blog-v2/issues/new?template=friend-link.yml',
      /**
       * 本站「网站截图」字段指向的图片路径（拼接 site.url 对外展示）。
       * 当前是占位图，替换为真实截图后同步改这里（建议 1200×750 以上）。
       */
      screenshot: '/images/site-screenshot.svg',
      /**
       * 信息卡默认展开的字段数，其余折进「更多本站字段」折叠块。
       * 字段顺序按重要性排：链接/头像/RSS 是访客最常复制的三项，保持常显。
       */
      expandedFields: 3,
      /** 是否显示「友链等级」图例折叠块 */
      showLegend: true,
      /** 是否显示「随机拜访」入口与确认模态 */
      randomVisit: true,
    },

    post: {
      showToc: true,
      showPrevNext: true,
      showRelated: true,
      relatedCount: 3,
      showCopyButton: true,
      showImageViewer: true,
    },

    shuoshuo: {
      /** Ech0 实例地址（不带尾斜杠），说说数据源 */
      apiBase: 'https://m.081531.xyz',
      /** 每页说说数量 */
      pageSize: 10,
      /** 卡片显示名称，空串回落到 site.author.name */
      displayName: '',
      /** 卡片头像路径，空串回落到 site.author.avatar */
      avatar: '',
      /** 桌面端（≥1280px）瀑布流列数；768~1280 固定 2 列，<768 单列 */
      desktopColumns: 3,
      /** 是否允许访客写表情反应（false 时仅展示计数） */
      reactionsEnabled: true,
      /** 评论区是否启用 */
      commentsEnabled: true,
    },
  },
}
