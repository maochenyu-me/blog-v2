/**
 * 文章目录的共享状态。
 *
 * 为什么需要它：
 *   触发按钮在 SiteHeader（layout 级），目录数据在文章页 —— 两者是兄弟关系，
 *   props 传不过去，provide/inject 也够不着（header 不是 page 的祖先）。
 *   全站已有同样的先例：useSearch() 用 useState('search-open') 在这种位置上共享状态。
 *
 * 单一数据源在这里，而不是各组件各存一份：
 *   桌面旁栏（ProseToc）与移动抽屉（MobileToc）必须对「当前是哪一节」有同一个答案，
 *   否则两处高亮会各算各的，来回切换时还会残留上一次的选中态。
 */
export interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

export interface FlatTocItem {
  id: string
  text: string
  depth: number
}

export function usePostToc() {
  const appConfig = useAppConfig()
  const tocCfg = (appConfig.theme as any).toc as {
    enabled: boolean
    minDepth: number
    maxDepth: number
  }
  const pageCfg = usePageConfig('post')

  const links = useState<TocLink[]>('post-toc-links', () => [])
  const activeId = useState<string>('post-toc-active', () => '')
  const isOpen = useState<boolean>('post-toc-open', () => false)

  /** 扁平化，只保留 minDepth..maxDepth 的标题（旁栏与抽屉共用同一份结果） */
  const flat = computed<FlatTocItem[]>(() => {
    const out: FlatTocItem[] = []
    function walk(items: TocLink[]) {
      for (const item of items) {
        if (item.depth >= tocCfg.minDepth && item.depth <= tocCfg.maxDepth) {
          out.push({ id: item.id, text: item.text, depth: item.depth })
        }
        if (item.children) walk(item.children)
      }
    }
    walk(links.value)
    return out
  })

  /** 是否该出现目录（开关 + 配置 + 真的有标题） */
  const available = computed(() => pageCfg.showToc && tocCfg.enabled && flat.value.length > 0)

  function setLinks(list: TocLink[]) {
    links.value = list
  }

  /** 离开文章页时清干净：否则上一篇的目录会残留在抽屉里闪一下 */
  function clear() {
    links.value = []
    activeId.value = ''
    isOpen.value = false
  }

  return { links, flat, activeId, isOpen, available, setLinks, clear }
}
