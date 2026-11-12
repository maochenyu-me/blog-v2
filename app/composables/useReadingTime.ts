/**
 * 阅读时长与日期格式化。
 * 阅读速度来自 theme.reading.wordsPerMinute，不硬编码。
 */

export function useReadingTime() {
  const appConfig = useAppConfig()
  const wpm = (appConfig.theme as any).reading.wordsPerMinute as number
  const enabled = (appConfig.theme as any).reading.showReadingTime as boolean

  /**
   * 中文按字计，英文按词计，混合文本按「汉字数 + 英文单词数」估算。
   * 纯 markdown 源码里的标点不计入。
   */
  function estimate(text: string): number {
    const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length
    const words = (text.match(/[a-zA-Z0-9]+/g) ?? []).length
    const total = cjk + words
    return Math.max(1, Math.round(total / wpm))
  }

  /** 正文字数（汉字 + 英文数字词），文章头卡「N 字」用 */
  function countWords(text: string): number {
    const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length
    const words = (text.match(/[a-zA-Z0-9]+/g) ?? []).length
    return cjk + words
  }

  return { estimate, countWords, enabled, wpm }
}

/** 统一的日期格式化，避免各处 format 不一致 */
export function useDateFormat() {
  function iso(d: string | Date): string {
    const date = typeof d === 'string' ? new Date(d) : d
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  /** 首页列表用短格式，节省横向空间 */
  function short(d: string | Date): string {
    const date = typeof d === 'string' ? new Date(d) : d
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${m}-${day}`
  }

  function year(d: string | Date): number {
    return (typeof d === 'string' ? new Date(d) : d).getFullYear()
  }

  return { iso, short, year }
}
