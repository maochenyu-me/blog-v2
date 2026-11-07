<script setup lang="ts">
const { site } = useBlogConfig()
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink to="/" class="wordmark" :aria-label="site.name">
        {{ site.name }}
      </NuxtLink>

      <NavDropdown :items="site.nav" />

      <div class="header-actions">
        <SearchTrigger />
        <!-- 目录按钮只出现在文章页（<1280px），内部自行判断是否显示 -->
        <MobileToc />
        <ThemeToggle />
        <MobileDrawer />
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
  height: var(--header-height);
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
