<script setup lang="ts">
import { fromSlugParam } from '~/utils/taxonomy'

const route = useRoute()
const { ui, t } = useUi()
const posts = usePosts()
const slug = computed(() => fromSlugParam(route.params.slug as string))

/* 同 tags/[slug]：slug 有损，必须反查原始分类名再查询 */
const { data } = await useAsyncData(
  () => `category-${slug.value}`,
  async () => {
    const name = await posts.categoryBySlug(slug.value)
    if (!name) return { name: slug.value, posts: [] }
    return { name, posts: await posts.byCategory(name) }
  },
  { watch: [slug] },
)

if (!data.value?.posts.length) {
  throw createError({ statusCode: 404, statusMessage: ui.collection.notFoundCategory })
}

const categoryName = computed(() => data.value?.name ?? slug.value)

useHead({ title: computed(() => t(ui.collection.categoryTitle, { name: categoryName.value })) })
</script>

<template>
  <div class="page-category">
    <div class="container">
      <header class="page-head">
        <NuxtLink to="/categories" class="back-link">{{ ui.collection.backToCategories }}</NuxtLink>
        <h1 class="page-title">{{ categoryName }}</h1>
        <p class="page-meta">{{ t(ui.common.count, { n: data?.posts.length ?? 0 }) }}</p>
      </header>

      <PostList :posts="data?.posts ?? []" :show-tags="true" />
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
