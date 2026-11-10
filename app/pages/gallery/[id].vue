<script setup lang="ts">
import type { GalleryImage } from '~/types/gallery'

/**
 * 相册分类详情 —— 瀑布流图片墙 + 灯箱。
 *
 * 独立路由而非同页面板：可预渲染、可分享、返回键行为天然正确。
 */
const route = useRoute()
const { ui, t } = useUi()
const pageCfg = usePageConfig('gallery')
const { byId, imageUrl, imageTitle } = useGallery()

const folder = computed(() => byId(route.params.id as string))

if (!folder.value) {
  throw createError({ statusCode: 404, statusMessage: ui.pages.gallery.notFound })
}

/** 图片顺序：构建期与客户端一致（不洗牌），保证 SSG 快照稳定 */
const images = computed<GalleryImage[]>(() => folder.value?.images ?? [])

useSeoMeta({
  title: () => `${folder.value?.name} · ${ui.pages.gallery.title}`,
  description: () => ui.pages.gallery.description,
})

/* ---- 灯箱 ---- */
const lightboxIndex = ref<number | null>(null)

function openAt(index: number) {
  lightboxIndex.value = index
}

function closeLightbox() {
  lightboxIndex.value = null
}
</script>

<template>
  <div class="page-gallery-folder">
    <div class="container">
      <SiteBreadcrumb :current="folder?.name" />
      <header class="page-head">
        <NuxtLink to="/gallery" class="back-link">
          <Icon name="tabler:chevron-left" aria-hidden="true" />
          {{ ui.pages.gallery.backToFolders }}
        </NuxtLink>

        <div class="head-main">
          <h1 class="page-title">{{ folder?.name }}</h1>
          <p class="page-meta">
            {{ t(ui.pages.gallery.photosCount, { n: images.length }) }}
          </p>
        </div>
      </header>

      <p v-if="!images.length" class="empty-tip">{{ ui.pages.gallery.empty }}</p>

      <div v-else class="image-grid" :style="{ '--cols': pageCfg.desktopColumns }">
        <button
          v-for="(pic, index) in images"
          :key="`${imageUrl(pic)}-${index}`"
          type="button"
          class="image-item"
          :aria-label="t(ui.pages.gallery.viewPhotoAria, { index: index + 1 })"
          @click="openAt(index)"
        >
          <img
            class="image"
            :src="imageUrl(pic)"
            :alt="imageTitle(pic) || `${folder?.name} ${index + 1}`"
            loading="lazy"
            decoding="async"
            draggable="false"
          >
          <span v-if="imageTitle(pic)" class="image-caption">{{ imageTitle(pic) }}</span>
        </button>
      </div>
    </div>

    <GalleryLightbox
      v-if="lightboxIndex !== null"
      :images="images"
      :initial-index="lightboxIndex"
      @close="closeLightbox"
    />
  </div>
</template>

<style scoped>
.page-gallery-folder {
  padding-block: var(--space-section) var(--space-block);
}

.container {
  max-width: var(--home-max-width);
  margin-inline: auto;
  padding-inline: var(--space-gutter);
}

/* ---- 页头 ---- */
.page-head {
  margin-bottom: var(--space-block);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  font-size: var(--fs-meta);
  line-height: 1;
  color: var(--muted-foreground);
  transition: color var(--duration-base) var(--easing-base);
}

.back-link:hover {
  color: var(--foreground);
}

.back-link svg {
  font-size: 1rem;
}

.head-main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.page-title {
  margin: 0;
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
}

.page-meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ---- 图片墙：CSS columns 瀑布流 ---- */
.image-grid {
  column-count: 1;
  column-gap: var(--space-gutter);
}

@media (min-width: 640px) {
  .image-grid {
    column-count: 2;
  }
}

@media (min-width: 1024px) {
  .image-grid {
    column-count: var(--cols, 3);
  }
}

.image-item {
  position: relative;
  display: block;
  width: 100%;
  margin: 0 0 var(--space-gutter);
  padding: 0;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 0.25rem);
  overflow: hidden;
  background: var(--muted);
  cursor: zoom-in;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  transition:
    border-color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.image-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
}

.image {
  display: block;
  width: 100%;
  height: auto;
  transition: transform var(--duration-slow) var(--easing-base);
}

.image-item:hover .image {
  transform: scale(1.03);
}

/* 有标题的图片：底部渐变条 */
.image-caption {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 1.75rem 0.875rem 0.75rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: #fff;
  text-align: left;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.62), transparent);
  opacity: 0;
  transition: opacity var(--duration-base) var(--easing-base);
}

.image-item:hover .image-caption,
.image-item:focus-visible .image-caption {
  opacity: 1;
}

.empty-tip {
  margin: var(--space-section) 0;
  text-align: center;
  color: var(--muted-foreground);
}

@media (prefers-reduced-motion: reduce) {
  .image-item,
  .image,
  .image-caption,
  .back-link {
    transition: none;
  }

  .image-item:hover {
    transform: none;
  }

  .image-item:hover .image {
    transform: none;
  }
}
</style>