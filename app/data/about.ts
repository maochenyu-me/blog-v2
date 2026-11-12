/**
 * 关于页全部配置 —— 结构移植自 Dusklight（mcxiaochen.top/about），
 * 视觉走本站极简 token。每个区块组件都有 enabled 开关；
 * 行结构由 aboutRows 声明：同行组件按 span 占比分配宽度，
 * 关闭其中一个后，剩余组件保持自身宽度并水平居中。
 */

// ---------- 类型 ----------

export interface AuthorTag {
  left: string
  right: string
}

export interface FavoriteItem {
  name: string
  /** 封面图路径（public/ 下）；留空则渲染纯色占位块 */
  image?: string
  /** 横版封面（16:9），默认竖版（3:4） */
  landscape?: boolean
}

export interface SelfInfoItem {
  label: string
  value: string
  /** @nuxt/icon 图标名 */
  icon: string
  /** 主题色，留空则用站点 accent */
  accent?: string
}

export interface SiteCardLink {
  text: string
  /** 留空则渲染纯文本 */
  href?: string
}

export interface SiteCard {
  title: string
  icon: string
  body?: string
  links?: SiteCardLink[]
}

export interface VisitStatsData {
  todayUv: string
  todayPv: string
  yesterdayUv: string
  yesterdayPv: string
  lastMonthPv: string
  totalPv: string
}

export interface RewardItem {
  name: string
  /** 头像直链，缺省渲染名称首字占位圆 */
  avatar?: string
  /** 金额（元） */
  amount: number
  /** 打赏日期，YYYY-MM-DD */
  date: string
}

// ---------- 区块配置 ----------

