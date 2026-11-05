/**
 * 主题级配置 —— 全部设计 token。
 * 禁止在组件里写魔法值（颜色 hex、字号、间距、圆角、动画时长）。
 * 本文件由 modules/design-tokens.ts 在构建期编译为 CSS 变量 + Tailwind v4 @theme。
 */
export default {
  theme: {
    /**
     * 唯一强调色。对比度实测：light #a94f33 on #fff = 5.45，dark #cc785c on #09090b = 6.07（均过 WCAG AA）。
     * 换色只改这两行，全站同步。
     */
    accent: {
      light: '#a94f33',
      dark: '#cc785c',
    },

    /** 中性色阶 —— 纯 zinc，零色相偏移（提示词 §5.2） */
    neutral: {
      light: {
        background: '#ffffff',
        foreground: '#18181b',
        muted: '#fafafa',
        mutedForeground: '#71717a',
        border: '#e4e4e7',
      },
      dark: {
        background: '#09090b',
        foreground: '#fafafa',
        muted: '#18181b',
        mutedForeground: '#a1a1aa',
        border: '#27272a',
      },
    },

    radius: '0.5rem',

    contentMaxWidth: '764px',
    /** 宽内容（表格 / 图片 / 代码）允许越界的上限 */
    wideMaxWidth: '1000px',
    /** 文章页目录旁栏宽度，≥1280px 时挂在正文右侧沟槽外 */
    tocWidth: '200px',
    tocGap: '3rem',
    tocBreakpoint: '1280px',

    fontFamily: {
      // 字体名必须与 @fontsource 实际注册的 family 一致（'Inter Variable' 带空格）
      sans: "'Inter Variable', 'LXGW WenKai Lite', 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      mono: "'JetBrains Mono', 'LXGW WenKai Lite', ui-monospace, monospace",
    },

    /**
     * 字阶 —— 本设计的签名：标题与正文同字号、分权重（提示词 §5.3）。
     * 字号尽量不动，层级靠 weight / 空间 / 1px 线建立。
     *
     * ⚠ 一个必须交代的取舍：LXGW WenKai 只有 400 / 700 两档字重。
     * 若 h2、h3 都用 700，在同字号约束下二者将无法区分。因此：
     *   h2 → 字重 700（层级由「更重」表达）
     *   h3 → 字重 400 + 色阶降一级（层级由「更淡」表达）
     * 这样既守住「只用 400/700」的硬约束，又让三级标题不与正文混淆。
     */
    fontSize: {
      h1: { size: '1.75rem', lineHeight: '1.25', weight: '700', tone: 'strong' },
      body: { size: '1.0625rem', lineHeight: '1.75', weight: '400', tone: 'strong' },
      bodyHeading: { size: '1.0625rem', lineHeight: '1.4', weight: '700', tone: 'strong' },
      bodyHeadingMinor: { size: '1.0625rem', lineHeight: '1.4', weight: '400', tone: 'muted' },
      listTitle: { size: '1.0625rem', lineHeight: '1.5', weight: '400', tone: 'strong' },
      meta: { size: '0.8125rem', lineHeight: '1.5', weight: '400', tone: 'muted' },
      code: { size: '0.875rem', lineHeight: '1.7', weight: '400', tone: 'strong' },
    },

    /** 段落间距 > 行距（提示词 §5.3） */
    paragraphSpacing: '1.2em',

    spacing: {
      section: '4rem',
      block: '2.5rem',
      item: '1.5rem',
      gutter: '1.5rem',
    },

    animation: {
      duration: 200,
      easing: 'ease-out',
      transitionName: 'page',
    },

    toc: {
      enabled: true,
      position: 'right' as const,
      mobileCollapsible: true,
      minDepth: 2,
      maxDepth: 3,
    },

    reading: {
      wordsPerMinute: 300,
      showReadingTime: true,
    },

    darkMode: {
      defaultMode: 'system' as const,
      enableCircularReveal: true,
    },
  },
}
