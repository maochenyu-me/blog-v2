<script setup lang="ts">
import type { Ech0Extension } from '~/utils/ech0'

const props = defineProps<{ extension: Ech0Extension }>()
const { ui, t } = useUi()

const githubRepo = computed(() => {
  if (props.extension.type !== 'GITHUBPROJ') return null
  const raw = props.extension.payload.repoUrl ?? ''
  const m = raw.match(/github\.com\/([^/]+)\/([^/#?]+)/)
  return m ? { url: raw, owner: m[1], repo: m[2] } : null
})

const website = computed(() => {
  if (props.extension.type !== 'WEBSITE') return null
  const site = props.extension.payload.site ?? ''
  let domain = site
  try {
    domain = new URL(site).hostname.replace(/^www\./, '')
  } catch {
    domain = site.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
  return { title: props.extension.payload.title || domain, site, domain }
})

const location = computed(() => {
  if (props.extension.type !== 'LOCATION') return null
  const lat = Number(props.extension.payload.latitude)
  const lng = Number(props.extension.payload.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const d = 0.008
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`
  return {
    lat,
    lng,
    text: props.extension.payload.placeholder || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
    link: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`,
  }
})

const video = computed(() => {
  if (props.extension.type !== 'VIDEO') return null
  const id = props.extension.payload.videoId ?? ''
  if (!id) return null
  const isBv = id.startsWith('BV')
  return {
    isBv,
    embed: isBv
      ? `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${id}&as_wide=1&high_quality=1&danmaku=0`
      : `https://www.youtube.com/embed/${id}`,
    link: isBv ? `https://www.bilibili.com/video/${id}` : `https://www.youtube.com/watch?v=${id}`,
  }
})

const musicUrl = computed(() =>
  props.extension.type === 'MUSIC' ? (props.extension.payload.url ?? '') : '',
)

const tweet = computed(() => {
  if (props.extension.type !== 'TWEET') return null
  const url = props.extension.payload.url ?? ''
  return url ? { url, username: props.extension.payload.username ?? '' } : null
})

function labelFor(type: string): string {
  switch (type) {
    case 'GITHUBPROJ':
      return ui.shuoshuo.extGithub
    case 'WEBSITE':
      return ui.shuoshuo.extWebsite
    case 'LOCATION':
      return ui.shuoshuo.extLocation
    case 'VIDEO':
      return ui.shuoshuo.extVideo
    case 'MUSIC':
      return ui.shuoshuo.extAudio
    case 'TWEET':
      return ui.shuoshuo.extTweet
    default:
      return ''
  }
}
</script>

<template>
  <div class="ext" v-if="extension">
    <!-- GitHub 项目卡 -->
    <a
      v-if="githubRepo"
      class="ext-card ext-link"
      :href="githubRepo.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="ext-head">
        <Icon name="tabler:brand-github" aria-hidden="true" />
        <span class="ext-label">{{ labelFor('GITHUBPROJ') }}</span>
        <Icon name="tabler:external-link" class="ext-go" aria-hidden="true" />
      </span>
      <span class="ext-title">{{ githubRepo.owner }} / {{ githubRepo.repo }}</span>
      <span class="ext-cta">{{ t(ui.shuoshuo.extGithubCta) }}</span>
    </a>

    <!-- 网站卡 -->
    <a
      v-else-if="website"
      class="ext-card ext-link"
      :href="website.site"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="ext-head">
        <Icon name="tabler:world" aria-hidden="true" />
        <span class="ext-label">{{ labelFor('WEBSITE') }}</span>
        <Icon name="tabler:external-link" class="ext-go" aria-hidden="true" />
      </span>
      <span class="ext-title">{{ website.title }}</span>
      <span class="ext-cta">{{ website.domain }}</span>
    </a>

    <!-- 位置卡：OSM 内嵌地图 -->
    <div v-else-if="location" class="ext-card ext-map-card">
      <span class="ext-head">
        <Icon name="tabler:map-pin" aria-hidden="true" />
        <span class="ext-label">{{ labelFor('LOCATION') }}</span>
        <a
          class="ext-go"
          :href="location.link"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t(ui.shuoshuo.extLocationAria)"
        >
          <Icon name="tabler:external-link" aria-hidden="true" />
        </a>
      </span>
      <iframe
        class="ext-map"
        :src="location.embed"
        loading="lazy"
        :title="location.text"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
      <span class="ext-cta">{{ location.text }}</span>
    </div>

    <!-- 视频卡：B 站 / YouTube 内嵌 -->
    <div v-else-if="video" class="ext-card">
      <span class="ext-head">
        <Icon name="tabler:player-play" aria-hidden="true" />
        <span class="ext-label">{{ labelFor('VIDEO') }}</span>
        <a
          class="ext-go"
          :href="video.link"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t(ui.shuoshuo.extVideoCta)"
        >
          <Icon name="tabler:external-link" aria-hidden="true" />
        </a>
      </span>
      <div class="ext-video">
        <iframe
          :src="video.embed"
          loading="lazy"
          scrolling="no"
          frameborder="0"
          allowfullscreen
          :title="t(ui.shuoshuo.extVideo)"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>

    <!-- 音乐卡 -->
    <div v-else-if="musicUrl" class="ext-card">
      <span class="ext-head">
        <Icon name="tabler:music" aria-hidden="true" />
        <span class="ext-label">{{ labelFor('MUSIC') }}</span>
      </span>
      <audio class="ext-audio" :src="musicUrl" controls preload="none" :aria-label="t(ui.shuoshuo.extAudioAria)"></audio>
    </div>

    <!-- 推文卡 -->
    <a
      v-else-if="tweet"
      class="ext-card ext-link"
      :href="tweet.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="ext-head">
        <Icon name="tabler:brand-x" aria-hidden="true" />
        <span class="ext-label">{{ labelFor('TWEET') }}</span>
        <Icon name="tabler:external-link" class="ext-go" aria-hidden="true" />
      </span>
      <span class="ext-title">@{{ tweet.username }}</span>
      <span class="ext-cta">{{ t(ui.shuoshuo.extTweetCta) }}</span>
    </a>
  </div>
</template>

<style scoped>
.ext-card {
  display: block;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 0.75rem;
  overflow: hidden;
}

.ext-link {
  text-decoration: none;
  color: inherit;
  transition: border-color var(--duration-base) var(--easing-base);
}

.ext-link:hover {
  border-color: var(--accent);
}

.ext-head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  margin-bottom: 0.5rem;
}

.ext-label {
  font-family: var(--font-mono);
}

.ext-go {
  margin-left: auto;
  color: var(--muted-foreground);
}

a.ext-go {
  display: inline-flex;
}

.ext-title {
  display: block;
  font-weight: 700;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: var(--foreground);
  margin-bottom: 0.25rem;
}

.ext-cta {
  display: block;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.ext-map {
  display: block;
  width: 100%;
  height: 160px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 0.5rem;
}

.ext-video {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius);
  overflow: hidden;
}

.ext-video iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.ext-audio {
  display: block;
  width: 100%;
}
</style>
