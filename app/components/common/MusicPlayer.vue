<script setup lang="ts">
import { formatTime } from '../../utils/music'
const { music } = useBlogConfig()
const { ui, t } = useUi()
const route = useRoute()
const { current, tracks, playing, buffering, status, unavailable, blocked, duration, currentTime, volume, mode, progress, togglePlay, prev, step, seek, setVolume, cycleMode, loadPlaylist } = useMusicPlayer()
const expanded = ref(false)
const visible = computed(() => music.enabled && route.path.replace(/\/$/, '') !== '/music')
const trackName = computed(() => current.value?.name || (status.value === 'loading' ? ui.music.loading : ui.music.unknownTrack))
const modeIcon = computed(() => ({ list: 'tabler:repeat', one: 'tabler:repeat-once', shuffle: 'tabler:arrows-shuffle' })[mode.value])
function onKeydown(event: KeyboardEvent) { if (event.key === 'Escape') expanded.value = false }
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
watch(() => route.path, () => { expanded.value = false })
</script>

<template>
  <div v-if="visible" class="music-widget">
    <Transition name="music-card">
      <section v-if="expanded" class="music-card" :aria-label="ui.music.regionLabel">
        <div class="music-card__head">
          <span class="music-card__art">
            <img v-if="current?.cover" :src="current.cover" :alt="t(ui.music.coverAlt, { name: trackName })" />
            <Icon v-else name="tabler:music" />
          </span>
          <span class="music-card__meta">
            <span class="music-card__name">{{ trackName }}</span>
            <span class="music-card__artist">{{ current?.artists || ui.music.unknownArtist }}</span>
          </span>
          <button type="button" class="music-icon-btn" :aria-label="ui.music.closeAria" @click="expanded = false"><Icon name="tabler:x" /></button>
        </div>
        <p v-if="status === 'error'" class="music-card__notice">{{ ui.music.loadFailed }} <button type="button" class="music-link" @click="loadPlaylist(true)">{{ ui.music.retry }}</button></p>
        <p v-else-if="unavailable || blocked" class="music-card__notice">{{ blocked ? ui.music.blocked : ui.music.unavailable }}</p>
        <div class="music-progress">
          <span>{{ formatTime(currentTime) }}</span>
          <input type="range" class="music-range" min="0" :max="duration || 0" step="0.1" :value="currentTime" :style="{ '--pct': `${progress}%` }" :disabled="!duration" :aria-label="ui.music.progressAria" @input="seek(Number(($event.target as HTMLInputElement).value))" />
          <span>{{ formatTime(duration) }}</span>
        </div>
        <div class="music-controls">
          <button type="button" class="music-icon-btn" :aria-label="ui.music.prevAria" :disabled="!tracks.length" @click="prev"><Icon name="tabler:player-skip-back-filled" /></button>
          <button type="button" class="music-play-btn" :aria-label="playing ? ui.music.pauseAria : ui.music.playAria" :aria-busy="buffering || status === 'loading'" @click="togglePlay">
            <Icon v-if="buffering || status === 'loading'" name="tabler:loader-2" class="music-spinner" />
            <Icon v-else :name="playing ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'" />
          </button>
          <button type="button" class="music-icon-btn" :aria-label="ui.music.nextAria" :disabled="!tracks.length" @click="step(1)"><Icon name="tabler:player-skip-forward-filled" /></button>
        </div>
        <div class="music-volume">
          <Icon :name="volume === 0 ? 'tabler:volume-off' : 'tabler:volume'" />
          <input type="range" class="music-range" min="0" max="1" step="0.01" :value="volume" :style="{ '--pct': `${volume * 100}%` }" :aria-label="ui.music.volumeAria" @input="setVolume(Number(($event.target as HTMLInputElement).value))" />
          <button type="button" class="music-icon-btn" :aria-label="t(ui.music.modeAria, { label: ui.music.modes[mode] })" @click="cycleMode"><Icon :name="modeIcon" /></button>
        </div>
        <NuxtLink to="/music" class="music-room-link">{{ ui.music.openPage }}<Icon name="tabler:arrow-up-right" /></NuxtLink>
      </section>
    </Transition>
    <button type="button" class="music-trigger" :class="{ 'music-trigger--playing': playing }" :aria-label="expanded ? ui.music.closeAria : ui.music.openAria" :aria-expanded="expanded" @click="expanded = !expanded">
      <img v-if="current?.cover" :src="current.cover" alt="" /><Icon v-else name="tabler:music" />
      <Icon :name="expanded ? 'tabler:chevron-down' : 'tabler:chevron-up'" />
    </button>
  </div>
