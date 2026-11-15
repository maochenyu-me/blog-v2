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
 * ── Cloudflare Pages Functions 仿真 ──────────────────────────
 * 本站关于页要调 /api/umami/*，线上由 functions/api/umami/[[path]].js 承担。
 * 纯静态服务器没有 Functions 运行时，该路径必然 404 —— 于是 verify.mjs 会在
 * 关于页报「控制台错误：404」，而线上是正常的。这个假阳性会掩盖真正的回归。
 *
 * 所以这里按 Pages 的约定加载 functions/ 下的模块并调用其导出函数：
 *   functions/api/umami/[[path]].js  →  匹配 /api/umami/**，params.path 为剩余段
 * 只实现本项目用到的最小子集（catch-all 段变量 + onRequestGet/Post），
 * 不做 env 注入、不做 _middleware，够用即可。
 *
 * 上游不可达时（离线、Umami 挂了）函数自身会返回 502，这是真实行为，不掩盖。
 *
 * 用法：node scripts/serve-dist.mjs [port] [dir]
 * 默认 4173 + dist，与 scripts/verify-font-flash.mjs 的默认 baseUrl 对齐。
 */
import { createServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const PORT = Number(process.argv[2] || 4173)
const ROOT = normalize(process.argv[3] || 'dist')
const FUNCTIONS_DIR = 'functions'

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

/* ─────────────────────── Functions 路由 ─────────────────────── */

/**
 * 扫描 functions/ 目录，把文件路径编译成路由。
 *
 * Pages 的路径约定（本项目只用到前两条）：
 *   api/umami/[[path]].js   →  /api/umami/**  可选 catch-all，params.path = 剩余段（可多段）
 *   api/umami/[id].js       →  /api/umami/:id 单段参数
 *   api/foo.js              →  /api/foo
 *
 * 数组顺序即优先级：静态段越多越靠前，catch-all 最后匹配。
 */
async function collectFunctions(dir) {
  const out = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out // 没有 functions/ 目录是正常情况
  }

  async function walk(current, segments) {
    for (const e of await readdir(current, { withFileTypes: true })) {
      const full = join(current, e.name)
      if (e.isDirectory()) {
        await walk(full, [...segments, e.name])
        continue
      }
      if (!e.name.endsWith('.js') && !e.name.endsWith('.mjs')) continue

      // index.js 映射到它所在目录本身，其余用文件名（去扩展名）
      const base = e.name.replace(/\.(mjs|js)$/, '')
      const segs = base === 'index' ? segments : [...segments, base]
      if (!segs.length) continue

      const keys = segs.map((s) => {
        const catchAll = s.match(/^\[\[(.+)\]\]$/)
        if (catchAll) return { kind: 'catchAll', name: catchAll[1] }
        const param = s.match(/^\[(.+)\]$/)
        if (param) return { kind: 'param', name: param[1] }
        return { kind: 'static', value: s }
      })

      out.push({
        file: full,
        keys,
        // 越具体的路由越优先：catch-all 计 0 分，参数 1 分，静态 2 分
        score: keys.reduce((n, k) => n + (k.kind === 'static' ? 2 : k.kind === 'param' ? 1 : 0), 0),
        module: null,
      })
    }
  }

  await walk(dir, [])
  return out.sort((a, b) => b.score - a.score)
}

/** 用一组已解码的路径段去匹配路由，命中返回 params 与模块 */
function matchFunction(routes, segments) {
  for (const route of routes) {
    const params = {}
    let matched = true
    let i = 0
    for (let k = 0; k < route.keys.length; k++) {
      const key = route.keys[k]
      if (key.kind === 'static') {
        if (segments[i] !== key.value) {
          matched = false
          break
        }
        i++
      } else if (key.kind === 'param') {
        if (segments[i] === undefined) {
          matched = false
          break
        }
        params[key.name] = segments[i++]
      } else {
        // catch-all 吃掉剩余全部段；Pages 允许零段
        params[key.name] = segments.slice(i)
        i = segments.length
      }
    }
    // 必须完整消耗路径，否则 /api/umami/x/y 不该命中 /api/umami/[id]
    if (matched && i === segments.length) return { route, params }
  }
  return null
}

const functionRoutes = await collectFunctions(FUNCTIONS_DIR)

/** 把 Node 的 IncomingMessage 转成 Pages 风格 Request */
function toRequest(req, url) {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
  }
  const method = (req.method || 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  return new Request(url, {
    method,
    headers,
    body: hasBody ? req : undefined,
    // Node 的流当 body 传需要半双工声明
    duplex: hasBody ? 'half' : undefined,
  })
}

/** 把 Pages 风格 Response 写回 Node 响应 */
async function writeResponse(res, response) {
  const headers = {}
  response.headers.forEach((v, k) => {
    headers[k] = v
  })
  res.writeHead(response.status, headers)
  if (!response.body) {
    res.end()
    return
  }
  res.end(Buffer.from(await response.arrayBuffer()))
}

async function handleFunction(req, res, url, segments) {
  const hit = matchFunction(functionRoutes, segments)
  if (!hit) return false

  try {
    if (!hit.route.module) {
      hit.route.module = await import(pathToFileURL(hit.route.file).href)
    }
    const mod = hit.route.module
    const method = (req.method || 'GET').toUpperCase()
    const handler
      = mod[`onRequest${method[0]}${method.slice(1).toLowerCase()}`] ?? mod.onRequest

    if (typeof handler !== 'function') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(`Function ${hit.route.file} 未导出 onRequest/${method}`)
      return true
    }

    const request = toRequest(req, url)
    const response = await handler({
      request,
      params: hit.params,
      // 本地没有 CF 的 env 绑定；Functions 自身都有默认值兜底
      env: process.env,
      functionPath: segments.join('/'),
      next: async () => new Response('Not found', { status: 404 }),
      waitUntil: () => {},
    })
    await writeResponse(res, response)
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`Function 执行失败：${err?.stack || err}`)
  }
  return true
}

/* ─────────────────────── 主流程 ─────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const pathname = url.pathname

  // Functions 优先于静态文件：与 Pages 的行为一致（函数路由先匹配）
  const segments = pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s))
  if (segments.length && functionRoutes.length) {
    const handled = await handleFunction(req, res, url, segments)
    if (handled) return
  }

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
  const fnNote = functionRoutes.length
    ? `  functions=${functionRoutes.length} 条（${functionRoutes.map(r => '/' + r.keys.map(k => (k.kind === 'static' ? k.value : k.kind === 'param' ? `[${k.name}]` : `[[${k.name}]]`)).join('/')).join(', ')}）`
    : '  functions=无'
  console.log(`静态预览：http://127.0.0.1:${PORT}  (root=${ROOT})${fnNote}`)
})
