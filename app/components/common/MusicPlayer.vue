<script setup lang="ts">
/**
 * 左下角悬浮音乐播放器。
 *
 * 折叠态：一枚随播放旋转的圆形封面（唱片感，中心一点唱针孔）。
 * 展开态：向上推出一张玻璃卡片 —— 封面 + 曲目 + 进度 + 传输键 + 音量。
 *
 * 两个刻意的选择：
 *   1. 音频源走 /stream 而不是 /song 的直链。直链是 http://m*.music.126.net，
 *      https 页面播放会被混合内容策略拦掉；/stream 是 https 且支持 Range。
 *   2. 歌单延迟到空闲时再取。它是 200+ 首的一次 POST，不该跟 LCP 抢带宽。
 *
 * 播放状态放组件内（不抽 useMusic）：播放器在 layout 里是单例，
 * 跨路由不会卸载，音频不会中断；抽成全局 composable 只会多一层无谓的间接。
 */
const { music } = useBlogConfig()
const { ui, t } = useUi()

interface Track {
  id: string
  name: string
  artists: string
  cover: string
}

type Mode = 'list' | 'one' | 'shuffle'

const STORE_KEY = 'kemiao:music'
/** 连续失败上限：越过就停手，避免在 200 首里空转 */
const FAIL_LIMIT = 5

const tracks = ref<Track[]>([])
const currentIndex = ref(-1)
const playing = ref(false)
const buffering = ref(false)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(music.volume)
const mode = ref<Mode>('list')
const expanded = ref(false)
const playlistName = ref('')
const unavailable = ref(false)

const audioEl = ref<HTMLAudioElement | null>(null)

const current = computed<Track | null>(() => tracks.value[currentIndex.value] ?? null)
/**
 * 无曲目时的标题：取歌单阶段显示进度文案，其余情况才退到占位。
 * 这样「正在取歌单…」只出现一次，不会与占位文案叠成两行废话。
 */
const trackName = computed(() => {
  if (current.value?.name) return current.value.name
  if (status.value === 'loading') return ui.music.loading
  return ui.music.unknownTrack
})
const trackArtist = computed(() => current.value?.artists || ui.music.unknownArtist)
const hasTracks = computed(() => tracks.value.length > 0)
const modeLabel = computed(() => ui.music.modes[mode.value])
const modeIcon = computed(
  () =>
    ({
      list: 'tabler:repeat',
      one: 'tabler:repeat-once',
      shuffle: 'tabler:arrows-shuffle',
    })[mode.value],
)

const progressPct = computed(() => {
  const d = duration.value
  if (!d) return 0
  return Math.min(100, Math.max(0, (currentTime.value / d) * 100))
})

const volumePct = computed(() => Math.round(volume.value * 100))

/** 轨道填充用 CSS 变量交给渐变，避免在样式里再判一次百分比 */
const progressStyle = computed(() => `--pct:${progressPct.value}%`)
const volumeStyle = computed(() => `--pct:${volumePct.value}%`)

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const elapsedText = computed(() => (current.value ? formatTime(currentTime.value) : '--:--'))
const durationText = computed(() => (duration.value ? formatTime(duration.value) : '--:--'))

/* ---------------- 持久化 ---------------- */

interface Stored {
  id?: string
  time?: number
  volume?: number
  mode?: Mode
}

function readStore(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

function persist() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        id: current.value?.id ?? '',
        time: currentTime.value,
        volume: volume.value,
        mode: mode.value,
      } satisfies Stored),
    )
  } catch {
    /* 隐私模式下 localStorage 会抛，静默放弃记忆 */
  }
}

/* ---------------- 歌单 ---------------- */

let pendingSeek = 0
let failStreak = 0
const deadIds = new Set<string>()

/**
 * 歌单缓存键。用 localStorage 而不是 sessionStorage —— 后者是每个标签页独立，
 * 而这块卡片在每个打开的页面里都会挂载。实测多开标签并发打歌单接口，
 * 服务端会偶发 500；localStorage 跨标签共享，能把这些请求收敛成一次。
 */
