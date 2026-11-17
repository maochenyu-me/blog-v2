<script setup lang="ts">
import { equipmentConfig, equipmentCount, type EquipmentItem } from '~/data/equipment'

const { ui, t } = useUi()
const text = ui.equipment
const { site } = useBlogConfig()
const quote = ref('')
const commentSection = ref<HTMLElement | null>(null)

function focusCommentForm(): boolean {
  const textarea = commentSection.value?.querySelector<HTMLTextAreaElement>('.ecoku-textarea')
  if (!textarea) return false
  textarea.focus({ preventScroll: true })
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}

function quoteEquipment(item: EquipmentItem) {
  const content = item.description.trim()
  if (!content) return
  quote.value = content
  nextTick(() => {
    if (!focusCommentForm()) window.setTimeout(focusCommentForm, 500)
  })
}

function includeQuote(event: SubmitEvent) {
  if (!quote.value || !commentSection.value) return
  const form = event.target
  if (!(form instanceof HTMLFormElement) || !form.classList.contains('ecoku-composer')) return
  const textarea = form.querySelector<HTMLTextAreaElement>('.ecoku-textarea')
  if (!textarea) return
  const prefix = `> ${quote.value.replace(/\n/g, '\n> ')}\n\n`
  if (!textarea.value.startsWith(prefix)) {
    textarea.value = `${prefix}${textarea.value}`
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

onMounted(() => commentSection.value?.addEventListener('submit', includeQuote, true))
onBeforeUnmount(() => commentSection.value?.removeEventListener('submit', includeQuote, true))

useSeoMeta({
  title: equipmentConfig.title,
  description: equipmentConfig.description,
})
</script>

<template>
  <div class="page-equipment">
    <div class="container">
      <SiteBreadcrumb />

      <header class="page-head glass-panel">
        <div class="page-heading">
          <p class="page-kicker"><span class="kicker-line" />{{ equipmentConfig.title }}</p>
          <h1 class="page-title">{{ equipmentConfig.englishTitle }}<span class="title-period">.</span></h1>
          <p class="page-desc">{{ equipmentConfig.description }}</p>
        </div>
        <div class="page-count" :aria-label="text.countAria">
          <strong>{{ String(equipmentCount).padStart(2, '0') }}</strong>
          <span>ITEMS</span>
        </div>
      </header>

      <figure class="equipment-banner">
        <img
          class="banner-image"
          :src="equipmentConfig.bannerImage"
          :alt="text.bannerAlt"
          fetchpriority="high"
          decoding="async"
        >
        <div class="banner-overlay" />
        <figcaption class="banner-caption">
          <span class="banner-index">GEAR / 01</span>
          <span>{{ text[equipmentConfig.noteKey] }}</span>
        </figcaption>
      </figure>

      <div class="content-heading">
        <div>
          <p class="section-kicker">{{ text.sectionKicker }}</p>
          <h2>{{ text.listTitle }}</h2>
        </div>
        <p class="content-total">{{ t(text.categoryCount, { categories: equipmentConfig.categories.length, items: equipmentCount }) }}</p>
      </div>

      <div class="category-list">
        <section
          v-for="(category, categoryIndex) in equipmentConfig.categories"
          :key="category.title"
          class="category-section"
          :aria-labelledby="`equipment-category-${categoryIndex}`"
        >
          <header class="category-heading">
            <span class="category-index">{{ String(categoryIndex + 1).padStart(2, '0') }}</span>
            <div class="category-copy">
              <h3 :id="`equipment-category-${categoryIndex}`">{{ category.title }}</h3>
              <p>{{ category.description }}</p>
            </div>
            <span class="category-count">{{ t(text.itemCount, { count: String(category.equipment_list.length).padStart(2, '0') }) }}</span>
          </header>

          <ul class="equipment-grid">
            <li
              v-for="(item, itemIndex) in category.equipment_list"
              :key="item.name"
              class="equipment-card"
              :style="{ '--card-delay': `${Math.min(itemIndex, 7) * 55}ms` }"
            >
              <a
                class="equipment-image-link"
                :href="item.link"
                target="_blank"
                rel="nofollow noopener noreferrer"
                :aria-label="t(text.imageLinkAria, { name: item.name })"
              >
                <div class="equipment-image-wrap">
                  <img
                    class="equipment-image"
                    :src="item.image"
                    :alt="item.name"
                    loading="lazy"
                    decoding="async"
                  >
                  <span class="image-corner" aria-hidden="true"><Icon name="tabler:arrow-up-right" /></span>
                </div>
              </a>

              <div class="equipment-copy">
                <p class="item-index">{{ t(text.itemCode, { number: String(itemIndex + 1).padStart(2, '0') }) }}</p>
                <h4 class="equipment-name">{{ item.name }}</h4>
                <p v-if="item.specification" class="equipment-spec">{{ item.specification }}</p>
                <p class="equipment-description">{{ item.description }}</p>
                <div class="equipment-actions">
                  <a
                    class="equipment-link"
                    :href="item.link"
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    <span>{{ text.details }}</span>
                    <Icon name="tabler:arrow-up-right" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    class="equipment-comment-button"
                    :aria-label="t(ui.comment.quoteAria, { name: item.name })"
                    @click="quoteEquipment(item)"
                  >
                    <Icon name="tabler:message-circle" aria-hidden="true" />
                    <span>{{ ui.comment.quote }}</span>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <p class="source-note">
        {{ text[equipmentConfig.noteKey] }}
        <a :href="equipmentConfig.sourceUrl" target="_blank" rel="noopener noreferrer">{{ text.sourceLink }}<Icon name="tabler:arrow-up-right" aria-hidden="true" /></a>
      </p>

      <section ref="commentSection" class="equipment-comments" :aria-label="ui.comment.aria">
        <div v-if="quote" class="equipment-quote">
          <div class="quote-copy">
            <span>{{ ui.comment.quotePrefix }}</span>
            <blockquote>{{ quote }}</blockquote>
          </div>
          <button
            type="button"
            class="quote-clear"
            :aria-label="ui.comment.clearQuoteAria"
            :title="ui.comment.clearQuote"
            @click="quote = ''"
          >
            <Icon name="tabler:x" aria-hidden="true" />
          </button>
        </div>
        <EcokuComments :page-title="`${equipmentConfig.title} · ${site.name}`" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-equipment {
  --gear-ink: var(--foreground);
  --gear-muted: var(--muted-foreground);
  --gear-line: color-mix(in srgb, var(--foreground) 12%, transparent);
  --gear-panel: color-mix(in srgb, var(--card) 88%, var(--background));
  --gear-accent-soft: color-mix(in srgb, var(--accent) 10%, transparent);
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--wide-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

.page-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  margin: 2.25rem 0 2rem;
  padding: 1.25rem 1.5rem;
}

.page-kicker,
.section-kicker,
.item-index,
.banner-index {
  font-family: var(--font-mono);
  letter-spacing: 0.14em;
}

.page-kicker {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 0.65rem;
  color: var(--gear-muted);
  font-size: var(--fs-meta);
}

.kicker-line {
  width: 1.35rem;
  height: 1px;
  background: var(--accent);
}

.page-title {
  margin: 0;
  color: var(--gear-ink);
  font-family: var(--font-mono);
  font-size: clamp(3.2rem, 7.5vw, 6.8rem);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.085em;
}

.title-period {
  color: var(--accent);
}

.page-desc {
  max-width: 42rem;
  margin: 1rem 0 0;
  color: var(--gear-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

.page-count {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: flex-end;
  padding-bottom: 0.45rem;
  color: var(--gear-muted);
  font-family: var(--font-mono);
}

.page-count strong {
  color: var(--gear-ink);
  font-size: clamp(2.6rem, 5vw, 4rem);
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.page-count span {
  margin-top: 0.45rem;
  font-size: 0.62rem;
  letter-spacing: 0.2em;
}

.equipment-banner {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: flex-end;
  min-height: clamp(13rem, 28vw, 24rem);
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--gear-line);
  border-radius: calc(var(--radius) + 0.35rem);
  background: var(--muted);
  animation: banner-in 650ms var(--easing-base) both;
}

.banner-image,
.banner-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.banner-image {
  z-index: -2;
  object-fit: cover;
  object-position: center 48%;
}

.banner-overlay {
  z-index: -1;
  background: linear-gradient(90deg, color-mix(in srgb, var(--background) 88%, transparent), color-mix(in srgb, var(--background) 26%, transparent) 55%, color-mix(in srgb, var(--background) 8%, transparent)), linear-gradient(0deg, color-mix(in srgb, var(--background) 42%, transparent), transparent 55%);
}

.banner-caption {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  width: 100%;
  padding: clamp(1.15rem, 3vw, 2rem);
  color: var(--gear-ink);
}

.banner-caption > span:last-child {
  max-width: 44rem;
  color: var(--gear-muted);
  font-size: var(--fs-meta);
  line-height: 1.8;
  text-align: right;
}

.banner-index {
  flex: none;
  color: var(--accent);
  font-size: 0.68rem;
}

.content-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin: clamp(3.5rem, 7vw, 6rem) 0 2.5rem;
  padding-bottom: 1.15rem;
  border-bottom: 1px solid var(--gear-line);
}

.section-kicker {
  margin: 0 0 0.65rem;
  color: var(--accent);
  font-size: 0.62rem;
}

.content-heading h2 {
  margin: 0;
  color: var(--gear-ink);
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  font-weight: 650;
  letter-spacing: -0.045em;
}

.content-total {
  flex: none;
  margin: 0 0 0.25rem;
  color: var(--gear-muted);
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
}

.content-total span {
  margin-inline: 0.35rem;
  color: var(--accent);
}

.category-section + .category-section {
  margin-top: clamp(3.5rem, 7vw, 5.75rem);
}

.category-heading {
  display: grid;
  grid-template-columns: 3.25rem minmax(0, 1fr) auto;
  align-items: start;
  gap: 1rem;
  margin-bottom: 1.35rem;
}

.category-index {
  padding-top: 0.12rem;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}

.category-copy h3 {
  margin: 0;
  color: var(--gear-ink);
  font-size: clamp(1.25rem, 2.2vw, 1.65rem);
  font-weight: 650;
  letter-spacing: -0.035em;
}

.category-copy p {
  margin: 0.35rem 0 0;
  color: var(--gear-muted);
  font-size: var(--fs-meta);
  line-height: 1.7;
}

.category-count {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--gear-line);
  border-radius: var(--radius-base);
  color: var(--gear-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  white-space: nowrap;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.equipment-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--gear-line);
  border-radius: calc(var(--radius) + 0.2rem);
  background: var(--gear-panel);
  animation: card-in 520ms var(--easing-base) var(--card-delay, 0ms) both;
  transition: border-color var(--duration-base) var(--easing-base), transform var(--duration-base) var(--easing-base);
}

.equipment-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 48%, var(--gear-line));
}

