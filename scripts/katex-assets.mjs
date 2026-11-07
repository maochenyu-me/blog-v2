/**
 * 生成 KaTeX 的自托管样式与字体。
 *
 * 为什么要这一步，而不是 `import 'katex/dist/katex.min.css'`：
 *   katex.min.css 里每个字体族同时声明 woff2 / woff / ttf 三份，
 *   直接交给 Vite 会把 60 个文件（1.2MB）全部 emit 进产物。现代浏览器
 *   只需要 woff2，20 个文件 296KB。这一步把三份裁成一份。
 *
 * 为什么字体放进 public/ 而不是走 Vite 的 url() 重写：
 *   与仓库既有做法一致（public/fonts 下的中文子集也是提交进仓库的），
 *   CF Pages 构建机不需要额外的东西就能产出正确路径；
 *   同时 /fonts/katex/ 的 URL 稳定，不随构建哈希变化。
 *
 * 产物：
 *   app/assets/css/katex.generated.css   ← 由 main.css @import
 *   public/fonts/katex/*.woff2           ← 20 个字体
 *
 * 用法：node scripts/katex-assets.mjs
 */
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SRC = 'node_modules/.pnpm/katex@0.16.47/node_modules/katex/dist'
const CSS_OUT = 'app/assets/css/katex.generated.css'
const FONT_OUT = 'public/fonts/katex'

/** katex.min.css 可能被动过位置，这里做一次兜底发现 */
async function resolveDist() {
  try {
    await readFile(join(SRC, 'katex.min.css'))
    return SRC
  } catch {
    // pnpm 的版本号目录名带后缀时（如 0.16.47_xxx）退化成扫描
    const base = 'node_modules/.pnpm'
    const dirs = await readdir(base)
    const hit = dirs.find((d) => d.startsWith('katex@'))
    if (!hit) throw new Error('找不到 katex 包，先跑 pnpm install')
    return join(base, hit, 'node_modules/katex/dist')
  }
}

const dist = await resolveDist()
const raw = await readFile(join(dist, 'katex.min.css'), 'utf8')

/**
 * 三份字体裁成一份，并把相对路径改成站点绝对路径。
 * 先把 woff2 的 url 改成绝对路径，再按「原始相对形态」删掉 woff / ttf 两段 ——
 * 删除正则必须匹配 url(fonts/x.woff)，因为那两段还没被改写。
 */
let css = raw.replace(/url\(fonts\/([^)]+?)\.woff2\)/g, 'url(/fonts/katex/$1.woff2)')
css = css.replace(/,url\(fonts\/[^)]+?\.woff\) format\("woff"\)/g, '')
css = css.replace(/,url\(fonts\/[^)]+?\.ttf\) format\("truetype"\)/g, '')

const header = `/**
 * KaTeX 样式 —— 由 scripts/katex-assets.mjs 生成，不要手改。
 *
 * 相对 npm 包的 katex.min.css 只做两处改动：
 *   1. @font-face 只保留 woff2（删掉 woff / ttf），字体文件数 60 → 20；
 *   2. 字体 URL 由 url(fonts/x.woff2) 改为 /fonts/katex/x.woff2。
 * 行内/块级公式的字号、间距、滚动由 ProseBody.vue 里的 :deep 规则覆盖，
 * 不在这里改 —— 那里能拿到项目的 token 变量。
 */

`
await writeFile(CSS_OUT, header + css, 'utf8')

await mkdir(FONT_OUT, { recursive: true })
const fonts = (await readdir(join(dist, 'fonts'))).filter((f) => f.endsWith('.woff2'))
for (const f of fonts) {
  await copyFile(join(dist, 'fonts', f), join(FONT_OUT, f))
}

const kb = (n) => `${(n / 1024).toFixed(0)}KB`
const cssKb = kb(Buffer.byteLength(css))
console.log(`[katex] ${CSS_OUT}（${cssKb}）`)
console.log(`[katex] ${FONT_OUT}：${fonts.length} 个 woff2`)
