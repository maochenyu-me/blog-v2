<script setup lang="ts">
const { site } = useBlogConfig()
const { ui } = useUi()
const route = useRoute()

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink to="/" class="wordmark" :aria-label="site.name">
        {{ site.name }}
      </NuxtLink>

      <nav class="nav-desktop" :aria-label="ui.nav.main">
        <NuxtLink
          v-for="item in site.nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <SearchTrigger />
        <ThemeToggle />
        <MobileNav />
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: var(--background);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  max-width: var(--wide-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
  height: 3.5rem;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.wordmark {
  font-size: var(--fs-body);
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.nav-desktop {
  display: none;
  align-items: center;
  gap: 1.5rem;
  margin-inline-start: auto;
}

.nav-link {
  font-size: var(--fs-meta);
  line-height: 1;
  color: var(--muted-foreground);
  padding-block: 0.25rem;
  border-bottom: 1px solid transparent;
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.nav-link:hover {
  color: var(--foreground);
}

/* 强调色使用的四处之一：当前导航项的下划线 */
.nav-link.is-active {
  color: var(--foreground);
  border-bottom-color: var(--accent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-inline-start: auto;
}

@media (min-width: 1024px) {
  .nav-desktop {
    display: flex;
    margin-inline-start: 0;
  }

  .header-actions {
    margin-inline-start: auto;
  }
}
</style>
