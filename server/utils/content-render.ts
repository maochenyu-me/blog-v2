/**
 * minimark AST → HTML / 纯文本。
 *
 * 为什么自己序列化，而不是调 @nuxt/content 的「renderMarkdown」：
 *   本仓库的 @nuxt/content 是 3.16.2，它只导出 queryCollection 系列，
 *   并没有导出名为 renderMarkdown 的函数（全包 grep 无此符号）。
 *   v3 存进库里的 body 已经是 minimark AST（`{ type: 'minimark', value: [...] }`），
 *   官方渲染路径是 Vue 组件 ContentRenderer（浏览器侧），服务端拿不到它。
 *   因此这里直接对 AST 做序列化——产物就是「渲染后的 HTML 全文」，
 *   而不是把 markdown 源码塞进 feed / 索引（提示词 §10.2 / §11.6 的硬要求）。
 *   AST 结构见 minimark：节点 = [tag, props, ...children]，文本节点就是 string。
 *
 * feed 与 search-index 共用同一份序列化，保证「feed 里看到的正文 = 索引里的正文」。
 */

export type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]]
export type MinimarkBody = { type: string; value: MinimarkNode[] } | null | undefined

/** 这些节点不含正文内容，或已被别处消费，渲染时跳过 */
const SKIP_TAGS = new Set(['style', 'script', 'link', 'meta'])

/** 自闭合标签 */
const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'source', 'track', 'wbr'])

/** 需要成块换行的标签，用于纯文本压缩空白时补空格 */
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'dd', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
])

