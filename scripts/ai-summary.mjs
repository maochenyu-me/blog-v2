/**
 * AI 摘要生成脚本 —— 硅基流动（SiliconFlow）OpenAI 兼容接口。
 *
 * 摘要写入文章 frontmatter 的 aisummary 字段（YAML 双引号单行字符串，
 * JSON 转义规则兼容 YAML），文章页由 PostAiSummary 组件消费。
 *
 * 用法：
 *   pnpm ai:summary                 只给没有 aisummary 的文章生成
 *   pnpm ai:summary -- --all        全量覆盖重生成（含已有摘要的文章）
 *   pnpm ai:summary -- --force <关键词>   只处理匹配的单篇/多篇（匹配文件名、title、abbrlink）
 *   pnpm ai:summary -- --dry-run    只调 API 打印结果，不写入文件
 *
 * API key：环境变量 SILICONFLOW_API_KEY，或写在项目根目录 .env（已 gitignore）。
 * 换模型：改下面的 MODEL，并把 app/blog.config.ts 的 ai.badge 一起改。
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

// ---------- 配置 ----------
const BASE_URL = 'https://api.siliconflow.cn/v1'
const MODEL = 'Qwen/Qwen3-8B'
const MAX_TOKENS = 600
const TEMPERATURE = 0.3
/** 送入模型的正文上限（字符），超长截断 */
const CONTENT_LIMIT = 6000
/** 摘要正文上限（字符），超长截断 */
const SUMMARY_LIMIT = 220
/** 相邻请求间隔（ms），避免触发限流 */
const REQUEST_GAP = 300

const CONTENT_DIR = join(process.cwd(), 'content', 'posts')

// ---------- 参数 ----------
const args = process.argv.slice(2)
const all = args.includes('--all')
const dryRun = args.includes('--dry-run')
const forceIdx = args.indexOf('--force')
const forceKeyword = forceIdx >= 0 ? args[forceIdx + 1] : null

// ---------- .env ----------
async function loadApiKey() {
  if (process.env.SILICONFLOW_API_KEY) return process.env.SILICONFLOW_API_KEY
  try {
    const env = await readFile(join(process.cwd(), '.env'), 'utf8')
    const line = env.split('\n').find((l) => l.trim().startsWith('SILICONFLOW_API_KEY='))
    const key = line?.split('=').slice(1).join('=').trim()
    if (key) return key
  } catch { /* 没有 .env 文件 */ }
  return null
}

// ---------- frontmatter 工具 ----------
function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { fm: '', body: raw, fmEnd: 0 }
  return { fm: match[1], body: raw.slice(match[0].length), fmEnd: match[0].length }
}

function pickField(fm, key) {
  const line = fm.split('\n').find((l) => l.startsWith(`${key}:`))
  if (!line) return ''
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
}

/** 是否已有非空 aisummary（块级标量也按有值算） */
function hasSummary(fm) {
  const line = fm.split('\n').find((l) => l.startsWith('aisummary:'))
  return Boolean(line && line.slice('aisummary:'.length).trim())
}

/**
 * 把 aisummary 写回 frontmatter：先删掉旧块（含缩进续行），再在 fm 末尾插入新行。
 * 其余字段原样保留，不做任何重排（避免动克喵手写的格式）。
 */
function writeSummary(raw, summary) {
  const { fm, body } = splitFrontmatter(raw)
  const lines = fm.split('\n')
  const out = []
  let skipping = false
  for (const line of lines) {
    if (line.startsWith('aisummary:')) {
      skipping = true
      continue
    }
    if (skipping) {
      // 块级标量的缩进续行一并删掉
      if (/^\s/.test(line) || line.trim() === '') continue
      skipping = false
    }
    out.push(line)
  }
  out.push(`aisummary: ${JSON.stringify(summary)}`)
  return `---\n${out.join('\n')}\n---\n${body}`
}

// ---------- 正文清洗 ----------
function cleanBody(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ') // 代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^#{1,6}\s+/gm, '') // 标题符
    .replace(/[*_`>~-]/g, ' ') // 行内记号
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CONTENT_LIMIT)
}

// ---------- API ----------
async function chat(apiKey, system, user) {
  const body = { model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: TEMPERATURE, max_tokens: MAX_TOKENS }
  // Qwen3 系列是混合思考模型，摘要场景明确关掉思考，直接出文本
  if (MODEL.toLowerCase().includes('qwen3')) body.enable_thinking = false

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 3000))
    return chat(apiKey, system, user) // 限流重试一次
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const json = await res.json()
  return (json.choices?.[0]?.message?.content ?? '').trim()
}

// ---------- 主流程 ----------
async function main() {
  const apiKey = await loadApiKey()
  if (!apiKey && !dryRun) {
    console.error('未找到 SILICONFLOW_API_KEY：请写入项目根目录 .env 或设置环境变量。')
    process.exit(1)
  }

  const entries = await readdir(CONTENT_DIR, { recursive: true })
  const files = entries.filter((f) => f.endsWith('.md')).sort()

  const SYSTEM_PROMPT = '你是博客文章摘要助手。根据给定的文章标题和正文，用简体中文写一段 80~150 字的摘要：客观概括文章的核心内容与要点，不夸张、不剧透细节、不使用第一人称，不出现「本文」「作者」以外的指代，直接输出摘要文本，不要任何前后缀和引号。'
  const USER_PROMPT = (title, content) => `标题：${title}\n\n正文：\n${content}`

  const tasks = []
  for (const file of files) {
    const path = join(CONTENT_DIR, file)
    const raw = await readFile(path, 'utf8')
    const { fm, body } = splitFrontmatter(raw)
    const title = pickField(fm, 'title') || file
    if (hasSummary(fm) && !all) continue
    if (forceKeyword && !`${file} ${title} ${pickField(fm, 'abbrlink')}`.includes(forceKeyword)) continue
    tasks.push({ file, path, raw, title, content: cleanBody(body) })
  }

  if (tasks.length === 0) {
    console.log('没有需要生成摘要的文章（全部已有或无匹配）。加 --all 可全量覆盖重生成。')
    return
  }
  console.log(`共 ${tasks.length} 篇待生成（模型 ${MODEL}${dryRun ? '，dry-run 不写入' : ''}）\n`)

  let done = 0
  let failed = 0
  for (const task of tasks) {
    try {
      let summary = await chat(apiKey, SYSTEM_PROMPT, USER_PROMPT(task.title, task.content))
      summary = summary.replace(/^["'「『]+|["'」』]+$/g, '').replace(/\s+/g, ' ').slice(0, SUMMARY_LIMIT)
      if (!summary) throw new Error('模型返回空内容')
      if (!dryRun) {
        await writeFile(task.path, writeSummary(task.raw, summary), 'utf8')
      }
      done++
      console.log(`✓ [${done}/${tasks.length}] ${relative(CONTENT_DIR, task.file)}：${summary.slice(0, 40)}…`)
    } catch (err) {
      failed++
      console.error(`✗ ${relative(CONTENT_DIR, task.file)}：${err.message}`)
    }
    await new Promise((r) => setTimeout(r, REQUEST_GAP))
  }

  console.log(`\n完成：成功 ${done}，失败 ${failed}`)
  if (failed > 0) process.exit(1)
}

main()
