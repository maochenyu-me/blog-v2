<script setup lang="ts">
const { mode, cycle, label, icon } = useTheme()
const { ui, t } = useUi()

function onClick(e: MouseEvent) {
  cycle({ x: e.clientX, y: e.clientY })
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="t(ui.nav.themeLabel, { label })"
    :title="t(ui.nav.themeTitle, { label })"
    @click="onClick"
  >
    <Icon :name="icon" class="theme-icon" aria-hidden="true" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: calc(var(--radius) / 2);
  color: var(--muted-foreground);
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base);
}

.theme-toggle:hover {
  color: var(--foreground);
  background-color: var(--muted);
}

.theme-icon {
  font-size: 1.125rem;
}
</style>
