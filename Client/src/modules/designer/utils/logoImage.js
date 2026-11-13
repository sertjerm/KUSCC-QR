// File: Client/src/modules/designer/utils/logoImage.js
// Version: 1.0.0
// Description: เตรียมไฟล์โลโก้ก่อนใส่ใน QR — ถ้าไฟล์ใหญ่หรือภาพกว้างเกิน จะย่อ/บีบอัดอัตโนมัติ (คงพื้นโปร่งใส)
//              ผลลัพธ์เป็น data URL ที่เก็บใน style.image (API จำกัด style ทั้งก้อน ~1 MB)

// ขนาดไฟล์โลโก้หลังย่อ (bytes) — base64 ขยาย ~33% จึงยังเหลือที่ให้ส่วนอื่นของ style
export const MAX_LOGO_BYTES = 500 * 1024
// ด้านยาวสุดของโลโก้ — โลโก้กินพื้นที่ ≤ 50% ของ QR, export 4096px จึงพอสำหรับงานพิมพ์
const MAX_LOGO_SIDE = 1024
const MIN_LOGO_SIDE = 128
// ไฟล์ต้นฉบับใหญ่เกินนี้ไม่ถอดรหัส (กันเบราว์เซอร์ค้าง)
const MAX_SOURCE_BYTES = 20 * 1024 * 1024

export class LogoError extends Error {}

const readAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

// ใช้ <img> แทน createImageBitmap เพื่อให้รองรับ SVG ด้วย
const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new LogoError('เปิดไฟล์รูปนี้ไม่ได้'))
    }
    img.src = url
  })

const encode = (img, width, height, mime, quality) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
}

/**
 * คืน { dataUrl, resized, originalBytes, finalBytes, width, height }
 * - ไฟล์เล็กพอและภาพไม่ใหญ่เกิน → ใช้ไฟล์เดิม (SVG ยังเป็น vector)
 * - ไม่งั้น → ย่อด้านยาวเหลือ ≤ 1024px แล้วลอง PNG → WEBP ถ้ายังเกินก็ย่อลงทีละ 25%
 */
export const prepareLogo = async (file) => {
  if (!file.type.startsWith('image/')) throw new LogoError('รองรับเฉพาะไฟล์รูปภาพ')
  if (file.size > MAX_SOURCE_BYTES) throw new LogoError('ไฟล์ต้นฉบับใหญ่เกิน 20 MB')

  const { img, url } = await loadImage(file)
  try {
    const sourceWidth = img.naturalWidth || MAX_LOGO_SIDE
    const sourceHeight = img.naturalHeight || MAX_LOGO_SIDE
    const longest = Math.max(sourceWidth, sourceHeight)

    if (file.size <= MAX_LOGO_BYTES && longest <= MAX_LOGO_SIDE) {
      return { dataUrl: await readAsDataUrl(file), resized: false, originalBytes: file.size, finalBytes: file.size, width: sourceWidth, height: sourceHeight }
    }

    let side = Math.min(longest, MAX_LOGO_SIDE)
    while (side >= MIN_LOGO_SIDE) {
      const scale = side / longest
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))
      // PNG คมสุด, WEBP เล็กกว่ามาก — ทั้งคู่คงพื้นโปร่งใส
      for (const [mime, quality] of [['image/png'], ['image/webp', 0.9], ['image/webp', 0.75]]) {
        const blob = await encode(img, width, height, mime, quality)
        if (blob && blob.size <= MAX_LOGO_BYTES) {
          return { dataUrl: await readAsDataUrl(blob), resized: true, originalBytes: file.size, finalBytes: blob.size, width, height }
        }
      }
      side = Math.floor(side * 0.75)
    }
    throw new LogoError('ย่อโลโก้ให้เล็กพอไม่ได้ ลองใช้ไฟล์อื่น')
  } finally {
    URL.revokeObjectURL(url)
  }
}
