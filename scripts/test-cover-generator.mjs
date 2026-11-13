import assert from 'node:assert/strict'
import { dimensionsForRatio, drawCover } from '../app/utils/cover-generator.ts'

assert.deepEqual(dimensionsForRatio('16:9', 1), { width: 1067, height: 600 })
assert.deepEqual(dimensionsForRatio('16:9', 2), { width: 2133, height: 1200 })
assert.deepEqual(dimensionsForRatio('1:1', 3), { width: 1800, height: 1800 })
assert.deepEqual(dimensionsForRatio('2:3', 1), { width: 400, height: 600 })
assert.deepEqual(dimensionsForRatio('16:9', 0), { width: 1067, height: 600 })

assert.throws(() => dimensionsForRatio('bad', 1), /Unsupported aspect ratio/)

const pixels = []
const context = {
  globalAlpha: 1,
  fillStyle: '',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  clearRect() {},
  save() { pixels.push(['save']) },
  restore() { pixels.push(['restore']) },
  fillRect(x, y, width, height) { pixels.push(['fillRect', this.globalAlpha, this.fillStyle, x, y, width, height]) },
  drawImage() {},
  measureText(text) { return { width: text.length * 10 } },
  fillText() {},
}
drawCover(context, {
  width: 600, height: 600, leftText: '', rightText: '', fontFamily: 'serif', fontSize: 64,
  fontWeight: 400, textColor: '#fff', backgroundColor: '#123456', backgroundOpacity: 1,
  backgroundTransparent: true, iconVisible: false, iconImage: null, iconSize: 64, iconRadius: 0,
  iconBackground: '#000', iconBackgroundEnabled: false, gap: 20, originalIconColor: true,
  iconColor: '#fff', shadowColor: '#000000', shadowBlur: 0, shadowX: 0, shadowY: 0,
  shadowOpacity: 0,
})
assert.ok(pixels.some(([type, alpha]) => type === 'fillRect' && alpha === 0))
console.log('cover generator dimensions and transparent export: PASS')