</template>

<style scoped>
.music-widget { position: fixed; left: 0; bottom: 0; z-index: 55; display: flex; flex-direction: column; align-items: flex-start; gap: .5rem; padding-bottom: env(safe-area-inset-bottom, 0px); pointer-events: none; }
.music-widget > * { pointer-events: auto; }
.music-trigger { display: flex; align-items: center; gap: .4375rem; height: 2.25rem; padding: 0 .625rem 0 .4375rem; border: 1px solid var(--glass-border); border-left: 0; border-radius: 0 var(--radius-card) var(--radius-card) 0; background: var(--surface-float); color: var(--muted-foreground); cursor: pointer; font-size: 14px; backdrop-filter: blur(var(--glass-blur)); }
.music-trigger img { width: 1.375rem; height: 1.375rem; object-fit: cover; border-radius: var(--radius); }
.music-trigger--playing img { outline: 1px solid var(--accent); outline-offset: 1px; }
.music-card { display: flex; flex-direction: column; gap: .625rem; width: min(20rem, calc(100vw - 2rem)); margin-left: .75rem; padding: .875rem; border: 1px solid var(--surface-float-border); border-radius: var(--radius-card); background: var(--surface-float); backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation)); }
.music-card__head { display: flex; align-items: center; gap: .625rem; min-width: 0; }
.music-card__art { display: grid; place-items: center; flex: none; width: 3rem; height: 3rem; overflow: hidden; border-radius: var(--radius); background: var(--muted); }
.music-card__art img { width: 100%; height: 100%; object-fit: cover; }
.music-card__meta { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.music-card__name, .music-card__artist { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.music-card__name { font-weight: 700; line-height: 1.3; }
.music-card__artist, .music-card__notice, .music-room-link { font-size: var(--fs-meta); color: var(--muted-foreground); }
.music-card__notice { margin: 0; }
.music-progress, .music-volume { display: flex; align-items: center; gap: .5rem; }
.music-progress > span { flex: none; font-size: var(--fs-meta); font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
.music-range { flex: 1; width: 100%; min-width: 0; height: 1.25rem; margin: 0; appearance: none; background: transparent; cursor: pointer; }
.music-range::-webkit-slider-runnable-track { height: 3px; border-radius: var(--radius-full); background: linear-gradient(to right, var(--foreground) 0 var(--pct), var(--border) var(--pct) 100%); }
.music-range::-webkit-slider-thumb { width: 10px; height: 10px; margin-top: -3.5px; border-radius: 50%; background: var(--foreground); appearance: none; }
.music-range::-moz-range-track { height: 3px; background: var(--border); }
.music-range::-moz-range-progress { height: 3px; background: var(--foreground); }
.music-range::-moz-range-thumb { width: 10px; height: 10px; border: 0; background: var(--foreground); }
.music-range:disabled { opacity: .4; }
.music-controls { display: flex; justify-content: center; align-items: center; gap: .5rem; }
.music-icon-btn, .music-play-btn { display: grid; place-items: center; flex: none; width: 2.25rem; height: 2.25rem; border: 0; border-radius: 50%; background: transparent; color: var(--muted-foreground); cursor: pointer; }
.music-icon-btn:hover { background: var(--muted); color: var(--foreground); }
.music-play-btn { background: var(--foreground); color: var(--background); }
.music-icon-btn:disabled { opacity: .4; }
.music-link { border: 0; padding: 0; color: var(--accent); background: transparent; cursor: pointer; }
.music-room-link { display: flex; justify-content: space-between; align-items: center; min-height: 2rem; border-top: 1px solid var(--border); padding-top: .5rem; }
.music-card-enter-active, .music-card-leave-active { transition: opacity .2s, transform .2s; }
.music-card-enter-from, .music-card-leave-to { opacity: 0; transform: translateY(6px); }
@media (prefers-reduced-motion: no-preference) { .music-spinner { animation: spin 1s linear infinite; } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .music-card-enter-active, .music-card-leave-active { transition: none; } }
</style>
