<script setup lang="ts">
defineProps<{
  prefix: string
  tips: string
  name: string
  intro: string
}>()
</script>

<template>
  <AboutCard class="hello-card">
    <div class="hello-inner">
      <p class="hello-tips">{{ tips }}</p>
      <p class="hello-title">
        {{ prefix }} <span class="hello-name">{{ name }}</span>
      </p>
      <p class="hello-intro">{{ intro }}</p>
    </div>
  </AboutCard>
</template>

<style scoped>
.hello-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  min-height: 180px;
}

.hello-tips {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.hello-title {
  margin: 0.375rem 0;
  font-size: calc(var(--fs-h1) * 1.15);
  line-height: 1.2;
  font-weight: 700;
}

.hello-name {
  color: var(--accent);
  white-space: nowrap;
}

.hello-intro {
  font-size: var(--fs-body);
  line-height: 1.75;
  color: var(--muted-foreground);
  max-width: 36em;
}
</style>