.equipment-image-link {
  display: block;
  color: inherit;
}

.equipment-image-wrap {
  position: relative;
  display: grid;
  place-items: center;
  height: clamp(10.5rem, 16vw, 14rem);
  overflow: hidden;
  border-bottom: 1px solid var(--gear-line);
  background: color-mix(in srgb, var(--muted) 68%, var(--background));
}

.equipment-image {
  display: block;
  width: 82%;
  height: 82%;
  object-fit: contain;
  transition: transform 480ms var(--easing-base);
}

.equipment-card:hover .equipment-image {
  transform: scale(1.055);
}

.image-corner {
  position: absolute;
  right: 0.7rem;
  bottom: 0.7rem;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--gear-line);
  border-radius: 50%;
  background: color-mix(in srgb, var(--card) 86%, transparent);
  color: var(--gear-muted);
  opacity: 0;
  transform: translate(-3px, 3px);
  transition: opacity var(--duration-base) var(--easing-base), transform var(--duration-base) var(--easing-base);
}

.equipment-card:hover .image-corner,
.equipment-image-link:focus-visible .image-corner {
  opacity: 1;
  transform: none;
}

.equipment-copy {
  padding: 1rem 1rem 1.1rem;
}

.item-index {
  margin: 0 0 0.5rem;
  color: var(--accent);
  font-size: 0.56rem;
}

