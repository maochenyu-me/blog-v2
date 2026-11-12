/**
 * 弹窗通用行为：Esc 关闭 + 打开期间锁定页面滚动。
 * 与 SearchDialog 的遮罩语言保持一致（color-mix 遮罩、z-60 层级）。
 */
export function useModalBehavior(open: MaybeRefOrGetter<boolean>, close: () => void) {
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  watch(() => toValue(open), (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  })
}
