<script setup lang="ts">
const route = useRoute()
const { ui, t } = useUi()
const posts = usePosts()
const tag = computed(() => decodeURIComponent(route.params.slug as string))

const { data } = await useAsyncData(
  () => `tag-${tag.value}`,
  () => posts.byTag(tag.value),
  { watch: [tag] },
)

if (!data.value?.length) {
  throw createError({ statusCode: 404, statusMessage: ui.collection.notFoundTag })
}

useHead({ title: computed(() => t(ui.collection.tagTitle, { name: tag.value })) })
</script>

<template>
  <div class="page-tag">
    <div class="container">
      <header class="page-head">
        <NuxtLink to="/tags" class="back-link">{{ ui.collection.backToTags }}</NuxtLink>
        <h1 class="page-title">{{ tag }}</h1>
        <p class="page-meta">{{ t(ui.common.count, { n: data?.length ?? 0 }) }}</p>
      </header>

      <PostList :posts="data ?? []" :show-tags="false" />
    </div>
  </div>
</template>

<style scoped>
.page-tag {
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
