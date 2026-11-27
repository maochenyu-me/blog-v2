/**
 * 天气卡的纯逻辑：接口定义、图标映射、缓存与请求。
 * 仅客户端使用（组件 onMounted 后调用）；接口失败不抛错，返回 null 由组件降级。
 *
 * 数据源为 uapis.cn 免费接口，不传参数时按请求方 IP 定位，
 * 因此每个访客看到的是自己所在地的天气；配置 city 可固定到指定城市。
 */

export interface WeatherPollutants {
  pm25?: number
  pm10?: number
  o3?: number
  no2?: number
  so2?: number
  co?: number
}

export interface WeatherForecastDay {
  date?: string
  week?: string
  temp_max?: number
  temp_min?: number
  weather_day?: string
  weather_night?: string
  sunrise?: string
  sunset?: string
  /** 降水概率，接口扩展字段不一定存在 */
  pop?: number
}

export interface WeatherData {
  province?: string
  city?: string
  district?: string
  weather?: string
  weather_icon?: string
  temperature?: number
  wind_direction?: string
  wind_power?: string
  humidity?: number
  report_time?: string
  temp_max?: number
  temp_min?: number
  feels_like?: number
  visibility?: number
  pressure?: number
  uv?: number
  aqi?: number
  aqi_level?: number
  aqi_category?: string
  precipitation?: number
  cloud?: number
  air_pollutants?: WeatherPollutants
  forecast?: WeatherForecastDay[]
}

export interface WeatherQuery {
  apiUrl: string
  extended: boolean
  city: string
}

/**
 * 天气代码 → tabler 图标名。
 * uapis 用三位数代码（100 晴 / 101 多云 / 104 阴 / 3xx 雨 / 4xx 雪 / 5xx 雾霾 / 1xx 夜间），
 * 精确码落空时按百位区间兜底，接口新增代码也不会渲染成空白。
 */
const WEATHER_ICONS: Record<string, string> = {
  '100': 'tabler:sun',
  '101': 'tabler:cloud',
  '102': 'tabler:cloud',
  '103': 'tabler:cloud',
  '104': 'tabler:cloud',
  '150': 'tabler:moon',
  '151': 'tabler:moon',
  '152': 'tabler:moon',
  '153': 'tabler:moon',
  '200': 'tabler:wind',
  '201': 'tabler:droplet',
  '202': 'tabler:cloud-storm',
}

export function weatherIcon(code?: string | number | null): string {
  const key = String(code ?? '')
  if (WEATHER_ICONS[key]) return WEATHER_ICONS[key]
  if (!key) return 'tabler:cloud'
  const hundred = key[0]
  if (hundred === '3') return 'tabler:cloud-rain'
  if (hundred === '4') return 'tabler:cloud-snow'
  if (hundred === '5') return 'tabler:cloud-fog'
  if (hundred === '1') return 'tabler:moon'
  return 'tabler:cloud'
}

/** 组装请求地址：可选固定城市，扩展与预报参数按配置开关拼接 */
export function buildWeatherUrl(q: WeatherQuery): string {
  // apiUrl 默认是同源相对路径（/api/weather），new URL 必须有 base 才能解析；
  // 配成完整 http(s) 地址时 base 会被忽略，两种写法都成立。
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(q.apiUrl, base)
  if (q.extended) {
    url.searchParams.set('extended', 'true')
    url.searchParams.set('forecast', 'true')
  }
  if (q.city) url.searchParams.set('city', q.city)
  // 同源相对路径保持相对，避免把 origin 硬编进 localStorage 缓存键以外的往返
  return q.apiUrl.startsWith('/') ? `${url.pathname}${url.search}` : url.toString()
}

const CACHE_PREFIX = 'kemiao:weather:v1'

function cacheKey(q: WeatherQuery): string {
  return `${CACHE_PREFIX}:${q.city || 'ip'}:${q.extended ? 'ext' : 'base'}`
}

function readCache(q: WeatherQuery, ttlMinutes: number): WeatherData | null {
  try {
    const raw = localStorage.getItem(cacheKey(q))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { timestamp: number; data: WeatherData }
    if (!parsed?.data || typeof parsed.timestamp !== 'number') return null
    if (Date.now() - parsed.timestamp > ttlMinutes * 60_000) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(q: WeatherQuery, data: WeatherData): void {
  try {
    localStorage.setItem(cacheKey(q), JSON.stringify({ timestamp: Date.now(), data }))
  } catch {
    // 无痕模式 / 配额满：写不进去不影响本次渲染
  }
}

/** 拉取天气；命中缓存直接返回。失败返回 null（网络错误、超时、字段异常） */
export async function fetchWeather(q: WeatherQuery, ttlMinutes: number): Promise<WeatherData | null> {
  const cached = readCache(q, ttlMinutes)
  if (cached) return cached

  try {
    const res = await fetch(buildWeatherUrl(q), {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as WeatherData
    // city 缺失视为无效响应（接口异常时会返回错误对象）
    if (!data || !data.city) return null
    writeCache(q, data)
    return data
  } catch {
    return null
  }
}

/** AQI 等级 → 语义色类名，供空气质量标签换配色 */
export function aqiTone(level?: number): 'good' | 'moderate' | 'bad' | 'none' {
  if (level === 1) return 'good'
  if (level === 2) return 'moderate'
  if (typeof level === 'number' && level >= 3) return 'bad'
  return 'none'
}