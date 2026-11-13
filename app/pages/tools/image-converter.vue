<script setup lang="ts">
import { IMAGE_FORMATS, encodeBmp, getOutputName, type ImageFormat } from '~/utils/image-converter'

const { ui, t } = useUi()
const text = ui.tools.converter

type Conversion = {
  id: string
  file: File
  previewUrl: string
  outputUrl: string
  outputName: string
  status: 'ready' | 'converting' | 'done' | 'error'
  message: string
  outputSize: number
}

useHead({ title: text.title })

const files = ref<Conversion[]>([])
const format = ref<ImageFormat>('png')
const isDragging = ref(false)
const isConverting = ref(false)
const message = ref('')
const input = ref<HTMLInputElement | null>(null)
const completed = computed(() => files.value.filter(item => item.status === 'done').length)
const totalSize = computed(() => files.value.reduce((sum, item) => sum + item.file.size, 0))

onBeforeUnmount(() => clearItems())

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function clearItems() {
  for (const item of files.value) {
    URL.revokeObjectURL(item.previewUrl)
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
  }
  files.value = []
  if (input.value) input.value.value = ''
}

function addFiles(list: FileList | File[]) {
  const accepted = Array.from(list).filter(file => file.type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(file.name))
  const rejected = list.length - accepted.length
  const existing = new Set(files.value.map(item => `${item.file.name}:${item.file.size}:${item.file.lastModified}`))
  const unique = accepted.filter(file => !existing.has(`${file.name}:${file.size}:${file.lastModified}`))
  for (const file of unique) {
    files.value.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      outputUrl: '',
      outputName: getOutputName(file.name, format.value),
      status: 'ready',
      message: '',
      outputSize: 0,
    })
  }
  if (rejected) message.value = t(text.rejectedFiles, { n: rejected })
  else if (accepted.length && !unique.length) message.value = text.alreadyAdded
  else message.value = ''
  if (!accepted.length && list.length) message.value = text.noValidImages
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) addFiles(target.files)
  target.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files) addFiles(event.dataTransfer.files)
}

function updateFormat() {
  message.value = ''
  for (const item of files.value) {
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
    item.outputUrl = ''
    item.outputName = getOutputName(item.file.name, format.value)
    item.outputSize = 0
    item.status = 'ready'
    item.message = ''
  }
}

function removeFile(item: Conversion) {
  URL.revokeObjectURL(item.previewUrl)
  if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
  files.value = files.value.filter(file => file.id !== item.id)
}

function canvasBlob(canvas: HTMLCanvasElement, mime: string) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime))
}

async function convertOne(item: Conversion) {
  item.status = 'converting'
  item.message = ''
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(item.file)
    if (!bitmap.width || !bitmap.height) throw new Error(text.invalidSize)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: format.value === 'bmp' })
    if (!context) throw new Error(text.canvasUnavailable)
    if (format.value === 'jpeg' || format.value === 'bmp') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(bitmap, 0, 0)
    let blob: Blob | null
    if (format.value === 'bmp') {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      blob = new Blob([encodeBmp(canvas.width, canvas.height, pixels)], { type: 'image/bmp' })
    } else {
      const target = IMAGE_FORMATS.find(entry => entry.value === format.value)!
      blob = await canvasBlob(canvas, target.mime)
      if (!blob || blob.type !== target.mime) {
        if (format.value === 'avif') throw new Error(text.avifUnsupported)
        throw new Error(t(text.formatUnsupported, { label: target.label }))
      }
    }
    if (!blob) throw new Error(text.noBlob)
    if (item.outputUrl) URL.revokeObjectURL(item.outputUrl)
    item.outputUrl = URL.createObjectURL(blob)
    item.outputName = getOutputName(item.file.name, format.value)
    item.outputSize = blob.size
    item.status = 'done'
  } catch (error) {
    item.status = 'error'
    item.message = error instanceof Error ? error.message : text.convertFailed
  } finally {
    bitmap?.close()
  }
}

