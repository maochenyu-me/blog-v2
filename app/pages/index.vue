<script setup lang="ts">
const { site } = useBlogConfig()
const { ui } = useUi()
const pageCfg = usePageConfig('home')
const posts = usePosts()

const { data } = await useAsyncData('home-posts', async () => {
  const [pinned, latest] = await Promise.all([
    posts.pinned(pageCfg.pinnedCount),
    posts.latest(pageCfg.latestCount),
  ])
  return { pinned, latest }
})

useHead({
  title: site.name,
  meta: [{ name: 'description', content: site.description }],
})
</script>

<template>
  <div class="page-home">
    <div class="container">
      <section class="hero">
        <h1 class="hero-name">{{ site.author.name }}</h1>
        <p class="hero-bio">{{ site.author.bio }}</p>
      </section>

      <section v-if="data?.pinned.length" class="section">
        <h2 class="section-label">{{ ui.pages.home.pinned }}</h2>
        <PostList :posts="data.pinned" :show-tags="true" />
      </section>

      <section class="section">
        <h2 class="section-label">{{ ui.pages.home.latest }}</h2>
        <PostList :posts="data?.latest ?? []" :show-tags="true" />
      </section>

      <div class="cta-row">
        <NuxtLink :to="pageCfg.cta.to" class="cta-link">
          {{ pageCfg.cta.label }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-home {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.hero {
  margin-bottom: var(--space-section);
}

.hero-name {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.hero-bio {
  margin-top: 0.75rem;
  color: var(--muted-foreground);
  max-width: 42ch;
}

.section + .section {
  margin-top: var(--space-block);
}

.section-label {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  font-weight: 400;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  margin-bottom: 0.75rem;
}

.cta-row {
  margin-top: var(--space-block);
}

.cta-link {
  display: inline-block;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.125rem;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.cta-link:hover {
  color: var(--foreground);
  border-bottom-color: var(--accent);
}
</style>
