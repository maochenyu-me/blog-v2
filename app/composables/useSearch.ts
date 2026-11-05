/**
 * 站内搜索（提示词 §11）。
 *
 * 结构：
 *   - 索引懒加载：首次打开搜索才 fetch，缓存进 useState，会话内不二次请求（§11.5）
 *   - MiniSearch 纯前端检索，构建期索引由 server/routes/api/search-index.json.get.ts 产出
 *   - 中文分词：自定义 tokenizer，CJK 走 bigram + 单字兜底，英文保持整词（§11.4 硬要求）
 *   - 历史 / 快捷键 / 命中片段全部读取 blog.config.ts，禁止硬编码（§11.6）
 *
 * 为什么 tokenizer 分「建索引用」和「查询用」两套：
 *   建索引时 CJK 同时写 bigram 和单字——bigram 保证词组精度，单字给单字查询兜底。
 *   查询时多字 CJK 只发 bigram：若把单字也发出去，搜「分词」会连带命中所有含「分」
 *   或「词」的文章，噪音压过精度。单字查询才发单字。
 *   这就是 §11.4 说的「bigram 切分 + 单字兜底」。
 */

/** CJK 字符范围：汉字（含扩展 A/兼容）、假名、谚文 */
const CJK_RANGE = '\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af'
const CJK_RUN_RE = new RegExp(`[${CJK_RANGE}]+`, 'g')
const CJK_CHAR_RE = new RegExp(`^[${CJK_RANGE}]$`)
/** 中英混排的切分单元：CJK 连续段 或 拉丁词 */
const SEGMENT_RE = new RegExp(`([${CJK_RANGE}]+)|([a-z0-9][a-z0-9_'-]*)`, 'gi')

export interface SearchDoc {
  id: string
  title: string
  description: string
  tags: string[]
  category: string
  text: string
  path: string
  date: string
}

export interface SnippetSegment {
  text: string
  mark: boolean
}

export interface SearchHit {
  doc: SearchDoc
  /** 命中片段（含高亮分段）；search.hit.enabled 关闭时为空数组 */
  segments: SnippetSegment[]
  score: number
}

/** 建索引用 tokenizer：CJK 出 bigram + 单字，拉丁出整词 */
export function tokenizeForIndex(text: string): string[] {
  const tokens: string[] = []
  if (!text) return tokens

  for (const m of text.matchAll(SEGMENT_RE)) {
    const cjkRun = m[1]
    if (cjkRun) {
      if (cjkRun.length === 1) {
        tokens.push(cjkRun)
      } else {
        // bigram 保证词组精度
        for (let i = 0; i + 1 < cjkRun.length; i += 1) tokens.push(cjkRun.slice(i, i + 2))
        // 单字保证单字查询能命中
        for (const ch of cjkRun) tokens.push(ch)
      }
      continue
    }
    const latin = m[2]
    if (latin) tokens.push(latin.toLowerCase())
  }

  return tokens
}

/** 查询用 tokenizer：多字 CJK 只出 bigram，单字才出单字；拉丁出整词 */
export function tokenizeForQuery(text: string): string[] {
  const tokens: string[] = []
  if (!text) return tokens

  for (const m of text.matchAll(SEGMENT_RE)) {
    const cjkRun = m[1]
    if (cjkRun) {
      if (cjkRun.length === 1) {
        tokens.push(cjkRun)
      } else {
        for (let i = 0; i + 1 < cjkRun.length; i += 1) tokens.push(cjkRun.slice(i, i + 2))
      }
      continue
    }
    const latin = m[2]
    if (latin) tokens.push(latin.toLowerCase())
  }

  return tokens
}

/** 从原文里抠出用于高亮的「关键词」：CJK 整段优先，拉丁整词 */
function extractNeedles(query: string): string[] {
  const needles: string[] = []
  for (const m of query.matchAll(SEGMENT_RE)) {
    const raw = m[1] ?? m[2]
    if (!raw) continue
    needles.push(m[1] ? raw : raw.toLowerCase())
  }
  return [...new Set(needles)].filter(Boolean).sort((a, b) => b.length - a.length)
}

