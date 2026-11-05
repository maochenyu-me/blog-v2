/**
 * 友链数据。结构化数组，不放 markdown（提示词 §4.4）。
 */
export interface FriendLink {
  name: string
  avatar: string
  description: string
  url: string
  owner: boolean
}

export const friendLinks: FriendLink[] = [
  {
    name: '2x.nz',
    avatar: '/images/links/2xnz.png',
    description: '二叉树树，AI 绘图与大模型 API 的个人站',
    url: 'https://2x.nz/',
    owner: false,
  },
  {
    name: 'Anthony Fu',
    avatar: '/images/links/antfu.png',
    description: 'Vue 与 Vite 核心团队成员，开源工具作者',
    url: 'https://antfu.me/',
    owner: false,
  },
  {
    name: 'Lee Rob',
    avatar: '/images/links/leerob.png',
    description: 'Vercel 的开发者体验工程师，写前端与产品',
    url: 'https://leerob.io/',
    owner: false,
  },
  {
    name: 'Paco',
    avatar: '/images/links/paco.png',
    description: '设计师与工程师，做交互细节与动效',
    url: 'https://paco.me/',
    owner: false,
  },
  {
    name: 'Rauno',
    avatar: '/images/links/rauno.png',
    description: '界面设计工程师，专注交互手感与可用性',
    url: 'https://rauno.me/',
    owner: false,
  },
  {
    name: '喵洛阁',
    avatar: '/images/avatar.png',
    description: '本站，克喵的博客',
    url: 'https://www.kemiaosw.top',
    owner: true,
  },
]
