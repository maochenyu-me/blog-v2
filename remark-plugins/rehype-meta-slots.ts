import type { Element, Properties, Root, RootContent } from 'hast'
import type { VFile } from 'vfile'

/**
 * Minimark 树节点类型（本地定义，避免引入 minimark 依赖）。
 * 结构：[tagName, properties, ...children] | string（文本节点）
 */
export type MinimarkNode = string | MinimarkTree
export type MinimarkTree = [string, Properties, ...MinimarkNode[]]

/**
 * minimark 的对象形态：`fromHast` 抽出的是 `{ type, value, props }`，
 * 不是上面的元组形态 —— 元组无法承载 MDC 属性，属性必须单独带出来
 * 交给 MetaSlotsRenderer 读 title。
 */
export interface MetaSlotsTree {
  type: 'minimark'
  value: MinimarkNode[]
  props?: Properties
}

declare module 'vfile' {
  interface DataMap {
    slots?: Record<string, MetaSlotsTree>
  }
}

export function fromHast(node: Element): MetaSlotsTree {
  return {
    props: node.properties,
    type: 'minimark',
    value: node.children.map(hastToMinimarkNode).filter(v => v !== undefined),
  }
}

function hastToMinimarkNode(input: RootContent): MinimarkNode | undefined {
  if (input.type === 'comment' || input.type === 'doctype') {
    return undefined
  }
  if (input.type === 'text' || input.type === 'raw') {
    return input.value
  }

  if (input.tagName === 'code' && input.properties?.className && (input.properties.className as string[]).length === 0) {
    delete input.properties.className
  }

  return [
    input.tagName,
    input.properties || {},
    ...(input.children || []).map(hastToMinimarkNode).filter(v => v !== undefined),
  ]
}

export default function rehypeMetaSlots() {
  return (tree: Root, file: VFile) => {
    file.data.slots ??= {}

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i]!

      if (node.type === 'element' && node.tagName.startsWith('meta-')) {
        const metaName = node.tagName.slice('meta-'.length)
        file.data.slots[metaName] = fromHast(node)

        tree.children.splice(i, 1)
        i--
      }
    }
  }
}