/**
 * 高亮关键词的备用展开。
 *
 * 问题：检索按 bigram 走，「中文分词」能命中含「中文」和「分词」的文章，
 * 但正文里未必出现连写的「中文分词」四个字——此时整词 needle 找不到位置，
 * 结果就是「搜到了却没高亮」。
 * 解决：整词在正文里一个都找不到时，退回到 bigram 去找位置。
 */
function expandNeedlesFor(text: string, needles: string[]): string[] {
  if (!text) return needles

  const hasHit = needles.some((n) => text.toLowerCase().includes(n.toLowerCase()))
  if (hasHit) return needles

  const expanded: string[] = []
  for (const needle of needles) {
    // CJK 且长度 ≥ 2：拆成 bigram
    if (needle.length >= 2 && CJK_CHAR_RE.test(needle[0]!)) {
      for (let i = 0; i + 1 < needle.length; i += 1) expanded.push(needle.slice(i, i + 2))
    } else {
      expanded.push(needle)
    }
  }
  return [...new Set(expanded)].filter(Boolean).sort((a, b) => b.length - a.length)
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 用关键词构造高亮正则（大小写不敏感） */
function buildHighlightRegex(needles: string[]): RegExp | null {
  if (!needles.length) return null
  return new RegExp(needles.map(escapeRegExp).join('|'), 'gi')
}

/** 把一段文本按关键词切成「普通段 / 命中段」 */
function splitByNeedles(text: string, needles: string[]): SnippetSegment[] {
  const re = buildHighlightRegex(needles)
  if (!re) return text ? [{ text, mark: false }] : []

  const segments: SnippetSegment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const index = m.index ?? 0
    if (index > last) segments.push({ text: text.slice(last, index), mark: false })
    segments.push({ text: m[0], mark: true })
    last = index + m[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last), mark: false })
  return segments
}

/**
 * 生成命中片段：以第一个命中位置为中心，取 snippetLength 字符的窗口。
 * 正文里没命中时（例如只命中标题）退化为正文开头，保证每条结果都有上下文。
 */
function buildSnippet(text: string, needles: string[], length: number): SnippetSegment[] {
  const source = text || ''
  if (!source) return []

  // 整词找不到位置时退回 bigram（见 expandNeedlesFor 注释）
  const effective = expandNeedlesFor(source, needles)
  const re = buildHighlightRegex(effective)
  const match = re ? re.exec(source) : null

  if (!match) {
    const head = source.slice(0, length)
    const segments = splitByNeedles(head, effective)
    if (source.length > length) segments.push({ text: '…', mark: false })
    return segments
  }

  const hitStart = match.index
  const hitLength = match[0].length
  // 命中居中，两头各留一半
  const start = Math.max(0, hitStart - Math.floor((length - hitLength) / 2))
  const end = Math.min(source.length, start + length)

  const segments = splitByNeedles(source.slice(start, end), effective)
  if (start > 0) segments.unshift({ text: '…', mark: false })
  if (end < source.length) segments.push({ text: '…', mark: false })
  return segments
}

/** 把 'mod+k' / 'ctrl+shift+p' 解析成 { key, mod, shift, alt } */
interface ShortcutSpec {
  key: string
  mod: boolean
  ctrl: boolean
  meta: boolean
  shift: boolean
  alt: boolean
}

function parseShortcut(shortcut: string): ShortcutSpec {
  const parts = (shortcut || 'mod+k').toLowerCase().split('+').map((p) => p.trim())
  const spec: ShortcutSpec = { key: '', mod: false, ctrl: false, meta: false, shift: false, alt: false }

  for (const part of parts) {
    if (part === 'mod' || part === 'cmdorctrl') spec.mod = true
    else if (part === 'ctrl' || part === 'control') spec.ctrl = true
    else if (part === 'meta' || part === 'cmd' || part === 'command') spec.meta = true
    else if (part === 'shift') spec.shift = true
    else if (part === 'alt' || part === 'option') spec.alt = true
    else if (part) spec.key = part
  }

  return spec
}

function isMac(): boolean {
  if (!import.meta.client) return false
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
}

/**
 * 与 formatShortcut 相同的格式，但强制按非 Mac 处理。
 * 仅用于 SSR 与首次客户端渲染，保证两端文本一致，避免 hydration 失配。
 */
