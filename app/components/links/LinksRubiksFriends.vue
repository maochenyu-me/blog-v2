<script setup lang="ts">
/**
 * 友链魔方（复刻 blog.demius.tech/friends 的 rubiks-friends 区块）。
 *
 * 机制（对 Demius 线上产物逆向整理）：
 *  - 三阶魔方 = 27 个 cubie（x/y/z ∈ {-1,0,1}），每个 cubie 6 个面；
 *  - 六个面对应六条友链，贴纸 = 该友链的 screenshot（缺失回落 avatar）
 *    按 background-size:300% + 0/50/100% 位置切成 3×3 铺在该面外露的 9 块上；
 *  - 层旋转 = 「位旋转」（更新 x/y/z 数据属性）+「累积 transform 字符串」
 *    （WeakMap 存历史前缀），不需要四元数/矩阵库；
 *  - 循环：随机 7 步打乱（360ms/步）→ 反向复原（430ms/步）→ 停留 4.2s
 *    → 换 6 面贴纸 + 预览卡切到新友链；
 *  - 三重闸门：IntersectionObserver（离屏 120px 暂停）、document.hidden
 *    （页签隐藏暂停）、prefers-reduced-motion（静态复原态，不跑循环）。
 *
 * 与本站的适配：
 *  - 数据取 app/data/friend-links.json（页面过滤失联后传入），只用有 URL 的条目；
 *    少于 6 条时各面按取模复用，友链增多自动覆盖更多面；
 *  - 贴纸 screenshot 优先、avatar 兜底；预览卡图同源；
 *  - 外观走全站 token（.glass-panel 语境、--font-mono、accent 受控），
 *    cubie 塑料体为固定深色（参考站明暗两版同为深色体 + 白描边）；
 *  - 动效只动 transform（合成器属性），离屏暂停，reduced-motion 降级。
 */
import type { FriendLink } from '~/data/links'

const props = defineProps<{
  /** 友链数据（页面已过滤失联条目；至少 1 条才渲染） */
  links: FriendLink[]
}>()

const { ui } = useUi()

/* ---------- 面定义（朝向与参考站 SSR 结构逐一核对） ---------- */

const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const
type FaceName = typeof FACES[number]

/** 每个面朝向哪根轴的哪一侧：front=+z、back=-z、right=+x、left=-x、top=-y、bottom=+y */
const FACE_AXIS: Record<FaceName, 'x' | 'y' | 'z'> = {
  front: 'z', back: 'z', right: 'x', left: 'x', top: 'y', bottom: 'y',
}
const FACE_SIGN: Record<FaceName, 1 | -1> = {
  front: 1, back: -1, right: 1, left: -1, top: -1, bottom: 1,
}

/** 27 个 cubie 的初始坐标；SSR 渲染顺序固定，避免水合失配 */
const GRID = [-1, 0, 1] as const
const cubies: Array<{ x: number; y: number; z: number }> = GRID.flatMap((x) =>
  GRID.flatMap((y) => GRID.map((z) => ({ x, y, z }))),
)
type Cubie = { x: number; y: number; z: number }

/** 贴纸瓦片在整张截图上的 3×3 取景位（映射按参考站 SSR 逐一核对，保证截图不镜像） */
function tilePos(face: FaceName, c: Cubie): { x: number; y: number } {
  switch (face) {
    case 'front': return { x: c.x, y: c.y }
    case 'back': return { x: -c.x, y: c.y }
    case 'right': return { x: -c.z, y: c.y }
    case 'left': return { x: c.z, y: c.y }
    case 'top': return { x: c.x, y: c.z }
    case 'bottom': return { x: c.x, y: -c.z }
  }
}
const pct = (v: number) => `${(v + 1) * 50}%`

/* ---------- 数据准备 ---------- */

/** 六个面各分一条友链；有截图的排前面，不足 6 条取模复用 */
const faces = computed(() => {
  const list = props.links.filter((l) => !l.lost && l.url)
  if (!list.length) return []
  const ordered = [...list].sort(
    (a, b) => Number(!!b.screenshot) - Number(!!a.screenshot),
  )
  return Array.from({ length: 6 }, (_, i) => ordered[i % ordered.length]!)
})

/** 贴纸/预览图：screenshot 优先，avatar 兜底 */
const stickerSrc = (l?: FriendLink) => l?.screenshot || l?.avatar

const enabled = computed(() => faces.value.length > 0)

