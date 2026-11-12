<script setup lang="ts">
import { marked } from 'marked'
import { ech0Images, formatEch0Time, type Ech0Echo } from '~/utils/ech0'
import ShuoshuoExtension from './ShuoshuoExtension.vue'
import ShuoshuoReactions from './ShuoshuoReactions.vue'
import ShuoshuoComments from './ShuoshuoComments.vue'

marked.use({ breaks: true, gfm: true })

const props = defineProps<{
  echo: Ech0Echo
  apiBase: string
  displayName: string
  avatar: string
  reactionsEnabled: boolean
  commentsEnabled: boolean
}>()

const { ui, t } = useUi()

const name = computed(() => props.displayName || props.echo.username || '')
const avatarSrc = computed(() => props.avatar)
const timeText = computed(() =>
  formatEch0Time(props.echo.created_at, {
    justNow: ui.shuoshuo.justNow,
    minutesAgo: ui.shuoshuo.minutesAgo,
    hoursAgo: ui.shuoshuo.hoursAgo,
    daysAgo: ui.shuoshuo.daysAgo,
  }),
)
const html = computed(() => marked.parse(props.echo.content, { async: false }) as string)
const images = computed(() => ech0Images(props.echo))
const tags = computed(() => props.echo.tags ?? [])

const commentsOpen = ref(false)
const commentCount = ref<number | null>(null)

const commentsBtnText = computed(() => {
  if (commentCount.value === null) return ui.shuoshuo.commentsToggle
  return t(ui.shuoshuo.commentsAria, { n: commentCount.value })
})
</script>

<template>
  <article class="ss-card">
    <header class="ss-head">
      <img
        class="ss-avatar"
        :src="avatarSrc"
        :alt="t(ui.shuoshuo.avatarAlt, { name })"
        width="36"
        height="36"
        loading="lazy"
        decoding="async"
      />
      <div class="ss-head-text">
        <span class="ss-name">{{ name }}</span>
        <time class="ss-time" :datetime="new Date(echo.created_at * 1000).toISOString()">{{ timeText }}</time>
      </div>
    </header>

    <div class="ss-content" v-html="html"></div>

    <div v-if="images.length" class="ss-imgs" :class="{ 'is-single': images.length === 1 }">
      <a
        v-for="img in images"
        :key="img.id"
        class="ss-img-link"
        :href="img.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img class="ss-img" :src="img.url" :alt="img.name || ''" loading="lazy" decoding="async" />
      </a>
    </div>

    <ShuoshuoExtension v-if="echo.extension" :extension="echo.extension" />

    <ul v-if="tags.length" class="ss-tags" aria-label="tags">
      <li v-for="tag in tags" :key="tag.id" class="ss-tag">#{{ tag.name }}</li>
    </ul>

    <footer class="ss-foot">
      <ShuoshuoReactions v-if="reactionsEnabled || (echo.reactions?.length ?? 0) > 0" :echo="echo" :api-base="apiBase" :enabled="reactionsEnabled" />
      <button
        v-if="commentsEnabled"
        type="button"
        class="ss-cmt-btn"
        :aria-expanded="commentsOpen"
        @click="commentsOpen = !commentsOpen"
      >
        <Icon name="tabler:message-circle" aria-hidden="true" />
        <span>{{ commentsBtnText }}</span>
      </button>
    </footer>

    <ShuoshuoComments
      v-if="commentsOpen && commentsEnabled"
      :echo-id="echo.id"
      :api-base="apiBase"
      @count-change="(n) => (commentCount = n)"
    />
  </article>
</template>

<style scoped>
.ss-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-item);
  margin-bottom: 1rem;
  break-inside: avoid;
}

.ss-head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.ss-avatar {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  object-fit: cover;
}

.ss-head-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ss-name {
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.4;
}

.ss-time {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.ss-content {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.ss-content :deep(p) {
  margin: 0 0 0.5em;
}

.ss-content :deep(p:last-child) {
  margin-bottom: 0;
}

.ss-content :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.ss-content :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--fs-code);
  background: var(--muted);
  border-radius: calc(var(--radius) / 2);
  padding: 0.1em 0.35em;
}

.ss-content :deep(pre) {
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.625rem 0.75rem;
  overflow-x: auto;
  font-size: var(--fs-code);
}

.ss-content :deep(pre code) {
  background: none;
  padding: 0;
}

.ss-content :deep(img) {
  max-width: 100%;
  border-radius: var(--radius);
  display: block;
}

.ss-content :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 0.75em;
  border-left: 2px solid var(--border);
  color: var(--muted-foreground);
}

.ss-imgs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.375rem;
}

.ss-imgs.is-single {
  grid-template-columns: 1fr;
}

.ss-img-link {
  display: block;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}

.ss-img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

.ss-tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ss-tag {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-family: var(--font-mono);
}

.ss-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: auto;
}

.ss-cmt-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-base);
  background: var(--card);
  padding: 0.25rem 0.625rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    border-color var(--duration-base) var(--easing-base),
    color var(--duration-base) var(--easing-base);
}

.ss-cmt-btn:hover,
.ss-cmt-btn[aria-expanded='true'] {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