export function formatShortcutStatic(shortcut: string): string {
  const spec = parseShortcut(shortcut)
  const parts: string[] = []
  if (spec.mod) parts.push('Ctrl')
  if (spec.ctrl && !spec.mod) parts.push('Ctrl')
  if (spec.meta && !spec.mod) parts.push('Meta')
  if (spec.shift) parts.push('Shift')
  if (spec.alt) parts.push('Alt')
  parts.push(spec.key.toUpperCase())
  return parts.join('+')
}

/** 快捷键在 UI 上的展示文案：⌘K / Ctrl K */
export function formatShortcut(shortcut: string): string {
  const spec = parseShortcut(shortcut)
  const parts: string[] = []
  if (spec.mod) parts.push(isMac() ? '⌘' : 'Ctrl')
  if (spec.ctrl && !spec.mod) parts.push('Ctrl')
  if (spec.meta && !spec.mod) parts.push(isMac() ? '⌘' : 'Meta')
  if (spec.shift) parts.push(isMac() ? '⇧' : 'Shift')
  if (spec.alt) parts.push(isMac() ? '⌥' : 'Alt')
  parts.push(spec.key.toUpperCase())
  return parts.join(isMac() ? '' : '+')
}

function matchesShortcut(event: KeyboardEvent, spec: ShortcutSpec): boolean {
  if (event.key.toLowerCase() !== spec.key) return false

  const needsCtrl = spec.ctrl || (spec.mod && !isMac())
  const needsMeta = spec.meta || (spec.mod && isMac())

  if (needsCtrl !== event.ctrlKey) return false
  if (needsMeta !== event.metaKey) return false
  if (spec.shift !== event.shiftKey) return false
  if (spec.alt !== event.altKey) return false

  return true
}

const HISTORY_KEY = 'search-history'
const HISTORY_LIMIT = 5
/** 空态展示的条数（提示词 §11.3：最近 3 条） */
const HISTORY_VISIBLE = 3

/**
 * 引擎实例与加载中的 Promise 放在模块作用域：
 * MiniSearch 实例不可序列化，放进 useState 会污染 SSR payload；
 * 而它本来就只在客户端存在（懒加载后才创建），模块级缓存正好是「会话内复用」。
 */
let searchEngine: any = null
let engineDocs: SearchDoc[] = []
let loadPromise: Promise<void> | null = null

/** 与 app/composables/useBlogConfig.ts 的 SearchConfig 保持结构一致（本地声明，避免依赖 auto-import 顺序） */
type SearchConfig = {
  enabled?: boolean
  shortcut?: string
  debounceMs?: number
  maxResults?: number
  history?: boolean
  includeDrafts?: boolean
  boost?: { title: number; description: number; tags: number; category: number; text: number }
  hit?: { enabled: boolean; snippetLength: number }
  index: { path: string; stripCodeBlocks: boolean }
}

/**
 * 读取 search 配置。
 *
 * 说明：`app/composables/useBlogConfig.ts` 里的 useBlogConfig() 目前**不会被 auto-import 注册**，
 * 该名字被 nuxt-site-config（@nuxtjs/seo 的依赖）占用（见 .nuxt/types/imports.d.ts）。
 * 调 useBlogConfig() 拿到的是 nuxt-site-config 的扁平对象，没有 `.search` 字段。
 *
 * 这里是本文件内的防御式取值：优先用 app 自己的 useBlogConfig()（一旦 Lead 修好命名冲突
 * 就自动恢复），拿不到时直接读 useAppConfig().search —— 与 blog.config.ts 同源，
 * 保证「搜索永远不被别人的命名冲突拖垮」。
 */
function resolveSearchConfig(): SearchConfig {
  const appConfig = useAppConfig() as any
  const fromAppConfig = appConfig?.search as SearchConfig | undefined

  // app 自己的 composable 若生效，会返回 { site, feed, search }；坏掉时返回 undefined 的 search
  const viaComposable = (useBlogConfig as any)?.()?.search as SearchConfig | undefined

  return viaComposable ?? fromAppConfig ?? ({ index: { path: '/api/search-index.json', stripCodeBlocks: true } } as SearchConfig)
}

