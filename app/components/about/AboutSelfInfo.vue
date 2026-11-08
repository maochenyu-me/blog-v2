<script setup lang="ts">
import type { SelfInfoItem } from '~/data/about'

defineProps<{
  items: SelfInfoItem[]
}>()
</script>

<template>
  <AboutCard class="selfinfo-card">
    <div
      v-for="item in items"
      :key="item.label"
      class="selfinfo-item"
      :style="{ '--selfinfo-accent': item.accent || 'var(--accent)' }"
    >
      <span class="selfinfo-icon" aria-hidden="true">
        <Icon :name="item.icon" />
      </span>
      <span class="selfinfo-value">{{ item.value }}</span>
      <span class="selfinfo-label">{{ item.label }}</span>
    </div>
  </AboutCard>
</template>

<style scoped>
.selfinfo-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 0.75rem;
  min-height: 220px;
}

.selfinfo-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.selfinfo-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 0.75rem;
  border-radius: 50%;
  color: var(--selfinfo-accent);
  background: color-mix(in srgb, var(--selfinfo-accent) 14%, transparent);
}

.selfinfo-icon svg {
  width: 22px;
  height: 22px;
}

.selfinfo-value {
  max-width: 100%;
  font-size: calc(var(--fs-h1) * 0.86);
  line-height: 1.15;
  font-weight: 700;
  color: var(--selfinfo-accent);
  overflow-wrap: anywhere;
}

.selfinfo-label {
  margin-top: 0.375rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

@media (max-width: 768px) {
  .selfinfo-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-height: 0;
    padding-block: var(--space-item);
    row-gap: var(--space-item);
  }
}
</style>
