/**
 * Ech0 说说数据源的类型与 API 访问层。
 * 接口形态以 https://github.com/lin-snow/Ech0 的公开路由为准，
 * 全部端点匿名可读，写操作（表情/评论）按访客身份记录。
 */

export type Ech0ExtensionType = 'MUSIC' | 'VIDEO' | 'GITHUBPROJ' | 'WEBSITE' | 'LOCATION' | 'TWEET'

export interface Ech0Tag {
  id: string
  name: string
  usage_count: number
  created_at: number
}

export interface Ech0Extension {
  id?: string
  echo_id?: string
  type: Ech0ExtensionType
  payload: Record<string, string>
  created_at?: number
  updated_at?: number
}

export interface Ech0FileInfo {
  id: string
  url: string
  content_type?: string
  name?: string
}

export interface Ech0EchoFile {
  id: string
  echo_id: string
  file_id: string
  sort_order?: number
  file?: Ech0FileInfo
}

export interface Ech0Reaction {
  key: string
  emoji: string
  count: number
  reacted: boolean
}

export interface Ech0Echo {
  id: string
  content: string
  username?: string
  echo_files?: Ech0EchoFile[]
  layout?: string
  private?: boolean
  user_id?: string
  extension?: Ech0Extension | null
  tags?: Ech0Tag[]
  reactions?: Ech0Reaction[]
  created_at: number
}

export interface Ech0PageResult {
  total: number
  items: Ech0Echo[]
}

export interface Ech0Comment {
  id: string
  echo_id: string
  parent_id?: string | null
  nickname: string
  email?: string
  website?: string
  content: string
  status: 'pending' | 'approved' | 'rejected'
  hot?: boolean
  source?: string
  created_at: number
  updated_at?: number
}

export interface Ech0FormMeta {
  form_token: string
  min_submit_ms: number
  captcha_enabled: boolean
  captcha_api_endpoint: string
  enable_comment: boolean
}

export interface Ech0CreateCommentDto {
  echo_id: string
  parent_id?: string
  nickname: string
  email: string
  website: string
  content: string
  hp_field: string
  form_token: string
  captcha_token: string
}

interface Ech0Envelope<T> {
  code: number
  msg: string
  data: T
}

const VISITOR_KEY = 'ech0-visitor'

/** 访客身份：客户端生成 UUID 持久化，服务端按 X-Ech0-Visitor 识别，缺失时退回 IP 哈希 */
export function getEch0VisitorId(): string {
  if (import.meta.server) return ''
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

async function ech0Fetch<T>(apiBase: string, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (import.meta.client) headers.set('X-Ech0-Visitor', getEch0VisitorId())
  const res = await fetch(`${apiBase}/api${path}`, { ...init, headers })
  const json = (await res.json()) as Ech0Envelope<T>
  if (json.code !== 1) throw new Error(json.msg || `Ech0 API ${path} 失败`)
  return json.data
}

/** 分页列表（pageSize 为 camelCase，服务端默认 10） */
export function fetchEch0Page(apiBase: string, page: number, pageSize: number): Promise<Ech0PageResult> {
  return ech0Fetch<Ech0PageResult>(apiBase, '/echo/page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page, pageSize }),
  })
}

/** 全量拉取：标签筛选时一次性取回再本地分页 */
export async function fetchEch0All(apiBase: string): Promise<Ech0Echo[]> {
  const out: Ech0Echo[] = []
  const pageSize = 50
  for (let page = 1; ; page++) {
    const res = await fetchEch0Page(apiBase, page, pageSize)
    out.push(...res.items)
    if (out.length >= res.total || res.items.length === 0) break
  }
  return out
}

export async function setEch0Reaction(
  apiBase: string,
  echoId: string,
  key: string,
  add: boolean,
): Promise<Ech0Reaction[]> {
  return ech0Fetch<Ech0Reaction[]>(
    apiBase,
    `/echo/${echoId}/reactions/${encodeURIComponent(key)}`,
    { method: add ? 'PUT' : 'DELETE' },
  )
}

export function fetchEch0ReactionCatalog(apiBase: string): Promise<Array<{ key: string; emoji: string }>> {
  return ech0Fetch<Array<{ key: string; emoji: string }>>(apiBase, '/reactions', { method: 'GET' })
}

export function fetchEch0Comments(apiBase: string, echoId: string): Promise<Ech0Comment[]> {
  return ech0Fetch<Ech0Comment[]>(apiBase, `/comments?echo_id=${encodeURIComponent(echoId)}`, {
    method: 'GET',
  })
}

export function fetchEch0CommentForm(apiBase: string): Promise<Ech0FormMeta> {
  return ech0Fetch<Ech0FormMeta>(apiBase, '/comments/form', { method: 'GET' })
}

export function createEch0Comment(apiBase: string, dto: Ech0CreateCommentDto): Promise<{ id: string; status: string }> {
  return ech0Fetch<{ id: string; status: string }>(apiBase, '/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
}

/** 说说附件里的图片（按 sort_order 排） */
export function ech0Images(echo: Ech0Echo): Ech0FileInfo[] {
  return (echo.echo_files ?? [])
    .map((f) => ({ file: f.file, order: f.sort_order ?? 0 }))
    .filter((x): x is { file: Ech0FileInfo; order: number } => !!x.file?.url)
    .sort((a, b) => a.order - b.order)
    .map((x) => x.file)
}

/** 相对时间：1 小时内按分钟、48 小时内按小时、30 天内按天，其余回退到本地日期 */
export function formatEch0Time(
  unixSeconds: number,
  i18n: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string },
): string {
  const diffMs = Date.now() - unixSeconds * 1000
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return i18n.justNow
  if (minutes < 60) return i18n.minutesAgo.replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return i18n.hoursAgo.replace('{n}', String(hours))
  const days = Math.floor(hours / 24)
  if (days <= 30) return i18n.daysAgo.replace('{n}', String(days))
  return new Date(unixSeconds * 1000).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
