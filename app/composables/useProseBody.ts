/**
 * 把正文 AST 里的 <style> 节点搬到 <head>。
 *
 * 为什么必须搬：
 * Shiki 的高亮器会把配色 CSS 以 `<style>` 形式追加到正文 HAST 根节点末尾
 * （@nuxtjs/mdc/dist/runtime/highlighter/rehype.js:47）。
 * 这个节点的文本在两侧不是同一份字面量：
 *   - 服务端输出的 HTML 经过构建期 CSS 压缩，逗号与冒号后的空格被吃掉
 *     → `html .default .shiki span{color:var(--shiki-default)}`
 *   - 客户端水合用的是 _payload.json 里的原始文本，空格完好
 *     → `html .default .shiki span {color: var(--shiki-default)}`
 * Vue 水合按文本节点逐字比对，两者不可能相等，于是每篇含代码块的文章
 * 都会打印 `Hydration completed but contains mismatches.`。
 *
 * 之前的做法是给逗号补空格让两端对齐，但压缩器同时也会吃掉 `{` 与 `:` 前的空格，
 * 靠补空格的补丁永远是打地鼠，且依赖压缩器实现细节。
 *
 * 现在的做法：把 <style> 从正文 AST 中整个摘掉（服务端与客户端摘的是同一份数据，
 * 结果必然一致），收集到的 CSS 通过 useHead 注入 <head>。
 * <head> 由 unhead 管理，不参与 Vue 的文本节点比对，因此不会再触发失配。
 * 选择器是 `html .shiki span` 这类全局选择器，放在 head 里语义完全不变。
 */

/** 从 minimark / HAST 节点里取出 <style> 的文本内容 */
function styleText(node: any): string {
  if (Array.isArray(node)) {
    // minimark 节点：['style', props, ...children]
    return node
      .slice(2)
      .map((child) => {
        if (typeof child === 'string') return child
        if (Array.isArray(child) && typeof child[2] === 'string') return child[2]
        return ''
      })
      .join('')
  }
  if (node && Array.isArray(node.children)) {
    // HAST 节点：{ type: 'element', tagName: 'style', children: [{ type: 'text', value }] }
    return node.children.map((child: any) => child?.value ?? '').join('')
  }
  return ''
}

/**
 * 递归摘除 <style>，返回新节点；命中的 style 文本推入 out。
 * 返回 null 表示该节点应被父级剔除。
 */
function strip(node: any, out: string[]): any {
  if (Array.isArray(node)) {
    // minimark 节点：[tag, props, ...children]
    if (typeof node[0] === 'string') {
      if (node[0] === 'style') {
        const text = styleText(node)
        if (text.trim()) out.push(text)
        return null
      }
      const next: any[] = [node[0], node[1]]
      for (let i = 2; i < node.length; i++) {
        const child = strip(node[i], out)
        if (child !== null) next.push(child)
      }
      return next
    }
    // 节点列表：[[...], [...], 'text']
    const list: any[] = []
    for (const child of node) {
      const kept = strip(child, out)
      if (kept !== null) list.push(kept)
    }
    return list
  }

  if (node && typeof node === 'object') {
    if (node.type === 'element' && node.tagName === 'style') {
      const text = styleText(node)
      if (text.trim()) out.push(text)
      return null
    }
    if (Array.isArray(node.children)) {
      const next: any = { ...node, children: [] }
      for (const child of node.children) {
        const kept = strip(child, out)
        if (kept !== null) next.children.push(kept)
      }
      return next
    }
    // minimark 根对象：{ type: 'minimark', value: [...], toc: ... }
    // style 节点挂在 value 数组的最后一个位置上，必须一并进入。
    if (Array.isArray(node.value)) {
      return { ...node, value: strip(node.value, out) }
    }
  }

  return node
}

function clone(value: any): any {
  if (Array.isArray(value)) return value.map(clone)
  if (value && typeof value === 'object') {
    const out: any = {}
    for (const key of Object.keys(value)) out[key] = clone(value[key])
    return out
  }
  return value
}

export interface ProseBody {
  /** 摘掉 <style> 之后的正文 AST，交给 ContentRenderer 渲染 */
  body: any
  /** 被摘出的配色 CSS，交给 useHead 注入 <head> */
  css: string
}

/**
 * 在页面 setup 里调用：
 *   const prose = useProseBody(post.value?.body)
 *   useHead({ style: prose.css ? [{ key: 'shiki', children: prose.css }] : [] })
 *   <ContentRenderer :value="{ ...post, body: prose.body }" />
 */
export function useProseBody(rawBody: any): ProseBody {
  if (!rawBody) return { body: rawBody, css: '' }
  const collected: string[] = []
  const body = strip(clone(rawBody), collected)
  return { body, css: collected.join('') }
}
