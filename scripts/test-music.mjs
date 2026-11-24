import assert from 'node:assert/strict'
import { parseLrc, activeLyricIndex, normalizePlaylist, normalizeLibrary, streamUrl, nextTrackIndex, readPlaybackState, formatTime, upgradeMediaUrl, normalizeNcmPlaylist, normalizeNcmSearch } from '../app/utils/music.ts'

const lines = parseLrc('[offset:100]\n[00:02.50][00:06.000]Hello\n[00:01.000]Start\n[ar:Artist]\n[00:09.000]End', '[00:02.500]你好')
assert.deepEqual(lines.map(({ time, text, translation }) => ({ time, text, translation })), [
  { time: 1.1, text: 'Start', translation: '' },
  { time: 2.6, text: 'Hello', translation: '你好' },
  { time: 6.1, text: 'Hello', translation: '' },
  { time: 9.1, text: 'End', translation: '' },
])
assert.deepEqual(parseLrc('plain text without timestamps'), [])
assert.equal(activeLyricIndex(lines, 0), -1)
assert.equal(activeLyricIndex(lines, 2.6), 1)
assert.equal(activeLyricIndex(lines, 99), 3)
assert.equal(activeLyricIndex([], 2), -1)
assert.equal(formatTime(Infinity), '0:00')
assert.equal(formatTime(125), '2:05')

const payload = { success: true, data: { playlist: { name: 'Mix', coverImgUrl: 'https://img.example/cover.jpg', tracks: [
  { id: 1, name: 'One', artists: 'A/B', album: 'First', picUrl: 'https://img.example/one.jpg' },
  { id: 1, name: 'Duplicate' }, { id: 2, name: 'Two' }, { name: 'Invalid' },
] } } }
const playlist = normalizePlaylist(payload)
assert.equal(playlist.name, 'Mix')
assert.equal(playlist.tracks.length, 2)
assert.equal(playlist.tracks[0].artists, 'A/B')
assert.equal(playlist.tracks[0].album, 'First')
assert.equal(playlist.tracks[1].cover, 'https://img.example/cover.jpg')
assert.equal(playlist.tracks[0].source, 'api')
assert.throws(() => normalizePlaylist({ success: false }), /playlist/)

const library = normalizeLibrary([
  { id: 'demo', name: 'Local', src: '/music/demo.mp3', cover: '/music/cover.jpg', lyricsUrl: '/music/demo.lrc' },
  { id: 'remote', name: 'Remote', src: 'https://audio.example/song.mp3', lyric: '[00:01]A' },
  { id: 'unsafe', src: 'javascript:alert(1)' },
  { id: 'mixed', src: 'http://audio.example/song.mp3' },
  { id: 'protocol', src: '//audio.example/song.mp3' },
  { id: 'blob', src: 'blob:https://example/123' },
])
assert.equal(library.length, 2)
assert.equal(library[0].id, 'local:demo')
assert.equal(library[0].lyricsUrl, '/music/demo.lrc')
assert.equal(library[1].source, 'url')
assert.equal(streamUrl('https://api.example///', '12&3', 'exhigh'), 'https://api.example/stream?id=12%263&level=exhigh')
assert.equal(nextTrackIndex(0, 3, -1, 'list'), 2)
assert.equal(nextTrackIndex(1, 3, 1, 'one'), 2)
assert.equal(nextTrackIndex(0, 1, 1, 'shuffle', () => 0), 0)
assert.equal(nextTrackIndex(1, 3, 1, 'shuffle', () => 0.6), 2)
assert.equal(nextTrackIndex(-1, 0, 1, 'list'), -1)
assert.deepEqual(readPlaybackState('{broken'), {})
assert.deepEqual(readPlaybackState(JSON.stringify({ id: '1', time: -5, volume: 99, mode: 'bad' })), { id: '1', time: 0, volume: 1 })
assert.deepEqual(readPlaybackState(JSON.stringify({ id: 'file:temp', time: 3, volume: 'loud', mode: 'one' })), { time: 3, mode: 'one' })
console.log('PASS: lyrics, playlist normalization, URL boundaries, playback order and stored state')

