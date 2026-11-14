<script setup lang="ts">
import { createAirConditioner, changeTemperature, changeMode, togglePower, energyHint, MIN_TEMPERATURE, MAX_TEMPERATURE, type AirMode } from '../utils/air-conditioner'
const { ui, t } = useUi()
const text = ui.airConditioner
const state = ref(createAirConditioner())
const { muted, failed, update, toggleMute } = useAirConditionerSound()
const hint = computed(() => energyHint(state.value))
useSeoMeta({ title: text.title, description: text.description })
function setMode(mode: AirMode) { state.value = changeMode(state.value, mode); void update(state.value.powered) }
function power() { state.value = togglePower(state.value); void update(state.value.powered) }
function temperature(delta: number) { state.value = changeTemperature(state.value, delta); void update(state.value.powered) }
</script>

<template>
  <div class="ac-page">
    <section class="ac-room" :class="{ 'is-on': state.powered, 'is-heat': state.mode === 'heat' }" :aria-label="text.title">
      <header class="ac-heading"><span>{{ text.eyebrow }}</span><h1>{{ text.title }}</h1><p>{{ state.mode === 'heat' ? text.heatTip : text.tip }}</p></header>
      <div class="ac-device-zone">
        <div class="ac-device" role="img" :aria-label="text.device">
          <div class="ac-front">
            <div class="ac-energy" aria-hidden="true"><strong>{{ text.efficiency }}</strong><div v-for="n in 5" :key="n" class="ac-energy-band" :style="{ '--band': n }"><span>{{ n }}</span></div><small>{{ text.energy }}</small></div>
            <div class="ac-display"><Icon :name="state.mode === 'heat' ? 'tabler:sun' : 'tabler:snowflake'" /><span class="ac-digits">{{ state.temperature }}<small>°C</small></span></div>
          </div>
          <div class="ac-brand"><Icon name="tabler:wind" /><span>{{ text.brand }}</span><span class="ac-indicator" /></div>
          <div class="ac-vent"><div class="ac-louver" /></div>
        </div>
        <div class="ac-wind" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div class="ac-status" role="status" aria-live="polite"><span class="ac-status-dot" />{{ state.powered ? t(text.running, { mode: text[state.mode], temperature: state.temperature }) : text.off }}</div>
      <div class="ac-remote" role="group" :aria-label="text.remote">
        <div class="ac-main-buttons">
          <button type="button" class="ac-button ac-cool" :class="{ selected: state.mode === 'cool' }" :aria-label="text.cool" :aria-pressed="state.mode === 'cool'" :title="text.cool" @click="setMode('cool')"><Icon name="tabler:snowflake" /></button>
          <button type="button" class="ac-button ac-power" :aria-label="state.powered ? text.powerOff : text.powerOn" :aria-pressed="state.powered" :title="state.powered ? text.powerOff : text.powerOn" @click="power"><Icon name="tabler:power" /></button>
          <button type="button" class="ac-button ac-heat" :class="{ selected: state.mode === 'heat' }" :aria-label="text.heat" :aria-pressed="state.mode === 'heat'" :title="text.heat" @click="setMode('heat')"><Icon name="tabler:sun" /></button>
        </div>
        <div class="ac-temperature-control"><button type="button" class="ac-button ac-adjust" :aria-label="text.increase" :title="text.increase" :disabled="state.temperature >= MAX_TEMPERATURE" @click="temperature(1)"><Icon name="tabler:caret-up-filled" /></button><output class="ac-temperature-readout" :aria-label="t(text.temperature, { temperature: state.temperature })">{{ state.temperature }}<small>°C</small></output><button type="button" class="ac-button ac-adjust" :aria-label="text.decrease" :title="text.decrease" :disabled="state.temperature <= MIN_TEMPERATURE" @click="temperature(-1)"><Icon name="tabler:caret-down-filled" /></button></div>
        <span class="ac-limits">{{ text.limits }}</span>
      </div>
      <p class="ac-energy-hint">{{ hint === 'cool' ? text.coolHint : hint === 'heat' ? text.heatHint : text.virtual }}</p>
      <div class="ac-sound"><button type="button" :aria-label="muted ? text.unmute : text.mute" :aria-pressed="!muted" @click="toggleMute(state.powered)"><Icon :name="muted ? 'tabler:volume-off' : 'tabler:volume'" /><span>{{ muted ? text.soundOff : text.soundOn }}</span></button><small v-if="failed" role="status">{{ text.soundFailed }}</small></div>
      <footer class="ac-credit">{{ text.inspiration }} <a href="https://github.com/anzhiyu-c/air-conditioner-vue" target="_blank" rel="noopener noreferrer">{{ text.source }}<Icon name="tabler:arrow-up-right" /></a></footer>
    </section>
  </div>
