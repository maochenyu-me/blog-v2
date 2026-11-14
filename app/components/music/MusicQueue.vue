<script setup lang="ts">
import type { MusicTrack } from '../../utils/music'
const emit = defineEmits<{ close: [] }>()
const { ui, t } = useUi()
const { tracks, current, playing, status, playAt, search, enqueue, loadPlaylist } = useMusicPlayer()
const query = ref('')
const tab = ref<'queue' | 'search'>('queue')
const results = ref<MusicTrack[]>([])
const searchState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
let searchAbort: AbortController | undefined
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  return tracks.value.map((track, index) => ({ track, index })).filter(({ track }) => !needle || `${track.name} ${track.artists}`.toLocaleLowerCase().includes(needle))
})
async function runSearch() {
  searchAbort?.abort()
  const keyword = query.value.trim()
  if (!keyword) { results.value = []; searchState.value = 'idle'; return }
  const controller = new AbortController()
  searchAbort = controller
  searchState.value = 'loading'
  try {
    const list = await search(keyword, controller.signal)
    if (controller.signal.aborted) return
    results.value = list
    searchState.value = 'ready'
  } catch { if (!controller.signal.aborted) searchState.value = 'error' }
}
function selectTrack(track: MusicTrack) { void playAt(enqueue(track)) }
function changeTab(value: 'queue' | 'search') { searchAbort?.abort(); tab.value = value; query.value = ''; searchState.value = 'idle'; results.value = [] }
onBeforeUnmount(() => searchAbort?.abort())
</script>

<template>
  <div class="room-queue">
    <div class="room-queue-heading"><div><h2>{{ ui.music.page.queue }}</h2><small>{{ t(ui.music.page.queueCount, { count: tracks.length }) }}</small></div><button type="button" class="room-icon" :aria-label="ui.music.page.close" @click="emit('close')"><Icon name="tabler:x" /></button></div>
    <div class="room-queue-tabs"><button type="button" :aria-pressed="tab === 'queue'" @click="changeTab('queue')">{{ ui.music.page.queue }}</button><button type="button" :aria-pressed="tab === 'search'" @click="changeTab('search')">{{ ui.music.page.search }}</button></div>
    <form class="room-search" role="search" @submit.prevent="runSearch">
      <Icon name="tabler:search" /><input v-model="query" type="search" maxlength="100" :placeholder="tab === 'queue' ? ui.music.page.queueFilter : ui.music.page.searchPlaceholder" :aria-label="tab === 'queue' ? ui.music.page.queueFilter : ui.music.page.searchPlaceholder" />
      <button v-if="tab === 'search'" type="submit" class="room-text-button" :disabled="searchState === 'loading' || !query.trim()">{{ ui.music.page.searchSubmit }}</button>
    </form>
    <div class="room-queue-list" aria-live="polite" :aria-busy="status === 'loading' || searchState === 'loading'">
      <template v-if="tab === 'queue'">
        <button v-for="{ track, index } in filtered" :key="track.id" type="button" class="room-track" :class="{ 'is-current': track.id === current?.id }" :aria-label="t(ui.music.page.playTrack, { name: track.name })" :aria-current="track.id === current?.id ? 'true' : undefined" @click="playAt(index)">
          <span class="room-track-number"><Icon v-if="track.id === current?.id && playing" name="tabler:volume" /><span v-else>{{ String(index + 1).padStart(2, '0') }}</span></span>
          <img v-if="track.cover" :src="track.cover" alt="" loading="lazy" /><span v-else class="room-track-placeholder"><Icon name="tabler:music" /></span>
          <span class="room-track-meta"><strong>{{ track.name }}</strong><small>{{ track.artists || ui.music.page.unknownArtist }}</small></span><span class="room-track-source">{{ ui.music.page[track.source] }}</span>
        </button>
        <div v-if="!filtered.length" class="room-queue-empty"><p>{{ status === 'loading' ? ui.music.loading : tracks.length ? ui.music.page.noMatches : ui.music.page.queueEmpty }}</p><button v-if="status === 'error'" type="button" class="room-text-button" @click="loadPlaylist(true)">{{ ui.music.retry }}</button></div>
      </template>
      <template v-else>
        <p v-if="searchState === 'loading'" class="room-queue-empty">{{ ui.music.page.searchLoading }}</p>
        <p v-else-if="searchState === 'error'" class="room-queue-empty">{{ ui.music.page.searchError }}</p>
        <template v-else>
          <button v-for="track in results" :key="track.id" type="button" class="room-track" :aria-label="t(ui.music.page.playTrack, { name: track.name })" @click="selectTrack(track)">
            <img v-if="track.cover" :src="track.cover" alt="" loading="lazy" /><span v-else class="room-track-placeholder"><Icon name="tabler:music" /></span>
            <span class="room-track-meta"><strong>{{ track.name }}</strong><small>{{ track.artists || ui.music.page.unknownArtist }}</small></span><Icon name="tabler:player-play-filled" />
          </button>
          <p v-if="!results.length" class="room-queue-empty">{{ searchState === 'ready' ? ui.music.page.searchEmpty : ui.music.page.searchPlaceholder }}</p>
        </template>
      </template>
    </div>
  </div>
</template>
