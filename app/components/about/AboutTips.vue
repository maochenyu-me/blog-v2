<script setup lang="ts">
/**
 * 关键词轮播：词条在遮罩内循环上滑。
 * 结构移植自 Dusklight，配色走本站 accent。
 */
const props = defineProps<{
  lead: string
  line1: string
  line2: string
  words: string[]
}>()

const idx = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (props.words.length < 2) return
  timer = setInterval(() => {
    idx.value = (idx.value + 1) % props.words.length
  }, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const shown = computed(() => idx.value)
const leaving = computed(() => (idx.value - 1 + props.words.length) % props.words.length)
</script>

<template>
  <AboutCard class="tips-card">
    <div class="tips-inner">
      <p class="tips-lead">{{ lead }}</p>
      <p class="tips-heading">
        {{ line1 }}<br />
        {{ line2 }}
        <span class="tips-mask" aria-live="polite">
          <span
            v-for="(w, i) in words"
            :key="w"
            class="tips-word"
            :class="{ 'is-show': i === shown, 'is-up': i === leaving }"
          >{{ w }}</span>
        </span>
      </p>
    </div>
  </AboutCard>
</template>

<style scoped>
.tips-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  min-height: 180px;
}

.tips-lead {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.tips-heading {
  margin-top: 0.375rem;
  font-size: calc(var(--fs-h1) * 1.07);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.tips-mask {
  position: relative;
  display: block;
  height: calc(var(--fs-h1) * 1.07 * 1.25);
  margin-top: 0.25rem;
  overflow: hidden;
}

.tips-word {
  position: absolute;
  top: 100%;
  left: 0;
  display: block;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.tips-word.is-show {
  transform: translateY(-100%);
  transition: transform 0.5s ease-in-out;
}

.tips-word.is-up {
  transform: translateY(-200%);
  transition: transform 0.5s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .tips-word { transition: none; }
}
</style>
