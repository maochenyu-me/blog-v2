import { createResolver, defineNuxtModule } from '@nuxt/kit'
import { writeFile, readFile } from 'node:fs/promises'
import { createJiti } from 'jiti'

/**
 * design-tokens —— 构建期把 app/theme.config.ts 编译为 CSS。
 *
 * 存在的理由：提示词 §4.2 要求「改一处 theme.config.ts 全站生效」。
 * 若 CSS 变量手写在 main.css 里，就有两份需要人肉同步的真相源，迟早漂移。
 * 这里让 theme.config.ts 成为唯一来源，构建时生成 app/assets/css/tokens.generated.css：
 *   1. Tailwind v4 的 @theme 块 —— 让 bg-background / text-muted-foreground 等工具类可用
 *   2. :root / .dark 的 CSS 变量 —— 供手写 CSS 与 shadcn 变量体系消费
 *
 * 为什么 @theme 里写的是 var(--background) 而不是直接写 hex：
 *   Tailwind 会把 --color-background 静态编译进 bg-background 工具类。
 *   若写死 hex，.dark 下覆盖 --background 将不生效。映射到 var() 才能跟随主题切换。
 */
export default defineNuxtModule({
  meta: { name: 'design-tokens' },

  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const OUT = resolve('../app/assets/css/tokens.generated.css')

    // theme.config.ts 用 defineAppConfig() 包裹，这在纯 Node 上下文里不存在。
    // 用 jiti 加载 TS 并提供一个返回入参原样的 shim，从而拿到纯对象。
    const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })
    ;(globalThis as any).defineAppConfig ??= (c: unknown) => c

    async function generate() {
      const themePath = resolve('../app/theme.config.ts')
      // moduleCache: false → 改完 theme.config.ts 立即拿到新值
      const themeMod = await jiti.import<any>(themePath)
      const theme = themeMod.default.theme

      const { accent, neutral, fontSize } = theme

      const css = `/* ---------------------------------------------------------------
 * 自动生成，请勿手动编辑。
 * 唯一来源：app/theme.config.ts    生成器：modules/design-tokens.ts
 * ------------------------------------------------------------- */

/* --- 静态 token：不随明暗切换 --- */
@theme {
  --font-sans: ${theme.fontFamily.sans};
  --font-mono: ${theme.fontFamily.mono};

  --radius-base: ${theme.radius};

  --text-h1: ${fontSize.h1.size};
  --text-h1--line-height: ${fontSize.h1.lineHeight};
  --text-body: ${fontSize.body.size};
  --text-body--line-height: ${fontSize.body.lineHeight};
  --text-meta: ${fontSize.meta.size};
  --text-meta--line-height: ${fontSize.meta.lineHeight};
  --text-code: ${fontSize.code.size};
  --text-code--line-height: ${fontSize.code.lineHeight};

  --spacing-section: ${theme.spacing.section};
  --spacing-block: ${theme.spacing.block};
  --spacing-item: ${theme.spacing.item};

  --ease-base: ${theme.animation.easing};

  /* --- 语义色：映射到动态变量，使 .dark 覆盖生效 --- */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-accent: var(--accent);
}

/* --- 明色 --- */
:root {
  --background: ${neutral.light.background};
  --foreground: ${neutral.light.foreground};
  --muted: ${neutral.light.muted};
  --muted-foreground: ${neutral.light.mutedForeground};
  --border: ${neutral.light.border};
  --accent: ${accent.light};

  --radius: ${theme.radius};
  --content-max-width: ${theme.contentMaxWidth};
  --wide-max-width: ${theme.wideMaxWidth};
  --toc-width: ${theme.tocWidth};
  --toc-gap: ${theme.tocGap};

  /* 目录吸顶与标题锚点避让共用：贴顶位置 = --header-height + --toc-sticky-offset */
  --header-height: ${theme.headerHeight};
  --toc-sticky-offset: ${theme.toc.stickyOffset};

  --fs-h1: ${fontSize.h1.size};
  --lh-h1: ${fontSize.h1.lineHeight};
  --fw-h1: ${fontSize.h1.weight};
  --fs-body: ${fontSize.body.size};
  --lh-body: ${fontSize.body.lineHeight};
  --fw-body: ${fontSize.body.weight};
  --fs-body-h: ${fontSize.bodyHeading.size};
  --lh-body-h: ${fontSize.bodyHeading.lineHeight};
  --fw-body-h: ${fontSize.bodyHeading.weight};
  --fs-body-h-minor: ${fontSize.bodyHeadingMinor.size};
  --lh-body-h-minor: ${fontSize.bodyHeadingMinor.lineHeight};
  --fw-body-h-minor: ${fontSize.bodyHeadingMinor.weight};
  --fs-list-title: ${fontSize.listTitle.size};
  --lh-list-title: ${fontSize.listTitle.lineHeight};
  --fw-list-title: ${fontSize.listTitle.weight};
  --fs-meta: ${fontSize.meta.size};
  --lh-meta: ${fontSize.meta.lineHeight};
  --fs-code: ${fontSize.code.size};
  --lh-code: ${fontSize.code.lineHeight};

  --space-section: ${theme.spacing.section};
  --space-block: ${theme.spacing.block};
  --space-item: ${theme.spacing.item};
  --space-gutter: ${theme.spacing.gutter};

  --duration-base: ${theme.animation.duration}ms;
  --easing-base: ${theme.animation.easing};

  --paragraph-spacing: ${theme.paragraphSpacing};

  color-scheme: light;
}

/* --- 暗色 --- */
.dark {
  --background: ${neutral.dark.background};
  --foreground: ${neutral.dark.foreground};
  --muted: ${neutral.dark.muted};
  --muted-foreground: ${neutral.dark.mutedForeground};
  --border: ${neutral.dark.border};
  --accent: ${accent.dark};

  color-scheme: dark;
}

/* 暗色模式禁用所有阴影（提示词 §5.2） */
.dark *,
.dark *::before,
.dark *::after {
  box-shadow: none !important;
}
`

      // 内容未变则跳过写入，避免无谓的 HMR 抖动
      const prev = await readFile(OUT, 'utf8').catch(() => null)
      if (prev !== css) await writeFile(OUT, css, 'utf8')
    }

    await generate()

    // 改 theme.config.ts 时自动重新生成（dev 下 HMR 生效）
    nuxt.hook('builder:watch', async (event, path) => {
      if (path.includes('theme.config.ts') && (event === 'change' || event === 'add')) {
        await generate()
      }
    })
  },
})
