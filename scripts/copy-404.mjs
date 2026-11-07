/**
 * 把预渲染出的 404 页提到站点根目录。
 *
 * 为什么需要：Nuxt 预渲染 `/404` 路由产出的是 `dist/404/index.html`，
 * 而 Cloudflare Pages / Netlify 这类静态托管只认根级的 `404.html`
 * 做未匹配路径的兜底。缺了它，访客看到的会是托管商的默认错误页，
 * 而不是我们自己的「页面不在这里」。
 *
 * 早先 `dist/404/index.html` 存在但根级 `404.html` 没有，所以本地
 * 用 Python 的 http.server 验收时，404 场景拿到的是 Python 自带的
 * 335 字节错误页 —— 没有 h1、没有 focus-visible、暗色也不生效，
 * 验收报 9 项失败，全是这一个缺口引起的。
 *
 * 代价只有一份重复 HTML（约 35 KB），换来的是 404 在任何静态托管上一致。
 */
import { access, copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const ROOT = process.argv[2] || 'dist'
const SRC = join(ROOT, '404', 'index.html')
const OUT = join(ROOT, '404.html')

try {
  await access(SRC)
} catch {
  console.warn(`[copy-404] 找不到 ${SRC}，跳过（检查 404 页是否被预渲染）`)
  process.exit(0)
}

await mkdir(dirname(OUT), { recursive: true })
await copyFile(SRC, OUT)
console.log(`[copy-404] ${SRC} → ${OUT}`)