const CACHE_KEY = `kemiao:music:playlist:${music.playlist}`

interface CachedPlaylist {
  at: number
  name: string
  tracks: Track[]
}

/**
 * 歌单接口实测要 3~8 秒（210 首一次性返回），缓存命中就直接上。
 * 30 分钟过期：歌单改动不频繁，但也不该永远吃旧数据。
 */
function readCache(): CachedPlaylist | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPlaylist
    if (!parsed?.tracks?.length || Date.now() - parsed.at > 30 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(name: string, tracks: Track[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), name, tracks }))
  } catch {
    /* 超出配额或隐私模式：放弃缓存，不影响播放 */
  }
}

function applyPlaylist(name: string, list: Track[]) {
  tracks.value = list
  playlistName.value = name
  status.value = 'ready'

  const saved = readStore()
  const restored = saved?.id ? list.findIndex((item) => item.id === saved.id) : -1
  currentIndex.value = restored >= 0 ? restored : 0
  if (restored >= 0 && saved?.time) pendingSeek = saved.time
  syncMediaSession()
  // 曲目一定，立刻在后台把这一首的 metadata 拉下来（不发声）。
  // 这是整块体验里最关键的优化：实测冷启动直接 play 要 3.3s 才出声，
  // 先预载 metadata 再 play 只要 0.37s —— 这 3 秒被藏进「用户还在看页面」的空隙里。
  preloadCurrent()
}

async function fetchPlaylist(): Promise<{ name: string; tracks: Track[] }> {
  // 用 GET 而不是 POST + JSON：同样参数服务端耗时一样，但 GET 是「简单请求」，
  // 浏览器不会先发 OPTIONS 预检，省掉一次跨域往返。
  const query = new URLSearchParams({ id: music.playlist })
  const res = await fetch(`${apiBase.value}/playlist?${query}`)
  if (!res.ok) throw new Error(String(res.status))
  const payload = await res.json()
  const playlist = payload?.data?.playlist
  const list: Track[] = (playlist?.tracks ?? [])
    .filter((item: { id?: string | number }) => Boolean(item?.id))
    .map((item: { id: string | number; name?: string; artists?: string; picUrl?: string }) => ({
      id: String(item.id),
      name: item.name ?? '',
      artists: item.artists ?? '',
      cover: item.picUrl || playlist?.coverImgUrl || '',
    }))
  if (!list.length) throw new Error('empty')
  return { name: playlist?.name ?? '', tracks: list }
}

let loading: Promise<void> | null = null

async function loadPlaylist(force = false): Promise<void> {
  if (!music.enabled) return
  // 加载中再点一次就等同一个请求，别发第二遍
  if (loading) return loading
  if (status.value === 'ready' && !force) return

  const cached = force ? null : readCache()
  if (cached) {
    applyPlaylist(cached.name, cached.tracks)
    return
  }

  status.value = 'loading'
  loading = (async () => {
    try {
      // 服务端偶发 500（实测与并发相关），退避重试两轮能救回绝大多数
      let result: { name: string; tracks: Track[] } | null = null
      for (const delay of [0, 900, 2200]) {
        if (delay) await new Promise((r) => setTimeout(r, delay))
        try {
          result = await fetchPlaylist()
          break
        } catch {
          /* 下一轮 */
        }
      }
      if (!result) throw new Error('playlist failed')
      applyPlaylist(result.name, result.tracks)
      writeCache(result.name, result.tracks)
    } catch {
      status.value = 'error'
    } finally {
      loading = null
    }
  })()

  return loading
}

/* ---------------- 播放 ---------------- */

/** 解析服务基址：去掉尾斜杠，避免 `//stream` 这种拼接，也保证 src 比较能对上 */
const apiBase = computed(() => music.api.replace(/\/+$/, ''))

function streamUrl(id: string): string {
  return `${apiBase.value}/stream?id=${encodeURIComponent(id)}&level=${music.level}`
}

