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
      columns: { mobile: 2, tablet: 3, desktop: 4 },
      showAvatar: true,
      applyRules: [
        '站点需为原创个人博客，内容健康、持续更新',
        '已在自己站点添加本站友链',
        '请提供站点名称、简介、头像与链接',
        '本站保留拒绝或随时移除友链的权利',
      ],
    },

    about: {
      blocks: ['intro', 'now', 'skills', 'timeline', 'contact'] as const,
      timeline: [
        { year: 2024, title: '开始写博客', detail: '把散落各处的笔记收拢到一个地方' },
        { year: 2023, title: '转向前端工程', detail: '从页面还原走向构建、性能与可维护性' },
        { year: 2021, title: '第一份工作', detail: '写下了第一行会被人使用的代码' },
      ],
    },

    post: {
      showToc: true,
      showPrevNext: true,
      showRelated: true,
      relatedCount: 3,
      showCopyButton: true,
      showImageViewer: true,
    },
  },
}
