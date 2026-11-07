import { createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * local-fonts —— 中文字体从「97 个 unicode-range 分片」收敛为「2 个单文件」，并在构建期校验覆盖。
 *
 * ═══════════════ 要解决的问题 ═══════════════
 * 刷新页面时正文「闪一下」，字形整页替换。实测（CDP 逐帧录屏 + 帧差量化，1100×760）：
 *
 *   reload 帧差曲线   [4.62, 4.80, 1.30, 0.93, 0.24, 0]   ← 连续 4 次跳变
 *   阻断字体后         [11.93, 0, 0, 0]                    ← 0 次跳变（11.93 只是首帧出内容）
 *   阻断 JS 后         [11.93, 3.54, 3.75, 2.47]           ← 照旧跳变
 *
 * 后两行是决定性证据：与 hydration 无关，纯粹是字体。
 *
 * ═══════════════ 根因 ═══════════════
 * lxgw-wenkai-lite-webfont 把一个字库切成 97 片，每片一个 @font-face，
 * 各带独立 unicode-range，且都声明 font-display:swap。浏览器按页面实际用字
 * 只下载命中的若干片，但**它们不是同时到达**：
 *
 *   1057ms  inter-latin
 *   1061ms  bold-111, bold-108
 *   1064ms  regular-118
 *   1093ms  regular-114, regular-113
 *   ……      15 片散落在 60ms 内
 *
 * 每片到达都独立触发一次 swap → 字形分 4 批替换 → 视觉上整页「闪几下」。
 *
 * ═══════════════ 方案与取舍 ═══════════════
 * 构建前用 scripts/font-subset.py 把 97 片合并成 1 片，并按**全站真实用字**子集化：
 *
 *   原方案：194 个 @font-face，首页拉 15 片 = 764 KB，闪 4 次
 *   本方案：2  个 @font-face，首页拉 2 片  = 474 KB，闪 1 次（且已被 preload 压到首帧前）
 *
 * 为什么产物提交进仓库、而不是每次构建现生成：
 *   CF Pages 构建机没有 python + fonttools。把 470 KB 的 woff2 提交进仓库，
 *   部署只做文件复制，零额外依赖。内容改动后用 `pnpm fonts` 重新生成即可。
 *
 * 为什么必须按「全站字符集」而非单页子集化：
 *   按单页子集，浏览到未收录的字就会回退系统字体，变成新的字形混排 —— 闪动换了个形式而已。
 */
export default defineNuxtModule({
  meta: { name: 'local-fonts' },

  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const logger = useLogger('local-fonts')

    const rootDir = nuxt.options.rootDir
    const fontDir = resolve('../public/fonts')

    nuxt.hook('build:before', async () => {
      const required = ['lxgw-wenkai-lite-400.woff2', 'lxgw-wenkai-lite-700.woff2', 'coverage.json']
      const missing = required.filter((f) => !existsSync(join(fontDir, f)))

      if (missing.length) {
        logger.error(`字体产物缺失：${missing.join(', ')}`)
        logger.error('请执行 pnpm fonts 重新生成（需要 python3 + fonttools + brotli）')
        return
      }

      // 覆盖校验：把当前源码用字与 coverage.json 比对，缺字会静默回退系统字体
      const coverage = new Set<number>(
        JSON.parse(await readFile(join(fontDir, 'coverage.json'), 'utf8')).codepoints,
      )
      const { chars } = await collectCharset(rootDir)
      const uncovered = [...chars].filter((c) => !coverage.has(c.codePointAt(0) as number))

      if (uncovered.length) {
        logger.warn(
          `有 ${uncovered.length} 个字符不在字体子集内，将回退系统字体：${uncovered.slice(0, 30).join('')}`,
        )
        logger.warn('执行 pnpm fonts 重新生成字体子集即可消除')
      } else {
        logger.success(`中文字体子集覆盖完整（${coverage.size} 个码位）`)
      }
    })
  },
})

/** 从磁盘上的真实文本采集全站字符集，与 scripts/font-subset.py 的输入保持一致 */
async function collectCharset(rootDir: string) {
  const chars = new Set<string>()
  const exts = ['.md', '.mdc', '.vue', '.ts', '.json']
  const roots = ['content', 'app']

  // CJK 汉字、中文标点、全角符号、常用连接号与间隔号
  const CJK = /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u2010-\u2027\u00b7]/

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        await walk(p)
        continue
      }
      if (!exts.includes(p.slice(p.lastIndexOf('.')))) continue
      for (const ch of await readFile(p, 'utf8')) {
        if (CJK.test(ch)) chars.add(ch)
      }
    }
  }

  for (const r of roots) await walk(join(rootDir, r))

  // 动态内容（日期、阅读时长、序号）会用到，但源码里未必以字面出现
  for (const ch of '0123456789:·—…、。，！？；：（）《》「」【】') chars.add(ch)

  return { chars }
}
