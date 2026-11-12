<script setup lang="ts">
import type { NavItem } from '~/composables/useBlogConfig'

/**
 * 桌面端多级导航。
 *
 * 交互按用户确认的方案：点击展开、点击外部关闭、父项本身不跳转。
 * 不采用悬停展开是因为触屏笔记本无法触发 hover，而键盘用户需要显式的可聚焦触发器。
 */
const props = defineProps<{ items: NavItem[] }>()

const { ui } = useUi()
const route = useRoute()

/** 当前展开的分组 label；同一时刻只允许一个菜单展开 */
const openLabel = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

function isGroupActive(item: NavItem): boolean {
  return isActive(item.to) || (item.children ?? []).some((child) => isActive(child.to))
}

function toggle(item: NavItem) {
  openLabel.value = openLabel.value === item.label ? null : item.label
}

function close() {
  openLabel.value = null
}

/** 点击组件外部时收起。用 pointerdown 而非 click，避免与触发器自身的 click 竞态 */
function onPointerDown(event: PointerEvent) {
  if (!root.value) return
  const target = event.target as Node | null
  if (target && !root.value.contains(target)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (openLabel.value === null) return
  close()
  // 焦点还给对应的触发器，否则键盘用户会丢失位置
  const trigger = root.value?.querySelector<HTMLButtonElement>('.nav-group__trigger[aria-expanded="true"]')
  trigger?.focus()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

/** 路由变化后收起菜单（点击菜单项跳转时） */
watch(() => route.fullPath, close)
</script>

<template>
  <nav class="nav-desktop" :aria-label="ui.nav.main" ref="root">
    <template v-for="item in items" :key="item.label">
      <div v-if="item.children?.length" class="nav-group">
        <button
          type="button"
          class="nav-link nav-group__trigger"
          :class="{ 'is-active': isGroupActive(item) }"
          :aria-expanded="openLabel === item.label"
          :aria-controls="`nav-menu-${item.label}`"
          @click="toggle(item)"
        >
          <Icon v-if="item.icon" :name="item.icon" class="nav-link__icon" aria-hidden="true" />
          {{ item.label }}
          <Icon name="tabler:chevron-down" class="nav-group__chevron" aria-hidden="true" />
        </button>

        <Transition name="nav-pop">
          <ul
            v-if="openLabel === item.label"
            :id="`nav-menu-${item.label}`"
            class="nav-group__menu"
          >
            <li v-for="child in item.children" :key="child.to">
              <NuxtLink
                :to="child.to"
                class="nav-menu__link"
                :class="{ 'is-active': isActive(child.to) }"
                :aria-current="isActive(child.to) ? 'page' : undefined"
                @click="close"
              >
                <Icon v-if="child.icon" :name="child.icon" class="nav-menu__icon" aria-hidden="true" />
                {{ child.label }}
              </NuxtLink>
            </li>
          </ul>
        </Transition>
      </div>

      <NuxtLink
        v-else
        :to="item.to"
        class="nav-link"
        :class="{ 'is-active': isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <Icon v-if="item.icon" :name="item.icon" class="nav-link__icon" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
    </template>
  </nav>
</template>

<style scoped>
.nav-desktop {
  display: none;
  align-items: center;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .nav-desktop {
    display: flex;
  }
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-meta);
  line-height: 1;
  color: var(--muted-foreground);
  padding-block: 0.25rem;
  border-bottom: 1px solid transparent;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.nav-link__icon {
  font-size: 1rem;
}

.nav-link:hover {
  color: var(--foreground);
}

/* 强调色使用的四处之一：当前导航项的下划线 */
.nav-link.is-active {
  color: var(--foreground);
  border-bottom-color: var(--accent);
}

.nav-group {
  position: relative;
}

/* 按钮要与 .nav-link 完全同形，否则会破坏顶部导航的基线对齐 */
.nav-group__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  font: inherit;
  font-size: var(--fs-meta);
  cursor: pointer;
}

.nav-group__chevron {
  font-size: 0.875rem;
  opacity: 0.72;
  transition: transform var(--duration-base) var(--easing-base);
}

.nav-group__trigger[aria-expanded='true'] .nav-group__chevron {
  transform: rotate(180deg);
}

/* 贴边矩形面板：1px 实线、4px 圆角（≤8px 约束内）、无阴影 */
.nav-group__menu {
  position: absolute;
  top: calc(100% + 0.75rem);
  left: -0.75rem;
  min-width: 9rem;
  padding: 0.25rem 0;
  list-style: none;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.nav-menu__link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: var(--fs-meta);
  line-height: 1.5;
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.nav-menu__icon {
  font-size: 1rem;
}

.nav-menu__link:hover {
  color: var(--foreground);
}

.nav-menu__link.is-active {
  color: var(--foreground);
  font-weight: 700;
}

.nav-pop-enter-active,
.nav-pop-leave-active {
  transition:
    opacity var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.nav-pop-enter-from,
.nav-pop-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .nav-group__chevron,
  .nav-pop-enter-active,
  .nav-pop-leave-active {
    transition: none;
  }
}
</style>