/** 面 → 友链 分配表（SSR 固定初值 = faces 顺序；运行时每轮洗牌覆盖） */
const assignments = ref<Record<FaceName, FriendLink | undefined>>({
  front: faces.value[0],
  back: faces.value[1],
  right: faces.value[2],
  left: faces.value[3],
  top: faces.value[4],
  bottom: faces.value[5],
})

/** 当前预览卡对应的友链 */
const current = ref<FriendLink | null>(faces.value[0] ?? null)

const phase = ref<'solved' | 'mixing' | 'solving'>('solved')
const statusText = computed(() => {
  if (phase.value === 'mixing') return ui.links.rubiksMixing
  if (phase.value === 'solving') return ui.links.rubiksSolving
  return ui.links.rubiksSolved
})
const statusBusy = computed(() => phase.value !== 'solved')

function isOnFace(c: Cubie, face: FaceName): boolean {
  return c[FACE_AXIS[face]] === FACE_SIGN[face]
}

function stickerStyle(c: Cubie, face: FaceName) {
  if (!isOnFace(c, face)) return undefined
  const link = assignments.value[face]
  const src = stickerSrc(link)
  if (!src) return undefined
  const t = tilePos(face, c)
  return {
    '--tile-image': `url("${src}")`,
    '--tile-x': pct(t.x),
    '--tile-y': pct(t.y),
  }
}

/* ---------- 运行时：层旋转引擎（移植参考站 M/j/x/S/P 五件套） ---------- */

const rootEl = ref<HTMLElement | null>(null)
let cubieEls: HTMLElement[] = []
const rotationMemo = new WeakMap<HTMLElement, string>()
const destroyed = ref(false)
const inView = ref(false)
let observer: IntersectionObserver | null = null

