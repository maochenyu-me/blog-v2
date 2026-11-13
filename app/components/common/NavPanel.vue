<script setup lang="ts">
import { navPanel } from '~/data/nav'
const { site } = useBlogConfig()
const { ui } = useUi()
const route = useRoute()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

function isActive(to: string) {
  if (!to.startsWith('/')) return false
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}

function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus) nextTick(() => trigger.value?.focus())
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    close(true)
  }
}

function onLinkClick() {
  close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

watch(() => route.fullPath, () => close())
</script>

<template>
  <div ref="root" class="nav-panel-root">
    <button
      ref="trigger"
      type="button"
      class="nav-panel-trigger"
      :class="{ 'is-open': open }"
      :aria-label="open ? ui.nav.panelClose : ui.nav.panelOpen"
      :aria-expanded="open"
      aria-controls="site-nav-panel"
      @click="open = !open"
    >
      <Icon :name="open ? 'tabler:x' : 'tabler:fingerprint'" aria-hidden="true" />
    </button>

    <Transition name="nav-panel">
      <section
        v-if="open"
        id="site-nav-panel"
        class="nav-panel"
        :aria-label="ui.nav.panelTitle"
      >
        <div class="nav-panel__brand">
          <span class="nav-panel__brand-mark" aria-hidden="true">{{ site.shortName.slice(0, 1) }}</span>
          <div>
            <p class="nav-panel__eyebrow">KEMIAOSW.TOP</p>
            <h2>{{ site.shortName }}</h2>
          </div>
        </div>

        <section v-for="(section, index) in navPanel" :key="section.title" class="nav-panel__section" :style="{ '--section-index': index }">
          <h3>{{ section.title }}</h3>
          <ul>
            <li v-for="item in section.links" :key="item.to">
              <a
                v-if="item.external"
                :href="item.to"
                target="_blank"
                rel="noopener noreferrer"
                class="nav-panel__link"
                @click="onLinkClick()"
              >
                <Icon :name="item.icon" aria-hidden="true" />
                <span>{{ item.label }}</span>
                <Icon name="tabler:external-link" class="nav-panel__external" aria-hidden="true" />
              </a>
              <NuxtLink
                v-else
                :to="item.to"
                class="nav-panel__link"
                :class="{ 'is-active': isActive(item.to) }"
                :aria-current="isActive(item.to) ? 'page' : undefined"
                @click="close()"
              >
                <Icon :name="item.icon" aria-hidden="true" />
                <span>{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.nav-panel-root {
  position: relative;
  display: flex;
  align-items: center;
}

.nav-panel-trigger {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 0;
  color: var(--accent);
  background: transparent;
  box-shadow: none;
  font-size: 1.25rem;
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.nav-panel-trigger:hover,
.nav-panel-trigger.is-open {
  color: var(--foreground);
}

.nav-panel {
  position: absolute;
  z-index: 70;
  top: calc(100% + 0.75rem);
  left: 0;
  width: min(41rem, calc(100vw - 2rem));
  max-height: min(76vh, 42rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1.25rem 1.5rem 1.5rem;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  color: var(--foreground);
  background: var(--surface-float);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  box-shadow: var(--glass-scrolled-shadow), var(--glass-highlight);
}

.nav-panel__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.2rem 0 1.05rem;
  border-bottom: 1px solid var(--border);
}

.nav-panel__brand-mark {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
  border-radius: 50%;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 9%, var(--card));
  font-size: 1.15rem;
  font-weight: 700;
}

.nav-panel__eyebrow {
  margin: 0;
  color: var(--muted-foreground);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.13em;
  line-height: 1.4;
}

.nav-panel__brand h2 {
  margin: 0.1rem 0 0;
  font-size: var(--fs-body-h);
  line-height: 1.35;
}

.nav-panel__section {
  padding-top: 1rem;
}

.nav-panel__section h3 {
  margin: 0 0 0.45rem;
  font-size: var(--fs-body-h);
  line-height: 1.4;
}

.nav-panel__section ul {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav-panel__link {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  font-size: var(--fs-body);
  line-height: 1.4;
  transition: color var(--duration-base) var(--easing-base), background-color var(--duration-base) var(--easing-base), transform var(--duration-base) var(--easing-base);
}

.nav-panel__link > :first-child {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 1.125rem;
}

.nav-panel__link span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-panel__link:hover,
.nav-panel__link.is-active {
  color: var(--foreground);
  background: color-mix(in srgb, var(--accent) 9%, transparent);
}

.nav-panel__link:hover {
  transform: translateX(2px);
}

.nav-panel__external {
  margin-inline-start: auto;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.nav-panel-enter-active,
.nav-panel-leave-active {
  transition: opacity var(--duration-base) var(--easing-base), transform var(--duration-base) var(--easing-base);
}

.nav-panel-enter-from,
.nav-panel-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem) scale(0.985);
}

@media (max-width: 640px) {
  .nav-panel {
    position: fixed;
    top: calc(var(--header-pad-y) + var(--header-pill-height) + 0.5rem);
    left: -0.375rem;
    box-sizing: border-box;
    width: min(28rem, calc(100vw - 2rem));
    max-height: min(62dvh, calc(100dvh - var(--header-pad-y) - var(--header-pill-height) - 2rem - env(safe-area-inset-bottom)));
    padding: 0.75rem 0.875rem calc(0.875rem + env(safe-area-inset-bottom));
    border-radius: var(--radius-card);
  }

  .nav-panel__brand {
    padding-bottom: 0.75rem;
  }

  .nav-panel__brand-mark {
    width: 2.25rem;
    height: 2.25rem;
  }

  .nav-panel__section {
    padding-top: 0.75rem;
  }

  .nav-panel__section ul {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.125rem;
  }

  .nav-panel__link {
    min-height: 48px;
    gap: 0.45rem;
    padding-inline: 0.375rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-panel-trigger,
  .nav-panel__link,
  .nav-panel-enter-active,
  .nav-panel-leave-active {
    transition: none;
  }
}
</style>
