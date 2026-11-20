/**
 * 复制文本到剪贴板的 composable
 * 提供 copied 状态，1.5 秒后自动复位
 */
export function useCopyText() {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        copied.value = false
        timer = null
      }, 1500)
    } catch {
      // 剪贴板不可用时静默失败
    }
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { copied, copy }
}
