<script setup lang="ts">
const { ui } = useUi()
const pageCfg = usePageConfig('archive')
const posts = usePosts()

const { data } = await useAsyncData('archive-groups', () => posts.byYear())

useHead({ title: ui.pages.archive })
</script>

<template>
  <div class="page-archive">
    <div class="container">
      <SiteBreadcrumb />
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.archive }}</h1>
      </header>

      <section v-for="group in data ?? []" :key="group.year" class="year-group">
        <h2 class="year-label">
          <span class="year-number">{{ group.year }}</span>
          <span v-if="pageCfg.showCount" class="year-count">{{ group.posts.length }}</span>
        </h2>

        <PostList :posts="group.posts" :show-tags="false" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-archive {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.page-head {
  margin-bottom: var(--space-block);
}

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.year-group + .year-group {
  margin-top: var(--space-section);
}

.year-label {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

/* 年份是真实序列，允许用数字表达 */
.year-number {
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.year-count {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}
</style>
