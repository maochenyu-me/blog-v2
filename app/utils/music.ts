export type PlayMode = 'list' | 'one' | 'shuffle'
export type MusicLevel = 'standard' | 'exhigh' | 'lossless'
export type MusicSource = 'netease' | 'meting'
export interface MetingConfig { enabled: boolean; api: string; server: 'netease' | 'tencent'; playlist: string; name: string }
export interface MusicTrack {
  id: string
  name: string
  artists: string
  album: string
  cover: string
  source: 'api' | 'meting' | 'local' | 'url' | 'file'
  src?: string
  lyric?: string
  translation?: string
  lyricsUrl?: string
  resourceId?: string
}
export interface LibraryTrack {
  id: string
  name: string
  src: string
  artists?: string
  album?: string
  cover?: string
  lyric?: string
  translation?: string
  lyricsUrl?: string
}
export interface LyricLine { time: number; text: string; translation: string }
export interface PlaybackState { id?: string; time?: number; volume?: number; mode?: PlayMode }

export function safeMediaUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  if (/^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value)) return value
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch { return '' }
}

function timedLines(raw: string, offset: number) {
  const output: Array<{ time: number; text: string }> = []
  for (const line of raw.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?\]/g)]
    const text = line.replace(/\[[^\]]*\]/g, '').trim()
    if (!text) continue
    for (const stamp of stamps) {
      const time = Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] || '0'}`) + offset
      output.push({ time: Math.max(0, time), text })
    }
  }
  return output.sort((a, b) => a.time - b.time)
}

export function parseLrc(raw = '', translated = ''): LyricLine[] {
  const offset = Number(raw.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000
  const translations = timedLines(translated, offset)
  return timedLines(raw, offset).map(line => ({
    ...line,
    translation: translations.find(other => Math.abs(other.time - line.time) < 0.05)?.text || '',
  }))
}

export function activeLyricIndex(lines: LyricLine[], time: number): number {
  let low = 0
  let high = lines.length - 1
  let result = -1
  while (low <= high) {
    const mid = (low + high) >>> 1
    if (lines[mid]!.time <= time) { result = mid; low = mid + 1 } else high = mid - 1
  }
  return result
}

export function normalizeApiTrack(item: any, fallbackCover = ''): MusicTrack | null {
  if (!item || !/^\d+$/.test(String(item.id))) return null
  return {
    id: String(item.id), name: String(item.name || ''), artists: String(item.artists || item.artist_string || ''),
    album: String(item.album || ''), cover: safeMediaUrl(item.picUrl || fallbackCover), source: 'api',
  }
}

export function normalizePlaylist(payload: any): { name: string; tracks: MusicTrack[] } {
  const playlist = payload?.data?.playlist
  if (payload?.success === false || !playlist || !Array.isArray(playlist.tracks)) throw new Error('playlist')
  const seen = new Set<string>()
  const tracks = playlist.tracks.map((item: unknown) => normalizeApiTrack(item, playlist.coverImgUrl))
    .filter((track: MusicTrack | null): track is MusicTrack => {
      if (!track || seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
  return { name: String(playlist.name || ''), tracks }
}

export function normalizeLibrary(items: LibraryTrack[]): MusicTrack[] {
  const tracks: MusicTrack[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const src = safeMediaUrl(item.src)
    if (!src || !item.id || seen.has(item.id)) continue
    seen.add(item.id)
    tracks.push({
      ...item, id: `local:${item.id}`, src, name: item.name || item.id, artists: item.artists || '',
      album: item.album || '', cover: safeMediaUrl(item.cover), lyricsUrl: safeMediaUrl(item.lyricsUrl),
      source: src.startsWith('/') ? 'local' : 'url',
    })
  }
  return tracks
}

export function streamUrl(api: string, id: string, level: MusicLevel): string {
  return `${api.replace(/\/+$/, '')}/stream?${new URLSearchParams({ id, level })}`
}

export function metingUrl(api: string, server: string, type: 'playlist' | 'search', id: string): string {
  const url = new URL(api)
  if (url.pathname === '/' || !url.pathname) url.pathname = '/api'
  url.searchParams.set('server', server)
  url.searchParams.set('type', type)
  url.searchParams.set('id', id)
  return url.href
}

export function normalizeMetingPlaylist(payload: unknown, server: string): MusicTrack[] {
  if (!Array.isArray(payload)) throw new Error('meting playlist')
  const seen = new Set<string>()
  const tracks: MusicTrack[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const src = safeMediaUrl(item.url)
    if (!src) continue
    const resourceId = new URL(src, 'https://local.invalid').searchParams.get('id') || String(item.id || src)
    const id = `meting:${server}:${resourceId}`
    if (seen.has(id)) continue
    seen.add(id)
    tracks.push({ id, name: String(item.title || item.name || ''), artists: String(item.author || item.artist || ''), album: String(item.album || ''),
      cover: safeMediaUrl(item.pic || item.cover), source: 'meting', resourceId, src, lyricsUrl: safeMediaUrl(item.lrc) })
  }
  return tracks
}

export function nextTrackIndex(index: number, total: number, direction: number, mode: PlayMode, random = Math.random): number {
  if (!total) return -1
  if (mode === 'shuffle' && total > 1) {
    const pick = Math.floor(random() * (total - 1))
    return pick >= index ? pick + 1 : pick
  }
  return ((index + direction) % total + total) % total
}

export function readPlaybackState(raw: string | null): PlaybackState {
  try {
    const value = JSON.parse(raw || '{}')
    if (!value || typeof value !== 'object') return {}
    const result: PlaybackState = {}
    if (typeof value.id === 'string' && !value.id.startsWith('file:')) result.id = value.id
    if (Number.isFinite(value.time)) result.time = Math.max(0, value.time)
    if (Number.isFinite(value.volume)) result.volume = Math.min(1, Math.max(0, value.volume))
    if (['list', 'one', 'shuffle'].includes(value.mode)) result.mode = value.mode
    return result
  } catch { return {} }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