</template>

<style scoped>
.ac-page { max-width: var(--home-max-width); margin: 0 auto; padding: 1.5rem var(--space-gutter) 3rem; }
.ac-room { --ac-cool: #27669f; --ac-heat: #a45b16; --ac-active: var(--ac-cool); --ac-shell: var(--card); --ac-shell-bottom: var(--muted); --ac-shadow: color-mix(in srgb, var(--foreground) 12%, transparent); --ac-led: #5b8b39; --ac-white: #fff; position: relative; isolation: isolate; display: flex; flex-direction: column; align-items: center; min-height: 720px; padding: 2.5rem 1.5rem 1.5rem; border: 1px solid var(--glass-border); border-radius: var(--radius-card); background: var(--glass-bg); overflow: hidden; }
.ac-room::before { content: ''; position: absolute; inset: 0; z-index: -1; background: radial-gradient(ellipse at 50% 28%, color-mix(in srgb, var(--ac-active) 7%, transparent), transparent 58%); opacity: 0; transition: opacity .7s; }
.ac-room.is-on::before { opacity: 1; }
.ac-room.is-heat { --ac-active: var(--ac-heat); }
:global(.dark .ac-room) { --ac-cool: #79b6df; --ac-heat: #e5ac6e; --ac-led: #a1cc7b; }
.ac-heading { text-align: center; }
.ac-heading > span { color: var(--muted-foreground); font: .6rem/1.5 var(--font-mono); letter-spacing: .22em; }
.ac-heading h1 { margin: .45rem 0 .5rem; font-size: var(--fs-h1); font-weight: 700; letter-spacing: .08em; }
.ac-heading p { margin: 0; color: var(--muted-foreground); font-size: var(--fs-meta); }
.ac-device-zone { width: min(100%, 540px); margin-top: 3rem; }
.ac-device { position: relative; height: 162px; border: 1px solid var(--border); border-radius: 14px 14px 28px 28px; background: linear-gradient(180deg, var(--ac-shell) 60%, var(--ac-shell-bottom)); box-shadow: 0 14px 24px -10px var(--ac-shadow), inset 0 2px 2px color-mix(in srgb, var(--ac-white) 60%, transparent); overflow: hidden; }
.ac-front { display: flex; align-items: center; justify-content: space-between; height: 107px; padding: 20px 30px; }
.ac-energy { width: 46px; padding: 3px; background: var(--ac-white); border: 1px solid color-mix(in srgb, var(--border) 80%, transparent); border-radius: 2px; transform: rotate(-1deg); color: #2c4f67; }
.ac-energy strong { display: block; font: 700 4px/1.7 var(--font-sans); text-align: center; }
.ac-energy-band { height: 5px; margin-top: 1px; width: calc(18px + var(--band) * 3px); border-radius: 0 5px 5px 0; background: var(--ac-energy-color); }
.ac-energy-band:nth-of-type(1) { --ac-energy-color: #3b8f72; }
.ac-energy-band:nth-of-type(2) { --ac-energy-color: #75aa69; }
.ac-energy-band:nth-of-type(3) { --ac-energy-color: #dfc35d; }
.ac-energy-band:nth-of-type(4) { --ac-energy-color: #ce9b4c; }
.ac-energy-band:nth-of-type(5) { --ac-energy-color: #c87151; }
.ac-energy-band span { display: block; font: 4px/5px var(--font-mono); padding-left: 3px; color: var(--ac-white); }
.ac-energy small { display: block; text-align: center; font-size: 4px; line-height: 1.8; }
.ac-display { display: flex; flex-direction: column; align-items: flex-end; gap: .15rem; color: var(--muted-foreground); opacity: .65; transition: color .4s, opacity .4s; }
.is-on .ac-display { color: var(--ac-active); opacity: 1; }
.ac-display > .iconify { font-size: 1rem; }
.ac-digits { font: 300 2.6rem/1 var(--font-mono); letter-spacing: -.08em; }
.ac-digits small { font-size: 1rem; letter-spacing: 0; margin-left: .3rem; }
.ac-brand { position: relative; height: 30px; display: flex; gap: .3rem; justify-content: center; align-items: center; color: var(--muted-foreground); font-size: 8px; letter-spacing: .14em; }
.ac-brand > .iconify { font-size: 13px; }
.ac-indicator { position: absolute; right: 19px; top: 12px; width: 4px; height: 4px; border-radius: 50%; background: var(--border); }
.is-on .ac-indicator { background: var(--ac-led); }
.ac-vent { position: absolute; bottom: 0; height: 23px; width: 100%; border-top: 1px solid var(--border); background: color-mix(in srgb, var(--foreground) 3%, var(--ac-shell-bottom)); perspective: 150px; }
.ac-louver { height: 100%; background: var(--ac-shell-bottom); border-top: 1px solid color-mix(in srgb, var(--ac-white) 30%, transparent); transform-origin: top; transition: transform .7s; }
.is-on .ac-louver { transform: rotateX(55deg); }
.ac-wind { display: flex; justify-content: center; gap: 5rem; height: 58px; padding-top: 14px; opacity: 0; transition: opacity .6s; }
.is-on .ac-wind { opacity: .65; }
.ac-wind i { display: block; width: 3px; height: 36px; border-radius: 50%; background: linear-gradient(var(--ac-active), transparent); }
.ac-wind i:first-child { rotate: 14deg; }
.ac-wind i:last-child { rotate: -14deg; }
.ac-status { display: flex; align-items: center; gap: .45rem; min-height: 25px; font-size: .75rem; color: var(--muted-foreground); }
.ac-status-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--border); }
.is-on .ac-status-dot { background: var(--ac-active); }
.ac-remote { display: flex; flex-direction: column; align-items: center; padding-top: 1.25rem; }
.ac-main-buttons { display: flex; gap: 1rem; }
.ac-button { display: grid; place-items: center; width: 56px; height: 56px; padding: 0; border: 1px solid transparent; border-radius: 50%; cursor: pointer; font-size: 1.6rem; transition: transform .18s, background .18s, opacity .18s; }
.ac-button:hover:not(:disabled) { transform: translateY(-2px); }
.ac-button:active:not(:disabled) { transform: scale(.94); }
.ac-button:focus-visible, .ac-sound button:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
.ac-cool { color: var(--ac-cool); background: color-mix(in srgb, var(--ac-cool) 12%, var(--card)); }
.ac-heat { color: var(--ac-heat); background: color-mix(in srgb, var(--ac-heat) 12%, var(--card)); }
.ac-button.selected { border-color: currentColor; }
.ac-power { background: var(--foreground); color: var(--background); }
.is-on .ac-power { background: var(--ac-active); color: var(--background); }
.ac-adjust { background: var(--muted); color: var(--foreground); }
.ac-button:disabled { opacity: .35; cursor: default; }
.ac-temperature-control { display: flex; flex-direction: column; align-items: center; margin-top: .8rem; }
.ac-temperature-control .ac-button { width: 48px; height: 48px; font-size: 1.25rem; }
.ac-temperature-readout { display: block; margin-block: .5rem; font: .95rem/1 var(--font-mono); color: var(--foreground); }
.ac-temperature-readout small { margin-left: 2px; font-size: .6rem; }
.ac-limits { color: var(--muted-foreground); font-size: .65rem; margin-top: .7rem; }
.ac-energy-hint { margin: 1rem 0 0; min-height: 1.5rem; font-size: .75rem; color: var(--muted-foreground); text-align: center; line-height: 1.8; }
.ac-sound { margin-top: .35rem; text-align: center; }
.ac-sound button { display: flex; align-items: center; justify-content: center; gap: .4rem; min-height: 44px; padding: 0 .5rem; border: 0; background: transparent; color: var(--muted-foreground); cursor: pointer; font: .7rem var(--font-sans); }
.ac-sound small { display: block; color: var(--accent); font-size: .7rem; }
.ac-credit { display: flex; justify-content: center; flex-wrap: wrap; gap: .35rem; margin-top: 1.25rem; font-size: .65rem; color: var(--muted-foreground); }
.ac-credit a { display: inline-flex; align-items: center; gap: .2rem; text-decoration: underline; text-underline-offset: 3px; }
@media (prefers-reduced-motion: no-preference) { .is-on .ac-wind i { animation: ac-airflow 2s ease-in-out infinite; } .is-on .ac-wind i:nth-child(2) { animation-delay: -.6s; } .is-on .ac-wind i:nth-child(3) { animation-delay: -1.2s; } }
@keyframes ac-airflow { 0%, 100% { opacity: .25; transform: translateY(-4px) scaleY(.8); } 50% { opacity: .85; transform: translateY(4px) scaleY(1.1); } }
@media (prefers-reduced-motion: reduce) { .ac-room *, .ac-room::before { animation: none !important; transition: none !important; } }
@media (max-width: 600px) { .ac-page { padding: .75rem 1rem 1.5rem; } .ac-room { padding: 1.75rem 1.15rem 1.25rem; min-height: 690px; } .ac-device-zone { margin-top: 2.25rem; } .ac-device { height: 140px; border-radius: 12px 12px 23px 23px; } .ac-front { height: 88px; padding: 16px 22px; } .ac-digits { font-size: 2.1rem; } .ac-brand { height: 29px; } .ac-wind { gap: 3rem; } .ac-heading h1 { font-size: 1.5rem; } .ac-main-buttons { gap: .9rem; } }
</style>