/**
 * 切到指定曲目。
 *
 * 核心是「先清空 src 并让出一帧，再赋新源」。实测数据（切歌到出声）：
 *   直接 el.src = newUrl          → 9544ms
 *   先 el.src = '' 等 60ms 再赋新  →  755ms
 *   清空 + load() 等 60ms 再赋新   →  754ms
 *
 * 为什么差这么多：/stream 是边下边发的长响应，直接换 src 只是让浏览器停止
 * 读取，TCP 连接不会立刻关闭；服务端仍为旧曲推流，新请求排在其后（实测
 * 新请求要等 13 秒才拿到响应）。清空 src 让出事件循环后连接真正断开，
 * 服务端立刻释放，切歌几乎瞬时。
 *
 * 注意不能把它写成同步的 removeAttribute + load() + src —— load algorithm
 * 是异步排队的，同步覆盖会被自己清掉（实测反而拖到 13 秒）。
 */
const SWAP_GAP = 60

/**
 * 清空 src 到新源生效之间的保护窗口。
 * 「空源」的 error 事件是异步派发的，可能在 60ms 之后才到，光看 src 是否为空
 * 拦不住；这个时间戳保证窗口内的 error 一律不当作真失败。
 */
let swapGuardUntil = 0

/** 判断 audio 当前挂的是不是这一首（避免重复赋 src 打断已建好的连接） */
function isLoaded(id: string): boolean {
  const audio = audioEl.value
  return !!audio?.src && audio.src === streamUrl(id)
}

/**
 * 后台预载当前曲的 metadata（不发声、不占播放状态）。
 *
 * 实测数据：冷启动直接 play 要 3298ms 才出声；先以 preload=metadata 设 src
 * （687ms 拿到元数据），再 play 只要 377ms。所以真正的加速手段不是「让请求变快」，
 * 而是「把请求挪到用户点击之前」。
 *
 * 只在没在播放、且当前 src 不是这首时动手，绝不打断正在放的歌。
 */
function preloadCurrent() {
  const audio = audioEl.value
  const track = current.value
  if (!audio || !track || playing.value || buffering.value) return
  if (isLoaded(track.id)) return

  audio.preload = 'metadata'
  audio.src = streamUrl(track.id)
  // 只预载不播放；进度恢复交给 loadedmetadata 里的 pendingSeek
}

/**
 * 切到指定曲目并播放。
 *
 * 若目标曲已经预载过（src 就是它），直接 play 即可 —— 这是命中率最高的一条路径，
 * 用户点播放时只花 ~370ms。
 *
 * 需要换源时走「先清空 src 并让出 60ms，再赋新源」。实测切歌到出声：
 *   直接 el.src = newUrl          → 9544ms
 *   先 el.src = '' 等 60ms 再赋新  →  755ms
 * 原因：/stream 是边下边发的长响应，直接换 src 只让浏览器停读、TCP 不关，
 * 服务端仍为旧曲推流，新请求排在后面（实测等 13 秒）。
 *
 * 注意不能写成同步的 removeAttribute + load() + src —— load algorithm 是异步排队的，
 * 同步覆盖会被自己清掉（实测反而拖到 13 秒）。
 */
async function playAt(index: number) {
  const total = tracks.value.length
  if (!total || !audioEl.value) return
  const target = ((index % total) + total) % total
  const track = tracks.value[target]
  if (!track) return

  const audio = audioEl.value
  const reused = currentIndex.value === target && isLoaded(track.id)

  currentIndex.value = target
  if (!reused) {
    currentTime.value = 0
    duration.value = 0
  }
  buffering.value = true
  armWatchdog()
  syncMediaSession()

  if (!reused) {
    swapGuardUntil = Date.now() + SWAP_GAP + 400
    audio.pause()
    audio.src = ''
    await new Promise((r) => setTimeout(r, SWAP_GAP))

    // 等待期间用户可能又切了歌，以最新的 currentIndex 为准
    if (currentIndex.value !== target) return
    const active = tracks.value[target]
    if (!active) return
    audio.src = streamUrl(active.id)
  }

  // 刻意不把 preload 提到 'auto'：那样浏览器会抢带宽整首缓冲，把新请求堵住。
  // 实测切歌到出声 auto=3162ms / metadata=459ms / 不设=413ms。play() 本身
  // 就会让浏览器按需拉流，不需要靠 preload 提优先级。
  try {
    await audio.play()
  } catch {
    // AbortError：用户连续快切，上一次 play() 被新 src 打断，属正常
    buffering.value = false
  }
}

