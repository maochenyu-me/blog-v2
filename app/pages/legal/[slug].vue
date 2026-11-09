<script setup lang="ts">
const route = useRoute()
const { site } = useBlogConfig()
const { ui } = useUi()

const path = computed(() => `/legal/${route.params.slug as string}`)

const { data: page } = await useAsyncData(
  () => `legal-${path.value}`,
  () => queryCollection('legal').path(path.value).first(),
  { watch: [path] },
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: ui.legal.notFound })
}

const canonical = computed(() => `${site.url}${path.value}`)

useHead({
  title: computed(() => page.value?.title ?? ''),
  meta: [{ property: 'og:url', content: canonical }],
  link: [{ rel: 'canonical', href: canonical }],
})

const { data: siblings } = await useAsyncData('legal-siblings', () =>
  queryCollection('legal').all(),
)
</script>

<template>
  <div v-if="page" class="page-legal">
    <div class="legal-shell">
      <h1 class="legal-title">{{ page.title }}</h1>

      <ProseBody>
        <ContentRenderer :value="page" />
      </ProseBody>

      <nav v-if="siblings?.length && siblings.length > 1" class="legal-siblings" :aria-label="ui.legal.navAria">
        <NuxtLink
          v-for="item in siblings"
          :key="item.path"
          :to="item.path"
          class="legal-sibling"
          :class="{ 'legal-sibling--current': item.path === path }"
        >
          {{ item.title }}
        </NuxtLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.page-legal {
  padding-block: var(--space-section) var(--space-block);
}

.legal-shell {
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.legal-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
  margin-bottom: var(--space-block);
}

.legal-siblings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  margin-top: var(--space-block);
  padding-top: var(--space-item);
  border-top: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
}

.legal-sibling {
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.legal-sibling:hover {
  color: var(--foreground);
}

.legal-sibling--current {
  color: var(--accent);
}
</style>
