#!/usr/bin/env node
/**
 * 友链议题管理脚本 —— GitHub issue 申请流程的核心逻辑，零依赖。
 *
 * 子命令：
 *   parse    --body-file <f>                          解析 issue form body，输出字段 JSON
 *   validate --issue <n> --body-file <f> --created <ISO> [--offline]
 *                                                     校验申请（格式/可达性/重复），stdout 输出结果 JSON
 *   add      --issue <n> --body-file <f> --created <ISO> [--offline]
 *                                                     校验通过后写入 friend-links.json（按建交日期升序）
 *   recommend --issue <n> --value <true|false>          按议题号改 recommended
 *
 * 约定：
 *   - stdout 只输出 JSON（工作流用 jq 消费），过程日志全走 stderr
 *   - --offline 跳过网络可达性校验，供本地 fixture 测试使用
 *   - 校验失败的评论文本由本脚本生成（result.comment），工作流原样张贴
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = resolve(ROOT, 'app/data/friend-links.json')
const UA = 'Mozilla/5.0 (compatible; KemiaoFriendLinkChecker/1.0; +https://www.kemiaosw.top)'
const TIMEOUT_MS = 15_000

// ---- 工具 ----

const log = (...a) => console.error('[friend-link]', ...a)
const out = (obj) => console.log(JSON.stringify(obj, null, 2))

function readArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k.startsWith('--')) {
      const next = argv[i + 1]
      // 布尔旗标：无值或下一个也是旗标时取 true（如末尾的 --offline）
      args[k.slice(2)] = next === undefined || next.startsWith('--') ? true : argv[++i]
    }
  }
  return args
}

function loadJson() {
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
}

function saveJson(list) {
  list.sort((a, b) => (a.daysSince ?? '').localeCompare(b.daysSince ?? ''))
  writeFileSync(DATA_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8')
}

/** 规范化 URL：补协议、去尾斜杠、去 hash，host 小写 */
function normalizeUrl(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return { error: '链接为空' }
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let u
  try {
    u = new URL(withProto)
  } catch {
    return { error: `不是合法 URL：${trimmed}` }
  }
  if (!/^https?:$/.test(u.protocol)) return { error: `仅支持 http(s)：${trimmed}` }
  if (!u.hostname.includes('.')) return { error: `域名不完整：${trimmed}` }
  u.hash = ''
  const path = u.pathname.replace(/\/+$/, '')
  return { url: `${u.protocol}//${u.hostname.toLowerCase()}${path}${u.search}` }
}

