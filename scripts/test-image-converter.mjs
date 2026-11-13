import assert from 'node:assert/strict'
import { IMAGE_FORMATS, getOutputName, encodeBmp } from '../app/utils/image-converter.ts'

assert.deepEqual(IMAGE_FORMATS.map(item => item.value), ['png', 'jpeg', 'webp', 'bmp', 'avif'])
assert.equal(getOutputName('photo.png', 'jpeg'), 'photo.jpg')
assert.equal(getOutputName('旅行 图.png', 'webp'), '旅行 图.webp')
assert.equal(getOutputName('.hidden', 'png'), '.hidden.png')
const bmp = encodeBmp(1, 1, new Uint8ClampedArray([255, 0, 0, 255]))
assert.equal(new TextDecoder().decode(bmp.slice(0, 2)), 'BM')
assert.equal(new DataView(bmp.buffer).getUint32(2, true), 58)
assert.deepEqual([...bmp.slice(54, 58)], [0, 0, 255, 0])
console.log('image converter core: PASS')
