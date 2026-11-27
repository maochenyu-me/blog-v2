<script setup lang="ts">
/**
 * 侧栏天气卡：按访客 IP 定位（配置 city 可固定城市），客户端拉取并缓存。
 *
 * 数据全部 onMounted 后获取，SSG 产物里只有占位骨架，与水合后首帧一致，
 * 不会产生 hydration mismatch。接口地址、城市、缓存时长、指标顺序与开关
 * 一律来自 pages.config.ts，组件内不写死。
 */
import {
  fetchWeather,
  weatherIcon,
  aqiTone,
  type WeatherData,
  type WeatherQuery,
} from '~/utils/weather'
import type { WeatherMetricKey } from '~/composables/usePageConfig'

interface WeatherConfig {
  enabled: boolean
  defaultCollapsed: boolean
  apiUrl: string
  extended: boolean
  city: string
  cacheMinutes: number
  metricOrder: WeatherMetricKey[]
  showPollutants: boolean
  showReportTime: boolean
}

const props = defineProps<{
  cfg: WeatherConfig
}>()

const { ui } = useUi()
const w = ui.pages.home.sidebar.weather
const s = ui.pages.home.sidebar.siteInfo

type Phase = 'loading' | 'error' | 'ready'

const phase = ref<Phase>('loading')
const data = ref<WeatherData | null>(null)
const collapsed = ref(props.cfg.defaultCollapsed)

const query = computed<WeatherQuery>(() => ({
  apiUrl: props.cfg.apiUrl,
  extended: props.cfg.extended,
  city: props.cfg.city,
}))

async function load(): Promise<void> {
  const result = await fetchWeather(query.value, props.cfg.cacheMinutes)
  if (result) {
    data.value = result
    phase.value = 'ready'
  } else {
    phase.value = 'error'
  }
}

onMounted(load)

/* ---- 展示用派生值 ---- */
const place = computed(() => {
  const d = data.value
  if (!d) return s.unknown
  return d.city || d.province || s.unknown
})
const district = computed(() => data.value?.district ?? '')
const temp = computed(() => (data.value?.temperature != null ? data.value.temperature : '--'))
const desc = computed(() => data.value?.weather ?? '')
const icon = computed(() => weatherIcon(data.value?.weather_icon))
const tempMax = computed(() => (data.value?.temp_max != null ? data.value.temp_max : '--'))
const tempMin = computed(() => (data.value?.temp_min != null ? data.value.temp_min : '--'))
const reportTime = computed(() => data.value?.report_time ?? '')
const today = computed(() => data.value?.forecast?.[0] ?? null)

const aqiCategory = computed(() => {
  const c = data.value?.aqi_category
  return c && c !== 'NA' ? c : ''
})
const aqiClass = computed(() => aqiTone(data.value?.aqi_level))

/** 指标值表：键名与 metricOrder 一一对应；缺数据统一回退到 na 占位 */
const metricValues = computed<Record<WeatherMetricKey, { icon: string; label: string; value: string; tone?: string }>>(() => {
  const d = data.value
  const u = w.units
  const na = w.na
  const t = today.value
  const wind = [d?.wind_direction, d?.wind_power].filter(Boolean).join(' ')

  return {
    wind: { ...w.metrics.wind, value: wind || na },
    visibility: { ...w.metrics.visibility, value: d?.visibility != null ? `${d.visibility}${u.visibility}` : na },
    feelsLike: { ...w.metrics.feelsLike, value: d?.feels_like != null ? `${d.feels_like}${u.temp}` : na },
    humidity: { ...w.metrics.humidity, value: d?.humidity != null ? `${d.humidity}${u.humidity}` : na },
    pressure: { ...w.metrics.pressure, value: d?.pressure != null ? `${d.pressure}${u.pressure}` : na },
    aqi: { ...w.metrics.aqi, value: d?.aqi != null ? String(d.aqi) : na, tone: aqiClass.value },
    cloud: { ...w.metrics.cloud, value: d?.cloud != null ? `${d.cloud}${u.cloud}` : na },
    uv: { ...w.metrics.uv, value: d?.uv != null ? String(d.uv) : na },
    precipitation: { ...w.metrics.precipitation, value: d?.precipitation != null ? `${d.precipitation}${u.precipitation}` : na },
    precipProbability: { ...w.metrics.precipProbability, value: t?.pop != null ? `${t.pop}${u.probability}` : na },
    sunrise: { ...w.metrics.sunrise, value: t?.sunrise || na },
    sunset: { ...w.metrics.sunset, value: t?.sunset || na },
  }
})

