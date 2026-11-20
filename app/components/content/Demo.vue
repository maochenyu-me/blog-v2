<script setup lang="ts">
const { ui } = useUi()

defineProps<{
  raw: string
  meta?: string
}>()
</script>

<template>
  <Tab :tabs="ui.content.demoTabs">
    <template #tab1>
      <slot />
    </template>
    <template #tab2>
      <ProsePre :code="raw" language="mdc" :meta />
    </template>
  </Tab>
</template>