.equipment-name {
  min-height: 2.8em;
  margin: 0;
  color: var(--gear-ink);
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: -0.02em;
}

.equipment-spec {
  margin: 0.35rem 0 0;
  overflow: hidden;
  color: var(--gear-muted);
  font-family: var(--font-mono);
  font-size: 0.67rem;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equipment-description {
  display: -webkit-box;
  min-height: 4.6em;
  margin: 0.75rem 0 0;
  overflow: hidden;
  color: var(--gear-muted);
  font-size: 0.76rem;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.equipment-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.75rem;
  margin-top: 0.65rem;
  color: var(--gear-ink);
  font-size: 0.72rem;
  transition: color var(--duration-base) var(--easing-base);
}

.equipment-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.65rem;
  border-top: 1px solid var(--gear-line);
}

.equipment-actions .equipment-link {
  flex: 1;
  margin-top: 0;
  border-top: 0;
}

.equipment-comment-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0.35rem 0.5rem;
  border: 0;
  border-radius: var(--radius-base);
  background: transparent;
  color: var(--gear-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.68rem;
  transition: color var(--duration-base) var(--easing-base), background var(--duration-base) var(--easing-base);
}

.equipment-comment-button:hover {
  color: var(--accent);
  background: var(--gear-accent-soft);
}

