<script setup lang="ts">
/**
 * 相册首页 —— 分类封面墙。
 *
 * 视觉沿用全站令牌（Dusklight 式双胶囊导航 + 玻璃底 + zinc 中性色），
 * 与 jeoor 相册的区别在于：那边是「同页切换面板」，这里走独立路由，
 * 分类页可被单独分享 / 被预渲染成静态 HTML / 被搜索引擎索引。
 */
const { ui, t } = useUi()
const pageCfg = usePageConfig('gallery')
const { folders, totalPhotos } = useGallery()

useSeoMeta({
  title: () => ui.pages.gallery.title,
  description: () => ui.pages.gallery.description,
})

const stats = computed(() => t(ui.pages.gallery.pageMeta, {
  folders: folders.length,
  photos: totalPhotos,
}))
</script>

<template>
  <div class="page-gallery">
    <div class="container">
      <SiteBreadcrumb />
      <header class="page-head">
        <h1 class="page-title">{{ ui.pages.gallery.title }}</h1>
        <p class="page-desc">{{ ui.pages.gallery.description }}</p>
        <p class="page-meta">{{ stats }}</p>
      </header>

      <div class="folder-grid">
        <NuxtLink
          v-for="(folder, i) in folders"
          :key="folder.id"
          :to="`/gallery/${folder.id}`"
          class="folder-card"
          :style="{ '--delay': `${Math.min(i, 11) * 40}ms` }"
        >
          <div class="folder-cover">
            <img
              class="cover-img"
              :src="folder.cover"
              :alt="t(ui.pages.gallery.coverAlt, { name: folder.name })"
              loading="lazy"
              decoding="async"
              draggable="false"
            >
            <span v-if="pageCfg.showCoverBadge" class="folder-badge">
              {{ t(ui.pages.gallery.photosCount, { n: folder.images.length }) }}
            </span>
          </div>

          <div class="folder-body">
            <h2 class="folder-name">{{ folder.name }}</h2>
            <Icon name="tabler:arrow-up-right" class="folder-arrow" aria-hidden="true" />
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-gallery {
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

.page-title {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
  font-weight: var(--fw-h1);
  letter-spacing: -0.02em;
  margin: 0;
}

.page-desc {
  margin: 0.5rem 0 0;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--muted-foreground);
}

.page-meta {
  margin: 0.375rem 0 0;
  font-family: var(--font-mono);
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ---- 分类封面墙 ---- */
.folder-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-item);
}

/* 平板：两列 */
@media (min-width: 640px) {
  .folder-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 桌面：三列 */
@media (min-width: 1024px) {
  .folder-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.folder-card {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: calc(var(--radius) + 0.25rem);
  border: 1px solid var(--border);
  background: var(--background);
  transition:
    border-color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
  animation: card-in var(--duration-slow) var(--easing-base) var(--delay, 0ms) backwards;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.folder-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
}

.folder-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--muted);
}

.cover-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--easing-base);
}

.folder-card:hover .cover-img {
  transform: scale(1.04);
}

.folder-badge {
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  font-size: var(--fs-meta);
  line-height: 1;
  padding: 0.3125rem 0.5rem;
  border-radius: 999px;
  color: #fff;
  background: color-mix(in srgb, #000 45%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  font-variant-numeric: tabular-nums;
}

.folder-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
}

.folder-name {
  margin: 0;
  font-size: var(--fs-list-title);
  line-height: var(--lh-list-title);
  font-weight: 700;
}

.folder-arrow {
  flex-shrink: 0;
  font-size: 1rem;
  color: var(--muted-foreground);
  transition:
    color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.folder-card:hover .folder-arrow {
  color: var(--accent);
  transform: translate(2px, -2px);
}

@media (prefers-reduced-motion: reduce) {
  .folder-card {
    animation: none;
  }

  .cover-img,
  .folder-card,
  .folder-arrow {
    transition: none;
  }

  .folder-card:hover {
    transform: none;
  }

  .folder-card:hover .cover-img {
    transform: none;
  }
}
</style>