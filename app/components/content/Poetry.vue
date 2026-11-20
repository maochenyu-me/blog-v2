<script setup lang="ts">
defineProps<{
  title?: string
  author?: string
  footer?: string
}>()
</script>

<template>
<section class="poetry">
  <h2 class="poetry-title">
    {{ title }}
  </h2>
  <div class="poetry-author">
    {{ author }}
  </div>
  <div class="poetry-content">
    <slot />
  </div>
  <div class="poetry-footer" v-if="footer">
    {{ footer }}
  </div>
</section>
</template>

<style scoped>
.poetry {
  width: fit-content;
  margin: 2em auto;
  text-align: center;
  white-space: pre-wrap;

  .poetry-title {
    font-size: 1.2em;
    margin-bottom: 0.25em;
  }

  .poetry-author {
    color: var(--muted-foreground);
    font-size: var(--text-meta);
    margin-bottom: 1em;
  }

  .poetry-content {
    text-align: start;
  }

  .poetry-footer {
    margin-top: 1em;
    color: var(--muted-foreground);
    font-size: var(--text-meta);
  }

  :deep(p) {
    width: fit-content;
    margin: 0.5em auto;
  }
}
</style>
