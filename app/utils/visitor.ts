/**
 * 访客信息卡的纯逻辑：UA 解析、haversine 距离、IP 地理接口回退链。
 * 仅客户端使用（组件 onMounted 后调用）；解析器不抛错，失败返回 null 由链条继续。
 */

export interface VisitorGeo {
  ip?: string
  location?: string
  isp?: string
  lat?: number
  lon?: number
}

interface GeoEndpoint {
  name: string
  url: string
  parse: (data: any) => VisitorGeo | null
}

/**
 * IP 地理接口回退链：命中即合并（后到者只补缺字段），
 * 拿到经纬度就提前结束。全部为支持 CORS 的免费接口。
 */
export const visitorEndpoints: GeoEndpoint[] = [
  {
    name: '60s-api',
    url: 'https://60s-api.518339.xyz/v2/ip',
    parse: (data) => {
      if (data.code !== 200 || !data.data) return null
      const d = data.data
      return {
        ip: d.ip,
        location: [d.country, d.prov, d.city].filter(Boolean).join(', '),
        isp: d.isp,
        lat: d.lat,
        lon: d.lng,
      }
    },
  },
  {
    name: 'ip.sb',
    url: 'https://api.ip.sb/geoip',
    parse: (data) => ({
      ip: data.ip,
      location: `${data.country || ''}, ${data.city || ''}`,
      isp: data.organization,
      lat: data.latitude,
      lon: data.longitude,
    }),
  },
  {
    name: 'ipinfo.io',
    url: 'https://ipinfo.io/json',
    parse: (data) => {
      const [lat, lon] = data.loc ? data.loc.split(',') : [null, null]
      return {
        ip: data.ip,
        location: `${data.country || ''}, ${data.city || ''}`,
        isp: data.org,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
      }
    },
  },
  {
    name: 'api.vore.top',
    url: 'https://api.vore.top/api/IPdata',
    parse: (data) => {
      if (data.code !== 200 || !data.ipinfo) return null
      return {
        ip: data.ipinfo.ip,
        location: `${data.ipinfo.info.country || ''}, ${data.ipinfo.info.province || ''}, ${data.ipinfo.info.city || ''}`.replace(/, $/, ''),
        isp: data.ipinfo.info.isp,
        lat: data.ipinfo.adcode?.lat,
        lon: data.ipinfo.adcode?.lng,
      }
    },
  },
  {
    name: 'ipwho.is',
    url: 'https://ipwho.is/',
    parse: (data) => {
      if (!data.success) return null
      return {
        ip: data.ip,
        location: `${data.country || ''}, ${data.city || ''}`,
        isp: data.isp,
        lat: data.latitude,
        lon: data.longitude,
      }
    },
  },
  {
    name: 'ipapi.co',
    url: 'https://ipapi.co/json/',
    parse: (data) => ({
      ip: data.ip,
      location: `${data.country_name || ''}, ${data.city || ''}`,
      isp: data.org,
      lat: data.latitude,
      lon: data.longitude,
    }),
  },
  {
    name: 'vvhan.com',
    url: 'https://api.vvhan.com/api/ipInfo?type=json',
    parse: (data) =>
      data.success
        ? {
            ip: data.ip,
            location: `${data.info.country || ''}, ${data.info.city || ''}`,
            isp: data.info.isp,
          }
        : null,
  },
]

/** 单个地理接口的请求超时（毫秒）：慢源直接放弃，走下一个 */
const ENDPOINT_TIMEOUT_MS = 3500

/**
 * 按回退链依次拉取访客 IP 地理信息，返回合并结果（可能全空）。
 */
export async function fetchVisitorGeo(): Promise<VisitorGeo> {
  const merged: VisitorGeo = {}
  for (const ep of visitorEndpoints) {
    if (merged.lat !== undefined && merged.lon !== undefined) break
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(ENDPOINT_TIMEOUT_MS) })
      if (!res.ok) continue
      const parsed = ep.parse(await res.json())
      if (parsed) {
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== undefined && v !== null && v !== '') {
            ;(merged as Record<string, unknown>)[k] = v
          }
        }
      }
    } catch {
      // 静默失败，尝试下一个源
    }
  }
  return merged
}

/** Haversine 直线距离（公里，四舍五入到整数） */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    0.5 -
    Math.cos(dLat) / 2 +
    (Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * (1 - Math.cos(dLon))) / 2
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)))
}

export function getOSFromUA(ua: string): string {
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('like Mac')) return 'iOS'
  return 'Unknown'
}

export function getBrowserFromUA(ua: string): string {
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  return 'Unknown'
}

export type CdnKind = 'cloudflare' | 'edgeone' | 'vercel' | 'local' | null

/** 按响应头识别 CDN/托管平台（均为官方认证标识符） */
export function detectCdn(hostname: string, headers: Headers): CdnKind {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local'
  if (headers.get('cf-ray') || headers.get('cf-cache-status')) return 'cloudflare'
  if (headers.get('eo-log-uuid') || headers.get('eo-cache-status')) return 'edgeone'
  if (headers.get('x-vercel-id') || headers.get('x-vercel-cache')) return 'vercel'
  return null
}