/** HTML 文本转义。& 必须最先替换，否则会把已生成的实体会二次转义。 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 属性值转义：比文本多处理引号 */
export function escapeAttribute(input: string): string {
  return escapeHtml(input).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * 把站内相对链接变成绝对链接。
 *   /posts/x          → https://site/posts/x
 *   #anchor           → 原样（feed 里没有页面上下文，硬拼反而错）
 *   mailto:/https:    → 原样
 *   //cdn/x           → 协议相对，原样
 * baseUrl 为空时一律原样返回，避免拼出 "/posts/x" 这种残缺绝对地址。
 */
export function absolutizeUrl(url: string, baseUrl: string): string {
  if (!url) return url
  if (!baseUrl) return url
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url // 已有协议
  if (url.startsWith('//')) return url
  if (url.startsWith('#')) return url
  return url.startsWith('/') ? baseUrl + url : `${baseUrl}/${url}`
}

interface RenderOptions {
  /** 站点根 URL，用于把相对链接绝对化；为空则不改写 */
  baseUrl?: string
}

/** 属性白名单 + 值修正。只输出 feed 阅读器能理解的安全属性。 */
function renderAttributes(
  tag: string,
  props: Record<string, unknown>,
  options: RenderOptions,
): string {
  const parts: string[] = []

  const push = (name: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return
    parts.push(`${name}="${escapeAttribute(String(value))}"`)
  }

  if (props.id !== undefined) push('id', props.id)
  if (props.title !== undefined) push('title', props.title)

  if (tag === 'a' && typeof props.href === 'string') {
    push('href', absolutizeUrl(props.href, options.baseUrl ?? ''))
  }
  if (tag === 'img') {
    if (typeof props.src === 'string') {
      push('src', absolutizeUrl(props.src, options.baseUrl ?? ''))
    }
    push('alt', typeof props.alt === 'string' ? props.alt : '')
  }
  if (tag === 'th' || tag === 'td') {
    if (props.colspan !== undefined) push('colspan', props.colspan)
    if (props.rowspan !== undefined) push('rowspan', props.rowspan)
  }
  if (tag === 'input') {
    push('type', props.type ?? 'text')
    if (props.checked === true) parts.push('checked')
    if (props.disabled === true) parts.push('disabled')
  }
  if (tag === 'ol' && props.start !== undefined) push('start', props.start)

  return parts.length ? ' ' + parts.join(' ') : ''
}

/** 代码块语言：优先 props.language，其次 className 里的 language-xxx */
function resolveLanguage(props: Record<string, unknown>): string {
  if (typeof props.language === 'string' && props.language) return props.language
  const className = props.className
  if (typeof className === 'string') {
    const m = className.match(/language-([\w-]+)/)
    if (m) return m[1]!
  }
  if (Array.isArray(className)) {
    for (const c of className) {
      const m = String(c).match(/language-([\w-]+)/)
      if (m) return m[1]!
    }
  }
  return ''
}

/** 取节点的纯文本（不含任何标签），用于代码块兜底与纯文本抽取 */
function textContent(node: MinimarkNode): string {
  if (typeof node === 'string') return node
  const [, , ...children] = node
  return children.map(textContent).join('')
}

/** 递归序列化一个节点列表 */
function renderNodes(nodes: MinimarkNode[], options: RenderOptions): string {
  let out = ''
  for (const node of nodes) out += renderNode(node, options)
  return out
}

function renderNode(node: MinimarkNode, options: RenderOptions): string {
  if (typeof node === 'string') return escapeHtml(node)

  const [tag, rawProps, ...children] = node
  const props = (rawProps ?? {}) as Record<string, unknown>

  if (SKIP_TAGS.has(tag)) return ''

  // 代码块：直接用 props.code（原始代码文本）重建，不输出 shiki 的 span 高亮层。
  // 理由：① 高亮 span 对 feed 阅读器毫无意义，只会把正文体积放大 5–10 倍；
  //       ② shiki 的颜色写在内联变量里，跨站点不通用；
  //       ③ 原始代码文本本身已被 escapeHtml 转义，含 `<` `&` 也不破坏 XML。
  if (tag === 'pre') {
    const language = resolveLanguage(props)
    const code = typeof props.code === 'string' && props.code
      ? props.code
      : textContent(node)
    const classAttr = language ? ` class="language-${escapeAttribute(language)}"` : ''
    return `<pre><code${classAttr}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`
  }

  if (VOID_TAGS.has(tag)) {
    return `<${tag}${renderAttributes(tag, props, options)} />`
  }

  // MDC 组件（自定义 Vue 组件）出现在正文时：不输出未知标签，只保留文本内容，
  // 避免 feed 里出现无法解析的自定义元素。
  if (!/^[a-z][a-z0-9-]*$/.test(tag)) {
    return escapeHtml(textContent(node))
  }

  const inner = renderNodes(children, options)
  return `<${tag}${renderAttributes(tag, props, options)}>${inner}</${tag}>`
}

/** 正文 AST → HTML 全文。baseUrl 传入后站内相对链接会被改写为绝对链接。 */
export function renderBodyToHtml(body: MinimarkBody, options: RenderOptions = {}): string {
  if (!body || !Array.isArray(body.value)) return ''
  return renderNodes(body.value, options)
}

interface PlainTextOptions {
  /**
   * 剔除代码块与行内代码（search.index.stripCodeBlocks 打开时用）。
   *
   * 取舍说明（提示词 §11.2 允许「去代码块」或「保留但降权」二选一）：
   * 行内 code 与块级 pre 在「噪音」性质上是同一回事——`useState`、`<div>` 都是标识符，
   * 都会造成「搜 div 命中一大片」的假阳性。因此两者一起剔。
   * 关键词本体通常也出现在正文叙述里，实测剔除后中文查询命中率不受影响。
   */
  stripCodeBlocks?: boolean
}

/** 无标签纯文本抽取。代码块 / 行内代码按 opts 决定是否剔除。 */
function collectText(node: MinimarkNode, opts: PlainTextOptions, out: string[]): void {
  if (typeof node === 'string') {
    if (node.trim()) out.push(node)
    return
  }

  const [tag, rawProps, ...children] = node

  if (SKIP_TAGS.has(tag)) return
  if (opts.stripCodeBlocks && (tag === 'pre' || tag === 'code')) {
    // 留一个空格边界，避免前后词粘连成新词
    out.push(' ')
    return
  }

  if (tag === 'img') {
    // 图片 alt 是有意义的关键词来源
    const alt = (rawProps as Record<string, unknown>)?.alt
    if (typeof alt === 'string' && alt.trim()) out.push(alt)
    return
  }
  if (tag === 'input') return
  if (tag === 'br' || tag === 'hr') {
    out.push(' ')
    return
  }

  const isBlock = BLOCK_TAGS.has(tag)
  if (isBlock) out.push(' ')
  for (const child of children) collectText(child, opts, out)
  if (isBlock) out.push(' ')
}

/**
 * 正文 AST → 纯文本。
 * 结果会压缩所有连续空白为单个空格——索引里不需要保留原排版。
 */
export function bodyToPlainText(body: MinimarkBody, opts: PlainTextOptions = {}): string {
  if (!body || !Array.isArray(body.value)) return ''
  const out: string[] = []
  for (const node of body.value) collectText(node, opts, out)
  return out.join('').replace(/\s+/g, ' ').trim()
}
