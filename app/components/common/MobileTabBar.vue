<script setup lang="ts">
/**
 * 移动端底部 Tab 栏（提示词 §6）。
 * 组成：site.nav 前 4 项 + 搜索 = 5 格；主题切换留在顶部。
 */
const { site, search } = useBlogConfig()
const { ui } = useUi()
const route = useRoute()

/**
 * 移动端搜索入口（提示词 §11.3 的三处入口之一）。
 *
 * 直接调用 useSearch().open()，而不是只 emit 'search' 让父组件接线：
 *   open() 内部就是 `useState('search-open').value = true`，与顶栏按钮、
 *   全局快捷键共用同一个开关，布局层什么都不用做就能生效。
 *   只 emit 的话，一旦父组件忘了绑 @search，这个按钮就是个死键。
 * emit 仍然保留，父组件想额外做点什么（埋点、关闭底栏等）照样能监听。
 */
const { open: openSearchDialog } = useSearch()

function openSearch() {
  openSearchDialog()
}

const tabItems = computed(() => site.nav.slice(0, 4))

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <nav class="tabbar" :aria-label="ui.nav.mobile">
    <NuxtLink
      v-for="item in tabItems"
      :key="item.to"
      :to="item.to"
      class="tab"
      :class="{ 'is-active': isActive(item.to) }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
    >
      <Icon v-if="item.icon" :name="item.icon" class="tab-icon" aria-hidden="true" />
      <span class="tab-label">{{ item.label }}</span>
    </NuxtLink>

    <button
      v-if="search.enabled"
      type="button"
      class="tab"
      :aria-label="ui.search.trigger"
      @click="openSearch"
    >
      <Icon name="tabler:search" class="tab-icon" aria-hidden="true" />
      <span class="tab-label">{{ ui.search.trigger }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  inset-inline: 0;
  z-index: 40;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  background-color: var(--background);
  border-top: 1px solid var(--border);
  /* 适配 iOS 安全区 */
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-height: 3.25rem;
  padding-block: 0.5rem;
  color: var(--muted-foreground);
  font-size: 0.6875rem;
  line-height: 1;
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

/* 强调色四处之一：当前 Tab */
.tab.is-active {
  color: var(--accent);
}

.tab-icon {
  font-size: 1.125rem;
}

@media (min-width: 768px) {
  .tabbar {
    display: none;
  }
}
</style>
