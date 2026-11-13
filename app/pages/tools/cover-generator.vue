<script setup lang="ts">
import { COVER_ICON_PRESETS, dimensionsForRatio, drawCover, type CoverRatio, type CoverRenderOptions } from '~/utils/cover-generator'

const title = '封面生成器'
useHead({ title })

const ratios: Array<{ label: string; value: CoverRatio }> = [
  { label: '16:9', value: '16:9' },
  { label: '4:3', value: '4:3' },
  { label: '1:1', value: '1:1' },
  { label: '3:2', value: '3:2' },
  { label: '2:3', value: '2:3' },
  { label: '9:16', value: '9:16' },
]
const scales = [1, 2, 3, 4]
const systemFonts = ['LXGW WenKai Lite', 'Inter Variable', 'Georgia', 'sans-serif', 'serif', 'monospace']
const settings = reactive({
  ratio: '16:9' as CoverRatio,
  scale: 1,
  filename: 'cover',
  leftText: '喵洛阁',
  rightText: '记录灵感与生活',
  fontFamily: 'LXGW WenKai Lite',
  fontSize: 64,
  fontWeight: 600,
  iconVisible: true,
  iconPreset: 'sparkles',
  iconSize: 64,
  iconRadius: 14,
  iconBackground: '#a54b30',
  iconBackgroundEnabled: false,
  gap: 20,
  originalIconColor: true,
  textColor: '#ffffff',
  iconColor: '#ffffff',
  backgroundColor: '#263247',
  backgroundOpacity: 100,
  backgroundTransparent: false,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowX: 0,
  shadowY: 4,
  shadowOpacity: 0,
})

const canvasEl = ref<HTMLCanvasElement | null>(null)
const backgroundImage = ref<HTMLImageElement | null>(null)
const iconImage = ref<HTMLImageElement | null>(null)
const presetIconImage = ref<HTMLImageElement | null>(null)
const backgroundName = ref('')
const iconName = ref('')
const fontName = ref('')
const message = ref('')
const iconSearch = ref('')
const iconResults = ref<string[]>([])
const iconSearchLoading = ref(false)
const iconSearchError = ref('')
const selectedLibraryIcon = ref('')
const fontReady = ref(false)
const customFontFamily = ref('')
const dimensions = computed(() => dimensionsForRatio(settings.ratio, settings.scale))
const canvasStyle = computed(() => ({ aspectRatio: `${dimensions.value.width} / ${dimensions.value.height}` }))

let backgroundUrl = ''
let iconUrl = ''
let fontUrl = ''
let iconSearchTimer: ReturnType<typeof setTimeout> | undefined
let iconSearchRequest = 0
let iconLoadRequest = 0

const iconApi = 'https://api.iconify.design'
const filteredPresets = computed(() => {
  const query = iconSearch.value.trim().toLowerCase()
  if (!query) return COVER_ICON_PRESETS
  return COVER_ICON_PRESETS.filter(icon => `${icon.id} ${icon.label} ${icon.glyph}`.toLowerCase().includes(query))
})

const renderOptions = computed<CoverRenderOptions>(() => ({
  ...dimensions.value,
  leftText: settings.leftText,
  rightText: settings.rightText,
  fontFamily: settings.fontFamily,
  fontSize: settings.fontSize,
  fontWeight: settings.fontWeight,
  textColor: settings.textColor,
  backgroundColor: settings.backgroundColor,
  backgroundOpacity: settings.backgroundOpacity / 100,
  backgroundTransparent: settings.backgroundTransparent,
  backgroundImage: backgroundImage.value,
  iconImage: iconImage.value || presetIconImage.value,
  iconVisible: settings.iconVisible,
  iconSize: settings.iconSize,
  iconRadius: settings.iconRadius,
  iconBackground: settings.iconBackground,
  iconBackgroundEnabled: settings.iconBackgroundEnabled,
  gap: settings.gap,
  originalIconColor: settings.originalIconColor,
  iconColor: settings.iconColor,
  shadowColor: settings.shadowColor,
  shadowBlur: settings.shadowBlur,
  shadowX: settings.shadowX,
  shadowY: settings.shadowY,
  shadowOpacity: settings.shadowOpacity / 100,
}))

function render() {
  const canvas = canvasEl.value
  if (!canvas) return
  const { width, height } = dimensions.value
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) drawCover(ctx, renderOptions.value)
}

