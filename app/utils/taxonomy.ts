/**
 * 分类 / 标签的 URL slug。
 *
 * 为什么要有 slug：标签与分类名是用户写的中文或英文混写（「工程」「CSS」「MiniSearch」），
 * 直接当 URL 段会带来两个真实问题：
 *   1. `/tags/CSS` 与 `/tags/css` 是两份不同页面，同一标签被搜索引擎收录两次；
 *   2. Git 与部分静态主机对大小写敏感，同一链接在不同环境指向不同产物。
 *
 * 转换规则：小写化 + 空白转连字符 + 去掉除 CJK/字母/数字/连字符外的字符。
 * 中文与英文都保留可读性，不引入拼音依赖：
 *   'CSS'        -> 'css'
 *   '工程'        -> '工程'
 *   'MiniSearch' -> 'minisearch'
 *   'View Transitions' -> 'view-transitions'
 */
export function toSlug(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 把 URL 段还原成原始名称。
 *
 * slug 是单向转换（去掉了标点），无法反推原名，
 * 所以真实解析必须拿 slug 去和已知名称列表比对，而不是直接 decode。
 * 这里只处理 URL 解码这一步。
 */
export function fromSlugParam(param: string): string {
  try {
    return decodeURIComponent(param)
  }
  catch {
    return param
  }
}
