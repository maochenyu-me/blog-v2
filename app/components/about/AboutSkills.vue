<script setup lang="ts">
defineProps<{
  tips: string
  title: string
  icons: string[]
}>()
</script>

<template>
  <AboutCard class="skills-card">
    <div class="skills-inner">
      <p class="skills-tips">{{ tips }}</p>
      <p class="skills-title">{{ title }}</p>
      <ul class="skill-wall">
        <li v-for="icon in icons" :key="icon" class="skill-icon">
          <Icon :name="icon" aria-hidden="true" />
          <span class="visually-hidden">{{ icon.split(':').pop() }}</span>
        </li>
      </ul>
    </div>
  </AboutCard>
</template>

<style scoped>
.skills-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  min-height: 160px;
}

.skills-tips {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.skills-title {
  margin: 0.375rem 0 1rem;
  font-size: calc(var(--fs-h1) * 1.15);
  font-weight: 700;
  line-height: 1.1;
}

.skill-wall {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skill-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--background) 60%, transparent);
  color: var(--foreground);
  transition:
    transform var(--duration-base) var(--ease-base),
    border-color var(--duration-base) var(--ease-base),
    color var(--duration-base) var(--ease-base);
}

.skill-icon:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--accent);
}

.skill-icon svg {
  width: 24px;
  height: 24px;
}
</style>
