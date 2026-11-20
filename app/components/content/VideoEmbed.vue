<script setup lang="ts">
/**
 * 视频嵌入组件（移植自 blog-v3 app/components/content/VideoEmbed.vue）。
 *
 * 支持的类型：raw（原生视频源）、bilibili、bilibili-nano、youtube、
 * douyin、douyin-wide、tiktok。
 *
 * 两个和参考站一致的实现细节：
 *   - 抖音播放器会先探测内部视口宽度，窄视口返回竖屏、宽视口返回横屏。
 *     douyin / douyin-wide 靠给 iframe 设 CSS `zoom` 骗过探测：把外层容器宽度
 *     除以目标视口宽度得到 zoom（横屏目标 1200px，竖屏目标 320px）。
 *   - 其它类型一律 16:9，抖音竖屏 27:56，抖音横屏 1198:731。
 *
 * 与参考站的差异：参考站用 box-shadow 做卡片投影，blog-v2 全局禁用阴影，
 * 这里改用边框 + --muted 底色表达同一层次。
 */
const props = withDefaults(defineProps<{
  /** 视频类型；抖音的 id 是 19 位数字，MDC 里要用引号包成字符串 */
  type?: 'raw' | 'bilibili' | 'bilibili-nano' | 'youtube' | 'douyin' | 'douyin-wide' | 'tiktok'
  id: string
  autoplay?: boolean
  /** 视频宽高比，如 `16 / 9`、`1.6` */
  ratio?: string | number
  /** 仅 type 为 raw 时可用 */
  poster?: string
  /** 视频最大宽度 */
  width?: string
  /** 视频最大高度 */
  height?: string
}>(), {
  type: 'raw',
  height: '80vh',
})

/** 根据视频类型计算宽高比 */
const computedRatio = computed(() => {
  if (props.ratio) return props.ratio
  switch (props.type) {
    case 'raw':
      return undefined
    case 'douyin':
      return '27 / 56'
    case 'douyin-wide':
      return '1198 / 731'
    default:
      return '16 / 9'
  }
})

/** 根据视频类型生成嵌入 URL；raw 直接用 id 当视频源 */
const embedSrc = computed(() => {
  switch (props.type) {
    case 'bilibili':
      return `https://player.bilibili.com/player.html?bvid=${props.id}&autoplay=${props.autoplay ? 1 : 0}`
    case 'bilibili-nano':
      return `https://www.bilibili.com/blackboard/newplayer.html?bvid=${props.id}&autoplay=${props.autoplay ? 1 : 0}`
    case 'youtube':
      return `https://www.youtube.com/embed/${props.id}?rel=0&disablekb=1&playsinline=1&autoplay=${props.autoplay ? 1 : 0}`
    case 'douyin':
    case 'douyin-wide':
      return `https://open.douyin.com/player/video?vid=${props.id}`
    case 'tiktok':
      return `https://www.tiktok.com/embed/v3/${props.id}`
    case 'raw':
    default:
      return props.id
  }
})

/*
 * 抖音播放器会按 iframe 内部视口宽度决定横/竖屏版式：视口够宽才给横屏。
 * CSS `zoom: z` 会把内部视口放大成「布局宽度 / z」，因此可以让它误判为宽屏。
 *
 * 目标视口宽度（2026-11-20 实测，容器约 714px）：
 *   - 1190px 内部视口 → 横屏铺满；793px → 仍是竖屏。取 1200 留余量。
 *   - 竖屏块反过来要窄视口，取 320px（与参考站竖屏 zoom 约 1.2 等价）。
 *
 * 关键：ResizeObserver 必须观察外层 .video 容器，而不是 iframe 自身。
 * iframe 上的 zoom 会改变它自己的 contentRect（714 / 0.5 ≈ 1428），
 * 观察它会形成反馈振荡，zoom 在 0.5~1.9 之间乱跳——这正是之前横屏失效的根因。
 * 容器宽度不受子元素 zoom 影响，是稳定的计算源。
 */
const DOUYIN_TARGET_VIEWPORT = {
  'douyin': 320,
  'douyin-wide': 1200,
} as const

const frame = useTemplateRef<HTMLIFrameElement>('frame')
const video = useTemplateRef<HTMLDivElement>('video')
const zoom = ref<number>()

const needsZoom = computed(() => props.type in DOUYIN_TARGET_VIEWPORT)

let videoRo: ResizeObserver | null = null

onMounted(() => {
  if (!needsZoom.value || !video.value) return
  const target = DOUYIN_TARGET_VIEWPORT[props.type as keyof typeof DOUYIN_TARGET_VIEWPORT]
  const update = (width: number) => {
    if (width > 0) zoom.value = width / target
  }
  update(video.value.clientWidth)
  videoRo = new ResizeObserver(([entry]) => {
    if (entry) update(entry.contentRect.width)
  })
  videoRo.observe(video.value)
})

onBeforeUnmount(() => {
  videoRo?.disconnect()
  videoRo = null
})
</script>

<template>
  <div
    ref="video"
    class="video"
    :style="{
      aspectRatio: computedRatio,
      maxWidth: width,
      maxHeight: height,
    }"
  >
    <video
      v-if="type === 'raw'"
      :src="embedSrc"
      :poster
      controls
    />
    <iframe
      v-else
      ref="frame"
      :src="embedSrc"
      :style="{ zoom }"
      scrolling="no"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
    />
  </div>
</template>

<style scoped>
.video {
  contain: paint;
  max-width: 100%;
  margin: 2rem auto;
  background-color: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.video video,
.video iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
