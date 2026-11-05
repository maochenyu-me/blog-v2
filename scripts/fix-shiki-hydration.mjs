/**
 * 构建后修正 Shiki 内联 <style> 的空白差异，消除 hydration 失配。
 *
 * ── 实证对比（同一篇含代码块的文章，构建产物）────────────────
 *   _payload.json（客户端水合用的数据）：
 *     "html pre.shiki code .sScJk, html code.shiki .sScJk{...}"
 *                                  ↑ 有空格
 *   index.html（服务端 SSR 输出的 DOM）：
 *     "<style>html pre.shiki code .sScJk,html code.shiki .sScJk{...}"
 *                                        ↑ 无空格
 *
 * 两端文本节点逐字不等 → Vue 判定
 * "Hydration completed but contains mismatches."，
 * 并重建整棵正文子树（可能存在一帧闪烁）。
 *
 * ── 为什么在产物上修，而不是在构建流程里 ────────────────
 * 已依次试过且均未生效：
 *   1. content.build.markdown.highlight.options.defaultColor —— 该配置项不存在
 *   2. rehypePlugins 自定义插件 —— 未影响最终 HTML 文本
 *   3. 在 body AST 上做规范化 —— payload 侧本来就有空格，改它没意义
 *   4. nitro 的 render:html 钩子 —— nuxt generate 预渲染路径不触发
 * devalue 序列化 payload 与 SSR 拼接 HTML 走的是两条不同的代码路径，
 * 唯一确定有效的位置是**最终产物**：扫描 dist 下所有 .html，
 * 把 ",html code.shiki" 补成 ", html code.shiki"。
 *
 * ── 安全性 ───────────────────────────────────────────
 * 只匹配紧邻 "html code.shiki" 的逗号，是纯空白规范化，
 * 不改变选择器语义，且幂等（重复执行结果相同）。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const DIST = join(process.cwd(), 'dist')
const NEEDLE = /,(?=html code\.shiki)/g

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (extname(entry.name) === '.html') out.push(p)
  }
  return out
}

const files = await walk(DIST)
let patched = 0
let occurrences = 0

for (const file of files) {
  const raw = await readFile(file, 'utf8')
  if (!raw.includes('code.shiki')) continue

  const before = (raw.match(NEEDLE) || []).length
  if (before === 0) continue

  const fixed = raw.replace(NEEDLE, ', ')
  await writeFile(file, fixed, 'utf8')
  patched++
  occurrences += before
}

console.log(
  `[fix-shiki-hydration] 扫描 ${files.length} 个 HTML，修正 ${patched} 个文件、共 ${occurrences} 处逗号空格`,
)