const { createMusicPlayer } = await import('../app/utils/music-player.ts')
class FakeAudio extends EventTarget {
  src = ''; currentTime = 0; duration = 60; volume = 1; paused = true; readyState = 1
  async play() { this.paused = false; this.dispatchEvent(new Event('loadedmetadata')); this.dispatchEvent(new Event('play')); this.dispatchEvent(new Event('playing')) }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  load() {}
  removeAttribute() { this.src = '' }
}
const audio = new FakeAudio()
const storage = new Map()
const calls = []
const player = createMusicPlayer({ enabled: true, api: 'https://api.example', playlist: '1', level: 'exhigh', volume: 0.6, warmup: '', tracks: [] }, {
  audioFactory: () => audio,
  storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  fetcher: async url => { calls.push(String(url)); return { ok: true, json: async () => String(url).includes('/playlist') ? payload : { data: { lrc: { lyric: '[00:01]Hello' } } } } },
})
await player.init()
assert.equal(player.tracks.value.length, 2)
assert.equal(player.playing.value, false)
assert.equal(audio.paused, true)
await player.togglePlay()
assert.equal(player.playing.value, true)
assert.match(audio.src, /stream\?id=1/)
await player.playAt(1)
assert.equal(player.current.value.id, '2')
assert.match(audio.src, /stream\?id=2/)
player.seek(12)
assert.equal(audio.currentTime, 12)
player.setVolume(0.3)
assert.equal(audio.volume, 0.3)
await player.loadPlaylist()
assert.equal(calls.filter(url => url.includes('/playlist')).length, 1)
const first = player.playAt(0)
const second = player.playAt(1)
await Promise.all([first, second])
assert.match(audio.src, /stream\?id=2/)
player.pause()
assert.equal(player.playing.value, false)
assert.equal(JSON.parse(storage.get('kemiao:music')).id, '2')
player.dispose()

const offlineAudio = new FakeAudio()
const offline = createMusicPlayer({ enabled: true, api: 'https://api.example', playlist: '1', level: 'exhigh', volume: 0.5, warmup: '', tracks: [{ id: 'demo', name: 'Local', src: '/music/demo.mp3' }] }, {
  audioFactory: () => offlineAudio,
  fetcher: async () => { throw new Error('offline') },
})
await offline.init()
assert.equal(offline.tracks.value.length, 1)
assert.equal(offline.status.value, 'ready')
assert.equal(offline.playlistError.value, true)
await offline.playAt(0)
assert.equal(offlineAudio.src, '/music/demo.mp3')
assert.equal(offline.playing.value, true)
offline.dispose()
console.log('PASS: shared playback, silent initialization, persistence, latest-selection wins, offline local library')
const savedAudio = new FakeAudio()
const saved = createMusicPlayer({ enabled: true, api: 'https://api.example', playlist: '', level: 'exhigh', volume: 0.5, warmup: '', tracks: [{ id: 'first', name: 'First', src: '/first.mp3' }, { id: 'second', name: 'Second', src: '/second.mp3' }] }, {
  audioFactory: () => savedAudio,
  storage: { getItem: () => JSON.stringify({ id: 'local:second', time: 18, volume: 0.2 }), setItem() {} },
})
await saved.init()
assert.equal(saved.current.value.id, 'local:second')
savedAudio.dispatchEvent(new Event('loadedmetadata'))
assert.equal(savedAudio.currentTime, 18)
saved.dispose()
console.log('PASS: local-only library restores selected track and position')

const config = { enabled: true, api: 'https://api.example', playlist: '1', level: 'exhigh', volume: 0.5, warmup: '', tracks: [] }
const cachedAudio = new FakeAudio()
let playlistRequests = 0
const cached = createMusicPlayer(config, {
  audioFactory: () => cachedAudio,
  storage: { getItem: key => key.includes(':playlist:') ? JSON.stringify({ at: Date.now(), name: 'Mix', tracks: payload.data.playlist.tracks }) : null, setItem() {} },
  fetcher: async () => { playlistRequests++; return { ok: true, json: async () => payload } },
})
await cached.init()
await cached.loadPlaylist(true)
assert.equal(playlistRequests, 1, 'cache must not prevent refresh')
cached.enqueue({ id: '99', name: 'Search track', artists: '', album: '', cover: '', source: 'api' })
await cached.playAt(2)
await cached.loadPlaylist(true)
assert.equal(cached.current.value.id, '99', 'refresh preserves manually added current song')
assert.match(cachedAudio.src, /id=99/)
cached.pause()
cachedAudio.currentTime = 42
cachedAudio.dispatchEvent(new Event('timeupdate'))
const previousSource = cachedAudio.src
await cached.loadPlaylist(true)
assert.equal(cachedAudio.src, previousSource)
assert.equal(cachedAudio.currentTime, 42)
cached.dispose()

