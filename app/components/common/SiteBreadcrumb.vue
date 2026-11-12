<script setup lang="ts">
/**
 * 面包屑导航（移植自 blog.liushen.fun 的 breadcrumb-bar）。
 *
 * 版式与交互照搬参考站：
 *   - 根节点用 `~` 字符（Unix 家目录双关），读屏读「首页」
 *   - 层级间分隔符 `/` 由 CSS ::before 生成，不是文本节点
 *   - 末级是 accent 底胶囊 + aria-current="page"，超长省略并挂 title
 *   - 详情页左侧多一个 `← cd ..` 返回药丸
 *   - 整条药丸横向可滚动、隐藏滚动条；<640px 隐藏中间层级
 *
 * 皮肤内化到本站令牌：参考站那套玻璃 + 渐变 + 阴影
 * （backdrop-filter / linear-gradient / box-shadow）收敛成
 * `--muted` 实底 + 1px `--border` + `--radius-full`，暗色下无阴影（符合全站铁律）。
 *
 * 层级数据由路由自动推导，页面只需在详情页传 `current`（末级显示名）。
 */
const props = withDefaults(
  defineProps<{
    /** 末级显示名。列表页留空则由路由表推导；详情页传自己的标题 */
    current?: string
    /**
     * 是否显示「← cd ..」返回药丸。
     * 参考站只在文章详情页给（标签/分类详情页没有），所以默认 false，
     * 由文章页显式打开。
     */
    back?: boolean
  }>(),
  { current: '', back: false },
)

const route = useRoute()
const { ui, t } = useUi()

interface Crumb {
  label: string
  /** 可点击跳转；缺省则渲染成纯文本（如没有索引页的「法务」） */
  to?: string
}

/**
 * 路由 → 层级表。
 *
 * parents 是「末级之前的所有祖先」（不含根 ~），leaf 是列表页自身的名字。
 * 详情页的 leaf 由 current prop 提供，所以表里只写 parents。
 */
const ROUTE_TABLE: Array<{ test: RegExp; parents: Crumb[]; leaf?: string }> = [
  { test: /^\/archive\/?$/, parents: [], leaf: ui.breadcrumb.routes.archive },
  { test: /^\/categories\/?$/, parents: [], leaf: ui.breadcrumb.routes.categories },
  {
    test: /^\/categories\/[^/]+\/?$/,
    parents: [{ label: ui.breadcrumb.routes.categories, to: '/categories' }],
  },
  { test: /^\/tags\/?$/, parents: [], leaf: ui.breadcrumb.routes.tags },
  {
    test: /^\/tags\/[^/]+\/?$/,
    parents: [{ label: ui.breadcrumb.routes.tags, to: '/tags' }],
  },
  { test: /^\/links\/?$/, parents: [], leaf: ui.breadcrumb.routes.links },
  { test: /^\/fcircle\/?$/, parents: [], leaf: ui.breadcrumb.routes.fcircle },
  { test: /^\/message\/?$/, parents: [], leaf: ui.breadcrumb.routes.message },
  { test: /^\/shuoshuo\/?$/, parents: [], leaf: ui.breadcrumb.routes.shuoshuo },
  { test: /^\/gallery\/?$/, parents: [], leaf: ui.breadcrumb.routes.gallery },
  {
    test: /^\/gallery\/[^/]+\/?$/,
    parents: [{ label: ui.breadcrumb.routes.gallery, to: '/gallery' }],
  },
  { test: /^\/about\/?$/, parents: [], leaf: ui.breadcrumb.routes.about },
  { test: /^\/changelog\/?$/, parents: [], leaf: ui.breadcrumb.routes.changelog },
  {
    // 法务页没有 /legal 索引页，父级不挂链接
    test: /^\/legal\/[^/]+\/?$/,
    parents: [{ label: ui.breadcrumb.routes.legal }],
  },
  {
    // 本站无 /posts 索引页：文章以上级「归档」作父级
    test: /^\/posts\/[^/]+\/?$/,
    parents: [{ label: ui.breadcrumb.routes.archive, to: '/archive' }],
  },
]

const matched = computed(() => ROUTE_TABLE.find((entry) => entry.test.test(route.path)) ?? null)

/** 末级显示名：优先 prop，其次路由表 */
const leafLabel = computed(() => props.current || matched.value?.leaf || '')

/** 层级轨迹（不含根 ~）；末级无 to 表示当前页 */
const trail = computed<Crumb[]>(() => {
  const parents = matched.value?.parents ?? []
  if (!leafLabel.value) return parents
  return [...parents, { label: leafLabel.value }]
})

/** 根页（首页）不渲染面包屑 */
const visible = computed(() => route.path !== '/' && trail.value.length > 0)

/**
 * 是否显示返回药丸：由页面显式开启（照参考站，仅文章详情页有）。
 */
const showBack = computed(() => props.back)

/**
 * 返回目标：优先 sessionStorage 里记录的来路（由
 * app/plugins/breadcrumb-history.client.ts 写入），无来路回首页。
 *
 * 初值固定为 '/'，与服务端渲染结果一致；onMounted 再换成真实来路，
 * 因此不会产生水合失配。
 */
const backTo = ref('/')
onMounted(() => {
  try {
    const saved = sessionStorage.getItem('breadcrumb-back')
    if (saved && saved.startsWith('/') && !saved.startsWith('//')) backTo.value = saved
  } catch {
    // 隐私模式不可读：保持回首页
  }
})

/** 返回按钮的无障碍说明带上当前位置 */
const backAria = computed(() =>
  t(ui.breadcrumb.backAria, { where: leafLabel.value || ui.breadcrumb.home }),
)
</script>