/**
 * 卡死兜底。服务端取元数据实测 2~7 秒、偶发更久，25 秒还没拿到就按失败处理：
 * 跳过本曲，让播放循环不至于停在黑屏。
 */
let watchdog: ReturnType<typeof setTimeout> | null = null

function armWatchdog() {
  clearWatchdog()
  watchdog = setTimeout(() => {
    const audio = audioEl.value
    if (audio && audio.readyState < 1 && current.value && !deadIds.has(current.value.id)) {
      const failed = current.value
      deadIds.add(failed.id)
      step(1)
    }
  }, 25000)
}

function clearWatchdog() {
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
}

function pickNextIndex(dir: number): number {
  const total = tracks.value.length
  if (!total) return -1
  if (mode.value === 'shuffle' && total > 1) {
    let next = currentIndex.value
    while (next === currentIndex.value) next = Math.floor(Math.random() * total)
    return next
  }
  return (currentIndex.value + dir + total) % total
}

function step(dir: number) {
  const next = pickNextIndex(dir)
  if (next >= 0) void playAt(next)
}

async function togglePlay() {
  // 歌单还没就绪（loading / error / 未开始）时，先把它弄到手再决定要不要出声
  if (status.value !== 'ready' || !hasTracks.value) {
    await loadPlaylist(status.value === 'error')
    if (!hasTracks.value) return
  }
  const audio = audioEl.value
  if (!audio) return
  if (playing.value) {
    audio.pause()
    persist()
    return
  }

  // 没预载或预载的不是这首：走完整加载
  const target = currentIndex.value < 0 ? 0 : currentIndex.value
  const track = tracks.value[target]
  if (!track || !isLoaded(track.id)) {
    await playAt(target)
    return
  }

  // 命中预载：src 已在缓冲，直接出声（实测 ~370ms）
  buffering.value = true
  armWatchdog()
  try {
    await audio.play()
  } catch {
    buffering.value = false
  }
}

function prev() {
  const audio = audioEl.value
  // 播过 3 秒再按上一首 = 回到本曲开头，与主流播放器一致
  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0
    return
  }
  step(-1)
}

function cycleMode() {
  mode.value = mode.value === 'list' ? 'one' : mode.value === 'one' ? 'shuffle' : 'list'
  persist()
}

function onSeek(event: Event) {
  const audio = audioEl.value
  const value = Number((event.target as HTMLInputElement).value)
  if (!audio || !Number.isFinite(value)) return
  audio.currentTime = value
  currentTime.value = value
}

function onVolume(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  volume.value = Math.min(1, Math.max(0, value))
  applyVolume()
  persist()
}

function applyVolume() {
  if (audioEl.value) audioEl.value.volume = volume.value
}

/* ---------------- 音频事件 ---------------- */

const seeking = ref(false)

function onLoadedMetadata() {
  clearWatchdog()
  const audio = audioEl.value
  if (!audio) return
  duration.value = Number.isFinite(audio.duration) ? audio.duration : 0
  if (pendingSeek > 0 && pendingSeek < duration.value) {
    audio.currentTime = pendingSeek
    currentTime.value = pendingSeek
    pendingSeek = 0
  }
}

function onTimeUpdate() {
  if (seeking.value) return
  const audio = audioEl.value
  if (!audio) return
  currentTime.value = audio.currentTime
  if (Number.isFinite(audio.duration)) duration.value = audio.duration
}