type Axis = 'x' | 'y' | 'z'
interface Move {
  axis: Axis
  layer: 1 | -1
  direction: 1 | -1
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const axisCss = (v: number) =>
  v === 0 ? '0px' : v > 0 ? 'var(--cubie-step)' : 'calc(var(--cubie-step) * -1)'

const transformOf = (el: HTMLElement) =>
  `translate3d(${axisCss(Number(el.dataset.x))}, ${axisCss(Number(el.dataset.y))}, ${axisCss(Number(el.dataset.z))}) ${rotationMemo.get(el) ?? ''}`

const rest = (el: HTMLElement) => {
  el.style.transform = transformOf(el)
}

/** 位旋转：绕 axis 转动 ±90° 后，cubie 的逻辑坐标随之变换（照参考站 j()） */
function rotateCoords(el: HTMLElement, move: Move) {
  const x = Number(el.dataset.x)
  const y = Number(el.dataset.y)
  const z = Number(el.dataset.z)
  let nx = x
  let ny = y
  let nz = z
  if (move.axis === 'x') {
    ny = move.direction > 0 ? -z : z
    nz = move.direction > 0 ? y : -y
  } else if (move.axis === 'y') {
    nx = move.direction > 0 ? z : -z
    nz = move.direction > 0 ? -x : x
  } else {
    nx = move.direction > 0 ? -y : y
    ny = move.direction > 0 ? x : -x
  }
  el.dataset.x = String(nx)
  el.dataset.y = String(ny)
  el.dataset.z = String(nz)
}

async function applyMove(move: Move, ms: number) {
  await waitVisible()
  if (destroyed.value) return
  const group = cubieEls.filter(
    (el) => Number(el.dataset[move.axis]) === move.layer,
  )
  const rotate = `rotate${move.axis.toUpperCase()}(${move.direction * 90}deg)`
  group.forEach((el) => {
    el.style.transition = 'none'
    rest(el)
  })
  // 强制重排：隔离「无过渡摆位」与「带过渡旋转」，防止浏览器合并两帧
  group[0]?.getBoundingClientRect()
  group.forEach((el) => {
    el.style.transition = `transform ${ms}ms cubic-bezier(.72, 0, .2, 1)`
    el.style.transform = `${rotate} ${transformOf(el)}`
  })
  await sleep(ms + 24)
  group.forEach((el) => {
    rotateCoords(el, move)
    rotationMemo.set(el, `${rotate} ${rotationMemo.get(el) ?? ''}`)
    el.style.transition = 'none'
    rest(el)
  })
}

/** 随机 7 步，且相邻两步不同轴（照参考站 N()） */
function randomMoves(): Move[] {
  const moves: Move[] = []
  while (moves.length < 7) {
    const axis: Axis = (['x', 'y', 'z'] as const)[Math.floor(Math.random() * 3)]!
    if (moves.at(-1)?.axis === axis) continue
    moves.push({
      axis,
      layer: Math.random() > 0.5 ? 1 : -1,
      direction: Math.random() > 0.5 ? 1 : -1,
    })
  }
  return moves
}

/** 复原态归位（照参考站 P()）：坐标回 home、清累积旋转 */
function resetLayout() {
  cubieEls.forEach((el) => {
    el.dataset.x = el.dataset.homeX!
    el.dataset.y = el.dataset.homeY!
    el.dataset.z = el.dataset.homeZ!
    rotationMemo.set(el, '')
    el.style.transition = 'none'
    rest(el)
  })
}

/** 洗牌 + 保证 front 面是一条「与当前预览不同」的友链（照参考站 T()） */
function pickNextFace(): Record<FaceName, FriendLink | undefined> {
  const pool = [...faces.value]
  for (let i = pool.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  const prev = current.value?.url
  if (prev) {
    const idx = pool.findIndex((l) => l.url !== prev)
    if (idx > 0) [pool[0], pool[idx]] = [pool[idx]!, pool[0]!]
  }
  const n = pool.length
  return {
    front: pool[0],
    back: pool[1 % n],
    right: pool[2 % n],
    left: pool[3 % n],
    top: pool[4 % n],
    bottom: pool[5 % n],
  }
}

async function waitVisible() {
  while (!destroyed.value && (!inView.value || document.hidden)) {
    await sleep(240)
  }
}

/* ---------- 生命周期 ---------- */

let resizeClean: (() => void) | null = null

onMounted(() => {
  cubieEls = [
    ...(rootEl.value?.querySelectorAll<HTMLElement>('.rubiks-cubie') ?? []),
  ]
  observer = new IntersectionObserver(
    ([entry]) => {
      inView.value = entry?.isIntersecting ?? false
    },
    { rootMargin: '120px 0px', threshold: 0.05 },
  )
  if (rootEl.value) observer.observe(rootEl.value)
  void run()
})

onBeforeUnmount(() => {
  destroyed.value = true
  observer?.disconnect()
  resizeClean?.()
})

async function run() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    phase.value = 'solved'
    return
  }
  await sleep(2200)
  while (!destroyed.value) {
    await waitVisible()
    if (destroyed.value) return
    assignments.value = pickNextFace()
    const moves = randomMoves()
    phase.value = 'mixing'
    for (const m of moves) {
      await applyMove(m, 360)
      if (destroyed.value) return
    }
    await sleep(700)
    if (destroyed.value) return
    phase.value = 'solving'
    for (const m of [...moves].reverse()) {
      await applyMove({ ...m, direction: (m.direction * -1) as 1 | -1 }, 430)
      if (destroyed.value) return
    }
    resetLayout()
    current.value = assignments.value.front ?? null
    phase.value = 'solved'
    await sleep(4200)
  }
}

/** 预览图加载失败：回落到该友链头像（防循环只回落一次） */
function onPreviewImgError(e: Event) {
  const img = e.target as HTMLImageElement
  const fallback = current.value?.avatar
  if (fallback && img.dataset.fb !== '1') {
    img.dataset.fb = '1'
    img.src = fallback
  }
}
</script>

