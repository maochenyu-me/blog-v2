import { createMusicPlayer } from '../utils/music-player'

export default defineNuxtPlugin(nuxtApp => {
  const player = createMusicPlayer(useBlogConfig().music)
  onNuxtReady(() => { void player.init() })
  if (import.meta.client) {
    window.addEventListener('pagehide', player.persist)
    if (import.meta.hot) import.meta.hot.dispose(() => {
      window.removeEventListener('pagehide', player.persist)
      player.dispose()
    })
  }
  return { provide: { musicPlayer: player } }
})
