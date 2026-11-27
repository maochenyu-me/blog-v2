<script setup lang="ts">
/**
 * 侧栏站点信息卡：构建平台 / 版本 / 许可三行主信息 + 可折叠的构建详情。
 *
 * 主信息与详情格子的值全部在构建期由 modules/build-info.ts 采集并写入
 * appConfig.build，组件只负责取值与渲染 —— 不写死任何版本号、时间或平台名。
 * 取值支持「点路径」写法（'build.platform'），配置里也能直接写字面量。
 */
import type { BuildMeta } from '#shared/types/build'

interface SiteInfoConfig {
  enabled: boolean
  defaultCollapsed: boolean
  mainRows: Array<{ icon: string; labelKey: string; value: string }>
  showDomain: boolean
  versionCells: Array<{ icon: string; label: string; value: string }>
  showBuildTime: boolean
  buildTimeZone: string
  showSystem: boolean
}

const props = defineProps<{
  cfg: SiteInfoConfig
}>()

const { ui } = useUi()
const appConfig = useAppConfig()
const s = ui.pages.home.sidebar.siteInfo

const build = computed<BuildMeta>(() => useBuildMeta())
const site = computed(() => appConfig.site as { url: string })

/** 点路径取值：命中即返回；未命中或空值回退到字面量本身，再空则用 unknown */
function resolveValue(expr: string): string {
  const hit = expr.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), appConfig as any)
  if (typeof hit === 'string' && hit) return hit
  if (hit != null && typeof hit !== 'object') return String(hit)
  return expr.includes('.') ? s.unknown : expr || s.unknown
}

const mainRows = computed(() =>
  props.cfg.mainRows.map((row) => ({
    icon: row.icon,
    label: (s.labels as Record<string, string>)[row.labelKey] ?? row.labelKey,
    value: resolveValue(row.value),
  })),
)

/** 域名去掉协议与结尾斜杠，卡片里只留主机名 */
const domain = computed(() =>
  site.value.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
)

const versionCells = computed(() =>
  props.cfg.versionCells.map((cell) => ({
    icon: cell.icon,
    label: cell.label,
    value: resolveValue(cell.value),
  })),
)

const collapsed = ref(props.cfg.defaultCollapsed)

const buildTimeText = computed(() => build.value.buildTime)
</script>

<template>
  <SidebarCard :title="s.title" icon="tabler:info-square-rounded">
    <div class="site-info">
      <dl class="row-list">
        <div v-for="row in mainRows" :key="row.label" class="row">
          <span class="row-icon"><Icon :name="row.icon" aria-hidden="true" /></span>
          <dt class="row-label">{{ row.label }}</dt>
          <dd class="row-value">{{ row.value }}</dd>
        </div>
      </dl>

      <div class="detail" :class="{ collapsed }">
        <div class="detail-inner">
          <div v-if="cfg.showDomain" class="cell cell-full">
            <Icon name="tabler:world-www" class="cell-icon" aria-hidden="true" />
            <span class="cell-label">{{ s.domain }}</span>
            <span class="cell-value">{{ domain }}</span>
          </div>

          <div v-for="cell in versionCells" :key="cell.label" class="cell">
            <Icon :name="cell.icon" class="cell-icon" aria-hidden="true" />
            <span class="cell-label">{{ cell.label }}</span>
            <span class="cell-value">{{ cell.value }}</span>
          </div>

          <div v-if="cfg.showBuildTime && buildTimeText" class="cell cell-full">
            <Icon name="tabler:tools" class="cell-icon" aria-hidden="true" />
            <span class="cell-label">{{ s.buildTime }}</span>
            <span class="cell-value">{{ buildTimeText }}</span>
          </div>

          <div v-if="cfg.showSystem && build.system" class="cell cell-full">
            <Icon name="tabler:device-desktop" class="cell-icon" aria-hidden="true" />
            <span class="cell-label">{{ s.system }}</span>
            <span class="cell-value">{{ build.system }}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="toggle"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        <Icon :name="collapsed ? 'tabler:chevron-down' : 'tabler:chevron-up'" aria-hidden="true" />
        <span>{{ collapsed ? s.expand : s.collapse }}</span>
      </button>
    </div>
  </SidebarCard>
</template>

<style scoped>
.row-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin: 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
}

.row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 0.8125rem;
  color: var(--accent);
  background: color-mix(in srgb, currentColor 14%, transparent);
}

.row-label {
  min-width: 5em;
  flex-shrink: 0;
  color: var(--muted-foreground);
  font-weight: 500;
}

.row-value {
  margin: 0;
  flex: 1;
  text-align: right;
  color: var(--foreground);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- 折叠区 ---- */
.detail {
  display: grid;
  grid-template-rows: 1fr;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 16%, transparent);
  transition: grid-template-rows var(--duration-slow) var(--easing-base);
}

/* grid-rows 0fr → 1fr 折叠：不依赖 max-height 估算，内容多高都收得干净 */
.detail.collapsed {
  grid-template-rows: 0fr;
  margin-top: 0;
  padding-top: 0;
  border-top-color: transparent;
}

.detail-inner {
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  min-height: 0;
}

.site-info {
  container-type: inline-size;
}

/* 宽卡（平板/移动端卡片拉满）走四列，窄侧栏保持两列 */
@container (min-width: 34rem) {
  .detail-inner {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.5rem 0.25rem;
  border-radius: calc(var(--radius) - 0.125rem);
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  text-align: center;
  min-width: 0;
}

.cell-full {
  grid-column: 1 / -1;
}

.cell-icon {
  font-size: 1rem;
  color: var(--accent);
}

.cell-label {
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--muted-foreground);
}

.cell-value {
  max-width: 100%;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.25rem 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--duration-base) var(--easing-base);
}

.toggle:hover {
  opacity: 0.75;
}

.toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius);
}

@media (prefers-reduced-motion: reduce) {
  .detail,
  .toggle {
    transition: none;
  }
}
</style>