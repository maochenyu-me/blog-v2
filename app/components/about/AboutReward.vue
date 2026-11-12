<script setup lang="ts">
import type { RewardItem } from '~/data/about'

const props = defineProps<{
  tips: string
  title: string
  desc: string
  stats: string
  chargeLabel: string
  countText: string
  items: RewardItem[]
  emptyText: string
}>()

/** 日期倒序（最新的在前），同日按金额降序 */
const sorted = computed(() =>
  [...props.items].sort((a, b) =>
    b.date.localeCompare(a.date) || b.amount - a.amount),
)

const total = computed(() =>
  props.items.reduce((acc, s) => acc + (Number(s.amount) || 0), 0),
)

/** 整数金额不带小数位，非整数保留两位 */
function fmt(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

const statsText = computed(() =>
  props.stats
    .replace('{count}', String(props.items.length))
    .replace('{sum}', fmt(total.value)),
)

const countDisplay = computed(() =>
  props.countText.replace('{count}', String(props.items.length)),
)

/** 头像加载失败降级为首字占位圆 */
const brokenAvatars = reactive(new Set<string>())

/** 充电按钮 → 打赏弹窗 */
const rewardOpen = ref(false)

function onAvatarError(name: string) {
  brokenAvatars.add(name)
}
</script>

<template>
  <AboutCard class="reward-card">
    <div class="reward-head">
      <div class="reward-heading">
        <p class="reward-tips">{{ tips }}</p>
        <p class="reward-title">{{ title }}</p>
        <p class="reward-desc">{{ desc }}</p>
      </div>

      <!-- 右上角充电按钮：点击弹出打赏中心（二维码 + 加入名单） -->
      <button type="button" class="charge-group" @click="rewardOpen = true">
        <span class="charge-btn">
          <Icon name="tabler:bolt-filled" class="charge-bolt" aria-hidden="true" />
          {{ chargeLabel }}
        </span>
        <svg class="charge-circuit" viewBox="0 0 132 44" aria-hidden="true">
          <g class="c-lines" fill="none" stroke-width="2" stroke-linecap="round">
            <path class="c-line" d="M2 8 H96" />
            <path class="c-line" d="M2 20 H64" />
            <path class="c-line" d="M2 32 H96" />
            <path class="c-line" d="M64 20 H112" />
          </g>
          <g class="c-dots">
            <circle class="c-dot" cx="101" cy="8" r="3" />
            <circle class="c-dot" cx="69" cy="20" r="3" />
            <circle class="c-dot" cx="101" cy="32" r="3" />
            <circle class="c-dot" cx="117" cy="20" r="3" />
          </g>
        </svg>
        <span class="charge-count">{{ countDisplay }}</span>
      </button>
    </div>

    <template v-if="sorted.length">
      <p class="reward-stats">
        <Icon name="tabler:heart-filled" aria-hidden="true" />
        {{ statsText }}
      </p>

      <ul class="reward-list">
        <li v-for="s in sorted" :key="`${s.name}-${s.date}`" class="reward-item">
          <img
            v-if="s.avatar && !brokenAvatars.has(s.name)"
            class="reward-avatar"
            :src="s.avatar"
            :alt="s.name"
            loading="lazy"
            @error="onAvatarError(s.name)"
          >
          <span v-else class="reward-avatar reward-avatar--fallback" aria-hidden="true">
            {{ s.name.slice(0, 1) }}
          </span>

          <span class="reward-meta">
            <span class="reward-name">{{ s.name }}</span>
            <span class="reward-time">{{ s.date }}</span>
          </span>

          <span class="reward-amount">¥{{ fmt(s.amount) }}</span>
        </li>
      </ul>
    </template>
    <p v-else class="reward-empty">{{ emptyText }}</p>
  </AboutCard>

  <!-- 打赏中心弹窗：微信/支付宝占位码 + 加入名单（议题模板）；名单就在下方，不重复放入口 -->
  <PostRewardModal :open="rewardOpen" hide-sponsors @close="rewardOpen = false" />
</template>

<style scoped>
.reward-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
}

.reward-heading {
  min-width: 0;
}

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

.reward-stats {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 1rem;
  font-size: var(--fs-meta);
  font-weight: 500;
  color: var(--accent);
}

.reward-stats :deep(.icon) {
  font-size: 1em;
}

.reward-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.625rem;
  margin-top: 0.875rem;
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--card);
  transition: border-color var(--duration-base) var(--easing-base);
}

.reward-item:hover {
  border-color: var(--accent);
}

.reward-avatar {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 1px solid var(--border);
}

.reward-avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 700;
}

.reward-meta {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
}

.reward-name {
  font-size: var(--fs-meta);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-time {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.reward-amount {
  flex-shrink: 0;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.reward-empty {
  margin-top: 1rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

/* ---------- 右上角：充电按钮 + 电路装饰 ---------- */
.charge-group {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  font: inherit;
}

.charge-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 1.35rem;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 62%, white));
  color: #fff;
  font-size: var(--fs-meta);
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
  transition: transform var(--duration-base) var(--easing-base),
    box-shadow var(--duration-base) var(--easing-base);
  overflow: hidden;
  position: relative;
}

/* hover 扫光 */
.charge-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.5s var(--easing-base);
}

.charge-group:hover .charge-btn::after {
  transform: translateX(120%);
}

.charge-btn :deep(.charge-bolt),
.charge-btn :deep(.icon) {
  font-size: 1.05rem;
  transition: transform var(--duration-base) var(--easing-base);
}

.charge-group:hover .charge-btn {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 55%, transparent);
}

.charge-group:hover .charge-btn :deep(.icon) {
  transform: scale(1.2) rotate(-8deg);
}

.charge-group:active .charge-btn {
  transform: translateY(0);
}

/* 电路装饰线：缓慢的电流流动 */
.charge-circuit {
  width: 7rem;
  height: auto;
  color: var(--border);
}

.c-lines .c-line {
  stroke: currentColor;
  stroke-dasharray: 5 9;
  animation: charge-flow 1.6s linear infinite;
}

.c-dots .c-dot {
  fill: var(--accent);
}

.c-dots .c-dot:nth-child(2) {
  animation: charge-pulse 1.6s ease-in-out infinite;
}

.c-dots .c-dot:nth-child(4) {
  animation: charge-pulse 1.6s ease-in-out 0.5s infinite;
}

@keyframes charge-flow {
  to {
    stroke-dashoffset: -14;
  }
}

@keyframes charge-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.charge-count {
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .reward-head {
    flex-direction: column;
  }

  /* 窄屏收起电路装饰，按钮保持可点 */
  .charge-circuit {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .charge-btn,
  .charge-btn::after,
  .charge-btn :deep(.icon) {
    transition: none;
  }

  .charge-btn::after {
    display: none;
  }

  .c-lines .c-line,
  .c-dots .c-dot {
    animation: none;
  }
}

@media (max-width: 1024px) {
  .reward-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .reward-list { grid-template-columns: 1fr; }
}
</style>
