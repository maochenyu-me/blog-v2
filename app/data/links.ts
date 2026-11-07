/**
 * 友链数据与等级印记体系。
 * 印记设计移植自 Saneko-Blog（HoshiSaneko）的 links.config.ts：
 *   16 级按建交天数划分，色彩语义分层 —— 灰(新生/失联) → 绿(成长) → 蓝(深交)
 *   → 银(坚稳) → 橙(热忱) → 红(炽烈) → 紫(传说)。
 *
 * 数据分两层：
 *   - friend-links.json —— GitHub issue 申请流程的写入面，bot 以 PR 维护
 *   - 本文件的 owner 条目 —— 手写
 * 提示词 §4.4：结构化数组，不放 markdown。
 * 颜色是「印记」自己的语义色（类似状态灯），不属于页面装饰，故未入 theme.config.ts；
 * 明暗两种模式下都保持 ≥3:1 的图形对比度。
 */
import rawFriendData from './friend-links.json'

/** 单个友链条目 */
export interface FriendLink {
  name: string
  avatar: string
  description: string
  url: string
  owner: boolean
  /** 建交起点（ISO 日期），印记据此计算；失联条目也保留原建交日期备查 */
  daysSince?: string
  /** 失联站点：单独分组，印记显示幽灵 */
  lost?: boolean
  /** 推荐标记：名称旁一枚琥珀色拇指 */
  recommended?: boolean
  /** 来源议题号：GitHub issue 申请流程写入，用于「推荐」标记的定位；手写条目可省略 */
  issue?: number
}

/** 印记配置：按建交天数区间划分等级 */
export interface BadgeConfig {
  /** 显示名，如「初遇/First」 */
  name: string
  minDays: number
  /** Infinity 表示上不封顶 */
  maxDays: number
  /** 印记语义色 */
  color: string
  /** tabler 图标名 */
  icon: string
}

/** 默认印记（初遇）：find 不命中时的兜底，避免索引访问的 undefined 分支 */
const FIRST_MEET: BadgeConfig = {
  name: '初遇/First',
  minDays: 0,
  maxDays: 30,
  color: '#94a3b8',
  icon: 'star',
}
const LOST: BadgeConfig = {
  name: '失联/Lost',
  minDays: 0,
  maxDays: 0,
  color: '#9ca3af',
  icon: 'ghost',
}

export const badgeConfigs: BadgeConfig[] = [
  { name: '失联/Lost', minDays: 0, maxDays: 0, color: '#9ca3af', icon: 'ghost' },
  { name: '初遇/First', minDays: 0, maxDays: 30, color: '#94a3b8', icon: 'star' },
  { name: '萌芽/Sprout', minDays: 30, maxDays: 60, color: '#22c55e', icon: 'seeding' },
  { name: '抽叶/Leaf', minDays: 60, maxDays: 90, color: '#22c55e', icon: 'leaf' },
  { name: '绽放/Bloom', minDays: 90, maxDays: 180, color: '#22c55e', icon: 'flower' },
  { name: '轻语/Whisper', minDays: 180, maxDays: 270, color: '#22c55e', icon: 'feather' },
  { name: '听风/Wind', minDays: 270, maxDays: 365, color: '#60a5fa', icon: 'wind' },
  { name: '云游/Cloud', minDays: 365, maxDays: 450, color: '#60a5fa', icon: 'cloud' },
  { name: '润泽/Water', minDays: 450, maxDays: 540, color: '#60a5fa', icon: 'droplet' },
  { name: '凝冰/Ice', minDays: 540, maxDays: 630, color: '#60a5fa', icon: 'snowflake' },
  { name: '磐石/Rock', minDays: 630, maxDays: 730, color: '#94a3b8', icon: 'mountain' },
  { name: '坚守/Guard', minDays: 730, maxDays: 900, color: '#f97316', icon: 'shield' },
  { name: '燃情/Fire', minDays: 900, maxDays: 1080, color: '#f97316', icon: 'flame' },
  { name: '烈阳/Sun', minDays: 1080, maxDays: 1460, color: '#ef4444', icon: 'sun' },
  { name: '雷鸣/Zap', minDays: 1460, maxDays: 2190, color: '#a855f7', icon: 'bolt' },
  { name: '传世/Legend', minDays: 2190, maxDays: Number.POSITIVE_INFINITY, color: '#a855f7', icon: 'crown' },
]

/** 按建交天数求印记：失联直返幽灵；无匹配回退「初遇」 */
export function getBadge(days: number, lost?: boolean): BadgeConfig & { days: number } {
  if (lost) {
    const lostBadge = badgeConfigs.find((b) => b.icon === 'ghost') ?? LOST
    return { ...lostBadge, days: 0 }
  }
  const badge =
    badgeConfigs.find((b) => b.icon !== 'ghost' && days >= b.minDays && days < b.maxDays) ??
    FIRST_MEET
  return { ...badge, days }
}

/** 推荐标记的琥珀色（Saneko 口径）。与印记色同属语义色，不进 theme.config.ts */
export const recommendedColor = '#f59e0b'

/**
 * issue 申请流程写入的朋友数据。
 * why as：JSON 由工作流运行时写入（含 issue 字段），TS 静态推断不含动态键，
 * 结构由 scripts/friend-link-manager.mjs 的写入逻辑保证。
 */
export const friendData: FriendLink[] = rawFriendData as FriendLink[]

export const friendLinks: FriendLink[] = [
  // ── 本站 ──
  {
    name: '喵洛阁',
    avatar: '/images/avatar.png',
    description: '本站，克喵的博客',
    /*
     * 本站用相对路径：站点域名来自 blog.config.ts 的 site.url，
     * 在这里再写一遍绝对地址既是重复配置，又会让站内链接被当成外链。
     */
    url: '/',
    owner: true,
  },
  // ── 朋友们：来源 .github issue 申请流程（friend-links.json，由 bot 维护）与手写条目 ──
  ...friendData,
]
