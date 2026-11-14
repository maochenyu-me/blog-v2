<script setup lang="ts">
import MusicLyrics from '../components/music/MusicLyrics.vue'
import MusicQueue from '../components/music/MusicQueue.vue'
import { formatTime } from '../utils/music'
import '../assets/css/music.css'
const { ui, t } = useUi()
const { music } = useBlogConfig()
const player = useMusicPlayer()
const { tracks, current, playing, buffering, status, playlistError, unavailable, blocked, currentTime, duration, volume, mode, progress, playlistName, lyricsStatus, togglePlay, prev, step, seek, setVolume, cycleMode, loadPlaylist, importFiles, attachLyrics } = player
const queueOpen = ref(false)
const mobileView = ref<'vinyl' | 'lyrics'>('vinyl')
const audioInput = ref<HTMLInputElement>()
const lyricInput = ref<HTMLInputElement>()
const queueDialog = ref<HTMLDialogElement>()
const queueButton = ref<HTMLButtonElement>()
const notice = ref('')
const brokenCover = ref(false)
const cover = computed(() => !brokenCover.value ? current.value?.cover : '')
const modeIcon = computed(() => ({ list: 'tabler:repeat', one: 'tabler:repeat-once', shuffle: 'tabler:arrows-shuffle' })[mode.value])
let lastVolume = music.volume || 0.6
let noticeTimer: ReturnType<typeof setTimeout> | undefined
useSeoMeta({ title: ui.music.page.title, description: ui.music.page.description })
function notify(text: string) { notice.value = text; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.value = '' }, 5000) }
async function onAudioFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const count = importFiles(Array.from(input.files || []))
  notify(count ? t(ui.music.page.imported, { count }) : ui.music.page.importEmpty)
  if (count) queueOpen.value = true
  input.value = ''
}
async function onLyricsFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    try { notify(await attachLyrics(file) ? ui.music.page.lyricImported : ui.music.page.lyricInvalid) }
    catch { notify(ui.music.page.lyricInvalid) }
  }
  input.value = ''
}
function mute() { if (volume.value) { lastVolume = volume.value; setVolume(0) } else setVolume(lastVolume) }
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || target.closest('input, textarea, select, button, a, [contenteditable="true"], dialog[open]')) return
  if (document.querySelector('dialog[open], [role="dialog"]')) return
  if (event.code === 'Space') { event.preventDefault(); void togglePlay() }
  else if (event.code === 'ArrowLeft') { event.preventDefault(); prev() }
  else if (event.code === 'ArrowRight') { event.preventDefault(); void step(1) }
}
watch(queueOpen, async open => {
  await nextTick()
  const dialog = queueDialog.value
  if (open && dialog && !dialog.open) dialog.showModal()
  else if (!open && dialog?.open) { dialog.close(); queueButton.value?.focus() }
})
watch(() => current.value?.id, () => { brokenCover.value = false })
watch(() => current.value?.id, () => { if (current.value) void nextTick(() => { if (lyricsStatus.value === 'idle') void player.loadLyrics() }) })
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (current.value && lyricsStatus.value === 'idle') void player.loadLyrics()
})
onBeforeUnmount(() => { window.removeEventListener('keydown', onKeydown); clearTimeout(noticeTimer); queueDialog.value?.close() })
</script>

