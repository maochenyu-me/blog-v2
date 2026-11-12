/**
 * 主题预设库 —— 「换背景图 + 配套色」的换装清单。
 *
 * 用法：
 *   1. 新图丢进 public/images/
 *   2. 复制一个最接近的预设，改 id、name 和需要的字段
 *   3. theme.config.ts 里 preset: '<新预设 id>'
 *   4. pnpm build + pnpm preview:dist 目检，不满意继续调预设参数
 *
 * 合并规则（构建期由 modules/design-tokens.ts 执行）：
 *   预设里写了的字段覆盖基线，没写的字段回退 theme.config.ts 基线值。
 *   所以一个预设可以只写两张背景图路径，也可以写全套配色。
 *
 * 校验：构建期检查预设 id 是否存在、背景图文件是否真实存在，
 * 缺失直接构建报错并指出缺什么。
 */
export interface ThemePreset {
  /** 展示名（pnpm theme 列表用） */
  name: string
  /** 强调色（浅/深各一个，缺失回退基线） */
  accent?: { light?: string; dark?: string }
  /** 深色中性色阶（逐值覆盖，缺失回退基线） */
  dark?: {
    background?: string
    foreground?: string
    muted?: string
    mutedForeground?: string
    border?: string
    card?: string
  }
  /** 深色玻璃层色调（顶部胶囊 / 页脚主体） */
  glass?: {
    dark?: { bg?: string; border?: string; highlight?: string; scrolledShadow?: string }
  }
  /** 背景图与 backdrop 参数（完整覆盖 theme.config.ts 的 backdrop 段） */
  backdrop?: {
    light?: string
    dark?: string
    blur?: number
    saturate?: { light?: number; dark?: number }
    opacity?: { light?: number; dark?: number }
    fade?: {
      light?: Array<{ mix: number; at: number }>
      dark?: Array<{ mix: number; at: number }>
    }
  }
}

export default {
  /** 夜空云海 —— 现行配色原样迁移，未启用其他预设前的默认观感 */
  /** 夜读暖炭 × 夜空云海（默认）——浅色宣纸墨书的暗面：灯下夜读的同一本书 */
  midnight: {
    name: '宣纸墨书 × 夜读暖炭（默认）',
    accent: {
      light: '#a54b30',
      dark: '#d4825f',
    },
    dark: {
      background: '#1c1712',
      foreground: '#ece5d8',
      muted: '#2a241c',
      mutedForeground: '#a89c8c',
      border: '#3a3328',
      card: '#241f18',
    },
    glass: {
      dark: {
        bg: 'rgba(28, 23, 18, 0.55)',
        border: 'rgba(58, 51, 40, 0.9)',
      },
    },
    backdrop: {
      light: '/images/backdrop-light.webp',
      dark: '/images/backdrop-dark.webp',
      blur: 6,
      saturate: { light: 1.16, dark: 1.05 },
      opacity: { light: 0.34, dark: 0.32 },
      fade: {
        light: [
          { mix: 0.2, at: 0 },
          { mix: 0.6, at: 40 },
        ],
        /**
         * 暗色遮罩加重（0.35→0.85 渐进）：夜空图带蓝调，压在暖炭底上
         * 色温冲突，加大背景色混合让图只在页头露一点、蓝味快速退场。
         */
        dark: [
          { mix: 0.35, at: 0 },
          { mix: 0.85, at: 50 },
        ],
      },
    },
  },
} satisfies Record<string, ThemePreset>
