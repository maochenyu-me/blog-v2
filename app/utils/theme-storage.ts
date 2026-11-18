/**
 * 主题存储键的唯一来源。
 * 必须在 <head> 内联脚本里也用同一个键，因此抽到这里避免两处手写字符串。
 */
export const THEME_STORAGE_KEY = 'theme-mode'

/**
 * 主题切换广播事件名：切换瞬间全站 backdrop-filter 毛玻璃表面要整批重绘，
 * 重动画区块（友链魔方等）监听它，让自己先暂停一步给重绘让路，
 * 避免两组合成压力同帧叠加（实测 165Hz 屏上 /links 切主题会掉到 ~80fps）。
 */
export const THEME_TRANSITION_EVENT = 'kemiao:theme-transition'

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
