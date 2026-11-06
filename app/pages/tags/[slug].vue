<script setup lang="ts">
import { fromSlugParam } from '~/utils/taxonomy'

const route = useRoute()
const { ui, t } = useUi()
const posts = usePosts()
const slug = computed(() => fromSlugParam(route.params.slug as string))

/*
 * slug 是有损转换（去掉了标点与大小写），不能直接当标签名用。
 * 必须先拿 slug 反查出原始标签名，再用原名查文章，
 * 否则「View Transitions」这类标签会查不到任何文章。
 */
const { data } = await useAsyncData(
  () => `tag-${slug.value}`,
  async () => {
    const name = await posts.tagBySlug(slug.value)
    if (!name) return { name: slug.value, posts: [] }
    return { name, posts: await posts.byTag(name) }
  },
  { watch: [slug] },
)

if (!data.value?.posts.length) {
  throw createError({ statusCode: 404, statusMessage: ui.collection.notFoundTag })
}

const tagName = computed(() => data.value?.name ?? slug.value)

useHead({ title: computed(() => t(ui.collection.tagTitle, { name: tagName.value })) })
</script>

<template>
  <div class="page-tag">
    <div class="container">
      <header class="page-head">
        <NuxtLink to="/tags" class="back-link">{{ ui.collection.backToTags }}</NuxtLink>
        <h1 class="page-title">{{ tagName }}</h1>
        <p class="page-meta">{{ t(ui.common.count, { n: data?.posts.length ?? 0 }) }}</p>
      </header>

      <PostList :posts="data?.posts ?? []" :show-tags="false" />
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
