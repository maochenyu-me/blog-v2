/**
 * 关于页全部配置 —— 结构移植自 Dusklight（mcxiaochen.top/about），
 * 视觉走本站极简 token。每个区块组件都有 enabled 开关；
 * 行结构由 aboutRows 声明：同行组件按 span 占比分配宽度，
 * 关闭其中一个后，剩余组件保持自身宽度并水平居中；
 * 若上下相邻两条行都只剩一个独苗，则合并成一行（上左、下右），见 buildAboutLayout。
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
  totalUv: string
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
    avatar: '/images/avatar.jpg',
    name: '克喵:)',
    authorTags: [
      { left: '博客魔改者', right: '日常记录者' },
      { left: 'ai编程者', right: '实习牛马中' },
    ] as AuthorTag[],
  },

  /** 问候卡（渐变留给了排版，卡片本体走极简） */
  hello: {
    enabled: true,
    prefix: '我是',
    tips: '你好呀',
    name: '克喵',
    intro: '目前大四，快实习了，在博客里面记录一些日常，踩掉一些坑。',
  },

  /** 关键词轮播（遮罩上滑动画） */
  tips: {
    enabled: true,
    lead: '座右铭',
    line1: '每一段旅行',
    line2: '都有终点',
    words: ['折腾', '编程', '摸鱼', '分享', '博客'],
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
    title: '提倡者',
    mbti: 'INFJ-T',
    desc: '提倡者是安静而有远见的人，常常也是鼓舞人心、不知疲倦的理想主义者。',
    link: {
      label: '了解提倡者人格档案',
      url: 'https://www.16personalities.com/ch/infj-%E4%BA%BA%E6%A0%BC',
    },
    image: './images/infj.svg',
  },

  /** 追番封面墙 */
  anime: {
    enabled: false,
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
    enabled: false,
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
          { text: '源码：GitHub', href: 'https://github.com/maochenyu-me/blog-v2' },
        ],
      },
    ] as SiteCard[],
  },

  /** 彩色图标三列信息行 */
  selfInfo: {
    enabled: true,
    items: [
      { label: '坐标', value: '南京工业职业技术大学', icon: 'tabler:map-pin' },
      { label: '身份', value: '大四学生 & 实习中', icon: 'tabler:id' },
      { label: '搭子', value: 'Deepseek-Harness', icon: 'tabler:cat' },
    ] as SelfInfoItem[],
  },

  /** 访问统计 —— 数据来自自建 Umami（app/composables/useUmamiStats.ts），此处只配文案 */
  visitStats: {
    enabled: true,
    tips: '数据',
    title: '访问统计',
    labels: {
      todayUv: '今日人数',
      todayPv: '今日访问',
      yesterdayUv: '昨日人数',
      yesterdayPv: '昨日访问',
      totalUv: '总人数',
      totalPv: '总访问',
      lastMonthPv: '最近月访问',
    },
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
}

// ---------- 行结构 ----------

/**
 * 每行放哪些区块、按什么比例分宽（span 相对值）。
 * key 必须是 aboutConfig 的一级键（hero 除外，它置顶独立渲染）。
 * 单元素行 = 通栏；关闭某组件后，同行剩余组件按自己的 span/总 span 保持原宽并居中。
 * 两条相邻行各剩一个独苗时合并成一行：宽度按两个独苗的 span 之比归一化；
 * 只要其中任一行恢复满员（或插入单元素通栏行），就退回独苗居中。
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

/** 区块是否启用 */
export function isBlockEnabled(key: AboutBlockKey): boolean {
  const block = aboutConfig[key] as { enabled?: boolean }
  return block.enabled !== false
}

// ---------- 渲染行 ----------

/** 渲染行里的一个单元格 */
export interface RenderCell {
  key: AboutBlockKey
  span: number
}

/** 实际渲染的一行 */
export interface RenderRow {
  cells: RenderCell[]
  /** 宽度分母：满员/独苗行取该行声明的 span 总和，合并行取两个独苗 span 之和 */
  totalSpan: number
  /** 由上下两条独苗行合并而成（上左、下右） */
  merged: boolean
}

/**
 * 把 aboutRows 展开成实际渲染的行：
 * - 关闭的组件剔除，整行全关则该行跳过；
 * - 声明两列却只剩一个组件的「独苗行」，若下一条也是独苗行，则合并成一行，
 *   宽度按两个独苗的 span 重新归一化（3 + 3 → 各 50%，3 + 2 → 60% / 40%）；
 * - 单元素通栏行（skills / aboutMe / reward）不参与合并，会打断配对；
 * - 三条以上连号独苗按从上到下依次两两配对，落单的那条仍按自身原宽居中。
 *
 * @param isEnabled 额外的启用判定（如正文未加载时关掉 aboutMe）
 */
export function buildAboutLayout(
  isEnabled: (key: AboutBlockKey) => boolean = isBlockEnabled,
  rows: ReadonlyArray<ReadonlyArray<{ key: AboutBlockKey; span: number }>> = aboutRows,
): RenderRow[] {
  const visible = rows
    .map((declared) => ({
      declared,
      totalSpan: declared.reduce((acc, c) => acc + c.span, 0),
      alive: declared.filter((c) => isEnabled(c.key)),
    }))
    .filter((row) => row.alive.length > 0)

  const layout: RenderRow[] = []

  for (let i = 0; i < visible.length; i++) {
    const row = visible[i]
    const next = visible[i + 1]
    if (!row) continue

    // 独苗行：声明两列，只剩一个组件
    const orphan = row.declared.length === 2 && row.alive.length === 1
    const left = row.alive[0]
    const right =
      next && next.declared.length === 2 && next.alive.length === 1 ? next.alive[0] : undefined

    if (orphan && left && right) {
      layout.push({
        cells: [{ key: left.key, span: left.span }, { key: right.key, span: right.span }],
        totalSpan: left.span + right.span,
        merged: true,
      })
      i++
      continue
    }

    layout.push({ cells: row.alive, totalSpan: row.totalSpan, merged: false })
  }

  return layout
}