function onPlay() {
  playing.value = true
}

function onPause() {
  playing.value = false
  persist()
}

function onEnded() {
  const audio = audioEl.value
  if (mode.value === 'one' && audio) {
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
    return
  }
  step(1)
}

function onAudioError() {
  const audio = audioEl.value
  // 切歌时故意把 src 清空 60ms 让服务端释放连接，这一步会触发「空源」error。
  // 那是自伤不是真失败；不忽略的话会把整张歌单连跳一遍。
  if (!audio || !audio.getAttribute('src')) return
  if (Date.now() < swapGuardUntil) return

  const failed = current.value
  if (failed) deadIds.add(failed.id)

  // 纯预载阶段（用户还没点播放）出错：只记住这首坏了，不自动跳曲。
  // 否则界面会在没人操作时自己换歌，很怪；真正播放到它时再由下面的逻辑跳过。
  if (!buffering.value && !playing.value) return

  buffering.value = false
  playing.value = false
  clearWatchdog()
  failStreak += 1

  // 这些歌拿不到直链时接口仍是 200 + success:true，只有 url 为空，
  // 浏览器侧表现为 error —— 所以自动跳过，连跳 FAIL_LIMIT 次就停手。
  if (failStreak >= FAIL_LIMIT || deadIds.size >= Math.max(tracks.value.length, 1)) {
    unavailable.value = true
    return
  }
  window.setTimeout(() => step(1), 350)
}

function onPlaying() {
  buffering.value = false
  failStreak = 0
  unavailable.value = false
  clearWatchdog()
}

function onVolumeChange() {
  const audio = audioEl.value
  if (audio && Math.abs(audio.volume - volume.value) > 0.01) volume.value = audio.volume
}

/* ---------------- 系统媒体控制 ---------------- */

function syncMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  const track = current.value
  if (!track) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.name,
    artist: track.artists || playlistName.value,
    album: playlistName.value,
    artwork: track.cover ? [{ src: track.cover, sizes: '300x300', type: 'image/jpeg' }] : [],
  })
}

function bindMediaSession() {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.setActionHandler('play', () => void togglePlay())
  navigator.mediaSession.setActionHandler('pause', () => audioEl.value?.pause())
  navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  navigator.mediaSession.setActionHandler('nexttrack', () => step(1))
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (audioEl.value && typeof details.seekTime === 'number') {
      audioEl.value.currentTime = details.seekTime
    }
  })
}

/* ---------------- 交互 ---------------- */

function toggleExpanded() {
  expanded.value = !expanded.value
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && expanded.value) expanded.value = false
}

function onPageHide() {
  persist()
}

/* ---------------- 生命周期 ---------------- */

// 提前建好到解析服务的 TCP + TLS，第一次请求能省掉一次跨域握手（实测 100~200ms）。
// 放在 setup 里，SSR 直接吐进 <head>，比等组件挂载再建更早。
if (music.enabled) {
  try {
    const origin = new URL(music.api).origin
    useHead({
      link: [
        { rel: 'preconnect', href: origin, crossorigin: '' },
        { rel: 'dns-prefetch', href: origin },
      ],
    })
  } catch {
    /* api 配错格式时不阻断渲染 */
  }
}

