<script setup lang="ts">
/**
 * 文章头卡：标题 + meta 行（创建/更新/分类/字数/访问量）+ 分享按钮。
 * 移植自 wxuyu.top 的 PostHeader，按本站 token 体系重写；不渲染封面图。
 */
const props = defineProps<{
  title: string
  date: string
  updated?: string
  category: string
  words: number
  pv?: string | null
  uv?: string | null
  showShare: boolean
}>()

defineEmits<{ share: [] }>()

const { ui, t } = useUi()
const { iso } = useDateFormat()
</script>

<template>
  <header class="post-header-card">
    <div class="card-body">
      <h1 class="card-title">{{ title }}</h1>

      <div class="card-meta-row">
        <div class="card-meta">
          <span class="meta-item" :title="t(ui.post.createdAt, { date: iso(date) })">
            <Icon name="ph:pencil-simple-line-bold" />
            <time class="meta-num" :datetime="iso(date)">{{ iso(date) }}</time>
          </span>

          <span v-if="updated" class="meta-item" :title="t(ui.post.updatedAt, { date: iso(updated) })">
            <Icon name="ph:clock-counter-clockwise-bold" />
            <time class="meta-num" :datetime="iso(updated)">{{ iso(updated) }}</time>
          </span>

          <NuxtLink :to="`/categories/${toSlug(category)}`" class="meta-item meta-link">
            <Icon name="ph:folder-open-bold" />
            {{ category }}
          </NuxtLink>

          <span class="meta-item">
            <Icon name="ph:paragraph-bold" />
            <span class="meta-num">{{ t(ui.post.wordCount, { n: words }) }}</span>
          </span>

          <span v-if="pv" class="meta-item">
            <Icon name="ph:eye-bold" />
            <span class="meta-num">{{ pv }} {{ ui.post.pageViews }}</span>
          </span>
          <span v-if="uv" class="meta-item">
            <Icon name="ph:user-bold" />
            <span class="meta-num">{{ uv }} {{ ui.post.pageVisitors }}</span>
          </span>
        </div>

        <button v-if="showShare" class="share-btn" @click="$emit('share')">
          <Icon name="ph:share-fat" />
          {{ t(ui.post.shareArticle) }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.post-header-card {
  margin-bottom: var(--space-block);
}

.card-body {
  padding: 1.25rem 0;
}

.card-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.card-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 1rem;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.meta-item :deep(.icon) {
  font-size: 1em;
  opacity: 0.8;
}

.meta-num {
  font-variant-numeric: tabular-nums;
}

.meta-link {
  transition: color var(--duration-base) var(--easing-base);
}

.meta-link:hover {
  color: var(--foreground);
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--card);
  font-size: var(--fs-meta);
  color: var(--foreground);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.share-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.share-btn :deep(.icon) {
  font-size: 1.05em;
}

@media (max-width: 600px) {
  .card-body {
    padding: 1rem 0;
  }

  /* 窄屏分享按钮独占一行右对齐，meta 不与之挤同一行 */
  .share-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
