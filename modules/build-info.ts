import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createResolver, defineNuxtModule, updateAppConfig } from '@nuxt/kit'
import { createJiti } from 'jiti'
import type { BuildMeta } from '../shared/types/build'

/**
 * 构建期信息采集 —— 供侧栏「站点信息卡」展示。
 *
 * 全部在构建期算好、随 payload 序列化进产物，客户端不重算：
 * 客户端拿不到 Node 版本、构建时间这类信息，且两端算出不同值会水合错位。
 * 类型定义在 app/composables/useBuildMeta.ts，供组件与服务端共用。
 */

const PLATFORM_MAP: Record<string, string> = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
  freebsd: 'FreeBSD',
}

const ARCH_MAP: Record<string, string> = {
  x64: 'x86_64',
  arm64: 'ARM64',
  arm: 'ARM',
  ia32: 'x86',
}

/** 常见 CI 环境识别；未命中但仍是 CI 时统一显示 CI */
function detectBuildPlatform(env: NodeJS.ProcessEnv): string {
  if (env.GITHUB_ACTIONS) return 'GitHub Actions'
  if (env.CF_PAGES) return 'Cloudflare Pages'
  if (env.VERCEL) return 'Vercel'
  if (env.NETLIFY) return 'Netlify'
  if (env.GITLAB_CI) return 'GitLab CI'
  if (env.CI) return 'CI'
  return 'Local'
}

/** 按给定时区把日期格式化成「YYYY-MM-DD HH:mm:ss」，避免依赖构建机本地时区 */
function formatInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const hour = pick('hour') === '24' ? '00' : pick('hour')
  return `${pick('year')}-${pick('month')}-${pick('day')} ${hour}:${pick('minute')}:${pick('second')}`
}

export default defineNuxtModule({
  meta: { name: 'build-info' },

  async setup() {
    const { resolve } = createResolver(import.meta.url)
    const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })
    ;(globalThis as any).defineAppConfig ??= (config: unknown) => config

    const pkg = JSON.parse(readFileSync(resolve('../package.json'), 'utf-8'))

    // 时区从 pages.config.ts 读，和卡片配置保持一致（避免一处写死两处维护）
    const pages = await jiti.import<any>(resolve('../app/pages.config.ts'))
    const timeZone = pages.default?.pages?.home?.sidebar?.siteInfo?.buildTimeZone || 'Asia/Shanghai'

    // 依赖版本优先从已安装包读取，读不到就退回 package.json 的声明范围
    const require = createRequire(import.meta.url)
    const readVersion = (id: string, fallback: string) => {
      try {
        return require(`${id}/package.json`).version || fallback
      } catch {
        return fallback
      }
    }

    const userAgent = process.env.npm_config_user_agent || ''
    const pnpmMatch = userAgent.match(/pnpm\/([\d.]+)/)
    const pnpmVersion =
      pnpmMatch?.[1]
      ?? (typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[1] : '')
      ?? ''

    const meta: BuildMeta = {
      platform: detectBuildPlatform(process.env),
      siteVersion: pkg.version || 'unknown',
      nuxtVersion: readVersion('nuxt', ''),
      vueVersion: readVersion('vue', ''),
      nodeVersion: process.version,
      pnpmVersion: pnpmVersion ? `v${pnpmVersion.replace(/^v/, '')}` : '',
      buildTime: formatInZone(new Date(), timeZone),
      system: `${PLATFORM_MAP[process.platform] || process.platform} / ${ARCH_MAP[process.arch] || process.arch}`,
    }

    updateAppConfig({ build: meta })
  },
})