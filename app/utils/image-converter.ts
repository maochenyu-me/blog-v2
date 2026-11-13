export const IMAGE_FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png', extension: '.png' },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', extension: '.jpg' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', extension: '.webp' },
  { value: 'bmp', label: 'BMP', mime: 'image/bmp', extension: '.bmp' },
  { value: 'avif', label: 'AVIF', mime: 'image/avif', extension: '.avif' },
] as const

export type ImageFormat = typeof IMAGE_FORMATS[number]['value']

export function getOutputName(inputName: string, format: ImageFormat) {
  const extension = IMAGE_FORMATS.find(item => item.value === format)!.extension
  const base = inputName.replace(/\.[^.\\/]+$/, '') || inputName
  return `${base}${extension}`
}

export function encodeBmp(width: number, height: number, rgba: Uint8ClampedArray) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4)
    throw new Error('Invalid bitmap dimensions')
  const rowBytes = Math.ceil(width * 3 / 4) * 4
  const pixelBytes = rowBytes * height
  const buffer = new ArrayBuffer(54 + pixelBytes)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  bytes[0] = 0x42
  bytes[1] = 0x4d
  view.setUint32(2, buffer.byteLength, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelBytes, true)
  view.setInt32(38, 2835, true)
  view.setInt32(42, 2835, true)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = ((height - 1 - y) * width + x) * 4
      const target = 54 + y * rowBytes + x * 3
      const red = rgba[source] ?? 0
      const green = rgba[source + 1] ?? 0
      const blue = rgba[source + 2] ?? 0
      const alpha = (rgba[source + 3] ?? 255) / 255
      bytes[target] = Math.round(blue * alpha + 255 * (1 - alpha))
      bytes[target + 1] = Math.round(green * alpha + 255 * (1 - alpha))
      bytes[target + 2] = Math.round(red * alpha + 255 * (1 - alpha))
    }
  }
  return bytes
}
