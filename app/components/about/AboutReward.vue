<script setup lang="ts">
import type { RewardItem } from '~/data/about'

const props = defineProps<{
  tips: string
  title: string
  desc: string
  items: RewardItem[]
  donateLabel: string
  donateTo?: string
  emptyText: string
}>()

/** "10 CNY" → 10；解析失败返回 0 */
function amountNum(amount: string): number {
  return parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
}

const sorted = computed(() =>
  [...props.items].sort((a, b) => amountNum(b.amount) - amountNum(a.amount)),
)

function fmt(amount: string): string {
  return `¥${amountNum(amount)}`
}
</script>

<template>
  <AboutCard class="reward-card">
    <p class="reward-tips">{{ tips }}</p>
    <p class="reward-title">{{ title }}</p>
    <p class="reward-desc">{{ desc }}</p>

    <div v-if="sorted.length" class="reward-list">
      <div v-for="s in sorted" :key="`${s.name}-${s.date}`" class="reward-item">
        <span class="reward-name">{{ s.name }}</span>
        <span class="reward-bottom">
          <span class="reward-amount" :class="{ 'reward-amount--hl': amountNum(s.amount) >= 50 }">
            {{ fmt(s.amount) }}
          </span>
          <span class="reward-time">{{ s.date }}</span>
        </span>
      </div>
    </div>
    <p v-else class="reward-empty">{{ emptyText }}</p>

    <div v-if="donateTo" class="reward-actions">
      <NuxtLink :to="donateTo" class="reward-btn">
        <Icon name="tabler:coffee" aria-hidden="true" />
        {{ donateLabel }}
      </NuxtLink>
    </div>
  </AboutCard>
</template>

<style scoped>
.reward-tips {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.reward-title {
  margin-top: 0.375rem;
  font-size: calc(var(--fs-h1) * 1.15);
  font-weight: 700;
  line-height: 1.1;
}

.reward-desc {
  margin-top: 0.5rem;
  font-size: var(--fs-meta);
  line-height: 1.7;
  color: var(--muted-foreground);
}

.reward-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
}

.reward-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--background) 60%, transparent);
}

.reward-name {
  font-size: var(--fs-meta);
  font-weight: 700;
}

.reward-bottom {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.reward-amount {
  padding: 1px 6px;
  border-radius: calc(var(--radius) - 0.25rem);
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.reward-amount--hl {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

.reward-time {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.reward-empty {
  margin-top: 1rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.reward-actions { margin-top: 1rem; }

.reward-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: var(--fs-meta);
  font-weight: 700;
  text-decoration: none;
  transition: transform var(--duration-base) var(--ease-base);
}

.reward-btn:hover { transform: translateY(-1px); }

.reward-btn svg {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .reward-list { grid-template-columns: 1fr; }
}
</style>
