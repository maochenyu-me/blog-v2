<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <details class="folding">
    <summary>
      <slot name="title">
        {{ title }}
      </slot>
    </summary>
    <div class="folding-body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.folding {
  margin: 1rem 0;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  background-color: var(--muted);
  font-size: 0.9375rem;
}

.folding[open] > summary {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--foreground);
}

.folding[open] > summary::after {
  content: "收起";
}

.folding > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
  user-select: none;
  list-style: none;
}

.folding > summary::-webkit-details-marker {
  display: none;
}

.folding > summary::after {
  content: "展开";
  flex: none;
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--muted-foreground);
  opacity: 0.7;
  transition: opacity var(--duration-base) var(--easing-base);
}

.folding > summary:hover {
  color: var(--foreground);
}

.folding > summary:hover::after {
  opacity: 1;
}

.folding-body > :deep(p:first-child) {
  margin-top: 0;
}

.folding-body > :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
