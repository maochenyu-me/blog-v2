/**
 * pnpm theme —— 列出主题预设与当前激活项。
 * 纯只读：加载 theme.config.ts + theme-presets.ts，打印清单和关键字段摘要。
 */
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })
;(globalThis).defineAppConfig ??= (c) => c

const themeMod = await jiti.import('../app/theme.config.ts')
const theme = (themeMod.default ?? themeMod).theme
const presetsMod = await jiti.import('../app/theme-presets.ts')
const presets = presetsMod.default ?? presetsMod

const active = theme.preset
const ids = Object.keys(presets)

console.log('\n  主题预设清单（切换：theme.config.ts → preset: \'<id>\'）\n')
console.log(`  当前激活：${active ? `${active}（${presets[active]?.name ?? '未知'}）` : '未启用预设（纯 theme.config 基线）'}\n`)

for (const [id, p] of Object.entries(presets)) {
  const mark = id === active ? ' ← 激活' : ''
  console.log(`  ${id}  ${p.name}${mark}`)
  const b = p.backdrop ?? {}
  const bits = []
  if (b.light) bits.push(`浅图 ${b.light}`)
  if (b.dark) bits.push(`深图 ${b.dark}`)
  if (b.opacity) bits.push(`透明度 ${b.opacity.light}/${b.opacity.dark}`)
  if (p.accent?.dark) bits.push(`深色强调 ${p.accent.dark}`)
  if (p.dark?.background) bits.push(`深色底 ${p.dark.background}`)
  for (const line of bits) console.log(`    · ${line}`)
  console.log()
}
