<script setup lang="ts">
/**
 * 侧栏博主资料卡：头像、昵称、一句话简介、社交链接组。
 * 头像/昵称/简介/社交可由 sidebar.profile 配置覆盖，留空回退 site 全局配置。
 */
interface ProfileConfig {
  avatar: string
  name: string
  bio: string
  social: Array<{ label: string; url: string; icon: string }>
  greeting: string
}

const props = defineProps<{
  cfg: ProfileConfig
}>()

const { site } = useBlogConfig()
const { ui, t } = useUi()

const avatar = computed(() => props.cfg.avatar || site.author.avatar)
const name = computed(() => props.cfg.name || site.author.name)
const bio = computed(() => props.cfg.bio || site.author.bio)
const social = computed(() => props.cfg.social.length ? props.cfg.social : site.social)

/** 问候语按访问时间动态生成（仅客户端，SSG 首帧用配置兜底） */
const greeting = ref(props.cfg.greeting)

onMounted(() => {
  const h = new Date().getHours()
  const w = ui.pages.home.greetingWords
  const word = h < 6 ? w.dawn : h < 12 ? w.morning : h < 14 ? w.noon : h < 18 ? w.afternoon : w.evening
  greeting.value = t(ui.pages.home.greeting, { word })
})
</script>

<template>
  <div class="profile">
    <span v-if="greeting" class="greeting-chip">{{ greeting }}</span>

    <NuxtLink to="/about" class="avatar-wrap" :aria-label="name">
      <img class="avatar" :src="avatar" :alt="t(ui.pages.home.sidebar.profileAlt, { name })" loading="lazy">
    </NuxtLink>

    <h2 class="profile-name">
      <NuxtLink to="/about" class="profile-name-link">{{ name }}</NuxtLink>
    </h2>
    <p class="profile-bio">{{ bio }}</p>

    <nav class="social" :aria-label="ui.pages.home.sidebar.socialNav">
      <a
        v-for="s in social"
        :key="s.url"
        class="social-btn"
        :href="s.url"
        :title="s.label"
        :aria-label="s.label"
        :target="s.url.startsWith('http') ? '_blank' : undefined"
        :rel="s.url.startsWith('http') ? 'noopener noreferrer' : undefined"
      >
        <Icon :name="s.icon" class="social-icon" aria-hidden="true" />
      </a>
    </nav>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.625rem;
}

.greeting-chip {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}

.avatar-wrap {
  border-radius: 999px;
  padding: 0.1875rem;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 55%, transparent), color-mix(in srgb, var(--border) 80%, transparent));
}

.avatar {
  display: block;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid var(--background);
}

.profile-name {
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 700;
  margin: 0;
}

.profile-name-link {
  transition: color var(--duration-base) var(--easing-base);
}

.profile-name-link:hover {
  color: var(--accent);
}

.profile-bio {
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
  color: var(--muted-foreground);
  margin: 0;
  max-width: 24ch;
}

.social {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: var(--muted-foreground);
  background: color-mix(in srgb, var(--card) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  transition:
    color var(--duration-base) var(--easing-base),
    border-color var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.social-btn:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  transform: translateY(-1px);
}

.social-icon {
  font-size: 1rem;
}
</style>
