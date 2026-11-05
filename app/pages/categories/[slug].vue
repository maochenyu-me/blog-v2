<script setup lang="ts">
const route = useRoute()
const { ui, t } = useUi()
const posts = usePosts()
const slug = computed(() => decodeURIComponent(route.params.slug as string))

const { data } = await useAsyncData(
  () => `category-${slug.value}`,
  () => posts.byCategory(slug.value),
  { watch: [slug] },
)

if (!data.value?.length) {
  throw createError({ statusCode: 404, statusMessage: ui.collection.notFoundCategory })
}

useHead({ title: computed(() => t(ui.collection.categoryTitle, { name: slug.value })) })
</script>

<template>
  <div class="page-category">
    <div class="container">
      <header class="page-head">
        <NuxtLink to="/categories" class="back-link">{{ ui.collection.backToCategories }}</NuxtLink>
        <h1 class="page-title">{{ slug }}</h1>
        <p class="page-meta">{{ t(ui.common.count, { n: data?.length ?? 0 }) }}</p>
      </header>

      <PostList :posts="data ?? []" :show-tags="true" />
    </div>
  </div>
</template>

<style scoped>
.page-category {
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

.back-link {
  display: inline-block;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  margin-bottom: 0.75rem;
  transition: color var(--duration-base) var(--easing-base);
}

.back-link:hover {
  color: var(--foreground);
}

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.page-meta {
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}
</style>
