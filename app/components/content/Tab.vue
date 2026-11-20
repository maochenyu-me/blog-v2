<script setup lang="ts">
const props = defineProps<{
  tabs: string[]
  center?: boolean
  active?: number
}>()

const activeTab = ref(props.active ?? 1)
</script>

<template>
  <div class="tab-wrapper" :class="{ center }">
    <div class="tab-header" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        role="tab"
        type="button"
        class="tab-button"
        :class="{ active: activeTab === index + 1 }"
        :aria-selected="activeTab === index + 1"
        @click="activeTab = index + 1"
      >
        {{ tab }}
      </button>
    </div>
    <div class="tab-panels">
      <div
        v-for="(_, index) in tabs"
        v-show="activeTab === index + 1"
        :key="index"
        role="tabpanel"
        class="tab-panel"
      >
        <slot :name="`tab${index + 1}`" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-wrapper {
  margin: 1rem 0;
}

.tab-wrapper.center {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
}

.tab-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  position: relative;
  width: fit-content;
  margin: 0 auto;
  padding-bottom: 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.9375rem;
  line-height: 1.4;
}

.tab-button {
  position: relative;
  padding: 0.375rem 0.75rem;
  margin-bottom: -1px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--radius-base) var(--radius-base) 0 0;
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  cursor: pointer;
  transition:
    color var(--duration-base) var(--easing-base),
    background-color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base);
}

.tab-button:hover {
  color: var(--foreground);
  background-color: var(--muted);
}

.tab-button.active {
  color: var(--accent);
  background-color: var(--card);
  border-color: var(--border);
  font-weight: 500;
}

.tab-button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background-color: var(--card);
}

.tab-panels {
  margin-top: 0.75rem;
}

.tab-panel {
  min-width: 0;
}
</style>
