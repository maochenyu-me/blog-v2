import { createMusicPlayer } from '../utils/music-player'

export default defineNuxtPlugin(nuxtApp => {
  const player = createMusicPlayer(useBlogConfig().music)

  if (import.meta.client) {
    const router = nuxtApp.$router
    if (router.currentRoute.value.path.replace(/\/$/, '') === '/music') void player.init()
    router.afterEach(to => {
      if (to.path.replace(/\/$/, '') === '/music') void player.init()
    })

    window.addEventListener('pagehide', player.persist)
    if (import.meta.hot) import.meta.hot.dispose(() => {
      window.removeEventListener('pagehide', player.persist)
      player.dispose()
    })
  }

  return { provide: { musicPlayer: player } }
})
