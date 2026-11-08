<script setup lang="ts">
import type { SiteCard } from '~/data/about'

defineProps<{
  cards: SiteCard[]
}>()
</script>

<template>
  <AboutCard class="sitecards-card">
    <div v-for="card in cards" :key="card.title" class="card-block">
      <h3 class="block-title">
        <Icon :name="card.icon" aria-hidden="true" />
        {{ card.title }}
      </h3>

      <div v-if="card.body" class="block-body">
        <p v-for="para in card.body.split('\n\n')" :key="para">{{ para }}</p>
      </div>

      <ul v-if="card.links" class="block-links">
        <li v-for="l in card.links" :key="l.text">
          <a
            v-if="l.href"
            :href="l.href"
            :target="l.href.startsWith('http') ? '_blank' : undefined"
            :rel="l.href.startsWith('http') ? 'noopener noreferrer' : undefined"
          >{{ l.text }}</a>
          <span v-else>{{ l.text }}</span>
        </li>
      </ul>
    </div>
  </AboutCard>
</template>

<style scoped>
.card-block {
  padding-bottom: 0.875rem;
  border-bottom: 1px solid var(--border);
}

.card-block:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.block-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--muted-foreground);
}

.block-title svg {
  width: 1rem;
  height: 1rem;
  color: var(--accent);
}

.block-body p {
  margin: 0 0 0.375rem;
  font-size: var(--fs-meta);
  line-height: 1.7;
  color: var(--muted-foreground);
}

.block-body p:last-child { margin-bottom: 0; }

.block-links {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.block-links li {
  font-size: var(--fs-meta);
  line-height: 1.6;
  color: var(--muted-foreground);
}

.block-links a {
  color: var(--accent);
  text-decoration: none;
}

.block-links a:hover { text-decoration: underline; }
</style>