<template>
  <section
    v-if="enabled"
    ref="rootEl"
    class="rubiks-friends glass-panel"
    aria-labelledby="rubiks-title"
  >
    <div class="rubiks-feature">
      <div class="rubiks-heading">
        <h2 id="rubiks-title" class="rubiks-title">{{ ui.links.rubiksTitle }}</h2>
        <p class="rubiks-desc">{{ ui.links.rubiksDesc }}</p>
      </div>

      <!-- 复原完成后的友链预览卡（点击跳转友链站点） -->
      <a
        v-if="current"
        class="rubiks-preview"
        :href="current.url"
        target="_blank"
        rel="noreferrer"
      >
        <span class="rubiks-preview-media">
          <img
            :src="stickerSrc(current)"
            :alt="`${current.name} 首页预览`"
            loading="lazy"
            decoding="async"
            @error="onPreviewImgError"
          >
          <span class="rubiks-preview-status" :class="{ 'is-busy': statusBusy }" aria-live="polite">
            <i aria-hidden="true" />{{ statusText }}
          </span>
        </span>
        <span class="rubiks-preview-meta">
          <img
            class="rubiks-preview-avatar"
            :src="current.avatar"
            :alt="current.name"
            loading="lazy"
            decoding="async"
          >
          <span class="rubiks-preview-copy">
            <strong>{{ current.name }}</strong>
            <small>{{ current.description }}</small>
          </span>
          <Icon name="tabler:arrow-up-right" class="rubiks-preview-arrow" aria-hidden="true" />
        </span>
      </a>
    </div>

    <div class="rubiks-stage">
      <div
        class="rubiks-cube"
        role="img"
        :aria-label="ui.links.rubiksCubeAria"
      >
        <div class="rubiks-cube-orient" aria-hidden="true">
          <span
            v-for="c in cubies"
            :key="`${c.x}.${c.y}.${c.z}`"
            class="rubiks-cubie"
            :data-x="c.x"
            :data-y="c.y"
            :data-z="c.z"
            :data-home-x="c.x"
            :data-home-y="c.y"
            :data-home-z="c.z"
            :style="{ '--tx': axisCss(c.x), '--ty': axisCss(c.y), '--tz': axisCss(c.z) }"
          >
            <span
              v-for="face in FACES"
              :key="face"
              class="rubiks-cubie-face"
              :class="`is-${face}`"
            >
              <span
                v-if="isOnFace(c, face)"
                class="rubiks-sticker"
                :style="stickerStyle(c, face)"
              />
            </span>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ---------- 区块布局：桌面双栏（左文右魔方），<768px 单栏 ---------- */
.rubiks-friends {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(18rem, 0.92fr);
  align-items: center;
  gap: clamp(1.8rem, 5vw, 4.5rem);
  margin: 0.25rem 0 2.5rem;
  padding: clamp(1.2rem, 3vw, 2.1rem);
  overflow: hidden;
}

.rubiks-feature {
  display: grid;
  gap: 1.05rem;
  min-width: 0;
}

.rubiks-title {
  margin: 0;
  font-size: clamp(1.25rem, 2.2vw, 1.7rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  text-wrap: balance;
}

.rubiks-desc {
  max-width: 37rem;
  margin: 0.5rem 0 0;
  font-size: var(--fs-meta);
  line-height: 1.75;
  color: var(--muted-foreground);
}

/* ---------- 预览卡 ---------- */
.rubiks-preview {
  display: grid;
  min-width: 0;
  color: inherit;
}

.rubiks-preview-media {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
  background-color: var(--muted);
}

.rubiks-preview-media::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 32%;
  background: linear-gradient(transparent, rgb(13 16 19 / 0.38));
  pointer-events: none;
}

.rubiks-preview-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: opacity 0.22s, transform 0.45s;
}

.rubiks-preview:hover .rubiks-preview-media img {
  transform: scale(1.015);
}

/* 状态徽章：绿点=已复原，黄点脉冲=打乱/复原中（配色照参考站） */
.rubiks-preview-status {
  position: absolute;
  right: 0.65rem;
  bottom: 0.58rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.34rem 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.26);
  border-radius: 0.3rem;
  background: rgb(15 18 20 / 0.67);
  -webkit-backdrop-filter: blur(7px);
  backdrop-filter: blur(7px);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.04em;
}

.rubiks-preview-status i {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 50%;
  background: #67d69a;
  box-shadow: 0 0 0 0.18rem rgb(103 214 154 / 0.2);
}

.rubiks-preview-status.is-busy i {
  background: #ffc65b;
  box-shadow: 0 0 0 0.18rem rgb(255 198 91 / 0.2);
  animation: rubiks-pulse 1s ease-in-out infinite;
}

@keyframes rubiks-pulse {
  50% {
    opacity: 0.45;
  }
}

.rubiks-preview-meta {
  display: grid;
  grid-template-columns: 2.35rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.68rem;
  padding-top: 0.7rem;
}

.rubiks-preview-avatar {
  width: 2.35rem;
  height: 2.35rem;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: 0.35rem;
  background-color: var(--muted);
}

.rubiks-preview-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.rubiks-preview-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--foreground);
}

.rubiks-preview-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.66rem;
  color: var(--muted-foreground);
}

.rubiks-preview-arrow {
  color: var(--muted-foreground);
  transition: color 0.2s, transform 0.2s;
}

.rubiks-preview:hover .rubiks-preview-arrow {
  color: var(--accent);
  transform: translate(2px, -2px);
}

.rubiks-preview:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 0.25rem;
}