const mixedAudio = new FakeAudio()
const mixed = createMusicPlayer({ ...config, tracks: [{ id: 'local', name: 'Local', src: '/local.mp3' }] }, {
  audioFactory: () => mixedAudio,
  storage: { getItem: key => key === 'kemiao:music' ? JSON.stringify({ id: '2', time: 42 }) : null, setItem() {} },
  fetcher: async () => ({ ok: true, json: async () => payload }),
})
await mixed.init()
assert.equal(mixed.current.value.id, '2', 'API restore has priority over local default')
mixedAudio.dispatchEvent(new Event('loadedmetadata'))
assert.equal(mixedAudio.currentTime, 42)
mixed.dispose()

let resolvePlaylist
const delayedAudio = new FakeAudio()
const delayed = createMusicPlayer(config, {
  audioFactory: () => delayedAudio,
  fetcher: () => new Promise(resolve => { resolvePlaylist = () => resolve({ ok: true, json: async () => payload }) }),
})
const initializing = delayed.init()
const requestedPlay = delayed.togglePlay()
delayed.pause()
resolvePlaylist()
await Promise.all([initializing, requestedPlay])
assert.equal(delayedAudio.paused, true, 'pause cancels playback while loading playlist')
assert.equal(delayed.playing.value, false)
delayed.dispose()
console.log('PASS: refresh after cache, search queue preservation, paused progress, mixed-source restore, cancel pending playback')
const isolatedA = createMusicPlayer({ ...config, playlist: '' })
const isolatedB = createMusicPlayer({ ...config, playlist: '' })
isolatedA.enqueue({ id: '123', name: 'Only A', artists: '', album: '', cover: '', source: 'api' })
assert.equal(isolatedB.tracks.value.length, 0)
const rejected = createMusicPlayer(config, { audioFactory: () => new FakeAudio(), fetcher: async () => ({ ok: false, status: 500 }) })
await rejected.init()
assert.equal(rejected.status.value, 'error')
assert.equal(rejected.playlistError.value, true)
rejected.dispose()
isolatedA.dispose()
isolatedB.dispose()
console.log('PASS: per-app SSR isolation and API error state')

const { normalizeMetingPlaylist, metingUrl } = await import('../app/utils/music.ts')
const metingConfig = { enabled: true, api: 'https://meting.example/api', server: 'netease', playlist: '123', name: 'Meting' }
const metingPayload = [
  { title: 'Meting One', author: 'A / B', pic: 'https://img.example/one.jpg', url: 'https://meting.example/api?server=netease&type=url&id=1&auth=signed', lrc: 'https://meting.example/api?server=netease&type=lrc&id=1&auth=lyric' },
  { title: 'Duplicate', url: 'https://meting.example/api?server=netease&type=url&id=1&auth=new' },
  { title: 'Invalid', url: 'javascript:alert(1)' },
  { title: 'JSONP unsupported', url: '@{"req":1}' },
]
assert.equal(metingUrl('https://meting.example/', 'netease', 'playlist', '123'), 'https://meting.example/api?server=netease&type=playlist&id=123')
assert.equal(metingUrl('https://meting.example/api?custom=1', 'netease', 'search', 'A B'), 'https://meting.example/api?custom=1&server=netease&type=search&id=A+B')
const metingList = normalizeMetingPlaylist(metingPayload, 'netease')
assert.equal(metingList.length, 1)
assert.equal(metingList[0].id, 'meting:netease:1')
assert.equal(metingList[0].source, 'meting')
assert.equal(metingList[0].src, metingPayload[0].url)
assert.equal(metingList[0].lyricsUrl, metingPayload[0].lrc)
assert.throws(() => normalizeMetingPlaylist({ status: 500 }, 'netease'), /meting/)
console.log('PASS: Meting query protocol, stable namespaced IDs, signature URLs and invalid inputs')