function loadPresetIcon() {
  if (selectedLibraryIcon.value) return
  const glyph = COVER_ICON_PRESETS.find(icon => icon.id === settings.iconPreset)?.glyph ?? '✦'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="none"/><text x="512" y="560" text-anchor="middle" dominant-baseline="middle" font-family="LXGW WenKai Lite, sans-serif" font-size="760" font-weight="800" fill="${settings.iconColor}">${glyph}</text></svg>`
  const image = new Image()
  image.onload = () => {
    presetIconImage.value = image
    render()
  }
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function scheduleIconSearch() {
  if (iconSearchTimer) clearTimeout(iconSearchTimer)
  iconResults.value = []
  iconSearchError.value = ''
  const query = iconSearch.value.trim()
  if (!query) {
    iconSearchLoading.value = false
    return
  }
  iconSearchTimer = setTimeout(() => void searchIcons(query), 280)
}

async function searchIcons(query: string) {
  const request = ++iconSearchRequest
  iconSearchLoading.value = true
  try {
    const response = await fetch(`${iconApi}/search?query=${encodeURIComponent(query)}&limit=32`)
    if (!response.ok) throw new Error('Icon search request failed')
    const data = await response.json() as { icons?: unknown }
    if (request !== iconSearchRequest) return
    iconResults.value = Array.isArray(data.icons)
      ? data.icons.filter((item): item is string => typeof item === 'string' && /^[a-z0-9-]+:[a-z0-9-]+$/i.test(item))
      : []
    iconSearchError.value = ''
  } catch {
    if (request === iconSearchRequest) iconSearchError.value = '图标库暂时无法连接，请检查网络后重试。'
  } finally {
    if (request === iconSearchRequest) iconSearchLoading.value = false
  }
}

async function selectLibraryIcon(iconId: string) {
  if (!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(iconId)) return
  const request = ++iconLoadRequest
  const [collection, name] = iconId.split(':')
  let objectUrl = ''
  try {
    const response = await fetch(`${iconApi}/${collection}/${name}.svg?color=${encodeURIComponent(settings.iconColor)}`)
    if (!response.ok) throw new Error('Icon request failed')
    const svg = await response.blob()
    objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Icon image failed'))
      image.src = objectUrl
    })
    if (request !== iconLoadRequest) {
      URL.revokeObjectURL(objectUrl)
      return
    }
    if (iconUrl) URL.revokeObjectURL(iconUrl)
    iconUrl = ''
    iconImage.value = null
    presetIconImage.value = image
    selectedLibraryIcon.value = iconId
    iconName.value = ''
    message.value = ''
    render()
    URL.revokeObjectURL(objectUrl)
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    if (request === iconLoadRequest) message.value = '该图标载入失败，请选择其他图标。'
  }
}

watch(renderOptions, render, { deep: true })
watch(() => [settings.iconPreset, settings.iconColor], () => {
  if (selectedLibraryIcon.value && !settings.originalIconColor) void selectLibraryIcon(selectedLibraryIcon.value)
  else loadPresetIcon()
})
watch(iconSearch, scheduleIconSearch)
onMounted(() => {
  loadPresetIcon()
  render()
})
onBeforeUnmount(() => {
  if (backgroundUrl) URL.revokeObjectURL(backgroundUrl)
  if (iconUrl) URL.revokeObjectURL(iconUrl)
  if (fontUrl) URL.revokeObjectURL(fontUrl)
})

function loadImage(event: Event, target: 'background' | 'icon') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) loadImageFile(file, target)
  input.value = ''
}

function onBackgroundDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0]
  if (file) loadImageFile(file, 'background')
}

function loadImageFile(file: File, target: 'background' | 'icon') {
  if (!file.type.startsWith('image/')) {
    message.value = '请选择有效的图片文件。'
    return
  }
  const previousUrl = target === 'background' ? backgroundUrl : iconUrl
  if (previousUrl) URL.revokeObjectURL(previousUrl)
  const nextUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    if (target === 'background') {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl)
      backgroundUrl = nextUrl
      backgroundImage.value = image
      backgroundName.value = file.name
    } else {
      if (iconUrl) URL.revokeObjectURL(iconUrl)
      iconUrl = nextUrl
      iconImage.value = image
      selectedLibraryIcon.value = ''
      iconName.value = file.name
    }
    message.value = ''
    render()
  }
  image.onerror = () => {
    URL.revokeObjectURL(nextUrl)
    message.value = '图片读取失败，请换一个文件再试。'
  }
  image.src = nextUrl
}

async function loadFont(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const family = `CoverFont-${Date.now()}`
    const nextFontUrl = URL.createObjectURL(file)
    const font = new FontFace(family, `url("${nextFontUrl}")`)
    await font.load()
    if (fontUrl) URL.revokeObjectURL(fontUrl)
    fontUrl = nextFontUrl
    document.fonts.add(font)
    customFontFamily.value = family
    settings.fontFamily = family
    fontName.value = file.name
    fontReady.value = true
    render()
    message.value = ''
  } catch {
    message.value = '字体加载失败，请使用有效的 TTF、OTF 或 WOFF 文件。'
  }
}

function downloadCover() {
  const canvas = canvasEl.value
  if (!canvas) return
  const safeName = settings.filename.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'cover'
  canvas.toBlob((blob) => {
    if (!blob) {
      message.value = '导出失败，请调整画布后重试。'
      return
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeName}.png`
    link.click()
    URL.revokeObjectURL(url)
    message.value = `已导出 ${dimensions.value.width} × ${dimensions.value.height} px PNG。`
  }, 'image/png')
}

