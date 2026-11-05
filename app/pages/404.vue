<script setup lang="ts">
const { systemMessages } = await import('~/data/system')
const msg = systemMessages.notFound

useHead({ title: `${msg.code} ${msg.title}` })
</script>

<template>
  <div class="page-404">
    <div class="inner">
      <p class="code">{{ msg.code }}</p>
      <h1 class="title">{{ msg.title }}</h1>
      <p class="desc">{{ msg.description }}</p>
      <NuxtLink :to="msg.action.to" class="action">{{ msg.action.label }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.page-404 {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-section) var(--space-gutter);
}

.inner {
  max-width: 30rem;
  text-align: left;
}

.code {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--accent);
  margin-bottom: 0.75rem;
}

.title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.desc {
  margin-top: 0.75rem;
  color: var(--muted-foreground);
}

.action {
  display: inline-block;
  margin-top: 1.5rem;
  font-size: var(--fs-meta);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.125rem;
  transition: border-color var(--duration-base) var(--easing-base);
}

.action:hover {
  border-bottom-color: var(--accent);
}
</style>
