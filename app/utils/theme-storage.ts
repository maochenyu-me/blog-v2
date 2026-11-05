/**
 * 主题存储键的唯一来源。
 * 必须在 <head> 内联脚本里也用同一个键，因此抽到这里避免两处手写字符串。
 */
export const THEME_STORAGE_KEY = 'theme-mode'

/** 生成首帧前执行的内联防 FOUC 脚本 */
export function buildThemeInitScript(): string {
  return [
    '(function(){try{',
    `var m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});`,
    "var d=m==='dark'||((!m||m==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);",
    "document.documentElement.classList.toggle('dark',d);",
    '}catch(e){}})();',
  ].join('')
}