for (const selected of ['netease', 'meting']) {
  const configuredAudio = new FakeAudio()
  const configuredStore = new Map([['kemiao:music:source', selected === 'meting' ? 'netease' : 'meting']])
  const requests = []
  const configured = createMusicPlayer({ ...config, source: selected, meting: metingConfig }, {
    audioFactory: () => configuredAudio,
    storage: { getItem: key => configuredStore.get(key) ?? null, setItem: (key, value) => configuredStore.set(key, value) },
    fetcher: async url => {
      const address = String(url); requests.push(address)
      return { ok: true, json: async () => address.includes('meting.example') ? metingPayload : payload, text: async () => '[00:01.00]Meting lyric' }
    },
  })
  await configured.init()
  assert.equal(configured.source, selected, 'code config overrides legacy stored source')
  assert.equal('setSource' in configured, false, 'no runtime source switching API')
  assert.equal(configured.playing.value, false)
  assert.equal(configured.current.value.id, selected === 'meting' ? 'meting:netease:1' : '1')
  await configured.togglePlay()
  if (selected === 'meting') {
    assert.equal(configuredAudio.src, metingPayload[0].url)
    await configured.loadLyrics()
    assert.equal(configured.lyrics.value[0].text, 'Meting lyric')
    assert.equal((await configured.search('keyword'))[0].source, 'meting')
    assert.ok(requests.every(url => url.includes('meting.example')))
    configured.enqueue({ id: 'meting:netease:99', name: 'Added', artists: '', album: '', cover: '', source: 'meting', src: 'https://meting.example/song.mp3' })
    await configured.loadPlaylist(true)
    assert.ok(configured.tracks.value.some(track => track.id === 'meting:netease:99'))
  } else {
    assert.match(configuredAudio.src, /stream\?id=1/)
    assert.equal((await configured.search('keyword')).length, 0)
    assert.ok(requests.every(url => url.includes('api.example')))
  }
  configured.dispose()
  assert.equal(configuredStore.get('kemiao:music:source'), selected === 'meting' ? 'netease' : 'meting', 'legacy preference is ignored and not rewritten')
}
console.log('PASS: code-only source selection, legacy preference ignored, protocol-specific playback/search/lyrics, no runtime switch')

const { createMusicPlayer: createNcmPlayer } = await import('../app/utils/music-player.ts')
assert.equal(upgradeMediaUrl('http://m801.music.126.net/a/b.flac'), 'https://m801.music.126.net/a/b.flac')
assert.equal(upgradeMediaUrl('https://p1.music.126.net/c.jpg'), 'https://p1.music.126.net/c.jpg')
assert.equal(upgradeMediaUrl('javascript:alert(1)'), '')
assert.equal(upgradeMediaUrl('/music/a.mp3'), '/music/a.mp3')

const ncmPlaylistPayload = { code: 200, playlist: { name: '夜声羽烦喜欢的音乐', coverImgUrl: 'http://p1.music.126.net/cover.jpg', tracks: [
  { id: 2603290364, name: 'One', ar: [{ name: 'A' }, { name: 'B' }], al: { name: 'First', picUrl: 'http://p3.music.126.net/one.jpg' }, dt: 200000, fee: 1 },
  { id: 2603290364, name: 'Duplicate' },
  { id: 1901371647, name: 'Two', ar: [{ name: 'C' }], al: { name: 'Second' }, fee: 0 },
  { name: 'Invalid' },
] } }
const ncmParsed = normalizeNcmPlaylist(ncmPlaylistPayload)
assert.equal(ncmParsed.name, '夜声羽烦喜欢的音乐')
assert.equal(ncmParsed.tracks.length, 2)
assert.equal(ncmParsed.tracks[0].id, '2603290364')
assert.equal(ncmParsed.tracks[0].artists, 'A / B')
assert.equal(ncmParsed.tracks[0].album, 'First')
assert.equal(ncmParsed.tracks[0].cover, 'https://p3.music.126.net/one.jpg', 'http cover is upgraded')
assert.equal(ncmParsed.tracks[0].source, 'ncm')
assert.equal(ncmParsed.tracks[1].cover, 'https://p1.music.126.net/cover.jpg', 'playlist cover is the fallback')
assert.throws(() => normalizeNcmPlaylist({ code: 200 }), /ncm playlist/)
assert.deepEqual(normalizeNcmPlaylist({ playlist: { name: 'x', tracks: [] } }).tracks, [])

