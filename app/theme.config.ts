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
    /** 悬浮卡片（音乐播放器）用的大圆角，比 --radius 松一档 */
    radiusCard: '0.875rem',

    contentMaxWidth: '764px',
    /** 宽内容（表格 / 图片 / 代码）允许越界的上限 */
    wideMaxWidth: '1000px',
    /**
     * 宽壳层上限：首页（主内容 + 侧栏）、顶部导航、页脚共用的宽容器，
     * 三者对齐构成 Dusklight 式通栏格局。窄于该值时流体占满（减去 gutter），
     * verify.mjs 对 home 路由的宽度上限单独放宽到本值 + 20px 余量。
     */
    homeMaxWidth: '1400px',
    /** 首页侧栏宽度（≥1024px 时挂在主内容右侧） */
    homeSidebarWidth: '340px',
    /**
     * 顶部导航高度。
     * 文章页目录的吸顶偏移、标题的锚点避让都从它推导，
     * 所以 SiteHeader / MobileDrawer 也必须消费这个 token，禁止各处再写 3.5rem。
     */
    headerHeight: '3.5rem',
    /**
     * 胶囊导航（Dusklight 式双胶囊）尺寸。
     * header 实际占位 = pill 高度 + headerPadY × 2 = 2.75 + 0.75×2 = 4.25rem，
     * 仍低于锚点避让线（3.5 + 1.5 = 5rem）。
     */
    headerPillHeight: '2.75rem',
    headerPadY: '0.75rem',
    headerPadX: '1rem',

    /**
     * 玻璃拟态 —— 顶部胶囊与页脚主体共用。
     * 与 zinc 中性色板对齐的 rgba 值；scrolledShadow 仅在滚动点亮态出现。
     */
    glass: {
      light: {
        bg: 'rgba(255, 255, 255, 0.66)',
        border: 'rgba(228, 228, 231, 0.7)',
        highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        scrolledShadow: '0 8px 24px rgba(24, 24, 27, 0.08)',
      },
      dark: {
        bg: 'rgba(9, 9, 11, 0.55)',
        border: 'rgba(39, 39, 42, 0.9)',
        highlight: 'inset 0 1px 0 rgba(250, 250, 250, 0.06)',
        scrolledShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
      },
      blur: '24px',
      saturation: '140%',
    },

    /**
     * 浮层实底 —— 悬浮卡片（音乐播放器）专用，故意比 glass 更不透明。
     * glass 是给「贴边、背后常是滚动正文」的头部用的，透一点才有层次；
     * 但卡片里要装曲名、滑条、按钮，透太多会读出背后的色块（实测暗色下
     * 橙色代码块透上来，文字发脏）。所以这一档单独给、单独调。
     */
    surface: {
      light: {
        bg: 'rgba(255, 255, 255, 0.92)',
        border: 'rgba(228, 228, 231, 0.95)',
      },
      dark: {
        bg: 'rgba(20, 20, 23, 0.92)',
        border: 'rgba(63, 63, 70, 0.9)',
      },
    },

    /** 胶囊 / 头像等药丸形圆角 */
    radiusFull: '9999px',
    /** 文章页目录旁栏宽度，≥1280px 时挂在正文右侧沟槽外 */
    tocWidth: '200px',
    tocGap: '3rem',
    tocBreakpoint: '1280px',

    fontFamily: {
      // 字体名必须与 @fontsource 实际注册的 family 一致（'Inter Variable' 带空格）
      //
      // 回退栈里为什么先排系统楷体、再排黑体：
      //   弱网首访（实测 3G 下 webfont 要 10s 才到）会先拿回退字体渲染，
      //   font-display: optional 在字体未赶上的那一轮直接整轮放弃。此时若回退是黑体，
      //   站点会退化成「普通黑体博客」，手写体的视觉身份彻底丢失。
      //   楷体与文楷同属楷体骨架，即使最终没换成 webfont，观感依然是楷体。
      //   KaiTi/macOS 的楷体族名各不相同，逐个别名列出；Android 无楷体，
      //   落到 sans-serif 兜底。
      // 'LXGW WenKai' 各族名放在 webfont 之后：装了本地文楷时由 fonts.css 的
      // local() 直接命中，这里是 local() 未命中时的二次保险。
      sans: "'Inter Variable', 'LXGW WenKai Lite', 'LXGW WenKai', 'LXGW WenKai Screen', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', 'PingFang SC', 'Microsoft YaHei', sans-serif",
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
      /** 卡片 hover 这类从容的微交互用慢一档的时长（友链页引入） */
      durationSlow: 300,
      easing: 'ease-out',
      transitionName: 'page',
    },

    toc: {
      enabled: true,
      position: 'right' as const,
      minDepth: 2,
      maxDepth: 3,
      /**
       * 吸顶时目录与顶部导航之间保留的间距。
       * 目录贴顶位置 = headerHeight + stickyOffset。
       */
      stickyOffset: '1.5rem',
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
