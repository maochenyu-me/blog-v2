<script setup lang="ts">
/**
 * 行式文章列表（提示词 §7.1：纯文字列表，无卡片堆叠）。
 * 首页 / 归档 / 分类 / 标签 共用。
 */
interface PostItem {
  path: string
  title: string
  date: string
  tags?: string[]
  category?: string
}

const props = withDefaults(
  defineProps<{
    posts: PostItem[]
    /** 是否显示日期列 */
    showDate?: boolean
    /** 是否显示标签 */
    showTags?: boolean
    /** 日期格式：full = YYYY-MM-DD，short = MM-DD */
    dateFormat?: 'full' | 'short'
  }>(),
  {
    showDate: true,
    showTags: true,
    dateFormat: 'full',
  },
)

const { iso, short } = useDateFormat()

function formatDate(d: string) {
  return props.dateFormat === 'full' ? iso(d) : short(d)
}
</script>

<template>
  <ul class="post-list">
    <li v-for="post in posts" :key="post.path" class="post-row">
      <NuxtLink :to="post.path" class="post-link">
        <time v-if="showDate" class="post-date" :datetime="iso(post.date)">
          {{ formatDate(post.date) }}
        </time>

        <span class="post-body">
          <span class="post-title">{{ post.title }}</span>
          <span v-if="showTags && post.tags?.length" class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
          </span>
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>

<style scoped>
.post-list {
  display: flex;
  flex-direction: column;
}

.post-row {
  border-bottom: 1px solid var(--border);
}

.post-row:first-child {
  border-top: 1px solid var(--border);
}

.post-link {
  display: flex;
  align-items: baseline;
  gap: 1.25rem;
  padding-block: 0.9375rem;
  transition: color var(--duration-base) var(--easing-base);
}

/* 日期列固定宽度，形成可扫读的一列 */
.post-date {
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.post-body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  min-width: 0;
}

.post-title {
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  font-weight: var(--fw-list-title);
  transition: font-weight var(--duration-base) var(--easing-base);
}

/* hover 只加字重，不加背景、不加位移 —— 提示词禁止卡片 hover 上浮 */
.post-link:hover .post-title {
  font-weight: 700;
}

.post-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.post-tag {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
}

.post-tag::before {
  content: '#';
  opacity: 0.5;
}

@media (max-width: 480px) {
  .post-link {
    gap: 0.75rem;
  }

  .post-date {
    font-size: 0.75rem;
  }
}
</style>
