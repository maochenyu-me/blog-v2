<script setup lang="ts">
import { createTierState, distributeTierItems, exportTierList, moveTierItem, removeTierItem, tierCounts, TIER_ROWS, type TierItem, type TierState, type TierZone } from '~/utils/tier-list'

const { ui, t } = useUi()
const text = ui.tools.tier

useHead({ title: text.title })

const state = ref<TierState>(createTierState())
const title = ref(text.title)
const message = ref('')
const isExporting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const zoneElements = new Map<TierZone, HTMLElement>()
const drag = ref<{ id: string; from: TierZone; x: number; y: number; offsetX: number; offsetY: number; width: number; height: number; active: boolean; over: TierZone | null }>({ id: '', from: 'pool', x: 0, y: 0, offsetX: 0, offsetY: 0, width: 0, height: 0, active: false, over: null })
const counts = computed(() => tierCounts(state.value))
const draggedItem = computed(() => [...state.value.pool, ...TIER_ROWS.flatMap(tier => state.value[tier.id])].find(item => item.id === drag.value.id))

let urls = new Set<string>()
let loadGeneration = 0

onBeforeUnmount(() => {
  cancelDrag()
  loadGeneration++
  for (const url of urls) URL.revokeObjectURL(url)
  urls.clear()
})

function setZoneElement(zone: TierZone, element: Element | null) {
  if (element instanceof HTMLElement) zoneElements.set(zone, element)
  else zoneElements.delete(zone)
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function addImages(files: FileList | File[]) {
  const images = Array.from(files).filter(file => file.type.startsWith('image/') || /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(file.name))
  if (!images.length) {
    message.value = text.invalidImageFile
    return
  }
  const generation = loadGeneration
  Promise.all(images.map(file => new Promise<TierItem>(resolve => {
    const src = URL.createObjectURL(file)
    urls.add(src)
    const image = new Image()
    image.onload = () => resolve({ id: createId(), name: file.name, src, ratio: image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1 })
    image.onerror = () => resolve({ id: createId(), name: file.name, src, ratio: 1 })
    image.src = src
  }))).then(items => {
    if (generation !== loadGeneration) {
      for (const item of items) {
        URL.revokeObjectURL(item.src)
        urls.delete(item.src)
      }
      return
    }
    state.value = distributeTierItems(state.value, items)
    message.value = ''
  })
}

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) addImages(input.files)
  input.value = ''
}

function onPageDrop(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (files?.length) {
    event.preventDefault()
    addImages(files)
  }
}

function onZoneDrop(event: DragEvent, zone: TierZone) {
  const files = event.dataTransfer?.files
  if (files?.length) {
    event.preventDefault()
    addImages(files)
  }
}

function beginDrag(event: PointerEvent, item: TierItem, from: TierZone) {
  if (!event.isPrimary || event.button !== 0 || drag.value.active) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  drag.value = { id: item.id, from, x: event.clientX, y: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, width: rect.width, height: rect.height, active: false, over: null }
  window.addEventListener('pointermove', moveDrag, { passive: false })
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', cancelDrag)
  window.addEventListener('keydown', onDragKeydown)
}

function moveDrag(event: PointerEvent) {
  const current = drag.value
  if (!current.id) return
  if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return
  event.preventDefault()
  const edge = 52
  if (event.clientY < edge) window.scrollBy(0, -Math.ceil((edge - event.clientY) / 3))
  else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, Math.ceil((event.clientY - (window.innerHeight - edge)) / 3))
  const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-tier-zone]')
  const over = element?.dataset.tierZone as TierZone | undefined
  drag.value = { ...current, x: event.clientX, y: event.clientY, active: true, over: over && (over === 'pool' || TIER_ROWS.some(row => row.id === over)) ? over : null }
}

function endDrag(event: PointerEvent) {
  const current = drag.value
  if (current.id && current.active) {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-tier-zone]')
    const to = element?.dataset.tierZone as TierZone | undefined
    if (to && (to === 'pool' || TIER_ROWS.some(row => row.id === to))) {
      const zone = zoneElements.get(to)
      const cards = Array.from(zone?.querySelectorAll<HTMLElement>('[data-tier-card]') ?? []).filter(card => card.dataset.tierCard !== current.id)
      const index = cards.findIndex(card => {
        const rect = card.getBoundingClientRect()
        return event.clientY < rect.top + rect.height / 2 || (Math.abs(event.clientY - rect.top - rect.height / 2) < rect.height / 2 && event.clientX < rect.left + rect.width / 2)
      })
      state.value = moveTierItem(state.value, current.id, current.from, to, index < 0 ? cards.length : index)
    }
  }
  cancelDrag()
}