function resetImage(target: 'background' | 'icon') {
  if (target === 'background') {
    if (backgroundUrl) URL.revokeObjectURL(backgroundUrl)
    backgroundUrl = ''
    backgroundImage.value = null
    backgroundName.value = ''
  } else {
    if (iconUrl) URL.revokeObjectURL(iconUrl)
    iconUrl = ''
    iconImage.value = null
    iconName.value = ''
    selectedLibraryIcon.value = ''
    loadPresetIcon()
  }
  render()
}
</script>

<template>
  <div class="cover-page">
    <header class="cover-heading">
      <div>
        <p class="cover-kicker">LOCAL IMAGE STUDIO · 01</p>
        <h1>封面生成器</h1>
        <p class="cover-intro">把标题、图标和背景排成一张封面。所有素材只在本机浏览器处理。</p>
      </div>
      <span class="privacy-mark"><Icon name="tabler:device-laptop" aria-hidden="true" /> 本地处理</span>
    </header>

    <div class="studio-grid">
      <aside class="studio-rail studio-rail--left" aria-label="内容素材设置">
        <section class="panel-block panel-block--content">
          <div class="panel-heading"><span>01 / CONTENT</span><h2>内容</h2></div>
          <label class="field-label" for="left-text">左侧文字</label>
          <input id="left-text" v-model="settings.leftText" maxlength="40" placeholder="输入标题">
          <label class="field-label" for="right-text">右侧文字</label>
          <input id="right-text" v-model="settings.rightText" maxlength="60" placeholder="输入副标题">
          <div class="field-row"><label class="field-label" for="cover-font">字体</label><select id="cover-font" v-model="settings.fontFamily"><option v-for="font in systemFonts" :key="font" :value="font">{{ font }}</option><option v-if="fontReady" :value="customFontFamily">{{ fontName || '已上传字体' }}</option></select></div>
          <label class="range-control"><span>字体粗细 <output>{{ settings.fontWeight }}</output></span><input id="font-weight" v-model.number="settings.fontWeight" type="range" min="300" max="900" step="100"></label>
          <label class="range-control"><span>字体大小 <output>{{ settings.fontSize }} px</output></span><input v-model.number="settings.fontSize" type="range" min="20" max="160"></label>
          <label class="upload-row" for="font-upload"><span><Icon name="tabler:typography" aria-hidden="true" /> {{ fontName || '自定义字体' }}</span><span class="upload-action">上传</span><input id="font-upload" type="file" accept=".ttf,.otf,.woff,.woff2" @change="loadFont"></label>
        </section>

        <section class="panel-block">
          <div class="panel-heading"><span>02 / ICON</span><h2>图标</h2></div>
          <label class="icon-search-label" for="icon-search">搜索图标库</label>
          <input id="icon-search" v-model="iconSearch" type="search" autocomplete="off" placeholder="搜索图标库…" aria-describedby="icon-search-help">
          <p id="icon-search-help" class="icon-search-help">输入名称或关键词，搜索 Iconify 图标库</p>
          <div v-if="iconSearch.trim()" class="icon-search-results" aria-live="polite">
            <p v-if="iconSearchLoading" class="icon-search-state">正在搜索图标…</p>
            <p v-else-if="iconSearchError" class="icon-search-state icon-search-state--error" role="alert">{{ iconSearchError }}</p>
            <p v-else-if="!iconResults.length" class="icon-search-state">没有找到图标，试试更短的关键词。</p>
            <div v-else class="icon-library-grid" role="listbox" aria-label="图标搜索结果">
              <button v-for="iconId in iconResults" :key="iconId" type="button" role="option" :aria-selected="selectedLibraryIcon === iconId" :class="{ selected: selectedLibraryIcon === iconId }" :title="iconId" @click="selectLibraryIcon(iconId)">
                <img :src="`${iconApi}/${iconId.replace(':', '/')}.svg?color=%2337332e`" :alt="''" loading="lazy">
                <span>{{ iconId }}</span>
              </button>
            </div>
          </div>
          <template v-else>
            <p class="field-label">快速选择</p>
            <div class="icon-presets" role="group" aria-label="预设图标">
              <button v-for="icon in COVER_ICON_PRESETS" :key="icon.id" type="button" :class="{ selected: settings.iconPreset === icon.id && !iconImage && !selectedLibraryIcon }" :aria-pressed="settings.iconPreset === icon.id && !iconImage && !selectedLibraryIcon" :aria-label="icon.label" @click="settings.iconPreset = icon.id; iconImage = null; selectedLibraryIcon = ''">{{ icon.glyph }}</button>
            </div>
          </template>
          <p class="current-icon" aria-live="polite">当前：{{ selectedLibraryIcon || (iconImage ? iconName : `本地预设：${COVER_ICON_PRESETS.find(item => item.id === settings.iconPreset)?.label}`) }}</p>
          <label class="upload-row" for="icon-upload"><span><Icon name="tabler:photo-plus" aria-hidden="true" /> {{ iconName || '自定义图片图标' }}</span><span class="upload-action">上传</span><input id="icon-upload" type="file" accept="image/*" @change="loadImage($event, 'icon')"></label>
          <label class="toggle-row"><span>显示图标</span><input v-model="settings.iconVisible" type="checkbox"></label>
          <label class="toggle-row"><span>保留原色</span><input v-model="settings.originalIconColor" type="checkbox"></label>
          <div class="color-grid color-grid--two"><label>图标颜色<input v-model="settings.iconColor" type="color" :disabled="settings.originalIconColor"></label><label>图标底色<input v-model="settings.iconBackground" type="color"></label></div>
          <label class="toggle-row"><span>启用图标底色</span><input v-model="settings.iconBackgroundEnabled" type="checkbox"></label>
          <button v-if="iconImage" class="text-button" type="button" @click="resetImage('icon')">恢复预设图标</button>
        </section>

        <section class="panel-block">
          <div class="panel-heading"><span>03 / BACKGROUND</span><h2>背景图片</h2></div>
          <label class="dropzone" for="background-upload" @dragover.prevent @drop.prevent="onBackgroundDrop"><Icon name="tabler:cloud-upload" aria-hidden="true" /><strong>{{ backgroundName || '点击或拖拽选择图片' }}</strong><span>图片只在浏览器本地载入</span><input id="background-upload" type="file" accept="image/*" @change="loadImage($event, 'background')"></label>
          <button v-if="backgroundImage" class="text-button" type="button" @click="resetImage('background')">移除背景图片</button>
        </section>
      </aside>

      <section class="preview-column" aria-label="实时封面画布">
        <div class="preview-toolbar">
          <div class="preview-title"><span class="eyebrow">LIVE CANVAS</span><strong>{{ dimensions.width }} <i>×</i> {{ dimensions.height }}<small> PX</small></strong></div>
          <span class="preview-status"><span /> 实时预览</span>
        </div>
        <div class="canvas-stage" :style="canvasStyle" @dragover.prevent @drop.prevent="onBackgroundDrop">
          <canvas ref="canvasEl" aria-label="实时封面预览" />
          <span class="canvas-corner canvas-corner--tl" aria-hidden="true" /><span class="canvas-corner canvas-corner--br" aria-hidden="true" />
          <span class="canvas-dimensions">{{ settings.ratio }} / {{ settings.scale }}×</span>
        </div>
        <p v-if="message" class="status-message" role="status">{{ message }}</p>
        <section class="export-dock" aria-label="画布与导出设置">
          <div class="panel-heading"><span>04 / EXPORT</span><h2>画布与导出</h2></div>
          <label class="field-label">画板比例</label>
          <div class="ratio-grid" role="group" aria-label="画板比例"><button v-for="ratio in ratios" :key="ratio.value" type="button" :class="{ selected: settings.ratio === ratio.value }" :aria-pressed="settings.ratio === ratio.value" @click="settings.ratio = ratio.value">{{ ratio.label }}</button></div>
          <div class="export-controls">
            <label class="export-field"><span>缩放倍率</span><select id="cover-scale" v-model.number="settings.scale"><option v-for="scale in scales" :key="scale" :value="scale">{{ scale }}×</option></select></label>
            <label class="export-field"><span>文件名</span><span class="filename-field"><input id="cover-filename" v-model="settings.filename" maxlength="80" autocomplete="off"><i>.png</i></span></label>
            <label class="toggle-row transparent-toggle"><span>透明背景</span><input v-model="settings.backgroundTransparent" type="checkbox"></label>
          </div>
          <div class="export-bottom"><span class="dimensions-note">输出 {{ dimensions.width }} × {{ dimensions.height }} px</span><button class="export-button" type="button" @click="downloadCover"><Icon name="tabler:download" aria-hidden="true" /> 导出 PNG</button></div>
        </section>
      </section>

      <aside class="studio-rail studio-rail--right" aria-label="外观样式设置">
        <section class="panel-block panel-block--appearance">
          <div class="panel-heading"><span>05 / APPEARANCE</span><h2>外观样式</h2></div>
          <label class="field-label">颜色</label>
          <div class="color-grid"><label>文字<input v-model="settings.textColor" type="color"></label><label>图标<input v-model="settings.iconColor" type="color" :disabled="settings.originalIconColor"></label><label>底色<input v-model="settings.backgroundColor" type="color"></label></div>
          <label class="range-control"><span>背景不透明度 <output>{{ settings.backgroundOpacity }}%</output></span><input v-model.number="settings.backgroundOpacity" type="range" min="0" max="100"></label>
          <div class="panel-divider" />
          <label class="range-control"><span>图标大小 <output>{{ settings.iconSize }} px</output></span><input v-model.number="settings.iconSize" type="range" min="16" max="160"></label>
          <label class="range-control"><span>图标圆角 <output>{{ settings.iconRadius }}%</output></span><input v-model.number="settings.iconRadius" type="range" min="0" max="50"></label>
          <label class="range-control"><span>内容间距 <output>{{ settings.gap }} px</output></span><input v-model.number="settings.gap" type="range" min="0" max="100"></label>
        </section>

        <details class="panel-block shadow-panel">
          <summary><span class="section-index">06</span><span>阴影设置</span><Icon name="tabler:chevron-down" aria-hidden="true" /></summary>
          <label class="range-control"><span>不透明度 <output>{{ settings.shadowOpacity }}%</output></span><input v-model.number="settings.shadowOpacity" type="range" min="0" max="100"></label>
          <div class="color-grid color-grid--two"><label>阴影颜色<input v-model="settings.shadowColor" type="color"></label></div>
          <label class="range-control"><span>模糊 <output>{{ settings.shadowBlur }} px</output></span><input v-model.number="settings.shadowBlur" type="range" min="0" max="40"></label>
          <label class="range-control"><span>水平偏移 <output>{{ settings.shadowX }} px</output></span><input v-model.number="settings.shadowX" type="range" min="-30" max="30"></label>
          <label class="range-control"><span>垂直偏移 <output>{{ settings.shadowY }} px</output></span><input v-model.number="settings.shadowY" type="range" min="-30" max="30"></label>
        </details>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cover-page {
  --tool-ink: var(--foreground);
  --tool-muted: var(--muted-foreground);
  --tool-line: var(--border);
  --tool-surface: var(--card);
  max-width: 1680px;
  margin: 0 auto;
  padding: 1.25rem clamp(1rem, 2vw, 2rem) 4rem;
}
.cover-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; max-width:1640px; margin:0 auto 1.5rem; }
.cover-kicker,.eyebrow { color:var(--accent); font:600 .68rem/1.4 var(--font-mono); letter-spacing:.13em; }
.cover-kicker { margin:0 0 .45rem; }
.cover-heading h1 { margin:0; font-family:'Georgia','LXGW WenKai Lite',serif; font-size:clamp(1.8rem,3vw,2.65rem); font-weight:500; letter-spacing:-.04em; line-height:1.05; }
.cover-intro { margin:.6rem 0 0; color:var(--tool-muted); font-size:var(--fs-meta); }
.privacy-mark { display:inline-flex; align-items:center; gap:.4rem; padding:.45rem .7rem; border:1px solid var(--tool-line); color:var(--tool-muted); font-size:.72rem; white-space:nowrap; }
.studio-grid { display:grid; grid-template-columns:minmax(250px,300px) minmax(420px,1fr) minmax(250px,300px); align-items:start; gap:clamp(.8rem,1.35vw,1.35rem); max-width:1640px; margin-inline:auto; }
.studio-rail { display:grid; gap:.8rem; min-width:0; }
.panel-block,.export-dock { min-width:0; padding:1.1rem 1.15rem; border:1px solid var(--tool-line); background:color-mix(in srgb,var(--tool-surface) 86%,transparent); }
.panel-heading { display:grid; grid-template-columns:auto 1fr; align-items:baseline; gap:.4rem .6rem; margin-bottom:.95rem; padding-bottom:.7rem; border-bottom:1px solid var(--tool-line); }
.panel-heading > span { color:var(--accent); font: .62rem/1.2 var(--font-mono); letter-spacing:.08em; }
.panel-heading h2 { grid-column:1/-1; margin:0; font-family:'Georgia','LXGW WenKai Lite',serif; font-size:1.15rem; font-weight:500; letter-spacing:-.02em; }
.field-label { display:flex; align-items:center; justify-content:space-between; gap:.5rem; margin:.8rem 0 .35rem; color:var(--tool-muted); font-size:.73rem; }
input:not([type=range]):not([type=checkbox]):not([type=color]),select { width:100%; min-width:0; min-height:2.55rem; padding:.52rem .65rem; border:1px solid var(--tool-line); border-radius:0; background:var(--background); color:var(--foreground); font:inherit; font-size:.8rem; }
select { cursor:pointer; }
input:disabled { opacity:.48; }
.field-row { display:grid; grid-template-columns:.65fr 1fr; align-items:center; gap:.55rem; margin-top:.7rem; }
.field-row .field-label { margin:0; }
.range-control { display:grid; gap:.35rem; margin-top:.85rem; color:var(--tool-muted); font-size:.71rem; }
.range-control > span { display:flex; justify-content:space-between; gap:.5rem; }
output { color:var(--foreground); font: .66rem var(--font-mono); font-variant-numeric:tabular-nums; }
input[type=range] { width:100%; accent-color:var(--accent); cursor:pointer; }
input[type=checkbox] { width:1rem; height:1rem; accent-color:var(--accent); cursor:pointer; }
input[type=color] { width:2.2rem; height:1.9rem; padding:.12rem; border:1px solid var(--tool-line); background:var(--background); cursor:pointer; }
.upload-row { position:relative; display:flex; align-items:center; justify-content:space-between; gap:.45rem; min-height:2.7rem; margin-top:.7rem; padding:.42rem .58rem; border:1px solid var(--tool-line); cursor:pointer; }
.upload-row > span:first-child { display:flex; align-items:center; gap:.4rem; min-width:0; color:var(--tool-muted); font-size:.73rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.upload-action { flex:0 0 auto; color:var(--accent); font-size:.68rem; }
.upload-row input[type=file],.dropzone input[type=file] { position:absolute; inset:0; width:1px; height:1px; padding:0; border:0; overflow:hidden; clip:rect(0,0,0,0); }
.icon-search-label { display:block; margin:.8rem 0 .35rem; color:var(--tool-muted); font-size:.73rem; }
.icon-search-help,.current-icon { margin:.4rem 0 0; color:var(--tool-muted); font-size:.67rem; line-height:1.5; }
.current-icon { overflow-wrap:anywhere; font-family:var(--font-mono); }
.icon-search-results { margin-top:.6rem; }
.icon-search-state { margin:.5rem 0; color:var(--tool-muted); font-size:.72rem; }
.icon-search-state--error { color:var(--destructive); }
.icon-library-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.35rem; max-height:15rem; overflow:auto; padding:.1rem; }
.icon-library-grid button { display:grid; place-items:center; gap:.25rem; min-width:0; min-height:3.4rem; padding:.35rem .2rem; border:1px solid var(--tool-line); background:var(--background); color:var(--tool-muted); cursor:pointer; }
.icon-library-grid button:hover,.icon-library-grid button.selected { border-color:var(--accent); color:var(--foreground); background:color-mix(in srgb,var(--accent) 8%,var(--background)); }
.icon-library-grid img { width:1.35rem; height:1.35rem; padding:.18rem; border-radius:.2rem; background:var(--icon-preview-bg, #eee9df); color:var(--icon-preview-fg, #37332e); object-fit:contain; }
.icon-library-grid button.selected img,.icon-library-grid button:hover img { background:color-mix(in srgb,var(--accent) 15%,var(--background)); }
:global([data-theme='dark']) .icon-library-grid img { --icon-preview-bg:#34312d; --icon-preview-fg:#f4eee5; }
.icon-library-grid button span { width:100%; overflow:hidden; font: .55rem var(--font-mono); text-overflow:ellipsis; white-space:nowrap; text-align:center; }
.icon-presets { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.35rem; }
.icon-presets button { display:grid; place-items:center; min-width:0; min-height:2.5rem; border:1px solid var(--tool-line); color:var(--tool-muted); font-size:.93rem; cursor:pointer; transition:color 160ms ease-out,border-color 160ms ease-out,background 160ms ease-out; }
.icon-presets button:hover,.icon-presets button.selected { border-color:var(--accent); color:var(--accent); background:color-mix(in srgb,var(--accent) 8%,var(--background)); }
.toggle-row { display:flex; align-items:center; justify-content:space-between; gap:.6rem; min-height:2.45rem; color:var(--tool-muted); font-size:.73rem; }
.color-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.35rem; margin-top:.75rem; }
.color-grid--two { grid-template-columns:repeat(2,minmax(0,1fr)); }
.color-grid label { display:flex; align-items:center; justify-content:space-between; gap:.2rem; min-width:0; padding:.35rem; border:1px solid var(--tool-line); color:var(--tool-muted); font-size:.65rem; }
.color-grid input[type=color] { flex:0 0 auto; width:1.7rem; height:1.55rem; }
.dropzone { position:relative; display:flex; min-height:7rem; flex-direction:column; align-items:center; justify-content:center; gap:.4rem; border:1px dashed var(--tool-line); color:var(--tool-muted); text-align:center; cursor:pointer; transition:border-color 180ms ease-out,background 180ms ease-out; }
.dropzone:hover { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 5%,transparent); }
.dropzone :deep(svg) { color:var(--accent); font-size:1.3rem; }
.dropzone strong { max-width:90%; overflow:hidden; color:var(--foreground); font-size:.76rem; text-overflow:ellipsis; white-space:nowrap; }
.dropzone span { font-size:.65rem; }
.preview-column { min-width:0; }
.preview-toolbar { display:flex; align-items:center; justify-content:space-between; gap:.8rem; margin:0 0 .7rem; }
.preview-title { display:grid; gap:.24rem; }
.preview-title strong { font:600 clamp(.85rem,1.3vw,1rem)/1.2 var(--font-mono); font-variant-numeric:tabular-nums; }
.preview-title strong i { color:var(--tool-muted); font-style:normal; }
.preview-title small { color:var(--tool-muted); font-size:.62rem; }
.preview-status { display:inline-flex; align-items:center; gap:.4rem; color:var(--tool-muted); font-size:.68rem; }
.preview-status > span { width:.4rem; height:.4rem; border-radius:50%; background:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent); }
.canvas-stage { position:relative; display:grid; place-items:center; width:100%; overflow:hidden; border:1px solid var(--tool-line); background-color:color-mix(in srgb,var(--tool-muted) 8%,var(--tool-surface)); background-image:linear-gradient(45deg,color-mix(in srgb,var(--tool-muted) 12%,transparent) 25%,transparent 25%),linear-gradient(-45deg,color-mix(in srgb,var(--tool-muted) 12%,transparent) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,color-mix(in srgb,var(--tool-muted) 12%,transparent) 75%),linear-gradient(-45deg,transparent 75%,color-mix(in srgb,var(--tool-muted) 12%,transparent) 75%); background-size:20px 20px; background-position:0 0,0 10px,10px -10px,-10px 0; }
.canvas-stage canvas { display:block; width:100%; height:100%; object-fit:contain; }
.canvas-corner { position:absolute; width:14px; height:14px; pointer-events:none; }
.canvas-corner--tl { top:8px; left:8px; border-top:1px solid var(--accent); border-left:1px solid var(--accent); }
.canvas-corner--br { right:8px; bottom:8px; border-right:1px solid var(--accent); border-bottom:1px solid var(--accent); }
.canvas-dimensions { position:absolute; right:.65rem; bottom:.55rem; padding:.25rem .4rem; background:color-mix(in srgb,var(--background) 82%,transparent); color:var(--tool-muted); font:.62rem var(--font-mono); pointer-events:none; }
.status-message { margin:.55rem 0 0; color:var(--accent); font-size:.76rem; }
.export-dock { margin-top:.8rem; padding:1rem 1.1rem; }
.export-dock .panel-heading { display:flex; align-items:baseline; gap:.6rem; }
.export-dock .panel-heading h2 { grid-column:auto; font-family:inherit; font-size:.88rem; font-weight:650; }
.ratio-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:.35rem; }
.ratio-grid button { min-width:0; min-height:2.45rem; border:1px solid var(--tool-line); color:var(--tool-muted); font:.68rem/1 var(--font-mono); cursor:pointer; transition:color 160ms ease-out,border-color 160ms ease-out,background 160ms ease-out; }
.ratio-grid button:hover { color:var(--foreground); border-color:var(--muted-foreground); }
.ratio-grid button.selected { border-color:var(--accent); background:color-mix(in srgb,var(--accent) 10%,var(--background)); color:var(--foreground); }
.export-controls { display:grid; grid-template-columns:minmax(95px,.8fr) minmax(120px,1.2fr) auto; align-items:end; gap:.7rem; margin-top:.8rem; }
.export-field { display:grid; gap:.35rem; color:var(--tool-muted); font-size:.68rem; }
.filename-field { display:flex; align-items:center; min-width:0; border:1px solid var(--tool-line); background:var(--background); }
.filename-field input:not([type=range]):not([type=checkbox]):not([type=color]) { min-height:2.45rem; padding:.45rem; border:0; }
.filename-field i { padding-inline:.4rem; color:var(--tool-muted); font:.65rem var(--font-mono); font-style:normal; }
.export-controls .toggle-row { gap:.35rem; white-space:nowrap; }
.export-bottom { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:.85rem; padding-top:.75rem; border-top:1px solid var(--tool-line); }
.dimensions-note { margin:0; color:var(--tool-muted); font:.67rem var(--font-mono); font-variant-numeric:tabular-nums; }
.export-button { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-height:2.75rem; padding:.6rem .95rem; background:var(--accent); color:var(--background); font-size:.75rem; font-weight:700; cursor:pointer; transition:filter 180ms ease-out,transform 180ms ease-out; }
.export-button:hover { filter:brightness(1.08); transform:translateY(-1px); }
.export-button:active { transform:translateY(0); }
.panel-divider { height:1px; margin:1rem 0; background:var(--tool-line); }
.shadow-panel { padding:0; }
.shadow-panel summary { display:flex; align-items:center; gap:.55rem; min-height:3.25rem; padding:0 1.15rem; list-style:none; cursor:pointer; font-size:.82rem; font-weight:650; }
.shadow-panel summary::-webkit-details-marker { display:none; }
.shadow-panel summary > :last-child { margin-left:auto; color:var(--tool-muted); transition:transform 180ms ease-out; }
.shadow-panel[open] summary > :last-child { transform:rotate(180deg); }
.shadow-panel > .range-control,.shadow-panel > .color-grid { margin:.2rem 1.15rem .8rem; }
.section-index { color:var(--accent); font:.66rem/1 var(--font-mono); font-variant-numeric:tabular-nums; }
.text-button { margin-top:.45rem; padding:.38rem 0; color:var(--accent); font-size:.7rem; cursor:pointer; }
button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,.upload-row:focus-within,.dropzone:focus-within { outline:2px solid var(--accent); outline-offset:2px; }
@media (max-width:1200px) {
  .studio-grid { grid-template-columns:minmax(0,1fr) minmax(275px,.72fr); }
  .preview-column { position:static; grid-column:1/-1; grid-row:1; }
  .studio-rail--left { grid-column:1; grid-row:2; }
  .studio-rail--right { grid-column:2; grid-row:2; }
}
@media (max-width:720px) {
  .cover-page { padding:.65rem .8rem 3rem; }
  .cover-heading { align-items:flex-start; margin-bottom:1rem; }
  .cover-intro { max-width:30rem; line-height:1.6; }
  .privacy-mark { margin-top:1.3rem; padding:.38rem; font-size:0; }
  .privacy-mark :deep(svg) { font-size:1rem; }
  .studio-grid { grid-template-columns:minmax(0,1fr); gap:.7rem; }
  .preview-column,.studio-rail--left,.studio-rail--right { grid-column:1; grid-row:auto; }
  .preview-column { position:static; }
  .studio-rail--left { display:contents; }
  .panel-block,.export-dock { padding:.9rem; }
  .ratio-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .export-controls { grid-template-columns:1fr 1.3fr; }
  .export-controls .toggle-row { grid-column:1/-1; justify-content:flex-start; }
}
@media (max-width:390px) {
  .cover-page { padding-inline:.65rem; }
  .export-bottom { align-items:flex-start; flex-direction:column; }
  .export-bottom .export-button { width:100%; }
  .color-grid { grid-template-columns:1fr; }
  .color-grid--two { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (prefers-reduced-motion:reduce) {
  .export-button,.ratio-grid button,.icon-presets button,.dropzone,.shadow-panel summary > :last-child { transition:none; }
}
</style>
