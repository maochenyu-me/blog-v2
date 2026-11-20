<script setup lang="ts">
/**
 * 图片展示组件：支持说明文字、尺寸控制、点击放大（交给全局 ImageLightbox 灯箱）。
 * 本地位图走 NuxtImg 优化，站外图片走原生 <img>。
 * canOptimizeImage 由 Nuxt 自动导入（app/utils/）。
 * 点击放大不在本组件内处理：正文图片统一由 ImageLightbox 事件委托弹出灯箱，
 * 避免与全局灯箱重复触发（既跳新标签页又弹灯箱）。zoom=false 时加 no-lightbox 让灯箱跳过。
 */
const props = withDefaults(defineProps<{
  src: string
  caption?: string
  width?: number | string
  height?: number | string
  zoom?: boolean
}>(), {
  caption: '',
  zoom: true,
})

const isOptimizable = computed(() => canOptimizeImage(props.src))
</script>

<template>
  <figure class="pic">
    <NuxtImg
      v-if="isOptimizable"
      class="pic-image"
      :class="{ 'no-lightbox': !zoom }"
      :style="{ cursor: zoom ? 'zoom-in' : undefined }"
      :src
      :alt="caption"
      :width
      :height
      loading="lazy"
      decoding="async"
      format="avif,webp"
      draggable="false"
    />
    <img
      v-else
      class="pic-image"
      :class="{ 'no-lightbox': !zoom }"
      :style="{ cursor: zoom ? 'zoom-in' : undefined }"
      :src
      :alt="caption"
      :width
      :height
      loading="lazy"
      decoding="async"
      draggable="false"
    >
    <figcaption v-if="caption" class="pic-caption">
      {{ caption }}
    </figcaption>
  </figure>
</template>

<style scoped>
.pic {
  margin: 2rem auto;
  text-align: center;
}

.pic-image {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  border-radius: var(--radius-base);
  transition: transform var(--duration-base) var(--easing-base);
}

.pic-image:hover {
  transform: scale(1.01);
}

.pic-caption {
  margin-top: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  text-align: center;
  color: var(--muted-foreground);
}
</style>
