<script setup lang="ts">
/**
 * 文章底部版权信息卡：标题 + 永久链接 + 四列 meta（作者/发布/更新/版权）+ 标签 + 打赏按钮。
 * 移植自 wxuyu.top 的 PostFooter，按本站 token 体系重写。
 */
import { toSlug } from '~/utils/taxonomy'

const props = defineProps<{
  title: string
  url: string
  author: string
  date: string
  updated?: string
  tags?: string[]
  license: string
  licenseUrl: string
  showReward: boolean
}>()

defineEmits<{ reward: [] }>()

const { ui, t } = useUi()
const { iso } = useDateFormat()
</script>

<template>
  <section class="post-footer-card" :aria-label="t(ui.post.copyrightAria)">
    <div class="copyright-badge">
      <Icon name="ph:copyright-bold" />
    </div>

    <h3 class="footer-title">{{ title }}</h3>
    <p class="footer-url">{{ url }}</p>

    <dl class="footer-meta">
      <div class="meta-col">
        <dt>{{ t(ui.post.copyrightAuthor) }}</dt>
        <dd>{{ author }}</dd>
      </div>
      <div class="meta-col">
        <dt>{{ t(ui.post.copyrightPublished) }}</dt>
        <dd class="meta-num">{{ iso(date) }}</dd>
      </div>
      <div v-if="updated" class="meta-col">
        <dt>{{ t(ui.post.copyrightUpdated) }}</dt>
        <dd class="meta-num">{{ iso(updated) }}</dd>
      </div>
      <div class="meta-col">
        <dt>{{ t(ui.post.copyrightLicense) }}</dt>
        <dd>
          <a :href="licenseUrl" target="_blank" rel="noopener noreferrer" class="license-link">
            {{ license }}
            <Icon name="ph:arrow-square-out-bold" />
          </a>
        </dd>
      </div>
    </dl>

    <div class="footer-bottom">
      <ul v-if="tags?.length" class="footer-tags">
        <li v-for="tag in tags" :key="tag">
          <NuxtLink :to="`/tags/${toSlug(tag)}`" class="footer-tag">{{ tag }}</NuxtLink>
        </li>
      </ul>

      <button v-if="showReward" class="reward-btn" @click="$emit('reward')">
        <Icon name="ph:sparkle" />
        {{ t(ui.post.rewardButton) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.post-footer-card {
  position: relative;
  margin-bottom: var(--space-block);
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background-color: var(--card);
}

.copyright-badge {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  font-size: 2rem;
  color: var(--border);
  opacity: 0.6;
}

.footer-title {
  padding-right: 2.5rem;
  font-size: var(--fs-body-h);
  font-weight: var(--fw-body-h);
  line-height: var(--lh-body-h);
}

.footer-url {
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  word-break: break-all;
}

.footer-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.25rem 0 0;
}

.meta-col {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.meta-col dt {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.meta-col dd {
  margin: 0;
  font-size: var(--fs-meta);
  font-weight: 500;
  line-height: 1.6;
  color: var(--foreground);
}

.meta-num {
  font-variant-numeric: tabular-nums;
}

.license-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: color var(--duration-base) var(--easing-base);
}

.license-link:hover {
  color: var(--accent);
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.footer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.footer-tag {
  display: inline-flex;
  align-items: center;
  height: 2rem;
  padding: 0 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  transition: border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.footer-tag::before {
  content: '#';
  opacity: 0.5;
}

.footer-tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.reward-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  margin-left: auto;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--card);
  font-size: var(--fs-meta);
  color: var(--foreground);
  cursor: pointer;
  transition: border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.reward-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.reward-btn :deep(.icon) {
  font-size: 1.05em;
}

@media (max-width: 600px) {
  .post-footer-card {
    padding: 1.1rem;
  }

  .footer-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reward-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