const ncmSearch = normalizeNcmSearch({ result: { songs: [
  { id: 1, name: 'Hit', ar: [{ name: 'Singer' }], al: { name: 'Album', picUrl: 'http://p4.music.126.net/s.jpg' }, fee: 0 },
  { id: 1, name: 'Dup' },
] } })
assert.equal(ncmSearch.length, 1)
assert.equal(ncmSearch[0].source, 'ncm')
assert.equal(ncmSearch[0].cover, 'https://p4.music.126.net/s.jpg')
assert.deepEqual(normalizeNcmSearch({ result: {} }), [])
assert.deepEqual(normalizeNcmSearch(null), [])
console.log('PASS: NCM payload normalization, http upgrade, ar/al mapping, duplicates dropped')

const ncmConfig = { enabled: true, api: '/api/ncm', playlist: '2607560262', name: 'NCM' }
const ncmAudio = new FakeAudio()
const ncmRequests = []
const ncmPlayer = createNcmPlayer({ ...config, playlist: '2607560262', source: 'ncm', ncm: ncmConfig }, {
  audioFactory: () => ncmAudio,
  storage: { getItem: () => null, setItem() {} },
  fetcher: async url => {
    const address = String(url); ncmRequests.push(address)
    if (address.includes('/playlist/detail')) return { ok: true, json: async () => ncmPlaylistPayload }
    if (address.includes('/song/url/v1')) {
      const id = new URL(address, 'https://local.invalid').searchParams.get('id')
      return { ok: true, json: async () => ({ code: 200, data: [{ id, url: `http://m801.music.126.net/${id}.flac`, fee: 0 }] }) }
    }
    if (address.includes('/lyric')) return { ok: true, json: async () => ({ code: 200, lrc: { lyric: '[00:01.00]NCM lyric' }, tlyric: { lyric: '[00:01.00]译文' } }) }
    if (address.includes('/cloudsearch')) return { ok: true, json: async () => ({ code: 200, result: { songs: [{ id: 777, name: 'Found', ar: [{ name: 'X' }], al: { name: 'Y' } }] } }) }
    return { ok: false, status: 500 }
  },
})
await ncmPlayer.init()
assert.equal(ncmPlayer.source, 'ncm')
assert.equal(ncmPlayer.tracks.value.length, 2)
assert.equal(ncmPlayer.current.value.id, '2603290364')
assert.ok(ncmRequests.some(url => url.startsWith('/api/ncm/playlist/detail')), 'playlist goes through the proxy prefix')
await ncmPlayer.togglePlay()
assert.equal(ncmAudio.src, 'https://m801.music.126.net/2603290364.flac', 'http direct link is upgraded to https')
await ncmPlayer.loadLyrics()
assert.equal(ncmPlayer.lyrics.value[0].text, 'NCM lyric')
assert.equal(ncmPlayer.lyrics.value[0].translation, '译文')
const ncmFound = await ncmPlayer.search('keyword')
assert.equal(ncmFound[0].id, '777')
assert.equal(ncmFound[0].source, 'ncm')
assert.ok(ncmRequests.every(url => url.startsWith('/api/ncm')), 'every NCM call stays on the same-origin proxy')
ncmPlayer.dispose()
console.log('PASS: NCM source plays through proxy prefix, resolves and upgrades the direct link, lyrics and search')

const ncmCachePlayer = createNcmPlayer({ ...config, playlist: '2607560262', source: 'ncm', ncm: ncmConfig }, {
  audioFactory: () => new FakeAudio(),
  storage: { getItem: () => null, setItem() {} },
  fetcher: async url => {
    const address = String(url)
    if (address.includes('/playlist/detail')) return { ok: true, json: async () => ncmPlaylistPayload }
    // 这首取不到地址：上游未登录时 fee 曲目就是 url=null
    return { ok: true, json: async () => ({ code: 200, data: [{ id: '2603290364', url: null }] }) }
  },
})
await ncmCachePlayer.init()
await ncmCachePlayer.togglePlay()
assert.equal(ncmCachePlayer.unavailable.value, true, 'a null direct link marks the track unavailable instead of playing an empty src')
assert.equal(ncmCachePlayer.playing.value, false)
ncmCachePlayer.dispose()
console.log('PASS: NCM missing direct link degrades to unavailable, not a silent empty src')