.equipment-comment-button:focus-visible,
.quote-clear:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.equipment-link > .iconify {
  color: var(--accent);
  transition: transform var(--duration-base) var(--easing-base);
}

.equipment-link:hover {
  color: var(--accent);
}

.equipment-link:hover > .iconify {
  transform: translate(2px, -2px);
}

.source-note {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 3rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--gear-line);
  color: var(--gear-muted);
  font-size: 0.68rem;
  line-height: 1.8;
}

.source-note a {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.25rem;
  color: var(--gear-ink);
  text-underline-offset: 3px;
}

.source-note a:hover {
  color: var(--accent);
}

.equipment-comments {
  margin-top: clamp(3rem, 7vw, 6rem);
  scroll-margin-top: calc(var(--header-height) + 1rem);
}

.equipment-quote {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 var(--space-gutter) 0;
  padding: 0.8rem 0.9rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--accent) 34%, var(--border));
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-base);
  background: color-mix(in srgb, var(--accent) 6%, var(--card));
}

.quote-copy {
  min-width: 0;
}

.quote-copy > span {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

.quote-copy blockquote {
  margin: 0;
  overflow: hidden;
  color: var(--muted-foreground);
  font-size: var(--fs-meta);
  line-height: 1.75;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-clear {
  display: grid;
  flex: none;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
}

.quote-clear:hover {
  color: var(--accent);
  background: var(--gear-accent-soft);
}

.equipment-image-link:focus-visible,
.equipment-link:focus-visible,
.source-note a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 3px;
}

@keyframes banner-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (min-width: 900px) {
  .equipment-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 620px) and (max-width: 899px) {
  .equipment-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .equipment-image-wrap { height: clamp(12rem, 30vw, 16rem); }
}

@media (max-width: 619px) {
  .page-head { align-items: flex-start; gap: 0.5rem; margin: 1.25rem 0 1.25rem; }
  .page-title { font-size: clamp(3rem, 15vw, 4.3rem); }
  .page-desc { max-width: 27rem; margin-top: 0.7rem; font-size: var(--fs-meta); }
  .page-count { padding-top: 1.4rem; }
  .page-count strong { font-size: 2.15rem; }
  .page-count span { font-size: 0.52rem; }
  .equipment-banner { min-height: 12rem; border-radius: var(--radius-card); }
  .banner-caption { align-items: flex-start; flex-direction: column; gap: 0.5rem; }
  .banner-caption > span:last-child { max-width: 32rem; text-align: left; }
  .content-heading { align-items: flex-start; flex-direction: column; margin-top: 3rem; margin-bottom: 1.75rem; }
  .category-heading { grid-template-columns: 2rem minmax(0, 1fr) auto; gap: 0.65rem; }
  .equipment-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
  .equipment-image-wrap { height: clamp(8.5rem, 40vw, 11rem); }
  .equipment-copy { padding: 0.8rem 0.75rem 0.85rem; }
  .equipment-name { font-size: 0.88rem; }
  .equipment-spec { font-size: 0.6rem; }
  .equipment-description { min-height: 6.8em; margin-top: 0.55rem; font-size: 0.68rem; }
  .source-note { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 360px) {
  .equipment-grid { grid-template-columns: 1fr; }
  .equipment-image-wrap { height: 13rem; }
}

@media (prefers-reduced-motion: reduce) {
  .equipment-banner,
  .equipment-card { animation: none; }
  .equipment-card,
  .equipment-image,
  .image-corner,
  .equipment-link,
  .equipment-link > .iconify { transition: none; }
  .equipment-card:hover,
  .equipment-card:hover .equipment-image,
  .equipment-link:hover > .iconify { transform: none; }
}
</style>