export function useSearch() {
  const searchConfig = resolveSearchConfig()

  // 防御式默认值：search 配置缺失时，也要保证 UI 不崩（面板照样能用）
  const cfg = {
    enabled: searchConfig.enabled !== false,
    shortcut: searchConfig.shortcut || 'mod+k',
    debounceMs: Number(searchConfig.debounceMs) >= 0 ? Number(searchConfig.debounceMs) : 200,
    maxResults: Number(searchConfig.maxResults) > 0 ? Number(searchConfig.maxResults) : 20,
    history: searchConfig.history !== false,
    includeDrafts: searchConfig.includeDrafts === true,
    boost: searchConfig.boost ?? { title: 8, description: 4, tags: 3, category: 2, text: 1 },
    hit: searchConfig.hit ?? { enabled: true, snippetLength: 60 },
    index: searchConfig.index ?? { path: '/api/search-index.json', stripCodeBlocks: true },
  }

  const isOpen = useState<boolean>('search-open', () => false)
  const docs = useState<SearchDoc[] | null>('search-docs', () => null)

  /** 索引加载中 */
  const isLoading = useState<boolean>('search-loading', () => false)
  const loadError = useState<string | null>('search-error', () => null)

  /**
   * 历史必须用 useState 而不是 ref：
   * useSearch() 会在 SearchDialog / SearchTrigger / MobileTabBar 三处各调一次，
   * 用 ref 会得到三份互不相通的副本，弹窗清了历史、入口还显示旧的。
   */
  const historyState = useState<string[]>('search-history', () => [])
  const history = historyState

  const enabled = computed(() => cfg.enabled !== false)

  /** 读取历史（仅客户端） */
  function readHistory(): string[] {
    if (!import.meta.client || !cfg.history) return []
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  function writeHistory(next: string[]) {
    if (!import.meta.client || !cfg.history) return
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, HISTORY_LIMIT)))
    } catch {
      // 隐私模式 / 配额满：历史只是一个便利功能，失败不该影响搜索
    }
  }

  /** 记录一次搜索（选中的查询词） */
  function recordHistory(query: string) {
    const q = query.trim()
    if (!cfg.history || !q) return
    const next = [q, ...history.value.filter((h) => h !== q)].slice(0, HISTORY_LIMIT)
    history.value = next
    writeHistory(next)
  }

  function clearHistory() {
    history.value = []
    if (import.meta.client) {
      try {
        localStorage.removeItem(HISTORY_KEY)
      } catch {
        /* 同上 */
      }
    }
  }

  /** 首次调用时拉索引并建引擎；并发调用共用同一个 Promise */
  async function ensureIndex(): Promise<void> {
    if (searchEngine) return
    if (loadPromise) return loadPromise

    isLoading.value = true
    loadError.value = null

    loadPromise = (async () => {
      try {
        const { default: MiniSearch } = await import('minisearch')

        // $fetch 在 SSG 下就是静态文件读取；这里只在客户端触发
        const fetched = await $fetch<SearchDoc[]>(cfg.index.path)

        engineDocs = Array.isArray(fetched) ? fetched : []
        docs.value = engineDocs

        searchEngine = new MiniSearch({
          idField: 'id',
          fields: ['title', 'description', 'tags', 'category', 'text'],
          storeFields: ['title', 'description', 'tags', 'category', 'text', 'path', 'date', 'id'],
          // tags 是数组，MiniSearch 只认字符串，这里拼成空格分隔的检索面
          extractField: (document: SearchDoc, fieldName: string) => {
            if (fieldName === 'tags') return (document.tags ?? []).join(' ')
            return (document as any)[fieldName] ?? ''
          },
          tokenize: tokenizeForIndex,
          // 统一小写；保留数字和连字符，避免 'view-transitions' 被拆散。
          // fieldName 声明为可选：MiniSearch 的类型是 (term, fieldName?) => ...，
          // 写成必填会与索引期签名不兼容。
          processTerm: (term: string, _fieldName?: string) => {
            const lower = term.toLowerCase()
            return lower.length >= 1 ? lower : null
          },
        })

        searchEngine.addAll(engineDocs)
      } catch (error) {
        loadError.value = error instanceof Error ? error.message : String(error)
        loadPromise = null
        throw error
      } finally {
        isLoading.value = false
      }
    })()

    return loadPromise
  }

  /**
   * 执行检索。
   * 返回按分数降序、最多 search.maxResults 条的结果。
   */
  function run(query: string): SearchHit[] {
    const q = query.trim()
    if (!searchEngine || !q) return []

    const needles = extractNeedles(q)
    const boost = cfg.boost ?? { title: 8, description: 4, tags: 3, category: 2, text: 1 }

    const raw = searchEngine.search(q, {
      tokenize: tokenizeForQuery,
      // 各字段权重来自 blog.config.ts，不写死
      boost: {
        title: boost.title,
        description: boost.description,
        tags: boost.tags,
        category: boost.category,
        text: boost.text,
      },
      // 前缀匹配：英文输入到一半也能命中；CJK bigram 上等于恒等，无害
      prefix: true,
      // 模糊匹配只给拉丁词，CJK 上开模糊会拖进大量同音近形噪音
      fuzzy: (term: string) => (/^[a-z0-9]/.test(term) ? 0.2 : false),
      // OR 组合：命中词越多排名越前，比 AND 适合「一句话丢进来」的场景
      combineWith: 'OR',
    }) as Array<Record<string, any>>

    const hitConfig = cfg.hit ?? { enabled: true, snippetLength: 60 }
    const limit = Number(cfg.maxResults) > 0 ? Number(cfg.maxResults) : 20

    return raw.slice(0, limit).map((result) => {
      const text = String(result.text ?? '')
      const doc: SearchDoc = {
        id: String(result.id ?? ''),
        title: String(result.title ?? ''),
        description: String(result.description ?? ''),
        tags: Array.isArray(result.tags) ? result.tags : [],
        category: String(result.category ?? ''),
        text,
        path: String(result.path ?? ''),
        date: String(result.date ?? ''),
      }

      return {
        doc,
        // 命中片段优先取正文；正文没命中（只命中标题/标签）时用 description 兜底
        segments: hitConfig.enabled
          ? buildSnippet(text || doc.description, needles, Number(hitConfig.snippetLength) || 60)
          : [],
        score: Number(result.score ?? 0),
      }
    })
  }

  /** 打开 / 关闭。打开时顺带触发懒加载与历史读取 */
  function open() {
    if (!enabled.value) return
    isOpen.value = true
    history.value = readHistory()
    void ensureIndex().catch(() => {
      // 错误已写进 loadError，UI 会显示；此处吞掉避免 unhandled rejection
    })
  }

  function close() {
    isOpen.value = false
  }

  /** 预加载：鼠标悬停触发按钮时提前拉索引，让点击后几乎无等待 */
  function prefetch() {
    if (!enabled.value || searchEngine || loadPromise) return
    void ensureIndex().catch(() => {})
  }

  /**
   * 绑定全局快捷键。
   * 必须在 onMounted 里调用，返回卸载函数。
   * search.enabled === false 时不绑定（§11.6）。
   */
  function bindShortcut(): () => void {
    if (!import.meta.client || !enabled.value) return () => {}

    const spec = parseShortcut(cfg.shortcut || 'mod+k')

    const onKeydown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, spec)) {
        event.preventDefault()
        if (isOpen.value) close()
        else open()
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }

  /**
   * 快捷键展示文案。
   *
   * ⚠ hydration 陷阱：平台判断只能在客户端做，服务端统一走非 Mac 分支。
   * 如果直接 computed，SSR 渲染出 "Ctrl+K"、客户端渲染出 "⌘K"，
   * 文本节点不一致会触发 "Hydration completed but contains mismatches"。
   * 所以先用 isHydrated 守住：SSR 与首次客户端渲染都输出同一个占位值，
   * mount 之后再切换成真实平台文案。
   */
  const isHydrated = useState('search-hydrated', () => false)
  const shortcutLabel = computed(() =>
    isHydrated.value ? formatShortcut(cfg.shortcut || 'mod+k') : formatShortcutStatic(cfg.shortcut || 'mod+k'),
  )

  if (import.meta.client) {
    onMounted(() => {
      isHydrated.value = true
    })
  }

  return {
    enabled,
    config: cfg,
    isOpen,
    docs,
    isLoading: readonly(isLoading),
    loadError: readonly(loadError),
    history: readonly(history),
    historyVisible: HISTORY_VISIBLE,
    shortcutLabel,
    open,
    close,
    prefetch,
    ensureIndex,
    run,
    recordHistory,
    clearHistory,
    bindShortcut,
    /** 供测试与调试：当前索引里的文档数 */
    indexedCount: () => engineDocs.length,
  }
}
