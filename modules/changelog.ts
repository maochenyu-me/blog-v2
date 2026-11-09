import { createJiti } from 'jiti'
import { createResolver, defineNuxtModule } from '@nuxt/kit'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * changelog —— 构建期把本仓库的 git 提交历史落成 app/data/changelog.json。
 *
 * 为什么不在页面里 execSync（参考站的做法）：
 * 页面组件会被 Vite 打进客户端 bundle，node:child_process 不能被序列化过去，
 * 而且客户端根本不该跑 git。这里在模块 setup 阶段生成静态 JSON，页面直接 import，
 * 产物是纯数据，客户端零开销、与 SSG 的时间线一致。
 *
 * 产物不进版本库（见 .gitignore）：
 * 提交历史本身会随每次 commit 变化，把生成物提交会形成「为了 commit 数据再 commit 一次」
 * 的死循环。CI 侧由 deploy.yml 的 fetch-depth: 0 保证历史完整。
 */

/** Conventional Commits 的白名单前缀；不在此列的一律归 other */
const KNOWN_TYPES = [
  'feat',
  'fix',
  'refactor',
  'perf',
  'style',
  'docs',
  'test',
  'chore',
  'ci',
  'build',
  'revert',
]

/** 提交消息里用单元分隔符而不是 | —— 冒号、竖线在真实 subject 里都可能出现 */
const FIELD = '\u001f'

interface Commit {
  hash: string
  date: string
  type: string
  scope: string | null
  text: string
  merge: boolean
}

function parseSubject(subject: string): Pick<Commit, 'type' | 'scope' | 'text' | 'merge'> {
  if (/^Merge (branch|pull request|remote)/i.test(subject)) {
    return { type: 'other', scope: null, text: subject, merge: true }
  }

  const m = subject.match(/^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.+)$/)
  if (!m) return { type: 'other', scope: null, text: subject, merge: false }

  const type = m[1]!
  return {
    type: KNOWN_TYPES.includes(type) ? type : 'other',
    scope: m[2] ?? null,
    text: m[3]!.trim(),
    merge: false,
  }
}

function readCommits(cwd: string, limit: number): Commit[] {
  // -c safe.directory=*：容器 / 共享磁盘里仓库属主常与当前用户不同，
  // git 会直接拒绝读（dubious ownership），这里对该次调用放行。
  const raw = execFileSync(
    'git',
    [
      '-c',
      'safe.directory=*',
      'log',
      `--pretty=format:%h${FIELD}%ad${FIELD}%s`,
      '--date=format:%Y-%m-%d',
      '-n',
      String(limit),
    ],
    { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'ignore'] },
  )

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash = '', date = '', ...rest] = line.split(FIELD)
      return { hash, date, ...parseSubject(rest.join(FIELD)) }
    })
    .filter((c) => c.hash && c.date)
}

export default defineNuxtModule({
  meta: { name: 'changelog' },

  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const OUT = resolve('../app/data/changelog.json')

    const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })
    const pagesMod = await jiti.import<any>(resolve('../app/pages.config.ts'))
    const cfg = pagesMod.default?.pages?.changelog ?? {}
    const limit = Number(cfg.limit) > 0 ? Number(cfg.limit) : 300
    const filterMerge = cfg.filterMerge !== false

    let commits: Commit[] = []
    try {
      commits = readCommits(nuxt.options.rootDir, limit)
    } catch (err) {
      // 拿不到历史（浅克隆 / 无 git）时不清空已有产物 —— 本地 dev 不该因此断掉
      console.warn('[changelog] 读取 git 历史失败，沿用已有数据：', (err as Error).message)
      if (existsSync(OUT)) return
    }

    if (filterMerge) commits = commits.filter((c) => !c.merge)

    const json = JSON.stringify({
      generatedAt: new Date().toISOString(),
      total: commits.length,
      commits,
    })

    if (existsSync(OUT) && readFileSync(OUT, 'utf8') === json) return

    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(OUT, json, 'utf8')
    console.log(`[changelog] ${commits.length} 条提交 → app/data/changelog.json`)
  },
})