onMounted(() => {
  // 关闭播放器（enabled: false）或没配歌单时什么都不做。
  // v-if 只管模板，onMounted 照样会跑，不在这里拦住就会白发一次歌单请求。
  if (!music.enabled || !music.playlist) return

  const saved = readStore()
  if (saved) {
    if (typeof saved.volume === 'number') volume.value = Math.min(1, Math.max(0, saved.volume))
    if (saved.mode) mode.value = saved.mode
  }
  applyVolume()
  bindMediaSession()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('pagehide', onPageHide)

  // 首次访问没有歌单缓存时，先用配置里的预热曲目占位预载 —— 这样即使歌单
  // 还要 3~5 秒，音频元数据的请求已经发出去在跑了。歌单回来后若对不上，
  // applyPlaylist 里的 preloadCurrent() 会静默换成正确的曲目。
  const audio = audioEl.value
  if (audio && music.warmup && !readCache()) {
    audio.preload = 'metadata'
    audio.src = streamUrl(music.warmup)
  }

  // 立即拉歌单。fetch 是异步的，不阻塞首屏渲染，只占一点带宽（约 50KB）；
  // 之前挂在 requestIdleCallback（timeout 2500）上，等于白等 2.5 秒才开始请求，
  // 这是「加载慢」最没道理的一处。
  void loadPlaylist()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('pagehide', onPageHide)
  persist()
})
</script>

<template>
  <div v-if="music.enabled" class="music-widget">
    <Transition name="music-card">
      <section
        v-if="expanded"
        class="music-card"
        role="region"
        :aria-label="ui.music.regionLabel"
      >
        <div class="music-card__head">
          <span class="music-card__art">
            <img
              v-if="current?.cover"
              :src="current.cover"
              :alt="t(ui.music.coverAlt, { name: trackName })"
              loading="lazy"
              decoding="async"
            />
            <Icon v-else name="tabler:music" />
          </span>

          <span class="music-card__meta">
            <span class="music-card__name">{{ trackName }}</span>
            <span class="music-card__artist">{{ trackArtist }}</span>
          </span>

          <button
            type="button"
            class="music-icon-btn music-icon-btn--close"
            :aria-label="ui.music.closeAria"
            @click="toggleExpanded"
          >
            <Icon name="tabler:x" />
          </button>
        </div>

        <p v-if="status === 'error'" class="music-card__notice">
          {{ ui.music.loadFailed }}
          <button type="button" class="music-card__retry" @click="loadPlaylist(true)">
            {{ ui.music.retry }}
          </button>
        </p>
        <p v-else-if="unavailable" class="music-card__notice">{{ ui.music.unavailable }}</p>

        <div class="music-progress">
          <span class="music-progress__time music-progress__time--start">{{ elapsedText }}</span>
          <input
            class="music-range"
            type="range"
            min="0"
            :max="duration || 0"
            step="0.1"
            :value="currentTime"
            :style="progressStyle"
            :aria-label="ui.music.progressAria"
            :disabled="!current"
            @pointerdown="seeking = true"
            @pointerup="seeking = false"
            @input="onSeek"
            @change="seeking = false"
          />
          <span class="music-progress__time music-progress__time--end">{{ durationText }}</span>
        </div>

        <div class="music-controls">
          <button
            type="button"
            class="music-icon-btn"
            :aria-label="ui.music.prevAria"
            :disabled="!hasTracks"
            @click="prev"
          >
            <Icon name="tabler:player-skip-back-filled" />
          </button>

          <button
            type="button"
            class="music-play-btn"
            :class="{ 'music-play-btn--busy': buffering || status === 'loading' }"
            :aria-label="playing ? ui.music.pauseAria : ui.music.playAria"
            :aria-busy="buffering || status === 'loading'"
            @click="togglePlay"
          >
            <Icon
              v-if="buffering || status === 'loading'"
              class="music-spinner"
              name="tabler:loader-2"
            />
            <Icon v-else :name="playing ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'" />
          </button>

          <button
            type="button"
            class="music-icon-btn"
            :aria-label="ui.music.nextAria"
            :disabled="!hasTracks"
            @click="step(1)"
          >
            <Icon name="tabler:player-skip-forward-filled" />
          </button>
        </div>

        <div class="music-volume">
          <Icon :name="volume === 0 ? 'tabler:volume-off' : 'tabler:volume'" />
          <input
            class="music-range music-range--volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            :style="volumeStyle"
            :aria-label="ui.music.volumeAria"
            @input="onVolume"
          />
          <button
            type="button"
            class="music-icon-btn music-icon-btn--mode"
            :aria-label="t(ui.music.modeAria, { label: modeLabel })"
            :title="modeLabel"
            @click="cycleMode"
          >
            <Icon :name="modeIcon" />
          </button>
        </div>
      </section>
    </Transition>

    <button
      type="button"
      class="music-trigger"
      :class="{ 'music-trigger--playing': playing }"
      :aria-label="expanded ? ui.music.closeAria : ui.music.openAria"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <img
        v-if="current?.cover"
        class="music-trigger__art"
        :src="current.cover"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <Icon v-else class="music-trigger__icon" name="tabler:music" />
      <Icon class="music-trigger__chevron" :name="expanded ? 'tabler:chevron-down' : 'tabler:chevron-up'" />
    </button>

    <audio
      ref="audioEl"
      preload="metadata"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @playing="onPlaying"
      @waiting="buffering = true"
      @canplay="buffering = false"
      @error="onAudioError"
      @volumechange="onVolumeChange"
    />
  </div>
