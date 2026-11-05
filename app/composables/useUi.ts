/**
 * UI 文案访问层。
 *
 * 为什么文案对象在 app/data/ui.ts、而函数在这里：
 * Nuxt 只自动导入 app/composables 与 app/utils，app/data 不在自动导入范围内。
 * 函数放在这里才能被所有组件直接用 useUi() 调用，数据仍归 data/ 层统一管理。
 */
import { ui } from '~/data/ui'

/**
 * 极简插值：把 {key} 替换为 params 里的值。
 * 只支持一层占位，够用且无需引入依赖。
 */
export function uiText(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  )
}

export function useUi() {
  return {
    ui,
    t: uiText,
  }
}