const metrics = computed(() => props.cfg.metricOrder.map((key) => ({ key, ...metricValues.value[key] })))

const pollutants = computed(() => {
  const p = data.value?.air_pollutants
  if (!p) return []
  return [
    { name: 'PM2.5', value: p.pm25 },
    { name: 'PM10', value: p.pm10 },
    { name: 'O₃', value: p.o3 },
    { name: 'NO₂', value: p.no2 },
    { name: 'SO₂', value: p.so2 },
    { name: 'CO', value: p.co },
  ]
})
</script>

<template>
  <SidebarCard :title="w.title" icon="tabler:sun-wind">
    <div class="weather">
      <div v-if="phase === 'loading'" class="state">
        <span class="spinner" aria-hidden="true"></span>
        <span class="state-text">{{ w.loading }}</span>
      </div>

      <div v-else-if="phase === 'error'" class="state">
        <Icon name="tabler:alert-circle" class="state-icon" aria-hidden="true" />
        <span class="state-text">{{ w.failed }}</span>
        <button type="button" class="retry" @click="load">
          <Icon name="tabler:refresh" aria-hidden="true" />
          <span>{{ w.retry }}</span>
        </button>
      </div>

      <template v-else>
        <div class="head">
          <div class="loc">
            <Icon name="tabler:map-pin" class="loc-icon" aria-hidden="true" />
            <span class="loc-city">{{ place }}</span>
            <span v-if="district" class="loc-district">{{ district }}</span>
          </div>
          <span class="sky"><Icon :name="icon" aria-hidden="true" /></span>
        </div>

        <div class="temp-row">
          <span class="temp">{{ temp }}</span>
          <span class="deg">{{ w.units.temp.replace('°C', '°') }}</span>
          <span class="desc">{{ desc }}</span>
        </div>

        <div class="range">
          <span class="max">{{ w.high }} <b>{{ tempMax }}{{ w.units.temp }}</b></span>
          <span class="sep">/</span>
          <span class="min">{{ w.low }} <b>{{ tempMin }}{{ w.units.temp }}</b></span>
        </div>

        <div class="detail" :class="{ collapsed }">
          <div class="detail-inner">
            <div class="metric-grid">
              <div v-for="m in metrics" :key="m.key" class="metric">
                <Icon :name="m.icon" class="metric-icon" aria-hidden="true" />
                <span class="metric-label">{{ m.label }}</span>
                <span class="metric-value">
                  {{ m.value }}
                  <span v-if="m.tone && m.tone !== 'none' && aqiCategory" class="aqi-tag" :class="`tone-${m.tone}`">
                    {{ aqiCategory }}
                  </span>
                </span>
              </div>
            </div>

            <div v-if="cfg.showPollutants && pollutants.length" class="pollutants">
              <Icon name="tabler:flask" class="metric-icon" aria-hidden="true" />
              <div class="pollutant-body">
                <span class="metric-label">{{ w.pollutants }}</span>
                <div class="pollutant-list">
                  <span v-for="p in pollutants" :key="p.name" class="pollutant">
                    {{ p.name }}: <b>{{ p.value ?? w.na }}</b>
                  </span>
                </div>
              </div>
            </div>

            <div v-if="cfg.showReportTime && reportTime" class="report">
              <Icon name="tabler:clock" aria-hidden="true" />
              <span>{{ reportTime }}</span>
            </div>
          </div>
        </div>

        <button type="button" class="toggle" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
          <Icon :name="collapsed ? 'tabler:chevron-down' : 'tabler:chevron-up'" aria-hidden="true" />
          <span>{{ collapsed ? w.expand : w.collapse }}</span>
        </button>
      </template>
    </div>
  </SidebarCard>
</template>

<style scoped>
.weather {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: var(--fs-meta);
  line-height: var(--lh-meta);
}