<template>
  <div class="music-room" :class="{ 'is-playing': playing, 'show-lyrics': mobileView === 'lyrics' }">
    <div class="room-atmosphere" aria-hidden="true"><img v-if="cover" :src="cover" alt="" /><div class="room-atmosphere-wash" /></div>
    <div class="room-topline">
      <div><span class="room-eyebrow">{{ ui.music.page.eyebrow }}</span><h1>{{ ui.music.page.title }}<span>{{ ui.music.page.subtitle }}</span></h1></div>
      <div class="room-library-name"><Icon name="tabler:disc" /><span>{{ playlistName || ui.music.page.description }}</span></div>
    </div>
    <p v-if="!music.enabled" class="room-notice">{{ ui.music.page.disabled }}</p>
    <template v-else>
      <div class="room-mobile-tabs"><button type="button" :aria-pressed="mobileView === 'vinyl'" @click="mobileView = 'vinyl'">{{ ui.music.page.vinyl }}</button><button type="button" :aria-pressed="mobileView === 'lyrics'" @click="mobileView = 'lyrics'">{{ ui.music.page.lyrics }}</button></div>
      <div class="room-stage">
        <section class="room-artwork">
          <div class="room-turntable" :class="{ 'is-playing': playing }">
            <span class="room-turntable-corner corner-tl" aria-hidden="true" /><span class="room-turntable-corner corner-br" aria-hidden="true" />
            <div class="room-arm" aria-hidden="true"><span class="room-arm-pivot" /><span class="room-arm-shaft" /><span class="room-arm-head" /></div>
            <button type="button" class="room-record-button" :aria-label="playing ? ui.music.pauseAria : ui.music.playAria" :disabled="!tracks.length" @click="togglePlay">
              <span class="room-record"><span class="room-record-grooves" /><span class="room-record-label"><img v-if="cover" :src="cover" :alt="t(ui.music.coverAlt, { name: current?.name || ui.music.unknownTrack })" @error="brokenCover = true" /><Icon v-else name="tabler:music" /></span><span class="room-record-spindle" /></span>
            </button>
            <span class="room-deck-mark" aria-hidden="true">33⅓ <span>STEREO</span></span>
            <span class="room-deck-light" :class="{ 'is-on': playing }" aria-hidden="true" />
          </div>
          <div class="room-song-info"><p class="room-song-state"><span class="room-sound-wave" :class="{ active: playing }" aria-hidden="true"><i /><i /><i /><i /></span>{{ buffering ? ui.music.page.loading : playing ? ui.music.page.nowPlaying : ui.music.page.paused }}</p><h2>{{ current?.name || (status === 'loading' ? ui.music.loading : ui.music.unknownTrack) }}</h2><p>{{ current?.artists || ui.music.page.unknownArtist }}<span v-if="current?.album"> / {{ current.album }}</span></p></div>
        </section>
        <MusicLyrics />
      </div>
      <div class="room-feedback" role="status"><span v-if="notice">{{ notice }}</span><span v-else-if="unavailable || blocked">{{ blocked ? ui.music.blocked : ui.music.unavailable }}</span><span v-else-if="playlistError">{{ tracks.length ? ui.music.page.refreshFailed : ui.music.loadFailed }} <button type="button" class="room-text-button" @click="loadPlaylist(true)">{{ ui.music.retry }}</button></span></div>
      <section class="room-console" :aria-label="ui.music.regionLabel">
        <div class="room-seek"><span>{{ formatTime(currentTime) }}</span><input class="room-range" type="range" min="0" :max="duration || 0" step="0.1" :value="currentTime" :disabled="!duration" :style="{ '--pct': `${progress}%` }" :aria-label="ui.music.progressAria" @input="seek(Number(($event.target as HTMLInputElement).value))" /><span>{{ formatTime(duration) }}</span></div>
        <div class="room-console-row">
          <div class="room-console-left"><button type="button" class="room-icon" :aria-label="t(ui.music.modeAria, { label: ui.music.modes[mode] })" :title="ui.music.modes[mode]" @click="cycleMode"><Icon :name="modeIcon" /></button><button type="button" class="room-icon" :aria-label="ui.music.page.refresh" :title="ui.music.page.refresh" :disabled="status === 'loading'" @click="loadPlaylist(true)"><Icon name="tabler:refresh" :class="{ 'room-spinner': status === 'loading' }" /></button><span class="room-mode-label">{{ ui.music.modes[mode] }}</span></div>
          <div class="room-transport"><button type="button" class="room-icon room-skip" :aria-label="ui.music.prevAria" :disabled="!tracks.length" @click="prev"><Icon name="tabler:player-skip-back-filled" /></button><button type="button" class="room-play" :aria-label="playing ? ui.music.pauseAria : ui.music.playAria" :aria-busy="buffering" :disabled="status === 'ready' && !tracks.length" @click="togglePlay"><Icon v-if="buffering || status === 'loading'" name="tabler:loader-2" class="room-spinner" /><Icon v-else :name="playing ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'" /></button><button type="button" class="room-icon room-skip" :aria-label="ui.music.nextAria" :disabled="!tracks.length" @click="step(1)"><Icon name="tabler:player-skip-forward-filled" /></button></div>
          <div class="room-console-right"><div class="room-volume"><button type="button" class="room-icon" :aria-label="volume ? ui.music.page.mute : ui.music.page.muted" @click="mute"><Icon :name="volume ? 'tabler:volume' : 'tabler:volume-off'" /></button><input class="room-range" type="range" min="0" max="1" step="0.01" :value="volume" :style="{ '--pct': `${volume * 100}%` }" :aria-label="ui.music.volumeAria" @input="setVolume(Number(($event.target as HTMLInputElement).value))" /></div><button ref="queueButton" type="button" class="room-icon room-queue-button" :aria-label="ui.music.page.queue" :aria-expanded="queueOpen" @click="queueOpen = true"><Icon name="tabler:playlist" /><span>{{ tracks.length }}</span></button></div>
        </div>
        <div class="room-console-foot"><span class="room-shortcut">{{ ui.music.page.shortcut }}</span><div><button type="button" class="room-text-button" :title="ui.music.page.importHint" @click="audioInput?.click()"><Icon name="tabler:folder-plus" />{{ ui.music.page.importAudio }}</button><button type="button" class="room-text-button" :disabled="!current" @click="lyricInput?.click()"><Icon name="tabler:file-music" />{{ ui.music.page.importLyrics }}</button></div></div>
      </section>
      <input ref="audioInput" class="room-file-input" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple :aria-label="ui.music.page.importAudio" @change="onAudioFiles" />
      <input ref="lyricInput" class="room-file-input" type="file" accept=".lrc,text/plain" :aria-label="ui.music.page.importLyrics" @change="onLyricsFile" />
      <dialog ref="queueDialog" class="room-dialog" :aria-label="ui.music.page.queue" @cancel.prevent="queueOpen = false" @close="queueOpen = false" @click="($event.target === queueDialog) && (queueOpen = false)"><MusicQueue v-if="queueOpen" @close="queueOpen = false" /><p class="room-import-note">{{ ui.music.page.importHint }}</p></dialog>
    </template>
  </div>
</template>