</template>

<style scoped>
/*
 * 吸底：容器贴住屏幕左下角，只留安全区高度给移动端手势条。
 * z-index 压过回顶键（50），低于所有弹层（60+）。
 */
.music-widget {
  --card-width: min(20rem, calc(100vw - 2.5rem));
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 55;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
}

.music-widget > * {
  pointer-events: auto;
}

/* ---------------- 折叠态：贴左边缘的展开按钮 ---------------- */

/*
 * 贴边胶囊：左边框去掉、左侧两角切平，读起来像从屏幕左缘探出的一个小把手，
 * 而不是一枚浮在角落的按钮。「向左折叠」的字面表达。
 */
.music-trigger {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  height: 2.25rem;
  padding: 0 0.625rem 0 0.4375rem;
  border: 1px solid var(--glass-border);
  border-left: 0;
  border-radius: 0 var(--radius-card) var(--radius-card) 0;
  background: var(--surface-float);
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 14px;
  box-shadow: var(--glass-scrolled-shadow), var(--glass-highlight);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  transition:
    color var(--duration-base) var(--easing-base),
    padding-right var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.music-trigger:hover {
  padding-right: 0.625rem;
  color: var(--foreground);
}

.music-trigger:active {
  transform: scale(0.97);
}

/* 缩略封面：保留「在放什么」的识别度，但不占地方 */
.music-trigger__art {
  flex: none;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: calc(var(--radius) - 0.1875rem);
  object-fit: cover;
}

/* 播放中用 outline 而非 box-shadow：暗色下全局禁阴影，outline 不受影响 */
.music-trigger--playing .music-trigger__art {
  outline: 1px solid var(--accent);
  outline-offset: 1px;
}

.music-trigger__icon,
.music-trigger__chevron {
  flex: none;
  font-size: 14px;
}

.music-trigger__chevron {
  opacity: 0.8;
}

/* ---------------- 展开态：卡片 ---------------- */

.music-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  /* 容器贴 left:0，卡片自身往里让一点，不糊在屏幕边缘上 */
  width: var(--card-width);
  margin-left: 0.75rem;
  padding: 0.875rem;
  border: 1px solid var(--surface-float-border);
  border-radius: var(--radius-card);
  background: var(--surface-float);
  box-shadow: var(--glass-scrolled-shadow), var(--glass-highlight);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  transform-origin: left bottom;
}

.music-card__head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}

.music-card__art {
  display: grid;
  place-items: center;
  flex: none;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 18px;
}