/* ---- 加载 / 错误态 ---- */
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 0;
}

.spinner {
  width: 1.75rem;
  height: 1.75rem;
  border: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-icon {
  font-size: 1.75rem;
  color: var(--muted-foreground);
}

.state-text {
  color: var(--muted-foreground);
}

.retry {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--muted) 60%, transparent);
  color: var(--accent);
  font-size: var(--fs-meta);
  cursor: pointer;
}

/* ---- 头部：地点 + 天气图标 ---- */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.loc {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  min-width: 0;
}

.loc-icon {
  align-self: center;
  font-size: 0.9375rem;
  color: var(--accent);
  flex-shrink: 0;
}

.loc-city {
  font-size: 1rem;
  font-weight: 700;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loc-district {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.sky {
  display: inline-flex;
  font-size: 2rem;
  color: var(--accent);
  flex-shrink: 0;
}

/* ---- 温度 ---- */
.temp-row {
  display: flex;
  align-items: flex-start;
  gap: 0.125rem;
  line-height: 1;
}

.temp {
  font-size: clamp(2.5rem, 12vw, 3.25rem);
  font-weight: 800;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

.deg {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--muted-foreground);
  margin-top: 0.25rem;
}

.desc {
  align-self: center;
  margin-left: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

.range {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--foreground) 16%, transparent);
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.range b {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.range .max b {
  color: #e05a4a;
}

.range .min b {
  color: #4a7de0;
}

.range .sep {
  opacity: 0.6;
}

/* ---- 折叠区 ---- */
.detail {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--duration-slow) var(--easing-base);
}

.detail.collapsed {
  grid-template-rows: 0fr;
}

.detail-inner {
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 列数跟随卡片自身宽度（容器查询）：340px 侧栏下两列，
   平板端卡片拉满时四列，避免固定两列被拉得过散 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.weather {
  container-type: inline-size;
}

@container (min-width: 34rem) {
  .metric-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  /* 宽卡下不再需要「末格独占一行」来补洞 */
  .metric:last-child:nth-child(odd) {
    grid-column: auto;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .metric:last-child:nth-child(odd) .metric-icon {
    grid-row: 1 / 3;
  }

  .metric:last-child:nth-child(odd) .metric-value {
    justify-self: start;
  }
}

.metric {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  column-gap: 0.4rem;
  align-items: center;
  min-width: 0;
}

.metric-icon {
  grid-row: 1 / 3;
  font-size: 1.0625rem;
  color: var(--accent);
}

.metric-label {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--fs-meta);
  font-weight: 700;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aqi-tag {
  padding: 0 0.25rem;
  border-radius: 0.1875rem;
  font-size: 0.625rem;
  line-height: 1.4;
  font-weight: 600;
  color: #fff;
}

.tone-good {
  background: #3fa34d;
}

.tone-moderate {
  background: #d9a02b;
}

.tone-bad {
  background: #d0503a;
}

/* 指标数为奇数时最后一格独占一行：改成「图标 + 标签 靠左 / 值 靠右」，
   避免整格拉伸后标签被推得离图标很远 */
.metric:last-child:nth-child(odd) {
  grid-column: 1 / -1;
  grid-template-columns: auto auto minmax(0, 1fr);
  grid-template-rows: auto;
  column-gap: 0.4rem;
}

.metric:last-child:nth-child(odd) .metric-icon {
  grid-row: 1;
  align-self: center;
}

.metric:last-child:nth-child(odd) .metric-value {
  justify-self: end;
}

.pollutants {
  display: flex;
  gap: 0.4rem;
  padding-top: 0.5rem;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 16%, transparent);
}

.pollutant-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.pollutant-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.pollutant b {
  color: var(--foreground);
}

.report {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

/* ---- 折叠按钮 ---- */
.toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  padding: 0.25rem 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: var(--fs-meta);
  font-weight: 500;
  cursor: pointer;
  transition: opacity var(--duration-base) var(--easing-base);
}

.toggle:hover {
  opacity: 0.75;
}

.toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius);
}

@media (prefers-reduced-motion: reduce) {
  .detail,
  .toggle {
    transition: none;
  }

  .spinner {
    animation: none;
  }
}
</style>