export const aboutConfig = {
  /** 置顶：头像 + 两侧漂浮标签（≤768px 隐藏标签） */
  hero: {
    enabled: true,
    avatar: '/images/avatar.png',
    name: '克喵',
    authorTags: [
      { left: '🐱 猫系前端', right: '🍊 布丁铲屎官' },
      { left: '🎨 界面强迫症', right: '📝 想清楚再写' },
    ] as AuthorTag[],
  },

  /** 问候卡（渐变留给了排版，卡片本体走极简） */
  hello: {
    enabled: true,
    prefix: '我是',
    tips: '你好呀',
    name: '克喵',
    intro: '白天做界面，晚上写字。这个博客是我放笔记的地方——想清楚了才写得出来的那种。',
  },

  /** 关键词轮播（遮罩上滑动画） */
  tips: {
    enabled: true,
    lead: '追求',
    line1: '生活不止眼前的苟且',
    line2: '还有诗和远方',
    words: ['折腾', '克制', '清晰', '分享', '前行'],
  },

  /** 技能图标墙 */
  skills: {
    enabled: true,
    tips: '技多不压身',
    title: '我的技能',
    /** @nuxt/icon 图标名 */
    icons: [
      'tabler:brand-typescript',
      'tabler:brand-vue',
      'tabler:brand-react',
      'tabler:brand-nodejs',
      'tabler:brand-python',
      'tabler:brand-docker',
      'tabler:brand-git',
      'tabler:brand-cloudflare',
    ],
  },

  /** 性格 MBTI 卡（image 留空则不渲染立绘） */
  personality: {
    enabled: true,
    tips: '性格',
    title: '逻辑学家',
    mbti: 'INTP-T',
    desc: '大众前社恐，实则慢热，和熟人比较放得开 :(',
    link: {
      label: '了解逻辑学家人格档案',
      url: 'https://www.16personalities.com/ch/intp-%E4%BA%BA%E6%A0%BC',
    },
    image: '',
  },

  /** 追番封面墙 */
  anime: {
    enabled: true,
    tips: '爱好番剧',
    title: '追番',
    items: [
      { name: '孤独摇滚' },
      { name: 'EVA' },
      { name: '鬼灭之刃' },
      { name: '紫罗兰永恒花园' },
      { name: '星际牛仔' },
    ] as FavoriteItem[],
  },

  /** 游戏封面墙 */
  games: {
    enabled: true,
    tips: '喜欢的游戏',
    title: '游戏',
    items: [
      { name: '塞尔达传说：旷野之息' },
      { name: 'Minecraft', landscape: true },
      { name: '空洞骑士' },
      { name: 'CS2', landscape: true },
      { name: '星露谷物语' },
    ] as FavoriteItem[],
  },

  /** 站点资料卡组（通栏行的右列 / 单行时全宽） */
  siteCards: {
    enabled: true,
    cards: [
      {
        title: '我的域名',
        icon: 'tabler:world',
        links: [
          { text: 'kemiaosw.top — 现在在用的', href: 'https://www.kemiaosw.top' },
        ],
      },
      {
        title: '关于本站',
        icon: 'tabler:info-circle',
        links: [
          { text: '框架：Nuxt 4 + Nuxt Content', href: 'https://nuxt.com' },
          { text: '部署：Cloudflare Pages', href: 'https://pages.cloudflare.com' },
          { text: '源码：GitHub', href: 'https://github.com/Kemeow0815' },
        ],
      },
    ] as SiteCard[],
  },

  /** 彩色图标三列信息行 */
  selfInfo: {
    enabled: true,
    items: [
      { label: '坐标', value: '待填写', icon: 'tabler:map-pin' },
      { label: '身份', value: '前端开发', icon: 'tabler:id' },
      { label: '搭子', value: '布丁（橘猫）', icon: 'tabler:cat' },
    ] as SelfInfoItem[],
  },

  /** 访问统计 —— 占位硬编码，接入统计服务后填 apiUrl 换成实时数据 */
  visitStats: {
    enabled: true,
    tips: '数据',
    title: '访问统计',
    /** 实时统计代理前缀（Pages Function）；留空则只展示 placeholder */
    apiUrl: '/api/umami',
    labels: {
      todayUv: '今日人数',
      todayPv: '今日访问',
      yesterdayUv: '昨日人数',
      yesterdayPv: '昨日访问',
      lastMonthPv: '最近月访问',
      totalPv: '总访问',
    },
    placeholder: {
      todayUv: '12',
      todayPv: '48',
      yesterdayUv: '36',
      yesterdayPv: '102',
      lastMonthPv: '1,286',
      totalPv: '4,096',
    } as VisitStatsData,
  },

  /** 关于我（通栏正文卡；正文来自 content/about.md） */
  aboutMe: {
    enabled: true,
    title: '关于我',
  },

  /** 打赏名单（数据在 app/data/sponsors.json，由打赏 issue 工作流自动维护） */
  reward: {
    enabled: true,
    tips: '感谢',
    title: '打赏名单',
    desc: '感谢每一位支持者的慷慨解囊，你们的支持是我持续创作最大的动力 ❤️',
    /** 统计条模板：{count} 笔数、{sum} 累计金额 */
    stats: '共收到 {count} 笔打赏，累计 ¥{sum}',
    /** 右上角充电按钮：label（点击弹出打赏中心弹窗） */
    chargeLabel: '为TA充电',
    /** 电路装饰旁的人数文案：{count} 名单人数 */
    countText: '共 {count} 人',
    emptyText: '还没有赞助记录，第一个支持者就是你~',
  },

  /** 评论区（当前为 CommentSlot 占位） */
  comments: {
    enabled: true,
  },
}

// ---------- 行结构 ----------

/**
 * 每行放哪些区块、按什么比例分宽（span 相对值）。
 * key 必须是 aboutConfig 的一级键（hero 除外，它置顶独立渲染）。
 * 单元素行 = 通栏；关闭某组件后，同行剩余组件按自己的 span/总 span 保持原宽并居中。
 */
export const aboutRows: Array<Array<{ key: AboutBlockKey; span: number }>> = [
  [{ key: 'hello', span: 3 }, { key: 'tips', span: 2 }],
  [{ key: 'skills', span: 1 }],
  [{ key: 'personality', span: 3 }, { key: 'anime', span: 2 }],
  [{ key: 'games', span: 2 }, { key: 'siteCards', span: 3 }],
  [{ key: 'visitStats', span: 2 }, { key: 'selfInfo', span: 3 }],
  [{ key: 'aboutMe', span: 1 }],
  [{ key: 'reward', span: 1 }],
]

export type AboutBlockKey = Exclude<keyof typeof aboutConfig, 'hero'>

/** 区块是否启用（comments 无独立渲染组件，由页面判断） */
export function isBlockEnabled(key: AboutBlockKey): boolean {
  const block = aboutConfig[key] as { enabled?: boolean }
  return block.enabled !== false
}
