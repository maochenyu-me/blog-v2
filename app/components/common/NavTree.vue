<script setup lang="ts">
/**
 * 多级导航列表 —— 移动端抽屉使用。
 *
 * 结构对齐 Dusklight 的移动菜单：一级项纵向排列，带子项的项可原地展开。
 * 外观严格走本项目的 zinc 语言：1px 实线分隔、无圆角卡片、无阴影、
 * 无毛玻璃（BLOG_PROMPT.md §5.2 / §5.4）。
 *
 * ── 为什么是两层写死，不做递归 ────────────────────
 * 导航由 blog.config.ts 维护，已确认最多两级（父项 + 子项）。
 * 递归组件要自引用，Vite 下是循环依赖，收益却为零 ——
 * 这里把两层展开写出来，读起来也更直接。
 *
 * ── 展开语义（用户确认）────────────────────────────
 * 点父项不跳转，只就地展开子项；想进 /archive 就点子项「归档」。
 * 这样手机上不会出现「想展开却手抖跳走」。
 */
import type { NavItem } from '~/composables/useBlogConfig'

const props = defineProps<{
  items: NavItem[]
}>()

const { ui } = useUi()
const route = useRoute()

/** 已展开的父项（按 label 记，配置里 label 唯一） */
const expanded = ref<Set<string>>(new Set())

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

/**
 * 父项高亮：自身命中，或任一子项命中。
 * 子项命中时父项也应高亮，否则在 /categories 下抽屉里看起来哪项都没选中。
 */
function isGroupActive(item: NavItem): boolean {
  if (isActive(item.to)) return true
  return (item.children ?? []).some((child) => isActive(child.to))
}

function toggle(item: NavItem) {
  const next = new Set(expanded.value)
  if (next.has(item.label)) next.delete(item.label)
  else next.add(item.label)
  expanded.value = next
}

/**
 * 默认展开：当前路由落在某个分组内时，打开该分组。
 * 抽屉每次打开都重新挂载，所以「打开就看到自己在哪」是自动的。
 */
expanded.value = new Set(
  props.items
    .filter((item) => item.children?.some((child) => isActive(child.to)))
    .map((item) => item.label),
)
</script>

<template>
  <ul class="nav-tree">
    <li
      v-for="item in items"
      :key="item.label"
      class="nav-tree__item"
      :class="{ 'is-group': !!item.children?.length }"
    >
      <!-- 带子项：按钮负责展开，不跳转 -->
      <template v-if="item.children?.length">
        <button
          type="button"
          class="nav-tree__row"
          :class="{ 'is-active': isGroupActive(item), 'is-open': expanded.has(item.label) }"
          :aria-expanded="expanded.has(item.label)"
          @click="toggle(item)"
        >
          <Icon v-if="item.icon" :name="item.icon" class="nav-tree__icon" aria-hidden="true" />
          <span class="nav-tree__label">{{ item.label }}</span>
          <Icon name="tabler:chevron-down" class="nav-tree__chevron" aria-hidden="true" />
        </button>

        <!-- 折叠动画：grid-template-rows 0fr→1fr 可动画，height:auto 不行。
             collapsed 时挂 inert —— grid 0fr 只是把它们压成 0 高，
             键盘 Tab 照样能聚焦到看不见的链接上，这是必须堵掉的可访问性缺陷。 -->
        <div
          class="nav-tree__panel"
          :class="{ 'is-open': expanded.has(item.label) }"
          :inert="expanded.has(item.label) ? undefined : true"
        >
          <div class="nav-tree__panel-inner">
            <ul class="nav-tree nav-tree--sub">
              <li v-for="child in item.children" :key="child.label" class="nav-tree__item">
                <NuxtLink
                  :to="child.to"
                  class="nav-tree__row"
                  :class="{ 'is-active': isActive(child.to) }"
                  :aria-current="isActive(child.to) ? 'page' : undefined"
                  :external="child.external"
                  :target="child.external ? '_blank' : undefined"
                  :rel="child.external ? 'noopener noreferrer' : undefined"
                >
                  <Icon v-if="child.icon" :name="child.icon" class="nav-tree__icon" aria-hidden="true" />
                  <span class="nav-tree__label">{{ child.label }}</span>
                  <span v-if="child.external" class="nav-tree__ext">
                    <Icon name="tabler:external-link" aria-hidden="true" />
                    <span class="visually-hidden">{{ ui.nav.externalLink }}</span>
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <!-- 无子项：普通链接 -->
      <NuxtLink
        v-else
        :to="item.to"
        class="nav-tree__row"
        :class="{ 'is-active': isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        :external="item.external"
        :target="item.external ? '_blank' : undefined"
        :rel="item.external ? 'noopener noreferrer' : undefined"
      >
        <Icon v-if="item.icon" :name="item.icon" class="nav-tree__icon" aria-hidden="true" />
        <span class="nav-tree__label">{{ item.label }}</span>
        <span v-if="item.external" class="nav-tree__ext">
          <Icon name="tabler:external-link" aria-hidden="true" />
          <span class="visually-hidden">{{ ui.nav.externalLink }}</span>
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>

<style scoped>
.nav-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-tree__item + .nav-tree__item {
  border-top: 1px solid var(--border);
}

.nav-tree__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  /* 44px 触控目标下限 */
  min-height: 2.75rem;
  padding-block: 0.625rem;
  padding-inline: 0;
  text-align: start;
  font-size: var(--fs-body);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.nav-tree__row:hover {
  color: var(--foreground);
}

/* 强调色使用处之一：当前项。用字重 + 颜色，不加色块 —— 与桌面导航一致 */
.nav-tree__row.is-active {
  color: var(--foreground);
  font-weight: var(--fw-body-h);
}

.nav-tree__icon {
  flex: 0 0 auto;
  font-size: 1.125rem;
  color: var(--muted-foreground);
}

.nav-tree__row.is-active .nav-tree__icon {
  color: var(--accent);
}

.nav-tree__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-tree__chevron {
  flex: 0 0 auto;
  font-size: 1rem;
  color: var(--muted-foreground);
  transition: transform var(--duration-base) var(--easing-base);
}

.nav-tree__row.is-open .nav-tree__chevron {
  transform: rotate(180deg);
}

.nav-tree__ext {
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}

.nav-tree__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-base) var(--easing-base);
}

.nav-tree__panel.is-open {
  grid-template-rows: 1fr;
}

.nav-tree__panel-inner {
  overflow: hidden;
}

/* ── 子级 ── */
.nav-tree--sub {
  /* 缩进 + 1px 竖线：竖向脊线表达层级，比纯空格缩进更可读 */
  margin-block: 0 0.5rem;
  margin-inline-start: 0.5rem;
  padding-inline-start: 1.25rem;
  border-inline-start: 1px solid var(--border);
}

/* 子级不逐项画横线：竖脊线已经框住整块，横线会让它变成蜂窝 */
.nav-tree--sub .nav-tree__item + .nav-tree__item {
  border-top: 0;
}

.nav-tree--sub .nav-tree__row {
  min-height: 2.5rem;
  padding-block: 0.5rem;
  font-size: var(--fs-meta);
}

/* 减少动效偏好：关闭展开动画与箭头旋转 */
@media (prefers-reduced-motion: reduce) {
  .nav-tree__panel,
  .nav-tree__chevron {
    transition: none;
  }
}
</style>
