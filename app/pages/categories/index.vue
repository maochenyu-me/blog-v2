<script setup lang="ts">
const { ui } = useUi()
const posts = usePosts()

const { data } = await useAsyncData('categories', () => posts.categories())

useHead({ title: ui.pages.categories })
</script>

<template>
  <div class="page-categories">
    <div class="container">
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.categories }}</h1>
      </header>

      <ul class="cat-list">
        <li v-for="cat in data ?? []" :key="cat.name" class="cat-row">
          <NuxtLink :to="`/categories/${cat.slug}`" class="cat-link">
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">{{ cat.count }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.page-categories {
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

.cat-list {
  display: flex;
  flex-direction: column;
}

.cat-row {
  border-bottom: 1px solid var(--border);
}

.cat-row:first-child {
  border-top: 1px solid var(--border);
}

.cat-link {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 0.9375rem;
}

.cat-name {
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  transition: font-weight var(--duration-base) var(--easing-base);
}

.cat-link:hover .cat-name {
  font-weight: 700;
}

.cat-count {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
</style>
