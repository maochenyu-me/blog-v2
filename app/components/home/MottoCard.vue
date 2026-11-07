<script setup lang="ts">
/**
 * 侧栏一言（格言）卡：每次页面加载从配置列表随机取一条。
 * 随机在 setup 期执行一次，不做定时轮换（保持简单，避免 SSG 水合噪音）。
 */
interface MottoConfig {
  mottos: Array<{ text: string; from: string }>
}

const props = defineProps<{
  cfg: MottoConfig
}>()

const { ui } = useUi()

/**
 * SSR 首帧固定渲染第一条（与预渲染 HTML 一致，避免水合 mismatch），
 * 客户端挂载完成后再随机取一条。直接在 setup 期 Math.random() 会让
 * 构建期与访问期的随机结果不同，触发 Vue 水合校验错误。
 */
const pick = ref(props.cfg.mottos[0] ?? null)

onMounted(() => {
  if (!props.cfg.mottos.length) return
  pick.value = props.cfg.mottos[Math.floor(Math.random() * props.cfg.mottos.length)]!
})
</script>

<template>
  <SidebarCard :title="ui.pages.home.sidebar.motto" icon="tabler:quote">
    <figure v-if="pick" class="motto">
      <blockquote class="motto-text">{{ pick.text }}</blockquote>
      <figcaption v-if="pick.from" class="motto-from">—— {{ pick.from }}</figcaption>
    </figure>
  </SidebarCard>
</template>

<style scoped>
.motto {
  margin: 0;
}

.motto-text {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--foreground);
  margin: 0;
}

.motto-text::before {
  content: '\300C';
  color: var(--accent);
}

.motto-text::after {
  content: '\300D';
  color: var(--accent);
}

.motto-from {
  margin-top: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  text-align: right;
}
</style>