<template>
  <nav v-if="visible" class="crumb-nav" :aria-label="ui.breadcrumb.aria">
    <div class="crumb-row">
      <NuxtLink v-if="showBack" :to="backTo" class="crumb-back" :aria-label="backAria">
        <Icon name="tabler:chevron-left" class="crumb-back-icon" aria-hidden="true" />
        <span class="crumb-back-text">{{ ui.breadcrumb.back }}</span>
      </NuxtLink>

      <ol class="crumb-bar" :class="{ 'has-back': showBack }">
        <li class="crumb-item is-root">
          <NuxtLink to="/" class="crumb-home" :aria-label="ui.breadcrumb.home" :title="ui.breadcrumb.home">
            <span aria-hidden="true">{{ ui.breadcrumb.homeGlyph }}</span>
          </NuxtLink>
        </li>

        <li
          v-for="(crumb, i) in trail"
          :key="`${crumb.label}-${i}`"
          class="crumb-item"
          :class="{ 'is-current': i === trail.length - 1 }"
        >
          <NuxtLink
            v-if="crumb.to && i !== trail.length - 1"
            :to="crumb.to"
            class="crumb-link"
            :title="crumb.label"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span v-else-if="i !== trail.length - 1" class="crumb-text" :title="crumb.label">
            {{ crumb.label }}
          </span>
          <span v-else class="crumb-current" aria-current="page" :title="crumb.label">
            {{ crumb.label }}
          </span>
        </li>
      </ol>
    </div>
  </nav>
</template>

<style scoped>
.crumb-nav {
  max-width: 100%;
  /*
   * 贴近顶部导航：所有内容页的顶部统一有 --space-section（4rem）呼吸位，
   * 面包屑夹在「导航 ↔ 标题」中间时两头都显空。这里吃掉大部分页顶留白，
   * 只留 1.5rem —— 用 calc 表达「页顶留白 − 2.5rem」，页距调整时自适应。
   */
  margin-top: calc(-1 * var(--space-section) + 1.5rem);
  margin-bottom: 1rem;
}

/* 返回药丸与层级条并排左对齐，整体贴在文章标题上方 */
.crumb-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

/* ── 返回上一页：← cd .. ── */
.crumb-back {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--radius-base);
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.crumb-back:hover {
  color: var(--foreground);
  border-color: var(--border);
}

.crumb-back-icon {
  font-size: 1rem;
  opacity: 0.7;
  transition: transform var(--duration-base) var(--easing-base);
}

.crumb-back:hover .crumb-back-icon {
  transform: translateX(-2px);
}

/* ── 层级条 ── */
.crumb-bar {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  min-width: 0;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  background-color: var(--muted);
  /* 层级过多时横向滚动，滚动条隐藏（照参考站） */
  overflow-x: auto;
  scrollbar-width: none;
}

.crumb-bar::-webkit-scrollbar {
  display: none;
}

.crumb-item {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
}

/* 层级分隔符：由 ::before 生成，非文本节点（照参考站） */
.crumb-item + .crumb-item::before {
  content: '/';
  margin-inline: 0.3rem;
  opacity: 0.6;
  color: var(--muted-foreground);
}

.crumb-home,
.crumb-link,
.crumb-text {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  border-radius: 0.45rem;
  font-size: var(--fs-meta);
  white-space: nowrap;
}

/*
 * 末级：必须是块级（而非 inline-flex），text-overflow: ellipsis 才会生效 ——
 * flex 容器上的 ellipsis 是静默失效的，之前末级长标题被硬裁切就是这个原因。
 */
.crumb-current {
  display: block;
  line-height: 1;
  border-radius: 0.45rem;
  font-size: var(--fs-meta);
  white-space: nowrap;
}

/* 根节点 ~ */
.crumb-home {
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--muted-foreground);
  transition:
    color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.crumb-home:hover {
  color: var(--accent);
  transform: translateY(-1px);
}

.crumb-link,
.crumb-text {
  padding: 0.35rem 0.55rem;
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.crumb-text {
  /* 无索引页的父级：不可点，视觉上比链接更淡 */
  opacity: 0.75;
}

.crumb-link:hover {
  color: var(--accent);
}

/* 末级：accent 底胶囊（本站强调色的受控使用点之一） */
.crumb-current {
  max-width: min(34ch, 64vw);
  overflow: hidden;
  padding: 0.35rem 0.55rem;
  text-overflow: ellipsis;
  color: color-mix(in srgb, var(--accent) 92%, var(--foreground));
  background-color: color-mix(in srgb, var(--accent) 11%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
}

/* 窄屏：收紧与导航/标题的间距（视觉约 16px），并隐藏中间层级（照参考站） */
@media (max-width: 640px) {
  .crumb-nav {
    /* header 元素含 0.75rem 底 padding，元素底 → 面包屑仅留 0.25rem，
       视觉胶囊底 → 面包屑 ≈ 16px —— 手机端克喵拍板再压一档 */
    margin-top: calc(-1 * var(--space-section) + 0.25rem);
    margin-bottom: 0.75rem;
  }

  .crumb-bar.has-back .crumb-item:not(.is-root):not(.is-current) {
    display: none;
  }

  .crumb-current {
    max-width: 52vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crumb-back,
  .crumb-back-icon,
  .crumb-home,
  .crumb-link {
    transition: none;
  }

  .crumb-home:hover {
    transform: none;
  }

  .crumb-back:hover .crumb-back-icon {
    transform: none;
  }
}
</style>
