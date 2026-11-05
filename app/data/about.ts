/**
 * 关于页元数据。正文（intro）来自 content/about.md，其余结构化数据在这里。
 * 时间线本身在 pages.config.ts 的 pages.about.timeline。
 */
export interface SkillGroup {
  title: string
  items: string[]
}

export interface NowItem {
  label: string
  value: string
}

export interface ContactItem {
  label: string
  value: string
  href?: string
}

export const skills: SkillGroup[] = [
  {
    title: '前端',
    items: ['TypeScript', 'Vue / Nuxt', 'React', 'Tailwind CSS', 'Vite'],
  },
  {
    title: '工程',
    items: ['构建与打包', '性能优化', '可访问性', '静态站点生成'],
  },
  {
    title: '其他',
    items: ['Node.js', '设计系统', '排版与字体', '写作'],
  },
]

export const now: NowItem[] = [
  { label: '在做', value: '重写这个博客，把笔记整理成可以读的东西' },
  { label: '在学', value: '排版细节，以及怎么让界面少一点噪音' },
  { label: '在听', value: '城市流行和一点爵士' },
  { label: '在玩', value: '塞尔达，以及各种没玩完的独立游戏' },
]

export const contacts: ContactItem[] = [
  { label: 'Email', value: 'hi@kemiaosw.top', href: 'mailto:hi@kemiaosw.top' },
  { label: 'GitHub', value: 'github.com/kemiaosw', href: 'https://github.com/kemiaosw' },
  { label: 'X', value: 'x.com/kemiaosw', href: 'https://x.com/kemiaosw' },
]
