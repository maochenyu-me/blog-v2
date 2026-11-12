/**
 * 打赏议题解析写入脚本 —— reward-add 工作流调用。
 *
 * 从 issue forms 格式的议题正文提取 赞赏者名称/头像/金额/日期，
 * 校验后按「日期倒序、同日金额降序」插入 app/data/sponsors.json（同名同日同金额去重）。
 * stdout 输出 JSON：{ ok, comment? }，供工作流决定回帖内容。
 *
 * 用法：node scripts/reward-issue.mjs --body-file /tmp/issue-body.md
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const DATA_PATH = resolve(process.cwd(), 'app/data/sponsors.json')

// ---------- 参数 ----------
function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : null
}

// ---------- 议题正文解析（issue forms：### 标题 + 空行 + 内容） ----------
function parseIssueBody(body) {
  const sections = {}
  const parts = body.split(/^###\s+/m).slice(1)
  for (const part of parts) {
    const nl = part.indexOf('\n')
    const label = part.slice(0, nl).trim()
    sections[label] = part.slice(nl + 1).trim()
  }
  return sections
}

/** 议题正文里的附件/图片链接（![...](url) 或裸 https://... 图片链接） */
function extractImageUrl(text) {
  if (!text) return ''
  const md = text.match(/!\[[^\]]*\]\((https:[^)\s]+)\)/)
  if (md) return md[1]
  const bare = text.match(/(https:[^\s)"']+\.(?:png|jpe?g|webp|gif))/i)
  return bare ? bare[1] : ''
}

function normalizeDate(raw) {
  const m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ---------- 主流程 ----------
async function main() {
  const fail = (comment) => { console.log(JSON.stringify({ ok: false, comment })) }

  const bodyFile = argValue('--body-file')
  if (!bodyFile) return fail('缺少 --body-file 参数。')

  const body = await readFile(bodyFile, 'utf8')
  const form = parseIssueBody(body)

  const name = (form['赞赏者名称'] ?? '').trim()
  const avatar = (form['头像图片链接'] ?? '').trim()
  const amountRaw = (form['金额（元）'] ?? '').trim()
  const dateRaw = (form['打赏日期'] ?? '').trim()
  const screenshot = form['转账截图'] ?? ''

  if (!name) return fail('未解析到「赞赏者名称」，请检查议题表单是否填写完整。')
  if (!screenshot) return fail('未解析到「转账截图」，核验材料缺失，不予收录。')

  const amount = Number.parseFloat(amountRaw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail(`金额「${amountRaw}」无效，请填写纯数字（可带两位小数）。`)
  }

  const date = normalizeDate(dateRaw)
  if (!date) return fail(`日期「${dateRaw}」无效，请使用 YYYY-MM-DD 格式。`)

  const item = { name, amount, date }
  if (avatar.startsWith('http')) item.avatar = avatar

  const json = await readFile(DATA_PATH, 'utf8')
  const list = JSON.parse(json)
  if (!Array.isArray(list)) return fail('sponsors.json 结构异常（非数组），转人工处理。')

  const dup = list.find((s) => s.name === name && s.date === date && Number(s.amount) === amount)
  if (dup) {
    return fail(`记录已存在（${name} · ¥${amount} · ${date}），无需重复收录。`)
  }

  list.push(item)
  list.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount)
  await writeFile(DATA_PATH, `${JSON.stringify(list, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    ok: true,
    comment: `✅ 已收录：**${name}** · ¥${amount} · ${date}\n\n数据已写入关于页打赏名单，感谢支持 ❤️`,
  }))
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, comment: `脚本异常：${err.message}` }))
})
