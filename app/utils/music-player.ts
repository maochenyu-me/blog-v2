import { computed, ref, shallowRef } from 'vue'
import { activeLyricIndex, normalizeApiTrack, normalizeLibrary, normalizeNcmPlaylist, normalizeNcmSearch, normalizePlaylist, nextTrackIndex, parseLrc, readPlaybackState, streamUrl, metingUrl, normalizeMetingPlaylist, upgradeMediaUrl } from './music.ts'
import type { LibraryTrack, LyricLine, MusicLevel, MusicTrack, PlayMode, MusicSource, MetingConfig, NcmConfig } from './music.ts'

interface PlayerConfig {
  enabled: boolean; api: string; playlist: string; warmup: string; level: MusicLevel; volume: number; tracks?: LibraryTrack[]; source?: MusicSource; meting?: MetingConfig; ncm?: NcmConfig
}
interface PlayerDependencies {
  audioFactory?: () => HTMLAudioElement
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  fetcher?: typeof fetch
}

export function createMusicPlayer(config: PlayerConfig, dependencies: PlayerDependencies = {}) {
  const tracks = ref<MusicTrack[]>(normalizeLibrary(config.tracks || []))
  const currentIndex = ref(tracks.value.length ? 0 : -1)
  const playing = ref(false)
  const buffering = ref(false)
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const playlistError = ref(false)
  const unavailable = ref(false)
  const blocked = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(config.volume)
  const mode = ref<PlayMode>('list')
  const playlistName = ref('')
  const source: MusicSource = config.source || 'netease'
  const playlistLoading = ref(false)
  const lyrics = shallowRef<LyricLine[]>([])
  const lyricsStatus = ref<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
  const current = computed(() => tracks.value[currentIndex.value] || null)
  const activeLine = computed(() => activeLyricIndex(lyrics.value, currentTime.value))
  const progress = computed(() => duration.value ? Math.min(100, currentTime.value / duration.value * 100) : 0)
  let audio: HTMLAudioElement | null = null
  let storage = dependencies.storage
  const fetcher = dependencies.fetcher || ((...args: Parameters<typeof fetch>) => fetch(...args))
  let initialized = false
  let disposed = false
  let loading: Promise<void> | null = null
  let initializing: Promise<void> | null = null
  let selection = 0
  let lyricSelection = 0
  let lyricAbort: AbortController | null = null
  let playlistAbort: AbortController | null = null
  let watchdog: ReturnType<typeof setTimeout> | undefined
  let wanted = false
  let pendingSeek = 0
  let lastPersist = 0
  let restored = readPlaybackState(null)
  const objectUrls = new Set<string>()
  const lyricCache = new Map<string, LyricLine[]>()
  const listeners: Array<[string, EventListener]> = []
  let playlistGeneration = 0
  function cacheKey() {
    if (source === 'meting') return `kemiao:music:playlist:meting:${config.meting?.api}:${config.meting?.server}:${config.meting?.playlist}`
    if (source === 'ncm') return `kemiao:music:playlist:ncm:${config.ncm?.api}:${config.ncm?.playlist}`
    return `kemiao:music:playlist:${config.api}:${config.playlist}`
  }

  function persist() {
    if (!storage) return
    try {
      storage.setItem('kemiao:music', JSON.stringify({
        id: current.value?.source === 'file' ? undefined : current.value?.id,
        time: current.value?.source === 'file' ? 0 : currentTime.value,
        volume: volume.value, mode: mode.value,
      }))
    } catch {}
  }

  async function request(path: string, signal?: AbortSignal) {
    const response = await fetcher(`${config.api.replace(/\/+$/, '')}${path}`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    if (payload?.success === false) throw new Error('api')
    return payload
  }

  /**
   * NCM 走自己的入口（Pages Function 代理），与 netease 的 config.api 分开。
   * 上游对收费曲目只放行 unblock 逐曲请求，故这里不做批量。
   */
  async function ncmRequest(path: string, signal?: AbortSignal) {
    const base = (config.ncm?.api || '').replace(/\/+$/, '')
    if (!base) throw new Error('ncm disabled')
    const response = await fetcher(`${base}${path}`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  }

  /** 直链内嵌时间戳，约 20 分钟过期；留一半余量，过期就当没缓存。 */
  const STREAM_TTL = 600000
  const streamCache = new Map<string, { url: string; at: number }>()

  function cachedStream(id: string): string {
    const entry = streamCache.get(id)
    if (!entry) return ''
    if (Date.now() - entry.at > STREAM_TTL) { streamCache.delete(id); return '' }
    return entry.url
  }

  async function resolveNcmSource(track: MusicTrack, signal?: AbortSignal): Promise<string> {
    const cached = cachedStream(track.id)
    if (cached) return cached
    try {
      const payload = await ncmRequest(`/song/url/v1?${new URLSearchParams({ id: track.id, level: config.level, unblock: 'true' })}`, signal)
      const url = upgradeMediaUrl(payload?.data?.[0]?.url)
      if (!url) return ''
      streamCache.set(track.id, { url, at: Date.now() })
      if (streamCache.size > 60) streamCache.delete(streamCache.keys().next().value!)
      return url
    } catch { return '' }
  }

  function sourceOf(track: MusicTrack) {
    if (track.source === 'ncm') return cachedStream(track.id)
    return track.source === 'api' ? streamUrl(config.api, track.id, config.level) : track.src || ''
  }

  /** 预取下一首的直链，切歌时省掉 unblock 的 1~2s。 */
  function prefetchNext() {
    if (source !== 'ncm' || disposed) return
    const index = nextTrackIndex(currentIndex.value, tracks.value.length, 1, mode.value)
    const next = index >= 0 ? tracks.value[index] : null
    if (!next || next.source !== 'ncm' || cachedStream(next.id)) return
    void resolveNcmSource(next)
  }

  function mediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !current.value) return
    const track = current.value
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name, artist: track.artists, album: track.album || playlistName.value,
        artwork: track.cover ? [{ src: track.cover }] : [],
      })
      navigator.mediaSession.playbackState = playing.value ? 'playing' : 'paused'
    } catch {}
  }

  async function loadLyrics() {
    const track = current.value
    const token = ++lyricSelection
    lyricAbort?.abort()
    lyrics.value = []
    if (!track) { lyricsStatus.value = 'idle'; return }
    const cached = lyricCache.get(track.id)
    if (cached) { lyrics.value = cached; lyricsStatus.value = cached.length ? 'ready' : 'empty'; return }
    lyricsStatus.value = 'loading'
    const controller = new AbortController()
    lyricAbort = controller
    try {
      let raw = track.lyric || ''
      let translation = track.translation || ''
      if (track.source === 'api') {
        const payload = await request(`/song?${new URLSearchParams({ id: track.id, type: 'lyric' })}`, controller.signal)
        raw = payload?.data?.lrc?.lyric || ''
        translation = payload?.data?.tlyric?.lyric || ''
      } else if (track.source === 'ncm') {
        const payload = await ncmRequest(`/lyric?${new URLSearchParams({ id: track.id })}`, controller.signal)
        raw = payload?.lrc?.lyric || ''
        translation = payload?.tlyric?.lyric || ''
      } else if (track.lyricsUrl && !raw) {
        const response = await fetcher(track.lyricsUrl, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
        if (!response.ok) throw new Error('lyrics')
        raw = await response.text()
      }
      if (disposed || token !== lyricSelection) return
      const parsed = parseLrc(raw, translation)
      lyricCache.set(track.id, parsed)
      if (lyricCache.size > 30) lyricCache.delete(lyricCache.keys().next().value!)
      lyrics.value = parsed
      lyricsStatus.value = parsed.length ? 'ready' : 'empty'
    } catch {
      if (!disposed && token === lyricSelection && !controller.signal.aborted) lyricsStatus.value = 'error'
    }
  }

  function clearWatchdog() { clearTimeout(watchdog); watchdog = undefined }
  function fail() {
    clearWatchdog()
    buffering.value = false
    unavailable.value = true
    wanted = false
    audio?.pause()
  }

  function prepare() {
    if (!audio || !current.value || playing.value || wanted) return
    const source = sourceOf(current.value)
    // NCM 直链要异步换，还没拿到就不预热，交给 playAt 去解。
    if (!source) return
    if (audio.src === source || audio.getAttribute?.('src') === source) return
    audio.preload = 'metadata'
    audio.src = source
    mediaSession()
  }

  function applyPlaylist(name: string, list: MusicTrack[]) {
    const activeId = current.value?.id
    const online = source === 'meting' ? 'meting' : source === 'ncm' ? 'ncm' : 'api'
    const configured = [...normalizeLibrary(config.tracks || []), ...list]
    const ids = new Set(configured.map(track => track.id))
    tracks.value = [...configured, ...tracks.value.filter(track => (track.source === online || track.source === 'file') && !ids.has(track.id))]
    playlistName.value = name
    const savedIndex = restored.id ? tracks.value.findIndex(track => track.id === restored.id) : -1
    const activeIndex = tracks.value.findIndex(track => track.id === activeId)
    const restore = savedIndex >= 0 && !playing.value && !wanted && selection === 0
    currentIndex.value = restore ? savedIndex : activeIndex >= 0 ? activeIndex : tracks.value.length ? 0 : -1
    if (restore) pendingSeek = restored.time || 0
    status.value = 'ready'
    prepare()
  }

  async function fetchMeting(type: 'playlist' | 'search', id: string, signal?: AbortSignal) {
    const meting = config.meting
    if (!meting?.enabled) throw new Error('meting disabled')
    const response = await fetcher(metingUrl(meting.api, meting.server, type, id), {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return normalizeMetingPlaylist(await response.json(), meting.server)
  }

  async function loadPlaylist(force = false): Promise<void> {
    if (disposed || !config.enabled) return
    if (loading) return loading
    if (status.value === 'ready' && !force) return
    const selectedSource = source
    const selectedPlaylist = selectedSource === 'meting'
      ? config.meting?.playlist
      : selectedSource === 'ncm' ? config.ncm?.playlist : config.playlist
    if (!selectedPlaylist) { playlistLoading.value = false; playlistError.value = false; status.value = 'ready'; prepare(); return }
    const token = ++playlistGeneration
    const key = cacheKey()
    const metingName = config.meting?.name || 'Meting'
    const ncmName = config.ncm?.name || 'NCM'
    playlistLoading.value = true
    status.value = tracks.value.length ? 'ready' : 'loading'
    playlistError.value = false
    const operation = (async () => {
      try {
        if (!force) {
          try {
            const cached = JSON.parse(storage?.getItem(key) || 'null')
            if (selectedSource === 'meting' && cached && Date.now() - cached.at < 1800000 && Array.isArray(cached.items)) {
              const normalized = normalizeMetingPlaylist(cached.items, config.meting!.server)
              if (normalized.length) { applyPlaylist(metingName, normalized); return }
            }
            if (selectedSource === 'netease' && cached && Date.now() - cached.at < 1800000 && Array.isArray(cached.tracks)) {
              const normalized = normalizePlaylist({ data: { playlist: { name: cached.name, tracks: cached.tracks } } })
              if (normalized.tracks.length) { applyPlaylist(normalized.name, normalized.tracks); return }
            }
            if (selectedSource === 'ncm' && cached && Date.now() - cached.at < 1800000 && Array.isArray(cached.tracks)) {
              const normalized = normalizeNcmPlaylist({ playlist: { name: cached.name, tracks: cached.tracks.map((track: MusicTrack) => ({ ...track, ar: track.artists, al: { name: track.album, picUrl: track.cover } })) } })
              if (normalized.tracks.length) { applyPlaylist(normalized.name, normalized.tracks); return }
            }
            const legacy = selectedSource === 'netease' ? JSON.parse(storage?.getItem(`kemiao:music:playlist:${config.playlist}`) || 'null') : null
            if (legacy && Date.now() - legacy.at < 1800000 && Array.isArray(legacy.tracks)) {
              const normalized = normalizePlaylist({ data: { playlist: { name: legacy.name, tracks: legacy.tracks.map((track: MusicTrack) => ({ ...track, picUrl: track.cover })) } } })
              if (normalized.tracks.length) { applyPlaylist(normalized.name, normalized.tracks); return }
            }
          } catch {}
        }
        playlistAbort = new AbortController()
        const result = selectedSource === 'meting'
          ? { name: metingName, tracks: await fetchMeting('playlist', selectedPlaylist, playlistAbort.signal) }
          : selectedSource === 'ncm'
            ? normalizeNcmPlaylist(await ncmRequest(`/playlist/detail?${new URLSearchParams({ id: selectedPlaylist })}`, playlistAbort.signal))
            : normalizePlaylist(await request(`/playlist?${new URLSearchParams({ id: selectedPlaylist })}`, playlistAbort.signal))
        if (disposed || token !== playlistGeneration) return
        applyPlaylist(result.name || (selectedSource === 'ncm' ? ncmName : ''), result.tracks)
        try {
          const data = selectedSource === 'meting'
            ? { at: Date.now(), items: result.tracks.map(track => ({ id: track.resourceId, title: track.name, author: track.artists, url: track.src, pic: track.cover, lrc: track.lyricsUrl })) }
            : { at: Date.now(), name: result.name, tracks: result.tracks.map(track => ({ ...track, picUrl: track.cover })) }
          storage?.setItem(key, JSON.stringify(data))
        } catch {}
      } catch {
        if (disposed || token !== playlistGeneration) return
        playlistError.value = true
        status.value = tracks.value.length ? 'ready' : 'error'
        prepare()
      }
    })()
    loading = operation
    try { await operation } finally {
      if (token === playlistGeneration) { loading = null; playlistLoading.value = false }
    }
  }

  /** 同步源能直接给；NCM 需要先换直链，返回 '' 表示取不到。 */
  async function resolveSource(track: MusicTrack): Promise<string> {
    if (track.source !== 'ncm') return sourceOf(track)
    return resolveNcmSource(track)
  }

  async function playAt(index: number) {
    if (!audio || disposed || !tracks.value.length) return
    const target = ((index % tracks.value.length) + tracks.value.length) % tracks.value.length
    const track = tracks.value[target]!
    const token = ++selection
    const reused = current.value?.id === track.id && audio.src && (audio.src === sourceOf(track) || audio.getAttribute?.('src') === sourceOf(track))
    wanted = false
    audio.pause()
    wanted = true
    currentIndex.value = target
    unavailable.value = false
    blocked.value = false
    buffering.value = true
    clearWatchdog()
    if (!reused) {
      pendingSeek = 0
      currentTime.value = 0
      duration.value = 0
      audio.removeAttribute('src')
      audio.load()
      await new Promise(resolve => setTimeout(resolve, 60))
      if (disposed || token !== selection || !wanted) return
      const resolved = await resolveSource(track)
      if (disposed || token !== selection || !wanted) return
      if (!resolved) {
        buffering.value = false
        wanted = false
        unavailable.value = true
        return
      }
      audio.src = resolved
    }
    if (lyricsStatus.value === 'idle' || !reused) void loadLyrics()
    mediaSession()
    watchdog = setTimeout(() => { if (token === selection && buffering.value) fail() }, 30000)
    try { await audio.play() } catch (error) {
      if (token !== selection || disposed) return
      clearWatchdog()
      buffering.value = false
      wanted = false
      if ((error as Error)?.name === 'NotAllowedError') blocked.value = true
      else if ((error as Error)?.name !== 'AbortError') unavailable.value = true
    }
    prefetchNext()
    persist()
  }

  function pause() {
    wanted = false
    selection++
    clearWatchdog()
    audio?.pause()
    playing.value = false
    buffering.value = false
    persist()
  }
  async function togglePlay() {
    if (playing.value || wanted) { pause(); return }
    wanted = true
    buffering.value = true
    const token = ++selection
    if (!initialized) await init()
    else if (initializing) await initializing
    if (!tracks.value.length) await loadPlaylist(status.value === 'error')
    if (disposed || token !== selection || !wanted) return
    if (tracks.value.length) await playAt(Math.max(0, currentIndex.value))
    else { wanted = false; buffering.value = false }
  }
  function step(direction: number) {
    return playAt(nextTrackIndex(currentIndex.value, tracks.value.length, direction, mode.value))
  }
  function prev() { if (currentTime.value > 3) seek(0); else void step(-1) }
  function seek(time: number) {
    if (!audio || !Number.isFinite(time) || !duration.value) return
    const value = Math.min(duration.value, Math.max(0, time))
    try { audio.currentTime = value; currentTime.value = value; persist() } catch {}
  }
  function setVolume(value: number) {
    if (!Number.isFinite(value)) return
    volume.value = Math.min(1, Math.max(0, value))
    if (audio) audio.volume = volume.value
    persist()
  }
  function cycleMode() { mode.value = mode.value === 'list' ? 'one' : mode.value === 'one' ? 'shuffle' : 'list'; persist() }

  async function search(keyword: string, signal?: AbortSignal): Promise<MusicTrack[]> {
    const query = keyword.trim().slice(0, 100)
    if (!query) return []
    if (source === 'meting') return fetchMeting('search', query, signal)
    if (source === 'ncm') return normalizeNcmSearch(await ncmRequest(`/cloudsearch?${new URLSearchParams({ keywords: query, limit: '30' })}`, signal))
    const result = await request(`/search?${new URLSearchParams({ keyword: query, limit: '30' })}`, signal)
    return (Array.isArray(result.data) ? result.data : []).map((track: unknown) => normalizeApiTrack(track)).filter((track: MusicTrack | null): track is MusicTrack => !!track)
  }
  function enqueue(track: MusicTrack) {
    const index = tracks.value.findIndex(item => item.id === track.id)
    if (index >= 0) return index
    tracks.value.push(track)
    if (currentIndex.value < 0) currentIndex.value = 0
    return tracks.value.length - 1
  }
  function importFiles(files: File[]) {
    const audioFiles = files.filter(file => /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name))
    for (const file of audioFiles) {
      const src = URL.createObjectURL(file)
      objectUrls.add(src)
      enqueue({ id: `file:${src}`, name: file.name.replace(/\.[^.]+$/, ''), artists: '', album: '', cover: '', source: 'file', src })
    }
    status.value = tracks.value.length ? 'ready' : status.value
    return audioFiles.length
  }
  async function attachLyrics(file: File) {
    const track = current.value
    if (!track || file.size > 2 * 1024 * 1024) return false
    const raw = await file.text()
    if (disposed || current.value?.id !== track.id) return false
    lyricAbort?.abort()
    lyricSelection++
    track.lyric = raw
    const parsed = parseLrc(raw)
    lyricCache.set(track.id, parsed)
    lyrics.value = parsed
    lyricsStatus.value = parsed.length ? 'ready' : 'empty'
    return parsed.length > 0
  }

  async function init() {
    if (initializing) return initializing
    if (initialized || disposed || !config.enabled) return
    initialized = true
    if (!storage && typeof window !== 'undefined') { try { storage = window.localStorage } catch {} }
    try {
      restored = readPlaybackState(storage?.getItem('kemiao:music') || null)
    } catch {}
    volume.value = restored.volume ?? config.volume
    mode.value = restored.mode || 'list'
    const restoredIndex = tracks.value.findIndex(track => track.id === restored.id)
    if (restoredIndex >= 0) { currentIndex.value = restoredIndex; pendingSeek = restored.time || 0 }
    audio = dependencies.audioFactory ? dependencies.audioFactory() : new Audio()
    audio.preload = 'metadata'
    audio.volume = volume.value
    const bind = (name: string, handler: EventListener) => { audio!.addEventListener(name, handler); listeners.push([name, handler]) }
    bind('play', () => { playing.value = true; mediaSession() })
    bind('pause', () => { playing.value = false; mediaSession(); persist() })
    bind('playing', () => { playing.value = true; buffering.value = false; unavailable.value = false; blocked.value = false; clearWatchdog() })
    bind('waiting', () => { if (wanted) buffering.value = true })
    bind('canplay', () => { buffering.value = false })
    bind('loadedmetadata', () => {
      duration.value = Number.isFinite(audio!.duration) ? audio!.duration : 0
      if (pendingSeek > 0 && pendingSeek < duration.value) { seek(pendingSeek); pendingSeek = 0 }
    })
    bind('timeupdate', () => {
      currentTime.value = audio!.currentTime
      duration.value = Number.isFinite(audio!.duration) ? audio!.duration : 0
      if (Date.now() - lastPersist > 5000) { lastPersist = Date.now(); persist() }
    })
    bind('ended', () => { if (mode.value === 'one') { seek(0); void playAt(currentIndex.value) } else void step(1) })
    bind('error', () => { if (wanted && audio?.getAttribute('src')) fail() })
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
        ['play', () => { if (!playing.value) void togglePlay() }], ['pause', pause],
        ['previoustrack', prev], ['nexttrack', () => void step(1)], ['seekto', details => seek(details.seekTime || 0)],
      ]
      for (const [name, handler] of actions) { try { navigator.mediaSession.setActionHandler(name, handler) } catch {} }
    }
    initializing = loadPlaylist()
    try { await initializing } finally { initializing = null }
  }
  function dispose() {
    persist()
    disposed = true
    wanted = false
    selection++
    lyricSelection++
    lyricAbort?.abort()
    playlistAbort?.abort()
    clearWatchdog()
    for (const [name, handler] of listeners) audio?.removeEventListener(name, handler)
    audio?.pause()
    audio?.removeAttribute('src')
    audio?.load()
    for (const url of objectUrls) URL.revokeObjectURL(url)
    objectUrls.clear()
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto'] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(action, null) } catch {}
      }
    }
  }
  return { source, playlistLoading, tracks, currentIndex, current, playing, buffering, status, playlistError, unavailable, blocked, currentTime, duration, volume, mode, playlistName, lyrics, lyricsStatus, activeLine, progress,
    init, loadPlaylist, loadLyrics, togglePlay, playAt, pause, step, prev, seek, setVolume, cycleMode, search, enqueue, importFiles, attachLyrics, persist, dispose }
}
export type MusicPlayerController = ReturnType<typeof createMusicPlayer>
