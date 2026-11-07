/**
 * 本地静态预览服务，只为验收而存在。
 *
 * 为什么不用 `python -m http.server`：它不认 `404.html`，未匹配路径会返回
 * 自带的 335 字节错误页。于是 verify.mjs 的 404 场景永远测的不是我们的页面，
 * 报出来的「缺少 h1 / 缺少 :focus-visible / 暗色未生效」全是这个假象。
 * 这里按静态托管的真实行为来：未命中 → 返回 404.html，状态码 404。
 *
 * 为什么不用 `nuxt preview` / `node .output/server/index.mjs`：本项目是纯 SSG，
 * 产物在 dist/。跑 node-server 会走运行时 SSR，与预渲染产物不是同一份东西 ——
 * 实测那样起会得到空白页（#__nuxt 零子节点）加 hydration mismatch。
 *
 * 用法：node scripts/serve-dist.mjs [port] [dir]
 * 默认 4173 + dist，与 scripts/verify-font-flash.mjs 的默认 baseUrl 对齐。
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

const PORT = Number(process.argv[2] || 4173)
const ROOT = normalize(process.argv[3] || 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.map': 'application/json; charset=utf-8',
}

/** 把请求路径钉死在 ROOT 内，挡掉 ../ 穿越 */
function resolvePath(pathname) {
  const decoded = decodeURIComponent(pathname)
  const target = normalize(join(ROOT, decoded))
  if (!target.startsWith(ROOT + sep) && target !== ROOT) return null
  return target
}

async function send(res, file, status = 200) {
  const buf = await readFile(file)
  res.writeHead(status, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  })
  res.end(buf)
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  let file = resolvePath(pathname)

  if (file) {
    try {
      const info = await stat(file)
      if (info.isDirectory()) file = join(file, 'index.html')
      await send(res, file)
      return
    } catch {
      // 落到 404 兜底
    }
  }

  try {
    await send(res, join(ROOT, '404.html'), 404)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`静态预览：http://127.0.0.1:${PORT}  (root=${ROOT})`)
})