/* ---------- 魔方本体 ---------- */
.rubiks-stage {
  display: grid;
  justify-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.rubiks-cube {
  /*
   * --cubie-half 必须是 cubie 的一半而不是立方体的一半：面用
   * translateZ(cubie-half) 贴到 cubie 表面，魔方才是「实心」的。
   * 参考站用了 cube-size/2，贴纸面悬在体外 98px——暗色贴纸看不出来，
   * 我们明色贴纸 + 明色页面会透底，视觉上就是贴纸散架。这里修正。
   * 本站友链容器（1000px）比参考站窄，右栏 ~410px；
   * 3D 投影约占元素宽的 1.35 倍，取 17.5rem 上限保证打乱到对角位也不压文字。
   */
  --cube-size: clamp(12rem, 21vw, 17.5rem);
  --cubie-size: calc(var(--cube-size) / 3);
  --cubie-step: calc(var(--cubie-size) + 2px);
  --cubie-half: calc(var(--cubie-size) / 2);
  position: relative;
  width: calc(var(--cube-size) * 1.32);
  max-width: 100%;
  aspect-ratio: 1;
  perspective: 1050px;
}

/* 落地投影：rotateX 压扁的模糊椭圆（装饰，pointer-events 随伪元素本无） */
.rubiks-cube::after {
  content: '';
  position: absolute;
  bottom: 3%;
  left: 12%;
  right: 12%;
  height: 12%;
  background: rgb(12 16 22 / 0.22);
  border-radius: 50%;
  filter: blur(1rem);
  transform: rotateX(70deg);
}

.rubiks-cube-orient {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: var(--cube-size);
  height: var(--cube-size);
  transform: translate(-50%, -50%) rotateX(-22deg) rotateY(-34deg);
  transform-style: preserve-3d;
}

.rubiks-cubie {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--cubie-size);
  height: var(--cubie-size);
  margin-top: calc(var(--cubie-half) * -1);
  margin-left: calc(var(--cubie-half) * -1);
  transform: translate3d(var(--tx), var(--ty), var(--tz));
  transform-origin: center center 0;
  transform-style: preserve-3d;
  will-change: transform;
}

.rubiks-cubie-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #11171c;
  border: 1px solid rgb(255 255 255 / 0.07);
  border-radius: 0.13rem;
  box-shadow: inset 0 0 0.75rem rgb(0 0 0 / 0.72);
  backface-visibility: hidden;
}

.rubiks-cubie-face.is-front { transform: rotateY(0deg) translateZ(var(--cubie-half)); }
.rubiks-cubie-face.is-back { transform: rotateY(180deg) translateZ(var(--cubie-half)); }
.rubiks-cubie-face.is-right { transform: rotateY(90deg) translateZ(var(--cubie-half)); }
.rubiks-cubie-face.is-left { transform: rotateY(-90deg) translateZ(var(--cubie-half)); }
.rubiks-cubie-face.is-top { transform: rotateX(90deg) translateZ(var(--cubie-half)); }
.rubiks-cubie-face.is-bottom { transform: rotateX(-90deg) translateZ(var(--cubie-half)); }

.rubiks-sticker {
  position: absolute;
  inset: 3px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-radius: 0.12rem;
  background-color: var(--muted);
  background-image: var(--tile-image);
  background-position: var(--tile-x) var(--tile-y);
  background-size: 300% 300%;
  box-shadow: inset 0 0 0 1px rgb(9 13 17 / 0.16);
}

/* ---------- 多端 / 降级 ---------- */
@media (max-width: 767px) {
  .rubiks-friends {
    grid-template-columns: 1fr;
    gap: 1.45rem;
    padding: 1.2rem 1rem 1.4rem;
  }

  /*
   * 3D 投影不受元素盒约束（打乱到对角位时视觉宽度可达元素宽 ~1.9 倍），
   * 窄屏上会盖住上下内容。stage 裁掉越界部分：旋转中的 cubie 被裁一瞬
   * 不可察觉，换来的是魔方永不入侵预览卡/标题区（桌面端两栏有整列余量，
   * 不需要裁）。
   */
  .rubiks-stage {
    overflow: hidden;
    padding-block: 0.5rem;
  }

  .rubiks-cube {
    --cube-size: clamp(9.5rem, 46vw, 13.5rem);
    width: min(100%, calc(var(--cube-size) * 1.36));
  }

  .rubiks-preview-media {
    aspect-ratio: 16 / 10;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rubiks-cubie {
    transition: none !important;
  }

  .rubiks-preview-status.is-busy i {
    animation: none;
  }
}
</style>
