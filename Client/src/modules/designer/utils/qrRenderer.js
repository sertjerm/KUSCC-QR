// File: Client/src/modules/designer/utils/qrRenderer.js
// Version: 1.0.0
// Description: จุดเดียวที่เรียก qr-code-styling — render QR แล้วประกอบข้อความ (textOptions) เหนือ/ใต้ QR
//              ใช้ทั้งภาพตัวอย่าง, ดาวน์โหลด, คัดลอก และภาพย่อ — ถ้าเปลี่ยนไลบรารีวาด QR แก้ที่ไฟล์นี้ไฟล์เดียว
import QRCodeStyling from 'qr-code-styling'
import { PREVIEW_SIZE, toStylingOptions } from './qrStyle.js'

const FONT_FAMILY = '"Noto Sans Thai", "Sarabun", sans-serif'
const LINE_HEIGHT = 1.35
const MAX_TEXT_WIDTH_RATIO = 0.9

const MIME_TYPES = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' }

const escapeXml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const getTextLines = (style) =>
  (style.textOptions?.text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

// คำนวณขนาดตัวอักษรและพื้นที่ข้อความ — ย่อฟอนต์อัตโนมัติถ้าบรรทัดยาวเกินความกว้าง QR
const measureTextLayout = async (style, size) => {
  const lines = getTextLines(style)
  if (lines.length === 0) return null

  const options = style.textOptions
  const weight = options.bold ? 700 : 500
  let fontPx = ((options.fontSize || 36) * size) / PREVIEW_SIZE
  const font = (px) => `${weight} ${px}px ${FONT_FAMILY}`

  // รอฟอนต์ไทยโหลดก่อนวัด/วาด ไม่งั้นจะได้ฟอนต์ fallback
  try {
    await document.fonts.load(font(fontPx), lines.join(''))
  } catch {
    // ใช้ฟอนต์ fallback
  }

  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = font(fontPx)
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width))
  const maxWidth = size * MAX_TEXT_WIDTH_RATIO
  if (widest > maxWidth) fontPx = (fontPx * maxWidth) / widest

  const lineHeight = fontPx * LINE_HEIGHT
  const padding = fontPx * 0.6
  const blockHeight = Math.ceil(lines.length * lineHeight + padding)
  const position = options.position === 'top' ? 'top' : 'bottom'
  return {
    lines,
    fontPx,
    font: font(fontPx),
    weight,
    color: options.color || '#000000',
    lineHeight,
    blockHeight,
    position,
    qrY: position === 'top' ? blockHeight : 0,
    // จุดกึ่งกลางแนวตั้งของแต่ละบรรทัด
    lineCenters: lines.map((_, i) => (position === 'top' ? padding : size) + lineHeight * (i + 0.5)),
  }
}

const getBackground = (style, extension) => {
  const color = style.backgroundOptions?.color
  if (!color || color === 'transparent') return extension === 'jpeg' ? '#ffffff' : null
  return color
}

const renderRaster = async (style, content, size, extension) => {
  const qr = new QRCodeStyling(toStylingOptions(style, content, size, 'canvas'))
  const layout = await measureTextLayout(style, size)
  const mime = MIME_TYPES[extension] || MIME_TYPES.png

  if (!layout && extension !== 'jpeg') return qr.getRawData(extension)

  const qrBlob = await qr.getRawData('png')
  const qrImage = await createImageBitmap(qrBlob)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size + (layout?.blockHeight || 0)
  const ctx = canvas.getContext('2d')

  const background = getBackground(style, extension)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(qrImage, 0, layout?.qrY || 0, size, size)

  if (layout) {
    ctx.font = layout.font
    ctx.fillStyle = layout.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    layout.lines.forEach((line, i) => ctx.fillText(line, size / 2, layout.lineCenters[i]))
  }

  return new Promise((resolve) => canvas.toBlob(resolve, mime, 0.95))
}

const renderSvg = async (style, content, size) => {
  const qr = new QRCodeStyling(toStylingOptions(style, content, size, 'svg'))
  const layout = await measureTextLayout(style, size)
  const qrBlob = await qr.getRawData('svg')
  if (!layout) return qrBlob

  // ซ้อน SVG ของ QR ไว้ใน SVG ใหม่ที่สูงขึ้น แล้วเพิ่ม <text> (ฟอนต์ต้องมีในเครื่องที่เปิดไฟล์)
  const qrSvg = (await qrBlob.text()).replace(/<\?xml[^>]*\?>/, '').replace('<svg ', `<svg x="0" y="${layout.qrY}" `)
  const height = size + layout.blockHeight
  const background = getBackground(style, 'svg')
  const texts = layout.lines
    .map(
      (line, i) =>
        `<text x="${size / 2}" y="${layout.lineCenters[i]}" text-anchor="middle" dominant-baseline="central" ` +
        `font-family='${FONT_FAMILY}' font-size="${layout.fontPx}" font-weight="${layout.weight}" fill="${layout.color}">${escapeXml(line)}</text>`,
    )
    .join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">` +
    (background ? `<rect width="100%" height="100%" fill="${background}"/>` : '') +
    qrSvg +
    texts +
    '</svg>'
  return new Blob([svg], { type: MIME_TYPES.svg })
}

// คืน Blob ของภาพ QR (+ ข้อความ) ตามนามสกุลที่ขอ
export const renderQrBlob = (style, content, { size = PREVIEW_SIZE, extension = 'png' } = {}) =>
  extension === 'svg' ? renderSvg(style, content, size) : renderRaster(style, content, size, extension)

export const downloadQr = async (style, content, { size, extension, fileName }) => {
  const blob = await renderQrBlob(style, content, { size, extension })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.${extension === 'jpeg' ? 'jpg' : extension}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const copyQrToClipboard = async (style, content, size) => {
  const blob = await renderQrBlob(style, content, { size, extension: 'png' })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export const makeThumbnailDataUrl = async (style, content, size = 200) => {
  const blob = await renderQrBlob(style, content, { size, extension: 'png' })
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