/** 解析 GitHub issue form 渲染的 body：### 标题 分段取值 */
function parseIssueBody(body) {
  const fields = {}
  const sections = String(body ?? '').split(/^### /m)
  for (const section of sections.slice(1)) {
    const nl = section.indexOf('\n')
    const label = section.slice(0, nl).trim()
    const value = section.slice(nl + 1).trim()
    if (label && value && value !== '_No response_') fields[label] = value
  }
  return fields
}

// ---- 校验 ----

async function reachable(url, { expectImage = false } = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,image/*;q=0.9,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return `可达性失败：HTTP ${res.status}`
    if (expectImage && !/^image\//i.test(res.headers.get('content-type') ?? '')) {
      return `头像地址返回的不是图片（content-type: ${res.headers.get('content-type')}）`
    }
    return null
  } catch (e) {
    return `无法访问：${e?.cause?.code ?? e?.name ?? e}`
  }
}

/**
 * 全量校验。existing = 现有友链数组；offline = 跳过网络检查（本地测试）。
 * 选填字段（RSS/截图/友链页面）：格式错误阻断，可达性只警告不阻断。
 * 返回 { ok, entry?, errors[], warnings[], comment }
 */
async function validate({ issue, body, created, existing, offline }) {
  const fields = parseIssueBody(body)
  const name = (fields['站点名称'] ?? '').trim()
  const desc = (fields['站点介绍'] ?? '').trim()
  const urlRes = normalizeUrl(fields['站点链接'])
  const avatarRes = normalizeUrl(fields['头像图片链接'])

  // 选填字段：label → 数据键
  const optionalDefs = [
    { label: 'RSS 地址', key: 'rss' },
    { label: '站点截图', key: 'screenshot' },
    { label: '友链页面', key: 'friendPage' },
  ]

  const errors = []
  const warnings = []
  if (!name) errors.push('缺少「站点名称」')
  else if (name.length > 40) errors.push('站点名称过长（> 40 字）')
  if (!desc) errors.push('缺少「站点介绍」')
  else if (desc.length > 100) errors.push('站点介绍过长（> 100 字）')
  if (urlRes.error) errors.push(`站点链接无效：${urlRes.error}`)
  if (avatarRes.error) errors.push(`头像链接无效：${avatarRes.error}`)

  const entryOpts = {}
  for (const def of optionalDefs) {
    const raw = (fields[def.label] ?? '').trim()
    if (!raw) continue
    const res = normalizeUrl(raw)
    if (res.error) errors.push(`${def.label}无效：${res.error}`)
    else entryOpts[def.key] = res.url
  }

  let entry = null
  if (!errors.length) {
    const dup = existing.find(
      (f) => !f.owner && normalizeUrl(f.url).url === urlRes.url,
    )
    if (dup) errors.push(`该站点已在友链中：${dup.name}`)
  }
  if (!errors.length && !offline) {
    errors.push(await reachable(urlRes.url))
    errors.push(await reachable(avatarRes.url, { expectImage: true }))
    // 选填字段可达性：只警告，不阻断收录
    for (const [key, url] of Object.entries(entryOpts)) {
      const problem = await reachable(url)
      if (problem) warnings.push(`${optionalDefs.find((d) => d.key === key).label}：${problem}`)
    }
  }

  const realErrors = errors.filter(Boolean)
  if (!realErrors.length) {
    entry = {
      name,
      avatar: avatarRes.url,
      description: desc,
      url: urlRes.url,
      daysSince: String(created ?? '').slice(0, 10),
      issue,
      ...entryOpts,
    }
  }

  const ok = realErrors.length === 0
  const commentLines = ok
    ? [`✅ 校验通过（issue #${issue}）：**${name}**`, '', '等待管理员审核收录。']
    : [`❌ 校验未通过（issue #${issue}），请修正后重新打开议题：`, '', ...realErrors.map((e) => `- ${e}`)]
  if (ok && warnings.length) {
    commentLines.push('', '⚠️ 以下选填字段暂时无法访问（不影响收录，管理员会人工复核）：', ...warnings.map((w) => `- ${w}`))
  }
  return { ok, issue, entry, errors: realErrors, warnings, comment: commentLines.join('\n') }
}

// ---- 子命令 ----

async function cmdValidate(args) {
  const body = readFileSync(resolve(args['body-file']), 'utf8')
  const result = await validate({
    issue: Number(args.issue),
    body,
    created: args.created,
    existing: loadJson(),
    offline: Boolean(args.offline),
  })
  out(result)
  process.exitCode = result.ok ? 0 : 1
}

async function cmdAdd(args) {
  const body = readFileSync(resolve(args['body-file']), 'utf8')
  const list = loadJson()
  const result = await validate({
    issue: Number(args.issue),
    body,
    created: args.created,
    existing: list,
    offline: Boolean(args.offline),
  })
  if (!result.ok) {
    out(result)
    process.exitCode = 1
    return
  }
  list.push(result.entry)
  saveJson(list)
  log(`已写入 ${result.entry.name}（${result.entry.daysSince}），当前 ${list.length} 条`)
  out({ ...result, comment: `🎉 已通过审核，**${result.entry.name}** 加入友链数据，感谢支持！\n\n站点将在下次部署后出现在[友链页](https://www.kemiaosw.top/links)。` })
}

async function cmdRecommend(args) {
  const issue = Number(args.issue)
  const value = args.value === 'true'
  const list = loadJson()
  const entry = list.find((f) => f.issue === issue)
  if (!entry) {
    out({ ok: false, comment: `⚠️ issue #${issue} 没有关联的友链数据（可能尚未收录）。推荐标记仅对已收录的申请生效。` })
    process.exitCode = 1
    return
  }
  entry.recommended = value
  saveJson(list)
  log(`${entry.name}.recommended = ${value}`)
  out({
    ok: true,
    comment: `🔖 **${entry.name}** 的推荐标记已${value ? '添加' : '移除'}。`,
  })
}

async function cmdParse(args) {
  out(parseIssueBody(readFileSync(resolve(args['body-file']), 'utf8')))
}

const commands = { validate: cmdValidate, add: cmdAdd, recommend: cmdRecommend, parse: cmdParse }
const cmd = process.argv[2]
if (!commands[cmd]) {
  log(`未知子命令：${cmd}。可用：${Object.keys(commands).join(' / ')}`)
  process.exit(2)
}
await commands[cmd](readArgs(process.argv.slice(3)))