function cancelDrag() {
  window.removeEventListener('pointermove', moveDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', cancelDrag)
  window.removeEventListener('keydown', onDragKeydown)
  drag.value = { id: '', from: 'pool', x: 0, y: 0, offsetX: 0, offsetY: 0, width: 0, height: 0, active: false, over: null }
}

function onDragKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') cancelDrag()
}

function deleteItem(item: TierItem) {
  state.value = removeTierItem(state.value, item.id)
  URL.revokeObjectURL(item.src)
  urls.delete(item.src)
}

function clearAll() {
  for (const url of urls) URL.revokeObjectURL(url)
  urls.clear()
  loadGeneration++
  state.value = createTierState()
  cancelDrag()
  message.value = ''
}

async function saveRanking() {
  if (!counts.value.ranked || isExporting.value) return
  isExporting.value = true
  message.value = ''
  try {
    const blob = await exportTierList(state.value, title.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.value.trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || text.title}.png`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    message.value = text.saved
  } catch (error) {
    message.value = error instanceof Error ? error.message : text.exportFailed
  } finally {
    isExporting.value = false
  }
}

function onZoneDragOver(event: DragEvent, zone: TierZone) {
  if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
  else if (drag.value.active) event.preventDefault()
}
</script>

<template>
  <main class="tier-page" @dragover.prevent="onZoneDragOver($event, 'pool')" @drop="onPageDrop">
    <header class="tier-heading">
      <div>
        <p class="tier-kicker">LOCAL TIER STUDIO · 02</p>
        <h1>{{ text.title }}</h1>
        <p>{{ text.intro }}</p>
      </div>
      <span class="local-badge"><Icon name="tabler:device-laptop" aria-hidden="true" /> {{ text.localBadge }}</span>
    </header>

    <section class="tier-board" :aria-label="text.boardAria">
      <div class="board-head">
        <div class="board-title"><Icon name="tabler:chart-bar" aria-hidden="true" /><h2>{{ text.boardTitle }}</h2></div>
        <label class="title-field" for="tier-title"><span>{{ text.exportTitleLabel }}</span><input id="tier-title" v-model="title" maxlength="80" spellcheck="false"></label>
      </div>

      <div class="tier-rows">
        <section v-for="tier in TIER_ROWS" :key="tier.id" class="tier-row" :class="[`tier-row--${tier.id}`, { 'tier-row--over': drag.active && drag.over === tier.id }]" :aria-label="t(text.tierZoneAria, { label: tier.label })">
          <div class="tier-label" :style="{ backgroundColor: tier.color }" :class="{ 'tier-label--light': tier.id === 'hang' }">{{ tier.label }}</div>
          <div :ref="el => setZoneElement(tier.id, el as Element | null)" class="tier-dropzone" :data-tier-zone="tier.id" role="region" :aria-label="t(text.tierZoneImagesAria, { label: tier.label })" @dragover.prevent="onZoneDragOver($event, tier.id)" @drop="onZoneDrop($event, tier.id)">
            <article v-for="item in state[tier.id]" :key="item.id" :data-tier-card="item.id" class="tier-item" :class="{ 'tier-item--dragging': drag.id === item.id && drag.active }" :style="{ aspectRatio: `${item.ratio}` }" @pointerdown="beginDrag($event, item, tier.id)">
              <img :src="item.src" :alt="item.name" draggable="false">
              <button class="remove-item" type="button" :aria-label="t(text.deleteItemAria, { name: item.name })" :title="text.deleteItemTitle" @pointerdown.stop @click.stop="deleteItem(item)"><Icon name="tabler:x" aria-hidden="true" /></button>
            </article>
            <span v-if="!state[tier.id].length" class="empty-tier">{{ text.emptyTier }}</span>
          </div>
        </section>
      </div>

      <div class="board-actions">
        <button class="action-button action-button--primary" type="button" @click="fileInput?.click()"><Icon name="tabler:photo-plus" aria-hidden="true" /> {{ text.addImages }}</button>
        <input ref="fileInput" class="visually-hidden" type="file" accept="image/*" multiple :aria-label="text.uploadAria" @change="onFiles">
        <button class="action-button" type="button" :disabled="!counts.ranked || isExporting" @click="saveRanking"><Icon name="tabler:download" aria-hidden="true" /> {{ isExporting ? text.saving : text.saveRanking }}</button>
        <button class="action-button action-button--danger" type="button" :disabled="!counts.total" @click="clearAll"><Icon name="tabler:trash" aria-hidden="true" /> {{ text.clearAll }}</button>
        <p class="tier-counts" aria-live="polite">{{ t(text.counts, counts) }}</p>
      </div>
      <p v-if="message" class="tier-message" role="status">{{ message }}</p>
    </section>

    <section class="pool-panel" :class="{ 'pool-panel--over': drag.active && drag.over === 'pool' }" :aria-label="text.poolAria">
      <div class="pool-heading"><div><span class="pool-kicker">UNRANKED</span><h2>{{ text.poolTitle }}</h2></div><span class="pool-count">{{ t(text.poolCount, { n: counts.pending }) }}</span></div>
      <div :ref="el => setZoneElement('pool', el as Element | null)" class="pool-dropzone" data-tier-zone="pool" role="region" :aria-label="text.poolZoneAria" @dragover.prevent="onZoneDragOver($event, 'pool')" @drop="onZoneDrop($event, 'pool')">
        <article v-for="item in state.pool" :key="item.id" :data-tier-card="item.id" class="tier-item" :class="{ 'tier-item--dragging': drag.id === item.id && drag.active }" :style="{ aspectRatio: `${item.ratio}` }" @pointerdown="beginDrag($event, item, 'pool')">
          <img :src="item.src" :alt="item.name" draggable="false">
          <button class="remove-item" type="button" :aria-label="t(text.deleteItemAria, { name: item.name })" :title="text.deleteItemTitle" @pointerdown.stop @click.stop="deleteItem(item)"><Icon name="tabler:x" aria-hidden="true" /></button>
        </article>
        <p v-if="!state.pool.length" class="pool-empty"><Icon name="tabler:photo" aria-hidden="true" /><span>{{ text.poolEmptyLine1 }}<br>{{ text.poolEmptyLine2 }}</span></p>
      </div>
    </section>

    <div v-if="drag.active && draggedItem" class="drag-preview" :style="{ left: `${drag.x - drag.offsetX}px`, top: `${drag.y - drag.offsetY}px`, width: `${drag.width}px`, height: `${drag.height}px` }" aria-hidden="true"><img :src="draggedItem.src" alt=""></div>
  </main>
</template>

<style scoped>
.tier-page { --tier-line:var(--border); --tier-muted:var(--muted-foreground); max-width:1500px; margin:0 auto; padding:1.4rem clamp(1rem,2.3vw,2rem) 4rem; }
.tier-heading { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:1.4rem; }
.tier-kicker,.pool-kicker { margin:0 0 .45rem; color:var(--accent); font:600 .67rem/1.4 var(--font-mono); letter-spacing:.13em; }
.tier-heading h1 { margin:0; font-family:'Georgia','LXGW WenKai Lite',serif; font-size:clamp(1.9rem,3.2vw,2.7rem); font-weight:500; letter-spacing:-.04em; line-height:1.05; }
.tier-heading p:not(.tier-kicker) { margin:.6rem 0 0; color:var(--tier-muted); font-size:var(--fs-meta); line-height:1.65; }
.local-badge { display:inline-flex; align-items:center; gap:.4rem; padding:.45rem .7rem; border:1px solid var(--tier-line); color:var(--tier-muted); font-size:.72rem; white-space:nowrap; }
.tier-board,.pool-panel { overflow:hidden; border:1px solid var(--tier-line); background:color-mix(in srgb,var(--card) 88%,transparent); }
.board-head { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.85rem 1rem; border-bottom:1px solid var(--tier-line); }
.board-title { display:flex; align-items:center; gap:.55rem; color:var(--accent); }
.board-title h2 { margin:0; color:var(--foreground); font-size:.9rem; font-weight:650; }
.title-field { display:flex; align-items:center; gap:.5rem; color:var(--tier-muted); font-size:.72rem; }
.title-field input { width:min(16rem,45vw); min-height:2.3rem; padding:.4rem .6rem; border:1px solid var(--tier-line); background:var(--background); color:var(--foreground); font:inherit; }
.tier-rows { display:grid; gap:.55rem; padding:.8rem; }
.tier-row { display:grid; grid-template-columns:6.25rem minmax(0,1fr); min-height:6.3rem; overflow:hidden; border:1px solid color-mix(in srgb,var(--tier-line) 70%,transparent); border-radius:.75rem; background:var(--card); transition:border-color 160ms ease-out,background 160ms ease-out; }
.tier-row--over { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 9%,var(--card)); }
.tier-label { display:flex; align-items:center; justify-content:center; padding:.5rem; color:#171717; text-align:center; font-size:clamp(.9rem,1.4vw,1.3rem); font-weight:800; user-select:none; }
.tier-label--light { color:#fff; }
.tier-dropzone,.pool-dropzone { display:flex; align-items:center; align-content:center; flex-wrap:wrap; gap:.5rem; min-width:0; padding:.55rem; background:color-mix(in srgb,var(--card) 76%,var(--background)); }
.empty-tier { padding:.5rem; color:color-mix(in srgb,var(--tier-muted) 75%,transparent); font-size:.68rem; pointer-events:none; }
.tier-item { position:relative; flex:0 0 auto; width:auto; height:4.5rem; min-width:2.8rem; max-width:14rem; overflow:hidden; border:1px solid var(--tier-line); border-radius:.65rem; background:var(--background); cursor:grab; touch-action:none; user-select:none; }
.tier-item:active { cursor:grabbing; }
.tier-item img { display:block; width:100%; height:100%; object-fit:contain; pointer-events:none; }
.tier-item--dragging { opacity:.3; }
.remove-item { position:absolute; top:.15rem; right:.15rem; display:grid; place-items:center; width:1.45rem; height:1.45rem; border:1px solid color-mix(in srgb,var(--foreground) 24%,transparent); border-radius:50%; background:color-mix(in srgb,var(--background) 88%,transparent); color:var(--foreground); cursor:pointer; opacity:0; transition:opacity 140ms ease-out; }
.tier-item:hover .remove-item,.remove-item:focus-visible { opacity:1; }
.board-actions { display:flex; align-items:center; flex-wrap:wrap; gap:.55rem; padding:.15rem 1rem 1rem; }
.action-button { display:inline-flex; align-items:center; justify-content:center; gap:.42rem; min-height:2.55rem; padding:.55rem .8rem; border:1px solid var(--tier-line); background:var(--background); color:var(--foreground); font-size:.73rem; font-weight:600; cursor:pointer; transition:background 160ms ease-out,border-color 160ms ease-out,transform 160ms ease-out; }
.action-button:hover:not(:disabled) { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 7%,var(--background)); transform:translateY(-1px); }
.action-button--primary { border-color:var(--accent); background:var(--accent); color:var(--background); }
.action-button--danger { color:var(--destructive); }
.action-button:disabled { opacity:.45; cursor:not-allowed; }
.tier-counts { margin:0 0 0 auto; color:var(--tier-muted); font-size:.72rem; font-variant-numeric:tabular-nums; }
.tier-message { margin:0 1rem 1rem; color:var(--accent); font-size:.74rem; }
.pool-panel { margin-top:1rem; border-radius:.85rem; transition:border-color 160ms ease-out; }
.pool-panel--over { border-color:var(--accent); }
.pool-heading { display:flex; align-items:center; justify-content:space-between; padding:.95rem 1rem .75rem; }
.pool-heading h2 { margin:0; font-family:'Georgia','LXGW WenKai Lite',serif; font-size:1.12rem; font-weight:500; }
.pool-kicker { margin-bottom:.25rem; font-size:.58rem; }
.pool-count { color:var(--tier-muted); font:.67rem var(--font-mono); }
.pool-dropzone { min-height:8.25rem; margin:.2rem .8rem .8rem; padding:.75rem; border:1px dashed var(--tier-line); border-radius:.7rem; }
.pool-empty { display:flex; align-items:center; gap:.7rem; margin:0; padding:.5rem; color:var(--tier-muted); font-size:.73rem; line-height:1.6; }
.pool-empty :deep(svg) { color:var(--accent); font-size:1.25rem; }
.drag-preview { position:fixed; z-index:1000; overflow:hidden; border:2px solid var(--accent); border-radius:.65rem; background:var(--background); box-shadow:0 12px 36px color-mix(in srgb,var(--foreground) 24%,transparent); pointer-events:none; opacity:.92; }
.drag-preview img { width:100%; height:100%; object-fit:contain; }
.visually-hidden { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
button:focus-visible,input:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
@media (max-width:680px) {
  .tier-page { padding:.8rem .75rem 3rem; }
  .tier-heading { align-items:flex-start; margin-bottom:1rem; }
  .local-badge { margin-top:1rem; padding:.38rem; font-size:0; }
  .local-badge :deep(svg) { font-size:1rem; }
  .board-head { align-items:flex-start; flex-direction:column; }
  .title-field { width:100%; }
  .title-field input { flex:1; width:auto; }
  .tier-rows { gap:.4rem; padding:.55rem; }
  .tier-row { grid-template-columns:4.5rem minmax(0,1fr); min-height:5.5rem; border-radius:.55rem; }
  .tier-dropzone,.pool-dropzone { gap:.35rem; padding:.4rem; }
  .tier-item { height:3.8rem; min-width:2.4rem; max-width:9rem; border-radius:.45rem; }
  .remove-item { opacity:1; width:1.25rem; height:1.25rem; }
  .board-actions { padding:0 .65rem .75rem; gap:.4rem; }
  .action-button { min-height:2.7rem; padding:.45rem .58rem; font-size:.67rem; }
  .tier-counts { flex-basis:100%; margin:.2rem 0 0; }
  .pool-dropzone { margin:.2rem .55rem .55rem; }
}
@media (prefers-reduced-motion:reduce) { .tier-row,.remove-item,.action-button,.pool-panel { transition:none; } }
</style>
