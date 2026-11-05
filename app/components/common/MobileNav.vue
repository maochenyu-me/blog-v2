<script setup lang="ts">
/**
 * 平板断点的汉堡菜单（提示词 §6：768–1023px 导航折叠）。
 * 用 Dialog 呈现，避免自造浮层焦点管理。
 */
const { site } = useBlogConfig()
const { ui } = useUi()
const route = useRoute()
const open = ref(false)

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

// 路由变化时自动关闭
watch(() => route.fullPath, () => (open.value = false))
</script>

<template>
  <button
    type="button"
    class="menu-btn"
    :aria-label="ui.nav.menuOpen"
    :aria-expanded="open"
    @click="open = true"
  >
    <Icon name="tabler:menu-2" class="menu-icon" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <div v-if="open" class="sheet-overlay" @click.self="open = false">
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="ui.nav.menuDialog"
        @keydown.esc="open = false"
      >
        <div class="sheet-head">
          <span class="sheet-title">{{ site.shortName }}</span>
          <button type="button" class="sheet-close" :aria-label="ui.nav.menuClose" @click="open = false">
            <Icon name="tabler:x" aria-hidden="true" />
          </button>
        </div>

        <nav class="sheet-nav">
          <NuxtLink
            v-for="item in site.nav"
            :key="item.to"
            :to="item.to"
            class="sheet-link"
            :class="{ 'is-active': isActive(item.to) }"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  cursor: pointer;
}

.menu-btn:hover {
  color: var(--foreground);
  background-color: var(--muted);
}

.menu-icon {
  font-size: 1.125rem;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: color-mix(in srgb, var(--foreground) 25%, transparent);
}

.sheet {
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
  padding: var(--space-item) var(--space-gutter) var(--space-block);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-item);
}

.sheet-title {
  font-weight: 700;
}

.sheet-close {
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 1.125rem;
}

.sheet-nav {
  display: flex;
  flex-direction: column;
}

.sheet-link {
  padding-block: 0.75rem;
  font-size: var(--fs-body);
  border-bottom: 1px solid var(--border);
  color: var(--muted-foreground);
}

.sheet-link.is-active {
  color: var(--foreground);
  font-weight: 700;
}

/* 只在平板断点显示汉堡 */
@media (min-width: 1024px) {
  .menu-btn {
    display: none;
  }
}

@media (max-width: 767px) {
  .menu-btn {
    display: none;
  }
}
</style>