.music-card__art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.music-card__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.music-card__name,
.music-card__artist {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.music-card__name {
  font-size: var(--fs-body);
  font-weight: 700;
  line-height: 1.3;
}

.music-card__artist {
  font-size: var(--fs-meta);
  line-height: 1.4;
  color: var(--muted-foreground);
}

.music-card__notice {
  margin: 0;
  font-size: var(--fs-meta);
  line-height: 1.5;
  color: var(--muted-foreground);
}

.music-card__retry {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---------------- 进度与音量 ---------------- */

.music-progress,
.music-volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.music-progress__time {
  flex: none;
  /* 两端同宽："--:--" 与 "0:00" 字宽不同，不定宽会导致滑条左右长度不一致 */
  width: 2.5rem;
  font-size: var(--fs-meta);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--muted-foreground);
}

.music-progress__time--start {
  text-align: right;
}

.music-progress__time--end {
  text-align: left;
}

.music-volume {
  gap: 0.5rem;
  color: var(--muted-foreground);
  font-size: 14px;
}

.music-range {
  --pct: 0%;
  flex: 1;
  width: 100%;
  height: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.music-range:disabled {
  cursor: default;
  opacity: 0.5;
}

.music-range::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: var(--radius-full);
  background: linear-gradient(
    to right,
    var(--foreground) 0 var(--pct),
    var(--border) var(--pct) 100%
  );
}

.music-range::-webkit-slider-thumb {
  width: 9px;
  height: 9px;
  margin-top: -3px;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--foreground);
  -webkit-appearance: none;
  appearance: none;
}

.music-range--volume {
  height: 0.875rem;
  flex: 1;
}

.music-range--volume::-webkit-slider-runnable-track {
  height: 2px;
}

.music-range--volume::-webkit-slider-thumb {
  width: 7px;
  height: 7px;
  margin-top: -2.5px;
}

.music-range::-moz-range-track {
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--border);
}

.music-range::-moz-range-progress {
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--foreground);
}

.music-range::-moz-range-thumb {
  width: 9px;
  height: 9px;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--foreground);
}

/* ---------------- 传输键 ---------------- */

.music-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  /* 传输键整体居中，模式键挪到下面音量行 —— 否则右侧空出一大块，重心歪 */
  padding-block: 0.125rem;
}

.music-icon-btn {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 17px;
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.music-icon-btn:hover:not(:disabled) {
  background: var(--muted);
  color: var(--foreground);
}

.music-icon-btn:disabled {
  cursor: default;
  opacity: 0.4;
}

/* 播放键是卡片里唯一的高对比实体：前景色实心 + 背景色图标 */
.music-play-btn {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  margin-inline: 0.125rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--foreground);
  color: var(--background);
  cursor: pointer;
  font-size: 16px;
  transition: opacity var(--duration-base) var(--easing-base);
}

.music-play-btn:hover:not(:disabled) {
  opacity: 0.86;
}

.music-play-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.music-play-btn--busy {
  opacity: 0.7;
}

/* 取流等待：服务端元数据要 2~7 秒，播放键必须明确表达「在转」而不是「没反应」 */
.music-spinner {
  animation: music-rotate 0.9s linear infinite;
}

@keyframes music-rotate {
  to {
    transform: rotate(360deg);
  }
}

.music-icon-btn--mode {
  flex: none;
  margin-left: 0.125rem;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 15px;
}

.music-icon-btn--close {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 15px;
}

/* ---------------- 进出场 ---------------- */

.music-card-enter-active,
.music-card-leave-active {
  transition:
    opacity var(--duration-base) var(--easing-base),
    transform var(--duration-slow) var(--easing-base);
}

.music-card-enter-from,
.music-card-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .music-card-enter-active,
  .music-card-leave-active {
    transition: opacity 0.01ms;
  }

  .music-card-enter-from,
  .music-card-leave-to {
    transform: none;
  }

  .music-spinner {
    animation-duration: 2s;
  }
}

/* ---------------- 移动端 ---------------- */

@media (max-width: 768px) {
  .music-widget {
    --card-width: min(20rem, calc(100vw - 2rem));
  }

  .music-trigger {
    height: 2rem;
    font-size: 13px;
  }

  .music-trigger__art {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* 卡片在小屏上同样往里收，贴边会显得局促 */
  .music-card {
    margin-left: 0.5rem;
  }

  .music-play-btn {
    width: 2.125rem;
    height: 2.125rem;
  }
}
</style>