async function convertAll() {
  if (!files.value.length || isConverting.value) return
  isConverting.value = true
  message.value = ''
  try {
    for (const item of files.value) await convertOne(item)
    const failures = files.value.filter(item => item.status === 'error').length
    message.value = failures ? t(text.convertSummaryFailed, { ok: files.value.length - failures, failed: failures }) : t(text.convertSummaryOk, { n: files.value.length })
  } finally {
    isConverting.value = false
  }
}

function download(item: Conversion) {
  if (!item.outputUrl) return
  const anchor = document.createElement('a')
  anchor.href = item.outputUrl
  anchor.download = item.outputName
  anchor.click()
}

async function downloadAll() {
  const ready = files.value.filter(item => item.status === 'done')
  if (ready.length === 1) return download(ready[0]!)
  for (const item of ready) {
    download(item)
    await new Promise(resolve => window.setTimeout(resolve, 180))
  }
}
</script>

<template>
  <main class="converter-page">
    <header class="converter-heading">
      <div>
        <p class="converter-kicker">LOCAL IMAGE CONVERTER</p>
        <h1>{{ text.title }}</h1>
        <p class="converter-intro">{{ text.intro }}</p>
      </div>
      <span class="privacy-mark"><Icon name="tabler:device-laptop" aria-hidden="true" /> {{ text.localBadge }}</span>
    </header>

    <section class="converter-workspace" :aria-label="text.workspaceAria">
      <div class="format-toolbar">
        <label for="output-format">{{ text.convertTo }}</label>
        <select id="output-format" v-model="format" :disabled="isConverting" @change="updateFormat">
          <option v-for="item in IMAGE_FORMATS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <span class="format-hint">PNG · JPEG · WebP · BMP · AVIF</span>
      </div>

      <div
        class="drop-area"
        :class="{ 'is-dragging': isDragging, 'has-files': files.length }"
        @dragenter.prevent="isDragging = true"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click="files.length ? undefined : input?.click()"
        @keydown.enter="files.length ? undefined : input?.click()"
        @keydown.space.prevent="files.length ? undefined : input?.click()"
        role="button"
        tabindex="0"
        :aria-label="files.length ? text.dropAriaWithFiles : text.dropAriaEmpty"
      >
        <template v-if="!files.length">
          <span class="drop-mark"><Icon name="tabler:photo-plus" aria-hidden="true" /></span>
          <strong>{{ text.dropTitle }}</strong>
          <span>{{ text.dropFormats }}</span>
          <button class="browse-button" type="button" @click.stop="input?.click()">{{ text.browse }}</button>
        </template>
        <template v-else>
          <div class="list-heading">
            <div><strong>{{ t(text.filesCount, { n: files.length }) }}</strong><span> · {{ formatBytes(totalSize) }} · {{ t(text.convertedCount, { n: completed }) }}</span></div>
            <button class="clear-button" type="button" :disabled="isConverting" @click.stop="clearItems">{{ text.clear }}</button>
          </div>
          <div class="file-list" @click.stop>
            <article v-for="item in files" :key="item.id" class="file-row">
              <img class="file-preview" :src="item.previewUrl" alt="" loading="lazy">
              <div class="file-info">
                <strong :title="item.status === 'done' ? item.outputName : item.file.name">{{ item.status === 'done' ? item.outputName : item.file.name }}</strong>
                <span>{{ formatBytes(item.file.size) }}<template v-if="item.status === 'done'"> → {{ formatBytes(item.outputSize) }}</template></span>
                <span v-if="item.status === 'error'" class="file-error" role="alert">{{ item.message }}</span>
              </div>
              <span class="file-status" :class="`status-${item.status}`">
                {{ item.status === 'ready' ? text.statusReady : item.status === 'converting' ? text.statusConverting : item.status === 'done' ? text.statusDone : text.statusError }}
              </span>
              <button v-if="item.status === 'done'" class="file-download" type="button" :aria-label="t(text.downloadAria, { name: item.outputName })" @click="download(item)"><Icon name="tabler:download" aria-hidden="true" /></button>
              <button class="remove-file" type="button" :disabled="isConverting" :aria-label="t(text.removeAria, { name: item.file.name })" @click="removeFile(item)"><Icon name="tabler:x" aria-hidden="true" /></button>
            </article>
          </div>
          <button class="add-more" type="button" :disabled="isConverting" @click.stop="input?.click()"><Icon name="tabler:plus" aria-hidden="true" /> {{ text.addMore }}</button>
        </template>
        <input ref="input" class="file-input" type="file" accept="image/*,.bmp,.avif" multiple @change="onInput">
      </div>

      <div class="action-row">
        <p v-if="message" class="converter-message" role="status">{{ message }}</p>
        <span v-else class="privacy-note">{{ text.privacyNote }}</span>
        <div class="actions">
          <button class="download-all" type="button" :disabled="!completed || isConverting" @click="downloadAll">{{ text.downloadAll }}{{ completed ? `（${completed}）` : '' }}</button>
          <button class="convert-button" type="button" :disabled="!files.length || isConverting" @click="convertAll">
            <Icon :name="isConverting ? 'tabler:loader-2' : 'tabler:refresh'" aria-hidden="true" :class="{ spinning: isConverting }" />
            {{ isConverting ? text.converting : text.convert }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.converter-page { max-width:1100px; margin:0 auto; padding:clamp(1rem,3vw,2rem) clamp(1rem,2vw,1.5rem) 4.5rem; color:var(--foreground); }
.converter-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin:0 auto 1.35rem; }
.converter-kicker { margin:0 0 .45rem; color:var(--accent); font:600 .68rem/1.4 var(--font-mono); letter-spacing:.13em; }
.converter-heading h1 { margin:0; font-family:'Georgia','LXGW WenKai Lite',serif; font-size:clamp(1.8rem,3vw,2.55rem); font-weight:500; letter-spacing:-.04em; line-height:1.08; }
.converter-intro { margin:.6rem 0 0; color:var(--muted-foreground); font-size:var(--fs-meta); }
.privacy-mark { display:inline-flex; align-items:center; gap:.4rem; padding:.45rem .7rem; border:1px solid var(--border); color:var(--muted-foreground); font-size:.72rem; white-space:nowrap; }
.converter-workspace { overflow:hidden; border:1px solid var(--border); background:color-mix(in srgb,var(--card) 88%,transparent); }
.format-toolbar { display:flex; align-items:center; gap:.7rem; min-height:4.2rem; padding:.7rem 1rem; border-bottom:1px solid var(--border); }
.format-toolbar > label { color:var(--muted-foreground); font-size:.8rem; }
.format-toolbar select { min-width:8rem; min-height:2.45rem; padding:.45rem 2rem .45rem .7rem; border:1px solid var(--border); border-radius:var(--radius-base); background:var(--background); color:var(--foreground); font:inherit; font-size:.82rem; cursor:pointer; }
.format-hint { margin-left:auto; color:var(--muted-foreground); font: .67rem var(--font-mono); }
.drop-area { position:relative; min-height:19rem; padding:2rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.75rem; margin:1rem; border:1px dashed var(--border); background:color-mix(in srgb,var(--background) 55%,transparent); text-align:center; cursor:pointer; transition:border-color 160ms ease-out,background 160ms ease-out; }
.drop-area.is-dragging { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 8%,var(--background)); }
.drop-area.has-files { min-height:0; align-items:stretch; padding:0; border-style:solid; text-align:left; cursor:default; }
.drop-mark { display:grid; place-items:center; width:3.3rem; height:3.3rem; border:1px solid var(--border); color:var(--accent); font-size:1.5rem; }
.drop-area > strong { font-family:'Georgia','LXGW WenKai Lite',serif; font-size:1.2rem; font-weight:500; }
.drop-area > span:not(.drop-mark) { color:var(--muted-foreground); font-size:.76rem; }
.browse-button,.download-all,.convert-button,.clear-button,.add-more { min-height:2.65rem; padding:.55rem .9rem; border:1px solid var(--border); background:var(--card); color:var(--foreground); font:inherit; font-size:.78rem; cursor:pointer; transition:background 160ms ease-out,border-color 160ms ease-out,color 160ms ease-out; }
.browse-button:hover,.download-all:hover,.clear-button:hover,.add-more:hover { border-color:var(--accent); }
.browse-button { margin-top:.25rem; }
.file-input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.list-heading { display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.8rem 1rem; border-bottom:1px solid var(--border); }
.list-heading > div { display:flex; flex-wrap:wrap; gap:.25rem; align-items:baseline; font-size:.8rem; }
.list-heading > div span { color:var(--muted-foreground); font-size:.7rem; }
.clear-button { min-height:2.25rem; padding:.4rem .65rem; font-size:.7rem; }
.file-list { max-height:28rem; overflow:auto; }
.file-row { display:grid; grid-template-columns:3.5rem minmax(0,1fr) auto 2.5rem 2.5rem; align-items:center; gap:.75rem; min-height:5.2rem; padding:.65rem 1rem; border-bottom:1px solid var(--border); }
.file-preview { width:3.5rem; height:3.5rem; object-fit:cover; border:1px solid var(--border); background:var(--muted); }
.file-info { display:grid; gap:.2rem; min-width:0; }
.file-info strong { overflow:hidden; color:var(--foreground); font-size:.76rem; font-weight:550; text-overflow:ellipsis; white-space:nowrap; }
.file-info span { color:var(--muted-foreground); font: .65rem var(--font-mono); }
.file-info .file-error { color:var(--destructive); font: .68rem var(--font-sans); }
.file-status { padding:.25rem .45rem; border:1px solid var(--border); color:var(--muted-foreground); font-size:.65rem; white-space:nowrap; }
.status-done { border-color:color-mix(in srgb,#36825d 45%,var(--border)); color:#28724d; }
.status-converting { border-color:color-mix(in srgb,var(--accent) 55%,var(--border)); color:var(--accent); }
.status-error { border-color:var(--destructive); color:var(--destructive); }
.file-download,.remove-file { display:grid; place-items:center; width:2.35rem; height:2.35rem; border:1px solid transparent; background:transparent; color:var(--muted-foreground); font-size:1rem; cursor:pointer; }
.file-download:hover { border-color:var(--border); color:var(--accent); }
.remove-file:hover { border-color:var(--border); color:var(--destructive); }
button:disabled { opacity:.45; cursor:not-allowed; }
.add-more { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; margin:.8rem 1rem; }
.action-row { display:flex; justify-content:space-between; align-items:center; gap:1rem; min-height:4.7rem; padding:.8rem 1rem; border-top:1px solid var(--border); }
.privacy-note,.converter-message { margin:0; color:var(--muted-foreground); font-size:.7rem; line-height:1.5; }
.converter-message { color:var(--accent); }
.actions { display:flex; gap:.55rem; flex:0 0 auto; }
.download-all { border-radius:var(--radius-base); }
.convert-button { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-width:8.5rem; border-color:var(--accent); border-radius:var(--radius-base); background:var(--accent); color:var(--background); font-weight:650; }
.convert-button:hover:not(:disabled) { filter:brightness(1.08); }
.spinning { animation:spin 900ms linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
:where(button,select,[role=button]):focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
@media (max-width:640px) {
  .converter-heading { align-items:flex-start; }
  .privacy-mark { padding:.38rem .5rem; font-size:.65rem; }
  .converter-intro { max-width:33ch; line-height:1.6; }
  .format-toolbar { flex-wrap:wrap; }
  .format-hint { width:100%; margin-left:0; }
  .drop-area { min-height:17rem; margin:.65rem; padding:1.2rem; }
  .file-row { grid-template-columns:2.8rem minmax(0,1fr) 2.2rem 2.2rem; gap:.45rem; padding:.6rem .55rem; }
  .file-preview { width:2.8rem; height:2.8rem; }
  .file-status { grid-column:2; justify-self:start; grid-row:2; }
  .file-info { grid-column:2; grid-row:1; }
  .file-download,.remove-file { width:2.1rem; height:2.1rem; }
  .list-heading { align-items:flex-start; }
  .action-row { align-items:stretch; flex-direction:column; }
  .actions { display:grid; grid-template-columns:1fr 1fr; }
  .actions button { min-width:0; padding-inline:.4rem; }
}
@media (max-width:390px) {
  .converter-page { padding-inline:.75rem; }
  .converter-heading { gap:.5rem; }
  .privacy-mark { font-size:0; gap:0; }
  .privacy-mark :deep(svg) { font-size:1rem; }
  .file-info strong { font-size:.7rem; }
}
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; } }
</style>
