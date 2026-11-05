/**
 * Vue 水合会把内联 <style> 的文本按 CSS 规则重新序列化，
 * 在逗号后补一个空格（",html" → ", html"）。
 * SSR 与客户端文本因此不等 → hydration mismatch。
 *
 * 修法：在正文渲染之前，把 AST 里所有 <style> 文本的逗号后补上空格，
 * 让服务端输出与 Vue 序列化结果逐字一致。样式语义完全不变。
 */

/** 只在选择器分隔处补空格，不碰 { } 内部的值 */
function normalize(css: string): string {
  // 逐条规则处理：先按 } 切开，仅对 "selector{...}" 的选择器部分补空格
  return css
    .split('}')
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const brace = chunk.indexOf('{')
      if (brace === -1) return chunk
      const sel = chunk.slice(0, brace).replace(/,(?!\s)/g, ', ')
      const bodyRest = chunk.slice(brace)
      return sel + bodyRest
    })
    .join('}')
    .concat('}')
}

function walk(node: any): void {
  if (!node) return

  // HAST：{ type:'element', tagName, children }
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    if (node.type === 'element' && node.tagName === 'style' && Array.isArray(node.children)) {
      for (const c of node.children) {
        if (c && c.type === 'text' && typeof c.value === 'string') {
          c.value = normalize(c.value)
        }
      }
    }
    const kids = node.children
    if (Array.isArray(kids)) for (const c of kids) walk(c)
    return
  }

  // minimark：[tag, props, ...children]
  if (Array.isArray(node)) {
    const tag = node[0]
    if (typeof tag === 'string') {
      if (tag === 'style') {
        for (let i = 2; i < node.length; i++) {
          const c = node[i]
          if (typeof c === 'string') node[i] = normalize(c)
          else if (Array.isArray(c) && typeof c[2] === 'string') c[2] = normalize(c[2])
        }
        return
      }
      for (let i = 2; i < node.length; i++) walk(node[i])
      return
    }
    for (const c of node) walk(c)
  }
}

function clone(n: any): any {
  if (Array.isArray(n)) return n.map(clone)
  if (n && typeof n === 'object') {
    const out: any = {}
    for (const k of Object.keys(n)) out[k] = clone(n[k])
    return out
  }
  return n
}

/**
 * 在页面 setup 里调用：
 *   const body = useNormalizedBody(post.value?.body)
 *   <ContentRenderer :value="{ ...post, body }" />
 */
export function useNormalizedBody(rawBody: any) {
  if (!rawBody) return rawBody
  const copy = clone(rawBody)
  walk(copy)
  return copy
}
