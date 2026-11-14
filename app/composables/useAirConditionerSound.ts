export function useAirConditionerSound() {
  let context: AudioContext | null = null
  let fan: AudioBufferSourceNode | null = null
  let fanGain: GainNode | null = null
  let disposed = false
  let generation = 0
  const muted = ref(false)
  const failed = ref(false)

  function getContext() {
    if (!context) context = new AudioContext()
    return context
  }
  function stopFan() {
    fan?.stop()
    fan?.disconnect()
    fanGain?.disconnect()
    fan = null
    fanGain = null
  }
  async function update(powered: boolean, beep = true) {
    const token = ++generation
    if (disposed) return
    if (!powered) stopFan()
    if (muted.value) { stopFan(); return }
    try {
      const audio = getContext()
      await audio.resume()
      if (disposed || token !== generation) return
      failed.value = false
      if (beep) {
        const tone = audio.createOscillator()
        const gain = audio.createGain()
        tone.type = 'sine'
        tone.frequency.value = 1850
        gain.gain.setValueAtTime(0.0001, audio.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.035, audio.currentTime + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.13)
        tone.connect(gain).connect(audio.destination)
        tone.start()
        tone.stop(audio.currentTime + 0.14)
        tone.onended = () => { tone.disconnect(); gain.disconnect() }
      }
      if (!powered || fan) return
      const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate)
      const samples = buffer.getChannelData(0)
      let previous = 0
      for (let index = 0; index < samples.length; index++) {
        previous = (previous + (Math.random() * 2 - 1) * 0.025) / 1.025
        samples[index] = previous * 3
      }
      const source = audio.createBufferSource()
      const gain = audio.createGain()
      source.buffer = buffer
      source.loop = true
      gain.gain.setValueAtTime(0, audio.currentTime)
      gain.gain.linearRampToValueAtTime(0.16, audio.currentTime + 1.2)
      source.connect(gain).connect(audio.destination)
      source.start()
      fan = source
      fanGain = gain
    } catch { if (!disposed && token === generation) failed.value = true }
  }
  function toggleMute(powered: boolean) {
    muted.value = !muted.value
    void update(powered, false)
  }
  onBeforeUnmount(() => {
    disposed = true
    generation++
    stopFan()
    if (context) void context.close().catch(() => undefined)
  })
  return { muted, failed, update, toggleMute }
}
