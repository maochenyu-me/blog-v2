<script setup lang="ts">
const { ui } = useUi()
const { lyrics, lyricsStatus, activeLine, duration, seek, loadLyrics } = useMusicPlayer()
const translation = ref(true)
const viewport = ref<HTMLElement>()
const following = ref(true)
let resumeTimer: ReturnType<typeof setTimeout> | undefined
function follow() {
  following.value = true
  const parent = viewport.value
  const active = parent?.querySelector<HTMLElement>('[aria-current="true"]')
  if (parent && active) parent.scrollTo({ top: active.offsetTop - parent.clientHeight / 2 + active.clientHeight / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
function browse() {
  following.value = false
  clearTimeout(resumeTimer)
  resumeTimer = setTimeout(follow, 4500)
}
watch(activeLine, () => { if (following.value) void nextTick(follow) })
watch(lyrics, () => { following.value = true; void nextTick(follow) })
onMounted(() => { if (lyricsStatus.value === 'idle') void loadLyrics() })
onBeforeUnmount(() => clearTimeout(resumeTimer))
</script>

<template>
  <section class="room-lyrics" :aria-label="ui.music.page.lyricsLabel">
    <div v-if="lyricsStatus === 'loading'" class="room-lyrics-empty"><Icon name="tabler:loader-2" class="room-spinner" /><p>{{ ui.music.page.lyricsLoading }}</p></div>
    <div v-else-if="lyricsStatus === 'error'" class="room-lyrics-empty"><Icon name="tabler:music-off" /><p>{{ ui.music.page.lyricsError }}</p><button type="button" class="room-text-button" @click="loadLyrics">{{ ui.music.retry }}</button></div>
    <template v-else-if="lyrics.length">
      <div class="room-lyrics-tools"><button type="button" class="room-text-button" :aria-pressed="translation" @click="translation = !translation">{{ ui.music.page.translation }}</button></div>
      <div ref="viewport" class="room-lyrics-scroll" tabindex="0" @wheel.passive="browse" @touchstart.passive="browse" @keydown="browse">
        <div class="room-lyrics-lines">
          <button v-for="(line, index) in lyrics" :key="`${line.time}-${index}`" type="button" class="room-lyric" :class="{ 'is-active': index === activeLine, 'is-past': index < activeLine }" :aria-current="index === activeLine ? 'true' : undefined" :disabled="!duration" @click="seek(line.time); follow()">
            <span>{{ line.text }}</span><small v-if="translation && line.translation">{{ line.translation }}</small>
          </button>
        </div>
      </div>
      <button v-if="!following" type="button" class="room-follow" @click="follow"><Icon name="tabler:focus-2" />{{ ui.music.page.follow }}</button>
    </template>
    <div v-else class="room-lyrics-empty"><Icon name="tabler:music" /><p>{{ ui.music.page.lyricsEmpty }}</p><small>{{ ui.music.page.lyricsEmptyHint }}</small></div>
  </section>
</template>
