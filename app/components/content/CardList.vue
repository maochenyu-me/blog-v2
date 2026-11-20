<template>
<div class="card-list">
  <slot />
</div>
</template>

<style scoped>
:deep() {
  :where(ol, ul):not([class]) {
    margin: 0;
    padding-inline-start: 0;
    list-style: none;

    > li {
      margin: 0;
    }
  }

  > ol, > ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.75em;

    > li {
      padding: 0.75em 1em;
      border-radius: var(--radius-card);
      background-color: var(--card);
      border: 1px solid var(--border);
      transition: box-shadow 0.2s var(--ease-base);

      &:hover {
        box-shadow: 0 2px 8px color-mix(in srgb, var(--foreground) 8%, transparent);
      }
    }
  }
}
</style>
