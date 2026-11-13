export interface NavPanelLink {
  label: string
  to: string
  icon: string
  external?: boolean
}

export interface NavPanelSection {
  title: string
  links: NavPanelLink[]
}

export const navPanel: NavPanelSection[] = [
  {
    title: '站点漫游',
    links: [
      { label: '首页', to: '/', icon: 'tabler:home' },
      { label: '文章归档', to: '/archive', icon: 'tabler:archive' },
      { label: '分类', to: '/categories', icon: 'tabler:folder' },
      { label: '标签', to: '/tags', icon: 'tabler:tag' },
      { label: '关于本站', to: '/about', icon: 'tabler:user' },
    ],
  },
  {
    title: '互动角落',
    links: [
      { label: '友链', to: '/links', icon: 'tabler:link' },
      { label: '朋友圈', to: '/fcircle', icon: 'tabler:rss' },
      { label: '说说', to: '/shuoshuo', icon: 'tabler:messages' },
      { label: '留言板', to: '/message', icon: 'tabler:message-circle' },
    ],
  },
  {
    title: '发现与记录',
    links: [
      { label: '相册', to: '/gallery', icon: 'tabler:photo' },
      { label: '热搜', to: '/hot', icon: 'tabler:flame' },
      { label: '更新日志', to: '/changelog', icon: 'tabler:history' },
      { label: '项目源码', to: 'https://github.com/maochenyu-me/blog-v2', icon: 'tabler:brand-github', external: true },
      { label: '联系站长', to: 'mailto:hi@kemiaosw.top', icon: 'tabler:mail', external: true },
    ],
  },
]
