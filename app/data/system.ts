/**
 * 404 / 错误页文案。组件内禁止硬编码，一律从这里读。
 */
export const systemMessages = {
  notFound: {
    code: '404',
    title: '页面不在这里',
    description: '这个地址可能被改过、删掉，或者从来就没存在过。',
    action: { label: '回到首页', to: '/' },
  },
  error: {
    title: '出了点问题',
    description: '页面没能加载出来。刷新一次通常就好了。',
    action: { label: '重新加载', to: '/' },
  },
} as const

export type SystemMessages = typeof systemMessages
